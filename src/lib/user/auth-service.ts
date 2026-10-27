/**
 * Website-user registration, OTP verification, login and password reset
 * (SERVER-ONLY). Mirrors the admin flow, except every code goes to the
 * user's own email. Accounts stay pending until the code is verified.
 */
import "server-only";
import type { Types } from "mongoose";
import { connectToDatabase } from "@/lib/mongodb";
import { UserModel } from "@/models/User";
import { UserOtpModel, type UserOtpPurpose } from "@/models/UserOtp";
import { UserSessionModel } from "@/models/UserSession";
import { getAdminAuthConfig } from "@/lib/admin/auth-config";
import { hashPassword, verifyPassword } from "@/lib/admin/password";
import { generateOtp, hashOtp, verifyOtpHash } from "@/lib/admin/otp";
import { sendUserPasswordResetOtp, sendUserVerificationOtp } from "@/lib/admin/mailer";

type IssueOutcome =
  | { outcome: "issued"; otp: string }
  | { outcome: "cooldown"; resendAvailableInSeconds: number }
  | { outcome: "resend_limit" };

/** Creates (or re-issues, respecting cooldown + max resends) the one active code for this user + purpose. */
async function issueOtp(userId: Types.ObjectId, purpose: UserOtpPurpose): Promise<IssueOutcome> {
  const c = getAdminAuthConfig();
  const now = new Date();
  const otp = generateOtp(c.otpLength);
  const expiresAt = new Date(now.getTime() + c.otpExpiresMinutes * 60_000);
  const existing = await UserOtpModel.findOne({ userId, purpose, status: "active" })
    .select({ lastSentAt: 1, resendCount: 1 })
    .lean();
  if (existing) {
    const sinceSend = (now.getTime() - new Date(existing.lastSentAt).getTime()) / 1000;
    if (sinceSend < c.otpResendCooldownSeconds) {
      return { outcome: "cooldown", resendAvailableInSeconds: Math.ceil(c.otpResendCooldownSeconds - sinceSend) };
    }
    if (existing.resendCount >= c.otpMaxResends) return { outcome: "resend_limit" };
    await UserOtpModel.updateOne(
      { _id: existing._id },
      {
        $set: { otpHash: hashOtp(otp, c.otpPepper), expiresAt, attempts: 0, status: "active", lastSentAt: now },
        $inc: { resendCount: 1 },
      },
    );
    return { outcome: "issued", otp };
  }
  await UserOtpModel.create({
    userId,
    purpose,
    otpHash: hashOtp(otp, c.otpPepper),
    expiresAt,
    attempts: 0,
    maxAttempts: c.otpMaxAttempts,
    resendCount: 0,
    lastSentAt: now,
    status: "active",
  });
  return { outcome: "issued", otp };
}

type ConsumeOutcome =
  | { outcome: "consumed" }
  | { outcome: "invalid" | "expired" | "locked" | "not_found"; attemptsLeft?: number };

/** Checks a code (expiry, attempts) and consumes it exactly once. */
async function consumeOtp(userId: Types.ObjectId, purpose: UserOtpPurpose, otp: string): Promise<ConsumeOutcome> {
  const c = getAdminAuthConfig();
  const record = await UserOtpModel.findOne({ userId, purpose, status: "active" }).select("+otpHash");
  if (!record) return { outcome: "not_found" };
  const now = new Date();
  if (record.expiresAt.getTime() <= now.getTime()) {
    await UserOtpModel.updateOne({ _id: record._id }, { $set: { status: "expired" } });
    return { outcome: "expired" };
  }
  if (record.attempts >= record.maxAttempts) {
    await UserOtpModel.updateOne({ _id: record._id }, { $set: { status: "locked" } });
    return { outcome: "locked" };
  }
  if (!verifyOtpHash(otp.trim(), record.otpHash, c.otpPepper)) {
    const attempts = record.attempts + 1;
    const locked = attempts >= record.maxAttempts;
    await UserOtpModel.updateOne(
      { _id: record._id },
      { $set: { attempts, ...(locked ? { status: "locked" as const } : {}) } },
    );
    return { outcome: "invalid", attemptsLeft: Math.max(0, record.maxAttempts - attempts) };
  }
  // Atomic single-use consume: a concurrent use of the same code loses here.
  const consumed = await UserOtpModel.findOneAndUpdate(
    { _id: record._id, status: "active" },
    { $set: { status: "consumed", consumedAt: now } },
    { returnDocument: "after" },
  );
  return consumed ? { outcome: "consumed" } : { outcome: "invalid" };
}

export type UserRegisterOutcome =
  | { outcome: "sent"; resendAvailableInSeconds: number }
  | { outcome: "cooldown"; resendAvailableInSeconds: number }
  | { outcome: "email_taken" }
  | { outcome: "resend_limit" };

