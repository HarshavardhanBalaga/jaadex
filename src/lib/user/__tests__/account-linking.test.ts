/**
 * Multi-method website-user auth tests: Google-only password setup, role
 * boundary and login responses. No network, no
 * Atlas, no server-only imports: pure helpers are run directly, services and
 * routes are checked as source text (same style as user-auth.test.ts).
 * DB-level behaviour (races, expiry, single use) is enforced by conditional
 * updates and unique indexes, which these invariants pin down.
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { userSetupPasswordSchema } from "../validation.ts";

const root = process.cwd();
const src = (p: string): string => readFileSync(join(root, p), "utf8");
const between = (text: string, start: string, end?: string): string => {
  const i = text.indexOf(start);
  assert.ok(i >= 0, `missing: ${start}`);
  return end ? text.slice(i, text.indexOf(end, i + start.length)) : text.slice(i);
};

const newRoutes = [
  "src/app/api/auth/password/setup/request/route.ts",
  "src/app/api/auth/password/setup/confirm/route.ts",
];

describe("schemas", () => {
  const good = { email: "user@gmail.com", otp: "123456", newPassword: "StrongPass123", confirmPassword: "StrongPass123" };

  it("password setup is strict, enforces password rules and never accepts a role or name", () => {
    assert.equal(userSetupPasswordSchema.safeParse(good).success, true);
    assert.equal(userSetupPasswordSchema.safeParse({ ...good, newPassword: "short", confirmPassword: "short" }).success, false);
    assert.equal(userSetupPasswordSchema.safeParse({ ...good, confirmPassword: "Different123" }).success, false);
    assert.equal(userSetupPasswordSchema.safeParse({ ...good, otp: "12ab56" }).success, false);
    assert.equal(userSetupPasswordSchema.safeParse({ ...good, role: "admin" }).success, false);
    assert.equal(userSetupPasswordSchema.safeParse({ ...good, name: "x" }).success, false);
  });
});

describe("password setup for Google-only accounts (scenario C)", () => {
  const service = src("src/lib/user/auth-service.ts");
  const setup = between(service, "async function findPasswordSetupUser");

  it("only active accounts without a password are eligible", () => {
    assert.match(setup, /findOne\(\{ email: normalized, status: "active", passwordHash: null \}\)/);
  });

  it("is not registration: no user is created and only passwordHash is written, conditionally", () => {
    assert.doesNotMatch(setup, /UserModel\.create/);
    assert.match(setup, /\{ _id: user\._id, status: "active", passwordHash: null \},\s*\{ \$set: \{ passwordHash: await hashPassword\(newPassword\) \} \}/);
    assert.doesNotMatch(setup, /\$set: \{[^}]*(googleSub|email|name|status)/, "id, email, profile and Google identity unchanged");
    assert.doesNotMatch(setup, /\$unset/);
  });

  it("uses its own single-use OTP purpose, separate from reset", () => {
    assert.match(setup, /issueOtp\(user\._id, "password-setup"\)/);
    assert.match(setup, /consumeOtp\(user\._id, "password-setup", otp\)/);
    const model = src("src/models/UserOtp.ts");
    assert.match(model, /enum: \["register", "password-reset", "password-setup"\]/);
  });

  it("the request route answers the same for every email", () => {
    const route = src("src/app/api/auth/password/setup/request/route.ts");
    assert.match(route, /await requestUserPasswordSetup\(parsed\.data\.email\);\s*return ok\(/);
    assert.match(route, /resendAvailableInSeconds: getAdminAuthConfig\(\)\.otpResendCooldownSeconds/);
  });
});

describe("setup codes: invalid, expired and reused (shared consumeOtp)", () => {
  const consume = between(src("src/lib/user/auth-service.ts"), "export async function consumeOtp", "export type UserRegisterOutcome");

  it("expired codes are rejected", () => {
    assert.match(consume, /if \(record\.expiresAt\.getTime\(\) <= now\.getTime\(\)\)[\s\S]*return \{ outcome: "expired" \}/);
  });

  it("wrong codes count attempts and lock", () => {
    assert.match(consume, /if \(!verifyOtpHash\([\s\S]*attempts >= record\.maxAttempts[\s\S]*return \{ outcome: "invalid"/);
  });

  it("codes are single use: an atomic consume on status active, so reuse or a racing use fails", () => {
    assert.match(consume, /findOneAndUpdate\(\s*\{ _id: record\._id, status: "active" \},\s*\{ \$set: \{ status: "consumed"/);
    assert.match(consume, /findOne\(\{ userId, purpose, status: "active" \}\)/, "consumed codes are never found again");
  });

  it("only hashes of codes are stored", () => {
    assert.match(src("src/models/UserOtp.ts"), /otpHash: \{ type: String, required: true, select: false \}/);
  });
});

describe("role boundary: user role only (admins are a separate collection)", () => {
  it("no website-user auth code reads or writes admin accounts", () => {
    for (const path of [
      "src/lib/user/auth-service.ts",
      "src/lib/user/google-login.ts",
      "src/lib/user/google-routes.ts",
      "src/lib/user/session.ts",
      ...newRoutes,
      "src/app/api/auth/login/route.ts",
      "src/app/api/auth/google/callback/route.ts",
    ]) {
      assert.doesNotMatch(src(path), /AdminModel|@\/models\/Admin"/, path);
    }
  });

  it("the User model has no role field to escalate", () => {
    assert.doesNotMatch(src("src/models/User.ts"), /\brole\b/);
  });
});

describe("routes and enumeration", () => {
  it("every new route is POST-only, checks CSRF, is rate limited and uses no-store responses", () => {
    for (const path of newRoutes) {
      const route = src(path);
      assert.match(route, /export async function POST/, path);
      assert.doesNotMatch(route, /export async function GET/, path);
      assert.match(route, /validateCsrf\(request\)/, path);
      assert.match(route, /checkRateLimit\(/, path);
      assert.match(route, /from "@\/lib\/admin\/respond"/, path);
      assert.doesNotMatch(route, /console\.(log|debug)/, path);
      assert.doesNotMatch(route, /passwordHash|otpHash/, `${path} must never return hashes`);
    }
  });

  it("login sends unknown emails to register but never reveals Google-only accounts", () => {
    const login = src("src/app/api/auth/login/route.ts");
    assert.doesNotMatch(login, /google_account/);
    assert.match(login, /if \(r\.outcome === "no_account"\) \{\s*return fail\("no_account"/);
    assert.match(login, /checkRateLimit\(`user-login:\$\{ip\}`/);
    assert.match(login, /checkRateLimit\(`user-login-email:/);
  });

  it("the login UI offers Google and Set a password after a failed login, separate from Forgot password", () => {
    const form = src("src/components/auth/UserLoginForm.tsx");
    assert.match(form, /You can sign in with Google or set a password to access your account using your email/);
    assert.match(form, /"\/api\/auth\/password\/setup\/request"/);
    assert.match(form, /"\/api\/auth\/password\/forgot"/);
    assert.match(form, /errorCode\(data\) === "no_account"[\s\S]*router\.push\(`\/register\?next=\$\{encodeURIComponent\(next\)\}&reason=no_account`\)/);
  });

  it("forgot-password is unchanged for existing accounts", () => {
    const service = src("src/lib/user/auth-service.ts");
    assert.match(service, /issueOtp\(user\._id, "password-reset"\)/);
    assert.match(service, /consumeOtp\(user\._id, "password-reset", otp\)/);
    assert.match(service, /UserSessionModel\.updateMany\(\{ userId: user\._id, revokedAt: null \}/, "reset still revokes sessions");
  });
});
