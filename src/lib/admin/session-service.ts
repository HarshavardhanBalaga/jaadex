/**
 * OTP verification + login services (SERVER-ONLY).
 * Single-use OTP consume is atomic.
 */
import "server-only";
import { connectToDatabase } from "@/lib/mongodb";
import { AdminModel } from "@/models/Admin";
import { AdminOtpModel } from "@/models/AdminOtp";
import { getAdminAuthConfig } from "./auth-config";
import { verifyOtpHash } from "./otp";

export type VerifyOutcome =
  | { outcome: "verified" }
  | { outcome: "invalid" | "expired" | "locked" | "not_found" | "email_mismatch"; attemptsLeft?: number };

export async function verifyRegistrationOtp(email: string, otp: string): Promise<VerifyOutcome> {
  const c = getAdminAuthConfig();
  const normalized = email.trim().toLowerCase();
  await connectToDatabase();
  const admin = await AdminModel.findOne({ email: normalized });
  if (!admin) return { outcome: "not_found" };
  if (admin.status === "active") return { outcome: "invalid" };
  const record = await AdminOtpModel.findOne({ adminId: admin._id, purpose: "register", status: "active" }).select(
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
  await AdminModel.updateOne(
    { _id: admin._id, status: "pending" },
    { $set: { status: "active", emailVerifiedAt: now } },
  );
  return { outcome: "verified" };
}
