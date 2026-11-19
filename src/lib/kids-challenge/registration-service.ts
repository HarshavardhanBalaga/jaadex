/** Kids Creative Challenge registration rules (SERVER-ONLY). Routes handle auth, rate limits and validation, then call in here. */
import "server-only";
import { Types } from "mongoose";
import { connectToDatabase } from "@/lib/mongodb";
import { isDuplicateKeyError } from "@/lib/workshops/queries";
import { checkPayment, type PaymentCheck, type PaymentFacts } from "@/lib/payments/payment-checks";
import type { KidsChallengeRegistrationInput } from "@/lib/kids-challenge/registration-validation";
import type { CurrentUser } from "@/lib/user/session";
import { KidsChallengeRegistrationModel, STUDENT_NAME_COLLATION, type KidsChallengePaymentStatus } from "@/models/KidsChallengeRegistration";

/** Entry fee in paise (₹99). Fixed on the server: the browser never chooses the amount. */
export const KIDS_CHALLENGE_FEE_PAISE = 9900;

export type KidsChallengeRegisterResult =
  | { ok: true; registrationId: string }
  /** This student is already registered and paid. */
  | { ok: false; reason: "already_registered" }
  /** This student is registered but unpaid: the client should take payment for this registration. */
  | { ok: false; reason: "payment_pending"; registrationId: string };

async function existingFor(userId: Types.ObjectId, studentName: string): Promise<KidsChallengeRegisterResult | null> {
  const existing = await KidsChallengeRegistrationModel.findOne({ userId, studentName })
    .collation(STUDENT_NAME_COLLATION)
    .select({ paymentStatus: 1 })
    .lean();
  if (!existing) return null;
  return existing.paymentStatus === "paid"
    ? { ok: false, reason: "already_registered" }
    : { ok: false, reason: "payment_pending", registrationId: String(existing._id) };
}

/** Save one student's registration (payment pending). The unique index refuses the same student twice from one account. */
export async function registerForKidsChallenge(user: CurrentUser, input: KidsChallengeRegistrationInput): Promise<KidsChallengeRegisterResult> {
  await connectToDatabase();
  const userId = new Types.ObjectId(user.id);
  const existing = await existingFor(userId, input.studentName);
  if (existing) return existing;
  try {
    const created = await KidsChallengeRegistrationModel.create({
      userId,
      parentName: input.parentName,
      parentEmail: input.parentEmail,
      parentPhone: input.parentPhone,
      studentName: input.studentName,
      studentClass: input.studentClass,
      studentAge: input.studentAge,
      schoolName: input.schoolName,
      city: input.city,
      state: input.state,
      consent: input.consent,
      paymentStatus: "pending",
      amountPaise: KIDS_CHALLENGE_FEE_PAISE,
    });
    return { ok: true, registrationId: String(created._id) };
  } catch (err) {
    // A racing double submit: the unique index caught it.
    if (isDuplicateKeyError(err)) return (await existingFor(userId, input.studentName)) ?? { ok: false, reason: "already_registered" };
    throw err;
  }
}

export type PayableRegistration = { id: string; parentName: string; parentEmail: string; parentPhone: string; studentName: string; amountPaise: number };

export type PayableResult = { ok: true; registration: PayableRegistration } | { ok: false; reason: "not_found" | "already_paid" };

/** A registration of this user that can still be paid for. */
export async function findPayableRegistration(user: CurrentUser, registrationId: string): Promise<PayableResult> {
  await connectToDatabase();
  const d = await KidsChallengeRegistrationModel.findOne({ _id: registrationId, userId: new Types.ObjectId(user.id) })
    .select({ parentName: 1, parentEmail: 1, parentPhone: 1, studentName: 1, amountPaise: 1, paymentStatus: 1 })
    .lean();
  if (!d) return { ok: false, reason: "not_found" };
  if (d.paymentStatus === "paid") return { ok: false, reason: "already_paid" };
  return {
    ok: true,
    registration: {
      id: String(d._id),
      parentName: d.parentName,
      parentEmail: d.parentEmail,
      parentPhone: d.parentPhone,
      studentName: d.studentName,
      amountPaise: d.amountPaise ?? KIDS_CHALLENGE_FEE_PAISE,
    },
  };
}

/** Remember the latest Razorpay order for a still-unpaid registration. */
export async function attachOrder(registrationId: string, orderId: string): Promise<void> {
  await connectToDatabase();
  await KidsChallengeRegistrationModel.updateOne({ _id: registrationId, paymentStatus: "pending" }, { $set: { razorpayOrderId: orderId } });
}

