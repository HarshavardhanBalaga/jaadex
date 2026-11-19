/** Pure checks on a Razorpay payment before we accept it. Unit-tested directly. */

export type PaymentFacts = { amount: number; currency: string; status: string; orderId: string };

export type PaymentCheck = { ok: true } | { ok: false; reason: "order_mismatch" | "amount_mismatch" | "currency_mismatch" | "not_captured" };

/** Accept only a captured INR payment of exactly the expected amount (paise) for the expected order. */
export function checkPayment(payment: PaymentFacts, expected: { amount: number; orderId: string }): PaymentCheck {
  if (payment.orderId !== expected.orderId) return { ok: false, reason: "order_mismatch" };
  if (payment.currency !== "INR") return { ok: false, reason: "currency_mismatch" };
  if (payment.amount !== expected.amount) return { ok: false, reason: "amount_mismatch" };
  if (payment.status !== "captured") return { ok: false, reason: "not_captured" };
  return { ok: true };
}
