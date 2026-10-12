/**
 * Registration service (SERVER-ONLY).
 * Repeat open registration: any email can self-register; the account stays
 * pending until OTP verification. The verification code is always sent to the
 * shared administrator inbox (ADMIN_OTP_EMAIL). Every account is a plain
 * admin — there is no superadmin tier for new registrations.
 */
import "server-only";
import { createHash } from "node:crypto";
import { randomUUID } from "node:crypto";
import { connectToDatabase } from "@/lib/mongodb";
import { AdminModel } from "@/models/Admin";
import { AdminOtpModel } from "@/models/AdminOtp";
import { getAdminAuthConfig } from "./auth-config";
import { hashPassword } from "./password";
import { generateOtp, hashOtp } from "./otp";
import { sendRegistrationOtp } from "./mailer";

export type RegisterOutcome =
  | { outcome: "created"; resendAvailableInSeconds: number }
  | { outcome: "already_pending"; resendAvailableInSeconds: number }
  | { outcome: "closed" }
  | { outcome: "email_taken" }
  | { outcome: "cooldown"; resendAvailableInSeconds: number }
  | { outcome: "resend_limit" };

function sha(input: string): string {
  return createHash("sha256").update(input, "utf8").digest("hex");
}

export async function bootstrapStatus(): Promise<{ registered: boolean; registrationOpen: boolean }> {
  const c = getAdminAuthConfig();
  await connectToDatabase();
  const active = await AdminModel.findOne({ status: "active" })
    .select({ _id: 1 })
    .lean();
  const registered = Boolean(active);
  return { registered, registrationOpen: Boolean(c.adminOtpEmail) };
}

export async function registerBootstrap(email: string, password: string): Promise<RegisterOutcome> {
  const c = getAdminAuthConfig();
  const normalized = email.trim().toLowerCase();
  await connectToDatabase();
  const existing = await AdminModel.findOne({ email: normalized })
    .select({ _id: 1, status: 1, role: 1 })
    .lean();
  if (existing && existing.status === "active") return { outcome: "email_taken" };

  let adminId;
  if (existing) {
    // Pending re-registration: keep the original password hash, fall through
    // to the OTP resend path below.
    adminId = existing._id;
  } else {
    // Every new account is a plain admin — no superadmin tier.
    const passwordHash = await hashPassword(password);
    try {
      const created = await AdminModel.create({
        email: normalized,
        passwordHash,
        role: "admin",
        status: "pending",
        emailVerifiedAt: null,
      });
      adminId = created._id;
    } catch (err: unknown) {
      if (typeof err === "object" && err !== null && "code" in err && (err as { code: number }).code === 11000) {
        return { outcome: "email_taken" };
      }
      throw err;
    }
  }

  const now = new Date();
  const existingOtp = await AdminOtpModel.findOne({
    adminId,
    purpose: "register",
    status: "active",
  })
    .select({ lastSentAt: 1, resendCount: 1, expiresAt: 1 })
    .lean();
  if (existingOtp) {
    const sinceSend = (now.getTime() - new Date(existingOtp.lastSentAt).getTime()) / 1000;
    if (sinceSend < c.otpResendCooldownSeconds) {
      return {
        outcome: "already_pending",
        resendAvailableInSeconds: Math.ceil(c.otpResendCooldownSeconds - sinceSend),
      };
    }
    if (existingOtp.resendCount >= c.otpMaxResends) return { outcome: "resend_limit" };
    const otp = generateOtp(c.otpLength);
    const expiresAt = new Date(now.getTime() + c.otpExpiresMinutes * 60_000);
    await AdminOtpModel.updateOne(
      { _id: existingOtp._id },
      {
        $set: {
          otpHash: hashOtp(otp, c.otpPepper),
          expiresAt,
          attempts: 0,
          status: "active",
          lastSentAt: now,
        },
        $inc: { resendCount: 1 },
      },
    );
    await sendRegistrationOtp(otp, c.otpExpiresMinutes);
    void sha(randomUUID());
    return { outcome: "already_pending", resendAvailableInSeconds: c.otpResendCooldownSeconds };
  }

  const otp = generateOtp(c.otpLength);
  const expiresAt = new Date(now.getTime() + c.otpExpiresMinutes * 60_000);
  await AdminOtpModel.create({
    adminId,
    purpose: "register",
    otpHash: hashOtp(otp, c.otpPepper),
    expiresAt,
    attempts: 0,
    maxAttempts: c.otpMaxAttempts,
    resendCount: 0,
    lastSentAt: now,
    status: "active",
  });
  await sendRegistrationOtp(otp, c.otpExpiresMinutes);
  return { outcome: "created", resendAvailableInSeconds: c.otpResendCooldownSeconds };
}
