/**
 * Kids Challenge confirmation email (SERVER-ONLY): sent once the ₹99 payment is confirmed,
 * tracked on the registration, resendable by admins. Uses the same SMTP transport as every other
 * JaaDeX email (sendWorkshopEmail), so a mail provider change is config-only.
 */
import "server-only";
import { after } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { getAdminAuthConfig } from "@/lib/admin/auth-config";
import { sendWorkshopEmail } from "@/lib/admin/mailer";
import { buildKidsChallengeConfirmationEmail } from "@/lib/kids-challenge/confirmation-email";
import { KIDS_CHALLENGE_FEE_PAISE } from "@/lib/kids-challenge/registration-service";
import { KidsChallengeRegistrationModel, type KidsConfirmationEmailStatus } from "@/models/KidsChallengeRegistration";

/** A pending email older than this is treated as stuck (the process stopped mid-send). */
const STUCK_PENDING_MS = 10 * 60 * 1000;

/** Admin-facing failure reason: one line, capped, never more than the SMTP error message itself. */
function emailErrorReason(err: unknown): string {
  const message = err instanceof Error ? err.message : String(err);
  return message.replace(/\s+/g, " ").trim().slice(0, 300) || "Unknown error";
}

/**
 * Send the confirmation for one PAID registration and record the outcome on it.
 * Never throws for SMTP problems: a failed send is stored as "failed" for admins to resend.
 */
export async function sendKidsConfirmation(registrationId: string): Promise<KidsConfirmationEmailStatus | null> {
  await connectToDatabase();
  const reg = await KidsChallengeRegistrationModel.findOne({ _id: registrationId, paymentStatus: "paid" })
    .select({ parentName: 1, parentEmail: 1, studentName: 1, studentClass: 1, schoolName: 1, amountPaise: 1, razorpayPaymentId: 1, paidAt: 1 })
    .lean();
  if (!reg) return null;
  const { appUrl } = getAdminAuthConfig();
  const email = buildKidsChallengeConfirmationEmail({
    parentName: reg.parentName,
    studentName: reg.studentName,
    studentClass: reg.studentClass,
    schoolName: reg.schoolName,
    amountPaise: reg.amountPaise ?? KIDS_CHALLENGE_FEE_PAISE,
    paymentId: reg.razorpayPaymentId ?? null,
    paidAt: reg.paidAt ? new Date(reg.paidAt) : null,
    challengeUrl: `${appUrl}/kids-creative-challenge`,
    siteUrl: appUrl,
  });
  const now = new Date();
  let set: Record<string, unknown>;
  try {
    const result = await sendWorkshopEmail(reg.parentEmail, email);
    set =
      result === "sent"
        ? { "confirmationEmail.status": "sent", "confirmationEmail.sentAt": now, "confirmationEmail.lastError": null }
        : { "confirmationEmail.status": "skipped", "confirmationEmail.lastError": "Email is not configured on the server (SMTP)." };
  } catch (err) {
    set = { "confirmationEmail.status": "failed", "confirmationEmail.lastError": emailErrorReason(err) };
  }
  await KidsChallengeRegistrationModel.updateOne(
    { _id: registrationId },
    { $set: { ...set, "confirmationEmail.lastAttemptAt": now }, $inc: { "confirmationEmail.attempts": 1 } },
  );
  return set["confirmationEmail.status"] as KidsConfirmationEmailStatus;
}

/**
 * Automatic send after payment. The atomic claim only succeeds for a paid registration that has never
 * had a confirmation, so the checkout callback, webhook and admin sync confirming the same payment
 * still produce exactly one email.
 */
export async function queueKidsConfirmation(registrationId: string): Promise<KidsConfirmationEmailStatus | null> {
  await connectToDatabase();
  const claimed = await KidsChallengeRegistrationModel.findOneAndUpdate(
    { _id: registrationId, paymentStatus: "paid", "confirmationEmail.status": { $exists: false } },
    { $set: { confirmationEmail: { status: "pending", attempts: 0, lastAttemptAt: new Date(), sentAt: null, lastError: null } } },
  )
    .select({ _id: 1 })
    .lean();
  if (!claimed) return null;
  return sendKidsConfirmation(registrationId);
}

/**
 * Call when a payment has just been confirmed (markPaid → "paid"). Sends after the response is out,
 * so SMTP latency never slows the parent and a mail failure never undoes a confirmed payment.
 */
export function scheduleKidsConfirmation(registrationId: string): void {
  after(() =>
    queueKidsConfirmation(registrationId).catch((err) =>
      console.error("[kids-challenge-email] confirmation error:", err instanceof Error ? err.message : err),
    ),
  );
}

export type KidsResendResult = { ok: true; status: KidsConfirmationEmailStatus } | { ok: false; reason: "not_found" | "not_paid" | "in_progress" };

/**
 * Admin resend. Allowed for sent (parent says it never arrived), failed, skipped, untracked and stuck
 * emails. A send already in progress is refused, so a double-click can't send twice.
 */
export async function resendKidsConfirmation(registrationId: string): Promise<KidsResendResult> {
  await connectToDatabase();
  const stuckBefore = new Date(Date.now() - STUCK_PENDING_MS);
  const claimed = await KidsChallengeRegistrationModel.findOneAndUpdate(
    {
      _id: registrationId,
      paymentStatus: "paid",
      $or: [
        { "confirmationEmail.status": { $in: ["sent", "failed", "skipped"] } },
        { "confirmationEmail.status": { $exists: false } },
        { "confirmationEmail.status": "pending", "confirmationEmail.lastAttemptAt": { $lt: stuckBefore } },
        { "confirmationEmail.status": "pending", "confirmationEmail.lastAttemptAt": null },
      ],
    },
    { $set: { "confirmationEmail.status": "pending", "confirmationEmail.lastAttemptAt": new Date() } },
  )
    .select({ _id: 1 })
    .lean();
  if (!claimed) {
    const reg = await KidsChallengeRegistrationModel.findById(registrationId).select({ paymentStatus: 1 }).lean();
    if (!reg) return { ok: false, reason: "not_found" };
    return { ok: false, reason: reg.paymentStatus === "paid" ? "in_progress" : "not_paid" };
  }
  const status = await sendKidsConfirmation(registrationId);
  return status ? { ok: true, status } : { ok: false, reason: "not_found" };
}
