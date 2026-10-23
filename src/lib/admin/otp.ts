/**
 * OTP helpers (SERVER-ONLY). OTPs are never stored; only HMAC-SHA256 hashes.
 * Pepper is a dedicated OTP_PEPPER secret, never a JWT secret.
 */
import "server-only";
import { createHmac, randomInt, timingSafeEqual, createHash } from "node:crypto";

export function generateOtp(length: number): string {
  let out = "";
  for (let i = 0; i < length; i++) out += String(randomInt(0, 10));
  return out;
}

export function hashOtp(otp: string, pepper: string): string {
  return createHmac("sha256", pepper).update(otp, "utf8").digest("hex");
}

export function verifyOtpHash(candidate: string, expectedHash: string, pepper: string): boolean {
  try {
    const candidateHash = hashOtp(candidate, pepper);
    const a = Buffer.from(candidateHash, "hex");
    const b = Buffer.from(expectedHash, "hex");
    return a.length === b.length && timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

/** SHA-256 hash for refresh-token storage (lookup by hash, never raw token). */
export function hashToken(raw: string): string {
  return createHash("sha256").update(raw, "utf8").digest("hex");
}
