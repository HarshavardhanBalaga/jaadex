/**
 * Kids Challenge payment ledger writes (SERVER-ONLY). Every Razorpay order gets one row; checkout,
 * webhook and admin sync update it. All writes are single atomic conditional updates, so the same
 * event arriving twice (checkout callback + webhook, or a redelivery) never double-counts.
 */
import "server-only";
import { Types } from "mongoose";
import { connectToDatabase } from "@/lib/mongodb";
import type { RazorpayPayment } from "@/lib/payments/razorpay";
import { KidsChallengePaymentModel, type KidsChallengePaymentSource } from "@/models/KidsChallengePayment";

export type LedgerRegistration = {
  id: string;
  userId: string;
  studentName: string;
  parentName: string;
  parentEmail: string;
  parentPhone: string;
};

/** A new order was created for a registration. */
export async function recordOrderCreated(reg: LedgerRegistration, orderId: string, amountPaise: number, currency: string): Promise<void> {
  await connectToDatabase();
  await KidsChallengePaymentModel.create({
    registrationId: new Types.ObjectId(reg.id),
    userId: new Types.ObjectId(reg.userId),
    orderId,
    amountPaise,
    currency,
    status: "created",
    studentName: reg.studentName,
    parentName: reg.parentName,
    parentEmail: reg.parentEmail,
    parentPhone: reg.parentPhone,
  });
}

/** Razorpay's fee fields exactly as returned: a number (0 is a real zero fee) or absent. */
function feeFields(payment: RazorpayPayment): { feePaise?: number; taxPaise?: number } {
  return {
    ...(payment.feePaise !== null ? { feePaise: payment.feePaise } : {}),
    ...(payment.taxPaise !== null ? { taxPaise: payment.taxPaise } : {}),
  };
}

/**
 * A verified, captured payment. Only a not-yet-paid row changes, so the first confirmation wins.
 * Fees are stored only when Razorpay returned them; null in the ledger means "not available yet", never zero.
 * A later confirmation of the same payment (webhook, admin sync) fills in fees that were missing.
 */
export async function recordPaymentSucceeded(orderId: string, payment: RazorpayPayment, source: KidsChallengePaymentSource): Promise<void> {
  await connectToDatabase();
  await KidsChallengePaymentModel.updateOne(
    { orderId, status: { $ne: "paid" } },
    {
      $set: {
        status: "paid",
        paymentId: payment.id,
        method: payment.method,
        ...feeFields(payment),
        confirmedBy: source,
        paidAt: new Date(),
      },
    },
  );
  await backfillFees(orderId, payment);
}

/** Fill fees that were unavailable at confirmation time. Only for the same payment, and never overwrites a known fee. */
async function backfillFees(orderId: string, payment: RazorpayPayment): Promise<void> {
  if (payment.feePaise !== null) {
    await KidsChallengePaymentModel.updateOne({ orderId, status: "paid", paymentId: payment.id, feePaise: null }, { $set: { feePaise: payment.feePaise } });
  }
  if (payment.taxPaise !== null) {
    await KidsChallengePaymentModel.updateOne({ orderId, status: "paid", paymentId: payment.id, taxPaise: null }, { $set: { taxPaise: payment.taxPaise } });
  }
}

/**
 * A failed attempt (Razorpay-confirmed: fetched from the API or from a signed webhook).
 * Each Razorpay payment id counts once, however many times it is reported. A paid order is never downgraded.
 */
export async function recordPaymentFailed(orderId: string, payment: RazorpayPayment): Promise<void> {
  await connectToDatabase();
  await KidsChallengePaymentModel.updateOne(
    { orderId, status: { $ne: "paid" }, failedPaymentIds: { $ne: payment.id } },
    {
      $set: {
        status: "failed",
        paymentId: payment.id,
        method: payment.method,
        errorCode: payment.errorCode,
        errorDescription: payment.errorDescription?.slice(0, 300) ?? null,
        lastFailedAt: new Date(),
      },
      $addToSet: { failedPaymentIds: payment.id },
      $inc: { failedAttempts: 1 },
    },
  );
}

/** The ledger row for an order, if it belongs to this user. */
export async function findOrderForUser(orderId: string, userId: string): Promise<{ registrationId: string; status: string } | null> {
  await connectToDatabase();
  const d = await KidsChallengePaymentModel.findOne({ orderId, userId: new Types.ObjectId(userId) }).select({ registrationId: 1, status: 1 }).lean();
  return d ? { registrationId: String(d.registrationId), status: d.status } : null;
}
