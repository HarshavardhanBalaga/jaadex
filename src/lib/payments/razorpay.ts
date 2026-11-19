/**
 * Razorpay server client (SERVER-ONLY). Plain fetch against the REST API, no SDK.
 * Keys come from .env: RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET, RAZORPAY_WEBHOOK_SECRET (optional).
 * Lazy: nothing throws until a payment is actually attempted.
 */
import "server-only";

const API_BASE = "https://api.razorpay.com/v1";

function env(name: string): string {
  return process.env[name]?.trim() ?? "";
}

export function isRazorpayConfigured(): boolean {
  return Boolean(env("RAZORPAY_KEY_ID") && env("RAZORPAY_KEY_SECRET"));
}

/** Public key id: safe to send to the browser for Checkout. */
export function razorpayKeyId(): string {
  return env("RAZORPAY_KEY_ID");
}

export function razorpayKeySecret(): string {
  return env("RAZORPAY_KEY_SECRET");
}

/** Empty when webhooks are not set up (e.g. local dev). */
export function razorpayWebhookSecret(): string {
  return env("RAZORPAY_WEBHOOK_SECRET");
}

function authHeader(): string {
  return `Basic ${Buffer.from(`${razorpayKeyId()}:${razorpayKeySecret()}`).toString("base64")}`;
}

export type RazorpayOrder = { id: string; amount: number; currency: string; status: string };

/** Create an order. Amount is in paise. Throws with Razorpay's error description on failure (never the keys). */
export async function createRazorpayOrder(input: { amount: number; receipt: string; notes: Record<string, string> }): Promise<RazorpayOrder> {
  const res = await fetch(`${API_BASE}/orders`, {
    method: "POST",
    headers: { Authorization: authHeader(), "Content-Type": "application/json" },
    body: JSON.stringify({ amount: input.amount, currency: "INR", receipt: input.receipt, notes: input.notes }),
    cache: "no-store",
  });
  const data = (await res.json().catch(() => ({}))) as Partial<RazorpayOrder> & { error?: { description?: string } };
  if (!res.ok || !data.id) throw new Error(`Razorpay order failed (${res.status}): ${data.error?.description ?? "unknown error"}`);
  return { id: data.id, amount: data.amount ?? input.amount, currency: data.currency ?? "INR", status: data.status ?? "created" };
}

export type RazorpayPayment = {
  id: string;
  orderId: string;
  amount: number;
  currency: string;
  /** created | authorized | captured | refunded | failed */
  status: string;
  method: string | null;
  feePaise: number | null;
  taxPaise: number | null;
  errorCode: string | null;
  errorDescription: string | null;
  createdAt: Date | null;
};

/** Razorpay payment entity (REST response or webhook payload) → our shape. */
export function toRazorpayPayment(data: Record<string, unknown>): RazorpayPayment {
  const str = (v: unknown) => (typeof v === "string" && v ? v : null);
  const num = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : null);
  return {
    id: str(data.id) ?? "",
    orderId: str(data.order_id) ?? "",
    amount: num(data.amount) ?? -1,
    currency: str(data.currency) ?? "",
    status: str(data.status) ?? "",
    method: str(data.method),
    feePaise: num(data.fee),
    taxPaise: num(data.tax),
    errorCode: str(data.error_code),
    errorDescription: str(data.error_description),
    createdAt: num(data.created_at) !== null ? new Date((data.created_at as number) * 1000) : null,
  };
}

async function getJson(path: string): Promise<Record<string, unknown>> {
  const res = await fetch(`${API_BASE}${path}`, { headers: { Authorization: authHeader() }, cache: "no-store" });
  const data = (await res.json().catch(() => ({}))) as Record<string, unknown> & { error?: { description?: string } };
  if (!res.ok) throw new Error(`Razorpay request failed (${res.status}): ${data.error?.description ?? "unknown error"}`);
  return data;
}

/** Fetch a payment from Razorpay, so amount/currency/status come from Razorpay itself, not the browser. */
export async function fetchRazorpayPayment(paymentId: string): Promise<RazorpayPayment> {
  const payment = toRazorpayPayment(await getJson(`/payments/${encodeURIComponent(paymentId)}`));
  if (!payment.id) throw new Error("Razorpay payment fetch returned no payment");
  return payment;
}

/** Every payment attempt made against one order (used to reconcile a stuck registration). */
export async function fetchOrderPayments(orderId: string): Promise<RazorpayPayment[]> {
  const data = await getJson(`/orders/${encodeURIComponent(orderId)}/payments`);
  const items = Array.isArray(data.items) ? (data.items as Record<string, unknown>[]) : [];
  return items.map(toRazorpayPayment).filter((p) => p.id);
}
