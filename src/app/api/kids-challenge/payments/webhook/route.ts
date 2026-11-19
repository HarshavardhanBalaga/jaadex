import { NextResponse } from "next/server";
import { isValidObjectId } from "mongoose";
import { markPaid } from "@/lib/kids-challenge/registration-service";
import { isDuplicateKeyError } from "@/lib/workshops/queries";
import { connectToDatabase } from "@/lib/mongodb";
import { RazorpayWebhookEventModel } from "@/models/RazorpayWebhookEvent";
import { recordPaymentFailed, recordPaymentSucceeded } from "@/lib/kids-challenge/payment-ledger";
import { toRazorpayPayment } from "@/lib/payments/razorpay";
import { razorpayWebhookSecret } from "@/lib/payments/razorpay";
import { verifyWebhookSignature } from "@/lib/payments/razorpay-signature";

export const dynamic = "force-dynamic";

type OrderPaidEvent = {
  event?: string;
  payload?: {
    order?: { entity?: { id?: string; notes?: { registrationId?: string; purpose?: string } } };
    payment?: { entity?: Record<string, unknown> & { id?: string; order_id?: string; notes?: { registrationId?: string; purpose?: string } } };
  };
};

/**
 * Razorpay webhook (Dashboard → Webhooks, events "order.paid" and "payment.failed"). order.paid is the
 * backup for parents who pay and close the tab before the checkout callback reaches us; payment.failed
 * fills the payment history with failed attempts. Authenticated only by the
 * X-Razorpay-Signature HMAC over the raw body. Each x-razorpay-event-id is recorded under a unique
 * index, so a redelivered event is acknowledged without being processed again. Always 200 for events we ignore.
 */
export async function POST(request: Request) {
  const secret = razorpayWebhookSecret();
  if (!secret) return NextResponse.json({ ok: false, error: "webhook_not_configured" }, { status: 503 });
  const raw = await request.text();
  const signature = request.headers.get("x-razorpay-signature") ?? "";
  if (!verifyWebhookSignature(raw, signature, secret)) return NextResponse.json({ ok: false, error: "invalid_signature" }, { status: 400 });

  let event: OrderPaidEvent;
  try {
    event = JSON.parse(raw) as OrderPaidEvent;
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_body" }, { status: 400 });
  }
  if (event.event !== "order.paid" && event.event !== "payment.failed") return NextResponse.json({ ok: true, ignored: true });

  const order = event.payload?.order?.entity;
  const paymentEntity = event.payload?.payment?.entity;
  const payment = paymentEntity ? toRazorpayPayment(paymentEntity) : null;
  // payment.failed carries no order entity; our order notes are copied onto the payment.
  const notes = order?.notes ?? paymentEntity?.notes;
  const orderId = order?.id ?? payment?.orderId;
  const registrationId = notes?.registrationId;
  if (notes?.purpose !== "kids-creative-challenge" || !orderId || !payment?.id || !registrationId || !isValidObjectId(registrationId)) {
    return NextResponse.json({ ok: true, ignored: true });
  }

  const eventId = request.headers.get("x-razorpay-event-id")?.trim().slice(0, 64) ?? "";
  let claimed = false;
  try {
    await connectToDatabase();
    if (eventId) {
      // Claim the event: the unique index lets exactly one delivery through.
      try {
        await RazorpayWebhookEventModel.create({ eventId, event: event.event });
        claimed = true;
      } catch (err) {
        if (isDuplicateKeyError(err)) return NextResponse.json({ ok: true, duplicate: true });
        throw err;
      }
    }
    if (event.event === "payment.failed") {
      await recordPaymentFailed(orderId, payment);
      return NextResponse.json({ ok: true, result: "failure_recorded" });
    }
    // notes.registrationId is set by our server when creating the order, so it also covers an older order of the same registration.
    const result = await markPaid(registrationId, orderId, payment.id, payment);
    if (result.status === "paid" || result.status === "already_paid") await recordPaymentSucceeded(orderId, payment, "webhook");
    return NextResponse.json({ ok: true, result: result.status });
  } catch (err) {
    console.error("[kids-challenge-payment] webhook error:", err instanceof Error ? err.message : err);
    // Release the claim so Razorpay's retry is processed instead of skipped as a duplicate.
    if (claimed) await RazorpayWebhookEventModel.deleteOne({ eventId }).catch(() => undefined);
    // Non-2xx makes Razorpay retry later.
    return NextResponse.json({ ok: false, error: "unavailable" }, { status: 503 });
  }
}
