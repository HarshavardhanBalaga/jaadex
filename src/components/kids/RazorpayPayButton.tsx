"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/Icon";

const CHECKOUT_SRC = "https://checkout.razorpay.com/v1/checkout.js";
const REGISTER_PATH = "/kids-creative-challenge/register";

type CheckoutSuccess = { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string };
type CheckoutOptions = {
  key: string;
  amount: number;
  currency: string;
  order_id: string;
  name: string;
  description: string;
  prefill: { name: string; email: string; contact: string };
  theme: { color: string };
  handler: (response: CheckoutSuccess) => void;
  modal: { ondismiss: () => void };
};
type PaymentFailedResponse = { error?: { description?: string; metadata?: { order_id?: string; payment_id?: string } } };
type RazorpayInstance = { open: () => void; on: (event: "payment.failed", cb: (response: PaymentFailedResponse) => void) => void };

declare global {
  interface Window {
    Razorpay?: new (options: CheckoutOptions) => RazorpayInstance;
  }
}

let checkoutScript: Promise<void> | null = null;

/** Load Razorpay Checkout once per page; a failed load can be retried. */
function loadCheckout(): Promise<void> {
  if (window.Razorpay) return Promise.resolve();
  checkoutScript ??= new Promise<void>((resolve, reject) => {
    const script = document.createElement("script");
    script.src = CHECKOUT_SRC;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => {
      checkoutScript = null;
      script.remove();
      reject(new Error("checkout_load_failed"));
    };
    document.body.appendChild(script);
  });
  return checkoutScript;
}

async function postJson(url: string, body: unknown) {
  const res = await fetch(url, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
  const data = (await res.json().catch(() => ({}))) as Record<string, unknown> & { success?: boolean; error?: { code?: string; message?: string } };
  return { res, data };
}

/**
 * "Pay ₹99" for one registration: create the order on our server → open Razorpay Checkout →
 * send the result back for signature verification. Only the server decides a payment is valid.
 */
export function RazorpayPayButton({ registrationId, onPaid, label = "Pay ₹99" }: { registrationId: string; onPaid?: () => void; label?: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  async function pay() {
    if (busy) return;
    setBusy(true);
    setMessage("");
    try {
      const [{ res, data }] = await Promise.all([postJson("/api/kids-challenge/payments/order", { registrationId }), loadCheckout()]);
      if (res.status === 401) {
        router.push(`/login?next=${encodeURIComponent(REGISTER_PATH)}`);
        return;
      }
      if (data.error?.code === "already_paid") {
        onPaid?.();
        router.refresh();
        return;
      }
      if (!res.ok || data.success !== true || !window.Razorpay) {
        setMessage(data.error?.message ?? "Couldn't start the payment. Try again.");
        setBusy(false);
        return;
      }
      const order = data as unknown as {
        keyId: string;
        orderId: string;
        amount: number;
        currency: string;
        prefill: CheckoutOptions["prefill"];
        studentName: string;
      };
      const checkout = new window.Razorpay({
        key: order.keyId,
        amount: order.amount,
        currency: order.currency,
        order_id: order.orderId,
        name: "JaaDeX",
        description: `Kids Creative Challenge – ${order.studentName}`,
        prefill: order.prefill,
        theme: { color: "#f4690d" },
        handler: async (response) => {
          try {
            const verified = await postJson("/api/kids-challenge/payments/verify", response);
            if (verified.res.ok && verified.data.success === true) {
              onPaid?.();
              router.refresh();
              return;
            }
            setMessage(verified.data.error?.message ?? "We couldn't confirm the payment. Refresh the page in a moment.");
          } catch {
            setMessage("We couldn't confirm the payment. Refresh the page in a moment.");
          } finally {
            setBusy(false);
          }
        },
        modal: {
          ondismiss: () => {
            setBusy(false);
            setMessage("Payment not completed. Your registration is saved — pay any time to confirm it.");
          },
        },
      });
      checkout.on("payment.failed", (response) => {
        // Payment history: the server fetches the failure from Razorpay; this only passes the ids.
        const meta = response.error?.metadata;
        if (meta?.order_id && meta.payment_id) {
          void postJson("/api/kids-challenge/payments/failed", { orderId: meta.order_id, paymentId: meta.payment_id }).catch(() => undefined);
        }
        // Checkout lets the parent retry inside the modal; this note stays until they succeed or close it.
        setMessage(response.error?.description ? `Payment failed: ${response.error.description}` : "Payment failed. Please try again.");
      });
      checkout.open();
    } catch {
      setMessage("Couldn't load the payment window. Check your connection and try again.");
      setBusy(false);
    }
  }

  return (
    <div className="grid justify-items-start gap-2">
      <button
        type="button"
        onClick={pay}
        disabled={busy}
        className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-full bg-orange px-6 py-[13px] text-center font-black text-white shadow-pop-orange transition-transform duration-200 hover:-translate-y-0.5 disabled:cursor-wait disabled:opacity-60 motion-reduce:transition-none"
      >
        {busy && <Icon name="loader" size={18} className="inline-block animate-spin" />}
        {busy ? "Processing…" : label}
      </button>
      {message ? (
        <p role="alert" className="text-[13px] font-bold text-[#a3410a]">
          {message}
        </p>
      ) : null}
    </div>
  );
}
