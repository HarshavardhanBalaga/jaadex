/** Razorpay signature checks. Pure (node:crypto only), so it is unit-tested directly. */
import { createHmac, timingSafeEqual } from "node:crypto";

function hmacHex(data: string, secret: string): string {
  return createHmac("sha256", secret).update(data).digest("hex");
}

/** Constant-time compare of two hex strings; false for any length or format mismatch. */
function safeEqualHex(expected: string, received: string): boolean {
  if (!/^[0-9a-f]+$/i.test(received) || received.length !== expected.length) return false;
  return timingSafeEqual(Buffer.from(expected, "hex"), Buffer.from(received.toLowerCase(), "hex"));
}

/**
 * Checkout success signature: HMAC_SHA256(order_id + "|" + payment_id, key_secret).
 * `orderId` must be the id stored on our side, never the one the browser sent back.
 */
export function verifyPaymentSignature(orderId: string, paymentId: string, signature: string, keySecret: string): boolean {
  return safeEqualHex(hmacHex(`${orderId}|${paymentId}`, keySecret), signature);
}

/** Webhook signature (X-Razorpay-Signature): HMAC_SHA256(raw request body, webhook_secret). */
export function verifyWebhookSignature(rawBody: string, signature: string, webhookSecret: string): boolean {
  return safeEqualHex(hmacHex(rawBody, webhookSecret), signature);
}
