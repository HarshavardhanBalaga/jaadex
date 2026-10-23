/**
 * Password-reset service (SERVER-ONLY).
 * Flow: forgot → OTP emailed to the account's own address → reset with
 * OTP + new password. Responses never reveal whether an email exists.
 * A successful reset consumes the OTP, replaces the password hash and
 * revokes every session so the new password takes effect everywhere.
 */
import "server-only";
import { connectToDatabase } from "@/lib/mongodb";
import { AdminModel } from "@/models/Admin";
import { AdminOtpModel } from "@/models/AdminOtp";
import { getAdminAuthConfig } from "./auth-config";
import { generateOtp, hashOtp, verifyOtpHash } from "./otp";
import { hashPassword } from "./password";
import { sendPasswordResetOtp } from "./mailer";
import { revokeAllSessions } from "./session-revoke";

export type ForgotOutcome =
  | { outcome: "sent"; resendAvailableInSeconds: number }
  | { outcome: "cooldown"; resendAvailableInSeconds: number };

export async function requestPasswordReset(email: string): Promise<ForgotOutcome> {
  const c = getAdminAuthConfig();
  const normalized = email.trim().toLowerCase();
  await connectToDatabase();
  const admin = await AdminModel.findOne({ email: normalized, status: "active" })
    .select({ _id: 1, email: 1 })
    .lean();
  if (!admin) {
    // Unknown email: same shape, no email sent — account enumeration stays shut.
    return { outcome: "sent", resendAvailableInSeconds: c.otpResendCooldownSeconds };
  }
  const now = new Date();
  const existing = await AdminOtpModel.findOne({ adminId: admin._id, purpose: "password-reset", status: "active" })
    .select({ lastSentAt: 1, resendCount: 1, expiresAt: 1 })
    .lean();
  if (existing) {
    const sinceSend = (now.getTime() - new Date(existing.lastSentAt).getTime()) / 1000;
    if (sinceSend < c.otpResendCooldownSeconds) {
      return {
        outcome: "cooldown",
        resendAvailableInSeconds: Math.ceil(c.otpResendCooldownSeconds - sinceSend),
      };
    }
    if (existing.resendCount < c.otpMaxResends) {
      const otp = generateOtp(c.otpLength);
      await AdminOtpModel.updateOne(
        { _id: existing._id },
        {
          $set: {
            otpHash: hashOtp(otp, c.otpPepper),
            expiresAt: new Date(now.getTime() + c.otpExpiresMinutes * 60_000),
            attempts: 0,
            status: "active",
            lastSentAt: now,
          },
          $inc: { resendCount: 1 },
        },
      );
      await sendPasswordResetOtp(admin.email, otp, c.otpExpiresMinutes);
      return { outcome: "sent", resendAvailableInSeconds: c.otpResendCooldownSeconds };
    }
    return { outcome: "sent", resendAvailableInSeconds: c.otpResendCooldownSeconds };
  }
  const otp = generateOtp(c.otpLength);
  await AdminOtpModel.create({
    adminId: admin._id,
    purpose: "password-reset",
    otpHash: hashOtp(otp, c.otpPepper),
    expiresAt: new Date(now.getTime() + c.otpExpiresMinutes * 60_000),
    attempts: 0,
    maxAttempts: c.otpMaxAttempts,
    resendCount: 0,
    lastSentAt: now,
    status: "active",
  });
  await sendPasswordResetOtp(admin.email, otp, c.otpExpiresMinutes);
  return { outcome: "sent", resendAvailableInSeconds: c.otpResendCooldownSeconds };
}

export type ResetOutcome =
  | { outcome: "reset" }
  | { outcome: "invalid"; attemptsLeft?: number }
  | { outcome: "expired" }
  | { outcome: "locked" }
  | { outcome: "not_found" };

export async function resetPasswordWithOtp(email: string, otp: string, newPassword: string): Promise<ResetOutcome> {
  const c = getAdminAuthConfig();
  const normalized = email.trim().toLowerCase();
  await connectToDatabase();
  const admin = await AdminModel.findOne({ email: normalized }).select({ _id: 1, status: 1 }).lean();
  if (!admin || admin.status !== "active") return { outcome: "not_found" };
  const record = await AdminOtpModel.findOne({ adminId: admin._id, purpose: "password-reset", status: "active" }).select(
    "+otpHash",
  );
  if (!record) return { outcome: "not_found" };
  const now = new Date();
  if (record.expiresAt.getTime() <= now.getTime()) {
    await AdminOtpModel.updateOne({ _id: record._id }, { $set: { status: "expired" } });
    return { outcome: "expired" };
  }
  if (record.attempts >= record.maxAttempts) {
    await AdminOtpModel.updateOne({ _id: record._id }, { $set: { status: "locked" } });
    return { outcome: "locked" };
  }
  if (!verifyOtpHash(otp.trim(), record.otpHash, c.otpPepper)) {
    const attempts = record.attempts + 1;
    const locked = attempts >= record.maxAttempts;
    await AdminOtpModel.updateOne(
      { _id: record._id },
      { $set: { attempts, ...(locked ? { status: "locked" as const } : {}) } },
    );
    return { outcome: "invalid", attemptsLeft: Math.max(0, record.maxAttempts - attempts) };
  }
  const consumed = await AdminOtpModel.findOneAndUpdate(
    { _id: record._id, status: "active" },
    { $set: { status: "consumed", consumedAt: now } },
    { returnDocument: "after" },
  );
  if (!consumed) return { outcome: "invalid" };
  const passwordHash = await hashPassword(newPassword);
  await AdminModel.updateOne({ _id: admin._id }, { $set: { passwordHash } });
  await revokeAllSessions(String(admin._id), "password_reset");
  return { outcome: "reset" };
}
