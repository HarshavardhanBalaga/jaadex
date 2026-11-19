import { NextResponse } from "next/server";
import { isValidObjectId } from "mongoose";
import { z } from "zod";
import { getCurrentUser } from "@/lib/user/session";
import { checkRateLimit } from "@/lib/admin/rate-limit";
import { attachOrder, findPayableRegistration } from "@/lib/kids-challenge/registration-service";
import { createRazorpayOrder, isRazorpayConfigured, razorpayKeyId } from "@/lib/payments/razorpay";
import { recordOrderCreated } from "@/lib/kids-challenge/payment-ledger";

export const dynamic = "force-dynamic";

const NO_STORE = { "Cache-Control": "no-store", Pragma: "no-cache" } as const;

function fail(code: string, message: string, status: number): NextResponse {
  return NextResponse.json({ success: false, error: { code, message } }, { status, headers: NO_STORE });
}

const bodySchema = z.object({ registrationId: z.string().refine(isValidObjectId) }).strict();

/**
 * Create a Razorpay order for one of the signed-in user's unpaid registrations.
 * The amount comes from the stored registration, never from the browser.
 */
export async function POST(request: Request) {
  const user = await getCurrentUser().catch(() => null);
  if (!user) return fail("unauthenticated", "Please log in to complete the payment.", 401);
  if (!isRazorpayConfigured()) return fail("payments_unavailable", "Online payment is not available right now. Please try again later.", 503);
  const limited = await checkRateLimit(`kids-challenge-order:${user.id}`, 10, 60).catch(() => null);
  if (limited && !limited.allowed) return fail("rate_limited", "Too many attempts. Try again later.", 429);
  let body: unknown = null;
  try {
    body = await request.json();
  } catch {
    return fail("invalid_request", "Invalid request body.", 400);
  }
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) return fail("invalid_request", "Invalid registration.", 400);
  try {
    const found = await findPayableRegistration(user, parsed.data.registrationId);
    if (!found.ok) {
      return found.reason === "already_paid"
        ? fail("already_paid", "This registration is already paid.", 409)
        : fail("not_found", "Registration not found.", 404);
    }
    const reg = found.registration;
    const order = await createRazorpayOrder({
      amount: reg.amountPaise,
      receipt: reg.id,
      notes: { registrationId: reg.id, purpose: "kids-creative-challenge" },
    });
    await attachOrder(reg.id, order.id);
    // Payment history: one ledger row per order.
    await recordOrderCreated({ ...reg, userId: user.id }, order.id, order.amount, order.currency);
    return NextResponse.json(
      {
        success: true,
        keyId: razorpayKeyId(),
        orderId: order.id,
        amount: order.amount,
        currency: order.currency,
        prefill: { name: reg.parentName, email: reg.parentEmail, contact: `+91${reg.parentPhone}` },
        studentName: reg.studentName,
      },
      { headers: NO_STORE },
    );
  } catch (err) {
    console.error("[kids-challenge-payment] order unavailable:", err instanceof Error ? err.message : err);
    return fail("unavailable", "Couldn't start the payment. Try again in a moment.", 503);
  }
}
