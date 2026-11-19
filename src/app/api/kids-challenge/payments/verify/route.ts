import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/user/session";
import { checkRateLimit } from "@/lib/admin/rate-limit";
import { findByOrder, markPaid } from "@/lib/kids-challenge/registration-service";
import { fetchRazorpayPayment, isRazorpayConfigured, razorpayKeySecret } from "@/lib/payments/razorpay";
import { verifyPaymentSignature } from "@/lib/payments/razorpay-signature";
import { recordPaymentSucceeded } from "@/lib/kids-challenge/payment-ledger";
import { scheduleKidsConfirmation } from "@/lib/kids-challenge/confirmation-service";

export const dynamic = "force-dynamic";

const NO_STORE = { "Cache-Control": "no-store", Pragma: "no-cache" } as const;

function fail(code: string, message: string, status: number): NextResponse {
  return NextResponse.json({ success: false, error: { code, message } }, { status, headers: NO_STORE });
}

const id = z.string().trim().min(1).max(64);
const bodySchema = z.object({ razorpay_order_id: id, razorpay_payment_id: id, razorpay_signature: z.string().trim().min(1).max(128) }).strict();

/**
 * Confirm a Checkout payment. The order must be the one we stored for this user's registration,
 * the signature is recomputed with our key secret over OUR order id, and the payment is fetched
 * from Razorpay to confirm it is captured, INR and exactly the fee before anything is marked paid.
 */
export async function POST(request: Request) {
  const user = await getCurrentUser().catch(() => null);
  if (!user) return fail("unauthenticated", "Please log in.", 401);
  if (!isRazorpayConfigured()) return fail("payments_unavailable", "Online payment is not available right now.", 503);
  const limited = await checkRateLimit(`kids-challenge-verify:${user.id}`, 10, 60).catch(() => null);
  if (limited && !limited.allowed) return fail("rate_limited", "Too many attempts. Try again later.", 429);
  let body: unknown = null;
  try {
    body = await request.json();
  } catch {
    return fail("invalid_request", "Invalid request body.", 400);
  }
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) return fail("invalid_request", "Invalid payment details.", 400);
  const { razorpay_order_id: orderId, razorpay_payment_id: paymentId, razorpay_signature: signature } = parsed.data;
  try {
    const reg = await findByOrder(user, orderId);
    if (!reg) return fail("not_found", "We couldn't match this payment to your registration.", 404);
    if (reg.paymentStatus === "paid") return NextResponse.json({ success: true, message: "Payment confirmed." }, { headers: NO_STORE });
    if (!verifyPaymentSignature(orderId, paymentId, signature, razorpayKeySecret())) {
      console.warn("[kids-challenge-payment] signature mismatch for order", orderId);
      return fail("invalid_signature", "Payment could not be verified. If money was deducted, contact us and we'll sort it out.", 400);
    }
    const payment = await fetchRazorpayPayment(paymentId);
    const result = await markPaid(reg.id, orderId, paymentId, payment);
    if (result.status === "paid" || result.status === "already_paid") {
      await recordPaymentSucceeded(orderId, payment, "checkout");
      // Only the first confirmation of this payment sends the email (the claim also dedupes).
      if (result.status === "paid") scheduleKidsConfirmation(reg.id);
      return NextResponse.json({ success: true, message: "Payment confirmed." }, { headers: NO_STORE });
    }
    if (result.status === "rejected" && result.reason === "not_captured") {
      // Authorised but not captured yet: the order.paid webhook confirms it once Razorpay captures.
      return fail("payment_processing", "Your payment is being processed. Refresh this page in a few minutes to see it confirmed.", 202);
    }
    return fail("payment_mismatch", "Payment could not be verified. If money was deducted, contact us and we'll sort it out.", 400);
  } catch (err) {
    console.error("[kids-challenge-payment] verify unavailable:", err instanceof Error ? err.message : err);
    return fail("unavailable", "Service temporarily unavailable. Your payment is safe; refresh the page in a moment.", 503);
  }
}