/** The registration (of this user) whose latest order is `orderId`, or null. */
export async function findByOrder(user: CurrentUser, orderId: string): Promise<{ id: string; paymentStatus: KidsChallengePaymentStatus } | null> {
  await connectToDatabase();
  const d = await KidsChallengeRegistrationModel.findOne({ razorpayOrderId: orderId, userId: new Types.ObjectId(user.id) })
    .select({ paymentStatus: 1 })
    .lean();
  return d ? { id: String(d._id), paymentStatus: d.paymentStatus } : null;
}

export type MarkPaidResult =
  | { status: "paid" }
  | { status: "already_paid" }
  | { status: "not_found" }
  | { status: "rejected"; reason: Exclude<PaymentCheck, { ok: true }>["reason"] };

/**
 * Mark a registration paid after a signature-verified payment.
 * 1. Already paid → nothing to do (no second write, original payment id kept).
 * 2. The payment must be captured, in INR, for exactly the stored fee, on an order of ours.
 * 3. The write is one atomic conditional update on a pending row, so the checkout callback and
 *    the webhook racing each other can't both apply it.
 */
export async function markPaid(registrationId: string, expectedOrderId: string, paymentId: string, payment: PaymentFacts): Promise<MarkPaidResult> {
  await connectToDatabase();
  const reg = await KidsChallengeRegistrationModel.findById(registrationId).select({ paymentStatus: 1, amountPaise: 1 }).lean();
  if (!reg) return { status: "not_found" };
  if (reg.paymentStatus === "paid") return { status: "already_paid" };
  const expectedAmount = reg.amountPaise ?? KIDS_CHALLENGE_FEE_PAISE;
  const checked = checkPayment(payment, { amount: expectedAmount, orderId: expectedOrderId });
  if (!checked.ok) {
    console.warn("[kids-challenge-payment] payment rejected:", checked.reason, "registration", registrationId, "payment", paymentId);
    return { status: "rejected", reason: checked.reason };
  }
  const result = await KidsChallengeRegistrationModel.updateOne(
    { _id: registrationId, paymentStatus: "pending" },
    { $set: { paymentStatus: "paid", razorpayOrderId: payment.orderId, razorpayPaymentId: paymentId, paidAt: new Date() } },
  );
  // 0 modified = another request marked it paid between our read and this write.
  return result.modifiedCount === 1 ? { status: "paid" } : { status: "already_paid" };
}

export type KidsChallengeRegistrationRow = {
  id: string;
  parentName: string;
  parentEmail: string;
  parentPhone: string;
  studentName: string;
  studentClass: number;
  studentAge: number;
  schoolName: string;
  city: string;
  state: string;
  paymentStatus: KidsChallengePaymentStatus;
  razorpayPaymentId: string | null;
  paidAt: Date | null;
  createdAt: Date;
  emailStatus: "pending" | "sent" | "failed" | "skipped" | null;
  emailSentAt: Date | null;
};

/** All registrations, newest first. Used by the admin dashboard and the CSV export. */
export async function listKidsChallengeRegistrations(): Promise<KidsChallengeRegistrationRow[]> {
  await connectToDatabase();
  const docs = await KidsChallengeRegistrationModel.find({})
    .select({ userId: 0, consent: 0, updatedAt: 0, __v: 0 })
    .sort({ createdAt: -1 })
    .lean();
  return docs.map((d) => ({
    id: String(d._id),
    parentName: d.parentName,
    parentEmail: d.parentEmail,
    parentPhone: d.parentPhone,
    studentName: d.studentName,
    studentClass: d.studentClass,
    studentAge: d.studentAge,
    schoolName: d.schoolName,
    city: d.city,
    state: d.state,
    paymentStatus: d.paymentStatus,
    razorpayPaymentId: d.razorpayPaymentId ?? null,
    paidAt: d.paidAt ? new Date(d.paidAt) : null,
    createdAt: new Date(d.createdAt),
    emailStatus: d.confirmationEmail?.status ?? null,
    emailSentAt: d.confirmationEmail?.sentAt ? new Date(d.confirmationEmail.sentAt) : null,
  }));
}

/** This account's registrations, oldest first, split into paid and awaiting payment. */
export async function userKidsChallengeRegistrations(user: CurrentUser): Promise<{ paid: string[]; pending: { id: string; studentName: string }[] }> {
  await connectToDatabase();
  const docs = await KidsChallengeRegistrationModel.find({ userId: new Types.ObjectId(user.id) })
    .select({ studentName: 1, paymentStatus: 1 })
    .sort({ createdAt: 1 })
    .lean();
  return {
    paid: docs.filter((d) => d.paymentStatus === "paid").map((d) => d.studentName),
    pending: docs.filter((d) => d.paymentStatus !== "paid").map((d) => ({ id: String(d._id), studentName: d.studentName })),
  };
}