export async function registerUser(name: string, email: string, password: string): Promise<UserRegisterOutcome> {
  const c = getAdminAuthConfig();
  const trimmedName = name.trim().slice(0, 80);
  const normalized = email.trim().toLowerCase();
  await connectToDatabase();
  const existing = await UserModel.findOne({ email: normalized }).select({ _id: 1, status: 1 }).lean();
  if (existing && existing.status !== "pending") return { outcome: "email_taken" };

  let userId: Types.ObjectId;
  if (existing) {
    // Pending re-registration: the account is unverified, so the latest
    // details win (the first attempt may have had a mistyped password).
    userId = existing._id;
    await UserModel.updateOne(
      { _id: userId, status: "pending" },
      { $set: { name: trimmedName, passwordHash: await hashPassword(password) } },
    );
  } else {
    try {
      const created = await UserModel.create({
        name: trimmedName,
        email: normalized,
        passwordHash: await hashPassword(password),
        status: "pending",
      });
      userId = created._id;
    } catch (err: unknown) {
      if (typeof err === "object" && err !== null && "code" in err && (err as { code: number }).code === 11000) {
        return { outcome: "email_taken" };
      }
      throw err;
    }
  }

  const issued = await issueOtp(userId, "register");
  if (issued.outcome !== "issued") return issued;
  await sendUserVerificationOtp(normalized, issued.otp, c.otpExpiresMinutes);
  return { outcome: "sent", resendAvailableInSeconds: c.otpResendCooldownSeconds };
}

export type UserVerifyOutcome =
  | { outcome: "verified"; userId: Types.ObjectId }
  | { outcome: "invalid" | "expired" | "locked" | "not_found"; attemptsLeft?: number };

export async function verifyUserOtp(email: string, otp: string): Promise<UserVerifyOutcome> {
  await connectToDatabase();
  const user = await UserModel.findOne({ email: email.trim().toLowerCase() }).select({ _id: 1, status: 1 }).lean();
  if (!user || user.status !== "pending") return { outcome: "not_found" };
  const r = await consumeOtp(user._id, "register", otp);
  if (r.outcome !== "consumed") return r;
  await UserModel.updateOne(
    { _id: user._id, status: "pending" },
    { $set: { status: "active", emailVerifiedAt: new Date() } },
  );
  return { outcome: "verified", userId: user._id };
}

export type UserLoginOutcome =
  | { outcome: "ok"; userId: Types.ObjectId }
  | { outcome: "no_account" }
  | { outcome: "invalid" };

/**
 * "no_account" (no user, or registration never verified) lets the UI send the
 * visitor to register. This deliberately reveals whether an email has an
 * account; login rate limits bound how fast that can be probed.
 */
export async function loginUser(email: string, password: string): Promise<UserLoginOutcome> {
  await connectToDatabase();
  const user = await UserModel.findOne({ email: email.trim().toLowerCase() }).select("+passwordHash");
  if (!user || user.status === "pending") return { outcome: "no_account" };
  const pwOk = await verifyPassword(password, user.passwordHash);
  if (!pwOk || user.status !== "active") return { outcome: "invalid" };
  return { outcome: "ok", userId: user._id };
}

/**
 * Forgot password: emails a reset code to an active account. Unknown emails,
 * cooldowns and resend limits all look the same to the caller.
 */
export async function requestUserPasswordReset(email: string): Promise<void> {
  const c = getAdminAuthConfig();
  const normalized = email.trim().toLowerCase();
  await connectToDatabase();
  const user = await UserModel.findOne({ email: normalized, status: "active" }).select({ _id: 1 }).lean();
  if (!user) return;
  const issued = await issueOtp(user._id, "password-reset");
  if (issued.outcome !== "issued") return;
  await sendUserPasswordResetOtp(normalized, issued.otp, c.otpExpiresMinutes);
}

export type UserResetOutcome =
  | { outcome: "reset" }
  | { outcome: "invalid" | "expired" | "locked" | "not_found"; attemptsLeft?: number };

/** Replaces the password and signs out every session so only the new password works. */
export async function resetUserPassword(email: string, otp: string, newPassword: string): Promise<UserResetOutcome> {
  await connectToDatabase();
  const user = await UserModel.findOne({ email: email.trim().toLowerCase(), status: "active" }).select({ _id: 1 }).lean();
  if (!user) return { outcome: "not_found" };
  const r = await consumeOtp(user._id, "password-reset", otp);
  if (r.outcome !== "consumed") return r;
  await UserModel.updateOne({ _id: user._id }, { $set: { passwordHash: await hashPassword(newPassword) } });
  await UserSessionModel.updateMany({ userId: user._id, revokedAt: null }, { $set: { revokedAt: new Date() } });
  return { outcome: "reset" };
}
