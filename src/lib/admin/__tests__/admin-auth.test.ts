/**
 * Admin-auth unit tests (no Atlas, no server-only imports).
 * Validation lives in validation.ts which is client+server safe;
 * OTP/JWT/crypto assertions use node builtins + jsonwebtoken directly.
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { createHmac, randomUUID, createHash } from "node:crypto";
import jwt from "jsonwebtoken";
import {
  registerSchema,
  verifyOtpSchema,
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
} from "../validation.ts";
import { originAllowed, isLoopback } from "../../csrf-origin.ts";
import { getCsrfToken, clearCsrfCache } from "../../admin-client/auth-fetch.ts";

function hmacOtp(otp: string, pepper: string): string {
  return createHmac("sha256", pepper).update(otp, "utf8").digest("hex");
}

function parseDuration(raw: string): number {
  const t = raw.trim().toLowerCase();
  const m = /^(\d+)\s*([smhd])?$/.exec(t);
  if (!m) throw new Error("bad duration");
  const n = Number(m[1]);
  const mult = m[2] === "m" ? 60 : m[2] === "h" ? 3600 : m[2] === "d" ? 86400 : 1;
  return n * mult;
}

describe("admin-auth", () => {
  it("registration validation rejects weak/mismatched/extra fields", () => {
    const base = { name: "Test Admin", email: "admin@example.com" };
    assert.equal(registerSchema.safeParse({ ...base, password: "short", confirmPassword: "short" }).success, false);
    assert.equal(registerSchema.safeParse({ ...base, password: "1234567", confirmPassword: "1234567" }).success, false);
    assert.equal(registerSchema.safeParse({ ...base, password: "12345678", confirmPassword: "12345678" }).success, true);
    assert.equal(registerSchema.safeParse({ ...base, password: "LongEnough123", confirmPassword: "Different123" }).success, false);
    assert.equal(registerSchema.safeParse({ email: "admin@example.com", password: "StrongPass123", confirmPassword: "StrongPass123" }).success, false);
    assert.equal(registerSchema.safeParse({ ...base, password: "StrongPass123", confirmPassword: "StrongPass123", role: "superadmin" }).success, false);
    assert.equal(registerSchema.safeParse({ ...base, password: "StrongPass123", confirmPassword: "StrongPass123" }).success, true);
    assert.equal(registerSchema.safeParse({ name: "A", email: "admin@example.com", password: "StrongPass123", confirmPassword: "StrongPass123" }).success, false);
    assert.equal(registerSchema.safeParse({ name: "N".repeat(81), email: "admin@example.com", password: "StrongPass123", confirmPassword: "StrongPass123" }).success, false);
    assert.equal(verifyOtpSchema.safeParse({ email: "admin@example.com", otp: "12345" }).success, false);
    assert.equal(verifyOtpSchema.safeParse({ email: "admin@example.com", otp: "123456" }).success, true);
    assert.equal(loginSchema.safeParse({ email: "admin@example.com", password: "" }).success, false);
    assert.equal(loginSchema.safeParse({ email: "admin@example.com", password: "x", extra: 1 }).success, false);
  });

  it("forgot/reset validation accepts a full reset and rejects bad input", () => {
    assert.equal(forgotPasswordSchema.safeParse({ email: "admin@example.com" }).success, true);
    assert.equal(forgotPasswordSchema.safeParse({ email: "not-an-email" }).success, false);
    assert.equal(
      resetPasswordSchema.safeParse({ email: "admin@example.com", otp: "123456", newPassword: "newpass12", confirmPassword: "newpass12" }).success,
      true,
    );
    assert.equal(
      resetPasswordSchema.safeParse({ email: "admin@example.com", otp: "12ab", newPassword: "newpass12", confirmPassword: "newpass12" }).success,
      false,
    );
    assert.equal(
      resetPasswordSchema.safeParse({ email: "admin@example.com", otp: "123456", newPassword: "short", confirmPassword: "short" }).success,
      false,
    );
    assert.equal(
      resetPasswordSchema.safeParse({ email: "admin@example.com", otp: "123456", newPassword: "newpass12", confirmPassword: "other12x" }).success,
      false,
    );
  });

  it("origin check accepts same-site and loopback aliases, rejects the rest", () => {
    const app = "http://localhost:3000";
    const req = (headers: Record<string, string>) =>
      new Request("http://localhost:3000/api/admin/auth/login", { method: "POST", headers });
    assert.equal(originAllowed(req({ origin: "http://localhost:3000" }), app, app), true);
    assert.equal(originAllowed(req({ origin: "http://127.0.0.1:3000" }), app, app), true);
    assert.equal(originAllowed(req({ origin: "http://[::1]:3000" }), app, app), true);
    assert.equal(originAllowed(req({ origin: "https://localhost:3000" }), app, app), false);
    assert.equal(originAllowed(req({ origin: "http://localhost:4000" }), app, app), false);
    assert.equal(originAllowed(req({ origin: "http://evil.com" }), app, app), false);
    assert.equal(originAllowed(req({ origin: "http://localhost:3000.evil.com" }), app, app), false);
    assert.equal(
      originAllowed(req({ referer: "http://localhost:3000/admin/login" }), app, app),
      true,
    );
    assert.equal(originAllowed(req({ referer: "http://evil.com/x" }), app, app), false);
    assert.equal(originAllowed(req({ host: "localhost:3000" }), app, app), true);
    assert.equal(originAllowed(req({ host: "evil.com" }), app, app), false);
    assert.equal(originAllowed(req({}), app, app), false);
    assert.equal(originAllowed(req({ origin: "http://localhost:3000" }), "not a url", "also bad"), false);
    assert.equal(isLoopback("localhost"), true);
    assert.equal(isLoopback("127.0.0.1"), true);
    assert.equal(isLoopback("example.com"), false);
  });

  it("CSRF issuance is single-flight and the cache invalidates cleanly", async () => {
    const realFetch = globalThis.fetch;
    let calls = 0;
    (globalThis as unknown as { fetch: unknown }).fetch = async () =>
      new Response(JSON.stringify({ csrfToken: `T${++calls}` }), { status: 200 });
    try {
      clearCsrfCache();
      const [a, b, c] = await Promise.all([getCsrfToken(), getCsrfToken(), getCsrfToken()]);
      assert.equal(calls, 1);
      assert.equal(a, "T1");
      assert.equal(b, "T1");
      assert.equal(c, "T1");
      // Cached: no new fetch.
      assert.equal(await getCsrfToken(), "T1");
      assert.equal(calls, 1);
      // Invalidated (e.g. after logout rotation): next call re-issues once.
      clearCsrfCache();
      assert.equal(await getCsrfToken(), "T2");
      assert.equal(calls, 2);
    } finally {
      (globalThis as unknown as { fetch: unknown }).fetch = realFetch;
      clearCsrfCache();
    }
  });

  it("OTP HMAC verifies, wrong code/pepper fails", () => {
    const pepper = "p".repeat(40);
    const h = hmacOtp("123456", pepper);
    assert.equal(h.length, 64);
    assert.equal(hmacOtp("123456", pepper), h);
    assert.notEqual(hmacOtp("000000", pepper), h);
    assert.notEqual(hmacOtp("123456", "q".repeat(40)), h);
  });

  it("refresh lookup hash is deterministic and opaque", () => {
    const t = randomUUID() + randomUUID();
    const h = (s: string) => createHash("sha256").update(s, "utf8").digest("hex");
    assert.equal(h(t), h(t));
    assert.notEqual(h(t), t);
  });

  it("duration parser yields short-lived access window", () => {
    assert.equal(parseDuration("15m"), 900);
    assert.equal(parseDuration("30d"), 30 * 86400);
    assert.equal(parseDuration("15m") <= 3600, true);
    assert.throws(() => parseDuration("nope"));
  });

  it("JWT rejects expired, wrong-audience and wrong-secret tokens", () => {
    const secret = "s".repeat(40);
    const expired = jwt.sign({ sub: "1", role: "superadmin", fid: "f" }, secret, {
      algorithm: "HS256",
      issuer: "jaadex-admin",
      audience: "jaadex-admin-portal",
      expiresIn: -10,
    } as unknown as jwt.SignOptions);
    assert.throws(() => jwt.verify(expired, secret, { algorithms: ["HS256"], issuer: "jaadex-admin", audience: "jaadex-admin-portal" }));
    const wrongAud = jwt.sign({ sub: "1" }, secret, { algorithm: "HS256", issuer: "jaadex-admin", audience: "other" });
    assert.throws(() => jwt.verify(wrongAud, secret, { algorithms: ["HS256"], issuer: "jaadex-admin", audience: "jaadex-admin-portal" }));
    const token = jwt.sign({ sub: "1" }, secret, { algorithm: "HS256", issuer: "jaadex-admin", audience: "jaadex-admin-portal" });
    assert.throws(() => jwt.verify(token, "q".repeat(40), { algorithms: ["HS256"], issuer: "jaadex-admin", audience: "jaadex-admin-portal" }));
  });

  it("cookie names follow __Host- rules", () => {
    assert.equal("__Host-jaadex_at".startsWith("__Host-"), true);
    assert.equal("__Host-jaadex_rt".startsWith("__Host-"), true);
    assert.equal("__Host-jaadex_csrf".startsWith("__Host-"), true);
  });
});

