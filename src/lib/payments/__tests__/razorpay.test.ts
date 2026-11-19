/**
 * Razorpay payment tests (no network, no DB). Signature checks are tested directly;
 * the payment routes' guarantees are asserted via source structure.
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { verifyPaymentSignature, verifyWebhookSignature } from "../razorpay-signature.ts";
import { checkPayment } from "../payment-checks.ts";

const src = (p: string): string => readFileSync(join(process.cwd(), p), "utf8");
const hmac = (data: string, secret: string) => createHmac("sha256", secret).update(data).digest("hex");

describe("razorpay checkout signature", () => {
  const secret = "test_key_secret";
  const good = hmac("order_ABC|pay_XYZ", secret);

  it("accepts the signature Razorpay computes over order_id|payment_id", () => {
    assert.equal(verifyPaymentSignature("order_ABC", "pay_XYZ", good, secret), true);
    assert.equal(verifyPaymentSignature("order_ABC", "pay_XYZ", good.toUpperCase(), secret), true);
  });

  it("rejects tampered ids, wrong secret and junk signatures", () => {
    assert.equal(verifyPaymentSignature("order_OTHER", "pay_XYZ", good, secret), false);
    assert.equal(verifyPaymentSignature("order_ABC", "pay_OTHER", good, secret), false);
    assert.equal(verifyPaymentSignature("order_ABC", "pay_XYZ", good, "wrong_secret"), false);
    assert.equal(verifyPaymentSignature("order_ABC", "pay_XYZ", "", secret), false);
    assert.equal(verifyPaymentSignature("order_ABC", "pay_XYZ", "zz" + good.slice(2), secret), false);
    assert.equal(verifyPaymentSignature("order_ABC", "pay_XYZ", good.slice(0, 10), secret), false);
  });
});

describe("razorpay webhook signature", () => {
  it("checks the HMAC over the exact raw body", () => {
    const body = '{"event":"order.paid"}';
    const sig = hmac(body, "whsec");
    assert.equal(verifyWebhookSignature(body, sig, "whsec"), true);
    assert.equal(verifyWebhookSignature(body + " ", sig, "whsec"), false);
    assert.equal(verifyWebhookSignature(body, sig, "other"), false);
  });
});

describe("payment amount / currency / status check", () => {
  const expected = { amount: 9900, orderId: "order_ABC" };
  const good = { amount: 9900, currency: "INR", status: "captured", orderId: "order_ABC" };

  it("accepts a captured ₹99 INR payment for our order", () => {
    assert.deepEqual(checkPayment(good, expected), { ok: true });
  });

  it("rejects a wrong amount, currency, order or an uncaptured payment", () => {
    assert.deepEqual(checkPayment({ ...good, amount: 100 }, expected), { ok: false, reason: "amount_mismatch" });
    assert.deepEqual(checkPayment({ ...good, amount: 99000 }, expected), { ok: false, reason: "amount_mismatch" });
    assert.deepEqual(checkPayment({ ...good, currency: "USD" }, expected), { ok: false, reason: "currency_mismatch" });
    assert.deepEqual(checkPayment({ ...good, orderId: "order_OTHER" }, expected), { ok: false, reason: "order_mismatch" });
    assert.deepEqual(checkPayment({ ...good, status: "authorized" }, expected), { ok: false, reason: "not_captured" });
    assert.deepEqual(checkPayment({ ...good, status: "failed" }, expected), { ok: false, reason: "not_captured" });
  });
});

describe("payment route guarantees", () => {
  it("the fee is a server constant of ₹99 and the order route never reads an amount from the request", () => {
    assert.match(src("src/lib/kids-challenge/registration-service.ts"), /KIDS_CHALLENGE_FEE_PAISE = 9900/);
    const order = src("src/app/api/kids-challenge/payments/order/route.ts");
    assert.match(order, /getCurrentUser\(\)/);
    assert.match(order, /registrationId: z\.string\(\)/);
    assert.doesNotMatch(order, /parsed\.data\.amount/);
  });

  it("verify requires a user, matches OUR stored order, and checks the signature before marking paid", () => {
    const verify = src("src/app/api/kids-challenge/payments/verify/route.ts");
    assert.match(verify, /getCurrentUser\(\)/);
    assert.match(verify, /findByOrder\(user, orderId\)/);
    assert.ok(verify.indexOf("verifyPaymentSignature(") < verify.indexOf("fetchRazorpayPayment("));
    assert.ok(verify.indexOf("fetchRazorpayPayment(") < verify.indexOf("markPaid("));
  });

  it("webhook checks X-Razorpay-Signature over the raw body before parsing", () => {
    const hook = src("src/app/api/kids-challenge/payments/webhook/route.ts");
    assert.match(hook, /request\.text\(\)/);
    assert.match(hook, /x-razorpay-signature/);
    assert.ok(hook.indexOf("verifyWebhookSignature(") < hook.indexOf("JSON.parse("));
  });

  it("webhook claims each x-razorpay-event-id under a unique index before processing", () => {
    const hook = src("src/app/api/kids-challenge/payments/webhook/route.ts");
    assert.match(hook, /x-razorpay-event-id/);
    assert.ok(hook.indexOf("RazorpayWebhookEventModel.create(") < hook.indexOf("markPaid("));
    assert.match(src("src/models/RazorpayWebhookEvent.ts"), /index\(\{ eventId: 1 \}, \{ unique: true \}\)/);
  });

  it("markPaid skips paid rows, checks amount/currency, then updates atomically", () => {
    const service = src("src/lib/kids-challenge/registration-service.ts");
    const fn = service.slice(service.indexOf("export async function markPaid("));
    assert.ok(fn.indexOf(`"already_paid"`) < fn.indexOf("checkPayment("));
    assert.ok(fn.indexOf("checkPayment(") < fn.indexOf("updateOne("));
    assert.match(fn, /updateOne\(\s*\{ _id: registrationId, paymentStatus: "pending" \}/);
    assert.match(fn, /modifiedCount === 1/);
  });

  it("order receipt is the registration id", () => {
    assert.match(src("src/app/api/kids-challenge/payments/order/route.ts"), /receipt: reg\.id/);
  });
});
