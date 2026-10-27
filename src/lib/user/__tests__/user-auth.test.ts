/**
 * Website-user auth regression tests (no Atlas, no server-only imports).
 * Reads source files as text and asserts security invariants, in the same
 * style as src/lib/admin/__tests__/auth-url-leakage.test.ts.
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { userVerifySchema } from "../validation.ts";

const root = process.cwd();
const src = (p: string): string => readFileSync(join(root, p), "utf8");

const postRoutes = [
  "src/app/api/auth/register/route.ts",
  "src/app/api/auth/register/verify-otp/route.ts",
  "src/app/api/auth/login/route.ts",
  "src/app/api/auth/password/forgot/route.ts",
  "src/app/api/auth/password/reset/route.ts",
];

describe("user-auth", () => {
  it("every state-changing auth route checks CSRF, is rate limited and uses no-store responses", () => {
    for (const path of postRoutes) {
      const route = src(path);
      assert.match(route, /export async function POST/, `${path} is POST`);
      assert.doesNotMatch(route, /export async function GET/, `${path} must not accept GET`);
      assert.match(route, /validateCsrf\(request\)/, `${path} checks CSRF`);
      assert.match(route, /checkRateLimit\(/, `${path} is rate limited`);
      assert.match(route, /from "@\/lib\/admin\/respond"/, `${path} responds via no-store helpers`);
      assert.doesNotMatch(route, /console\.(log|debug)/, `${path} must not debug-log`);
    }
    const logout = src("src/app/api/auth/logout/route.ts");
    assert.match(logout, /validateCsrf\(request\)/, "logout checks CSRF");
    assert.match(logout, /fail\("csrf_invalid"/, "logout reports CSRF failure so the client retries");
  });

  it("forms never put credentials in the URL", () => {
    for (const path of ["src/components/auth/UserLoginForm.tsx", "src/components/auth/UserRegisterForm.tsx"]) {
      const form = src(path);
      for (const tag of form.match(/<form[^>]*>/g) ?? []) {
        assert.match(tag, /method="post"/i, `${path}: every <form> needs method="post"`);
      }
      assert.doesNotMatch(form, /name="(password|confirm|otp|email)/i, `${path}: secrets must not be named controls`);
      assert.doesNotMatch(
        form,
        /router\.(push|replace)\([^)]*(email|password|otp)/i,
        `${path}: navigation must not embed credentials`,
      );
    }
  });

  it("enquiries are login-gated on the server, not just by the proxy", () => {
    assert.match(src("src/proxy.ts"), /matcher:[^\]]*"\/contact"/, "proxy redirects guests from /contact");
    assert.match(src("src/app/contact/page.tsx"), /getCurrentUser\(\)/, "contact page verifies the session");
    assert.match(src("src/app/api/contact/route.ts"), /getCurrentUser\(\)/, "contact API verifies the session");
  });

  it("the password is chosen at code verification, never by a re-registration", () => {
    const service = src("src/lib/user/auth-service.ts");
    const register = service.slice(service.indexOf("export async function registerUser"), service.indexOf("export type UserVerifyOutcome"));
    assert.doesNotMatch(register, /updateOne\([\s\S]*passwordHash/, "re-registration must not overwrite a pending password");
    const verify = service.slice(service.indexOf("export async function verifyUserOtp"), service.indexOf("export type UserLoginOutcome"));
    assert.match(verify, /passwordHash: await hashPassword\(password\)/, "verification sets the password");
  });

  it("verification schema is strict and enforces password rules", () => {
    const good = { name: "Test User", email: "user@example.com", password: "StrongPass123", otp: "123456" };
    assert.equal(userVerifySchema.safeParse(good).success, true);
    assert.equal(userVerifySchema.safeParse({ ...good, password: "short" }).success, false);
    assert.equal(userVerifySchema.safeParse({ ...good, otp: "12ab56" }).success, false);
    assert.equal(userVerifySchema.safeParse({ ...good, role: "admin" }).success, false);
    const { password: _omit, ...withoutPassword } = good;
    void _omit;
    assert.equal(userVerifySchema.safeParse(withoutPassword).success, false);
  });
});
