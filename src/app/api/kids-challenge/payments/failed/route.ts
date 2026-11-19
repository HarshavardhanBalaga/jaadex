import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/user/session";
import { checkRateLimit } from "@/lib/admin/rate-limit";
import { findOrderForUser, recordPaymentFailed } from "@/lib/kids-challenge/payment-ledger";
import { fetchRazorpayPayment, isRazorpayConfigured } from "@/lib/payments/razorpay";

export const dynamic = "force-dynamic";

const NO_STORE = { "Cache-Control": "no-store", Pragma: "no-cache" } as const;

const id = z.string().trim().min(1).max(64);
const bodySchema = z.object({ orderId: id, paymentId: id }).strict();

function done(status = 200, body: Record<string, unknown> = { success: true }) {
  return NextResponse.json(body, { status, headers: NO_STORE });
}

/**
 * Checkout reported a failed attempt. The browser only supplies ids: the failure itself is
 * fetched from Razorpay, so nothing the client says is stored as-is. Best effort (payment history only).
 */
export async function POST(request: Request) {
  const user = await getCurrentUser().catch(() => null);
  if (!user) return done(401, { success: false });
  if (!isRazorpayConfigured()) return done(503, { success: false });
  const limited = await checkRateLimit(`kids-challenge-failed:${user.id}`, 20, 60).catch(() => null);
  if (limited && !limited.allowed) return done(429, { success: false });
  let body: unknown = null;
  try {
    body = await request.json();
  } catch {
    return done(400, { success: false });
  }
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) return done(400, { success: false });
  const { orderId, paymentId } = parsed.data;
  try {
    const order = await findOrderForUser(orderId, user.id);
    if (!order) return done(404, { success: false });
    const payment = await fetchRazorpayPayment(paymentId);
    if (payment.orderId === orderId && payment.status === "failed") await recordPaymentFailed(orderId, payment);
    return done();
  } catch (err) {
    console.error("[kids-challenge-payment] failure report error:", err instanceof Error ? err.message : err);
    return done(503, { success: false });
  }
}
