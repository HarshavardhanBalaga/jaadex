/**
 * Sensitive-data exposure regression tests (no Atlas, no server-only imports).
 * Reads source files as text and asserts security invariants WITHOUT ever
 * printing or embedding real secrets (only short structural placeholders).
 *
 * Covers: credentials/OTP/tokens never in URLs, no tokens in JSON bodies or
 * web storage, secure cookie attributes, server-side authorization on every
 * protected surface, no secret logging, no-store + referrer policy, and that
 * public pages + auth validation flows still work.
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { loginSchema, registerSchema, verifyOtpSchema } from "../validation.ts";

const root = process.cwd();
const src = (p: string): string => readFileSync(join(root, p), "utf8");

describe("auth-url-leakage", () => {
  it("1. login form cannot place email/password in the URL", () => {
    const form = src("src/components/admin/AdminLoginForm.tsx");
    // Native fallback must be POST so named controls never hit the query string.
    assert.match(form, /<form[^>]*method="post"/i, "login <form> needs method=\"post\"");
    // Password must not be a named control (native GET serializes name= attrs).
    assert.doesNotMatch(form, /name="password"/i, "password must not be a named form control");
    assert.doesNotMatch(form, /name="confirm/i, "confirm must not be a named form control");
    // Credentials go via POST JSON body, never via navigation URL.
    assert.match(form, /method:\s*"POST"/, "login fetch must use POST");
    assert.match(form, /JSON\.stringify\(/, "login must send a JSON body");
    assert.doesNotMatch(
      form,
      /router\.(push|replace)\([^)]*(email|password|otp|token)/i,
      "login navigation must not embed credentials",
    );
    assert.match(form, /router\.push\("\/admin\/dashboard"\)/, "login success goes to a clean URL");
    // No credential-from-query fallback may exist.
    assert.doesNotMatch(form, /useSearchParams|get\("email"\)|get\("password"\)/, "login must not read credentials from query");
  });

  it("2. OTP values never appear in URLs or redirects", () => {
    const form = src("src/components/admin/AdminRegisterForm.tsx");
    assert.match(form, /method="post"/i, "register/otp forms need method=\"post\"");
    assert.doesNotMatch(form, /name="otp"/i, "OTP must not be a named form control");
    assert.match(form, /\/api\/admin\/auth\/register\/verify-otp/, "OTP submits to the POST API");
    assert.match(form, /otp:\s*otp\.trim\(\)/, "OTP travels in the POST body");
    assert.doesNotMatch(
      form,
      /router\.(push|replace)\([^)]*otp/i,
      "OTP must not appear in navigation",
    );
    assert.match(form, /router\.push\("\/admin\/login"\)/, "post-activation redirect is a clean URL");
    const verifyRoute = src("src/app/api/admin/auth/register/verify-otp/route.ts");
    assert.match(verifyRoute, /export async function POST/, "OTP verification is POST-only");
    assert.doesNotMatch(verifyRoute, /export async function GET/, "OTP verification must not accept GET (URL) input");
  });

  it("3. success and failure navigation stays credential-free", () => {
    for (const f of ["src/components/admin/AdminLoginForm.tsx", "src/components/admin/AdminRegisterForm.tsx"]) {
      const code = src(f);
      for (const m of code.matchAll(/router\.(push|replace)\(([^)]*)\)/g)) {
        assert.doesNotMatch(m[2], /\?/, `navigation in ${f} must not carry a query string: ${m[2].slice(0, 60)}`);
      }
    }
    const proxy = src("src/proxy.ts");
    assert.match(proxy, /url\.search\s*=\s*""/, "proxy redirect must strip any query string");
    const logout = src("src/components/admin/AdminLogoutButton.tsx");
    assert.match(logout, /router\.push\("\/admin\/login"\)/, "logout lands on a clean URL");
  });

  it("4. access/refresh tokens never appear in response bodies or URLs", () => {
    const login = src("src/app/api/admin/auth/login/route.ts");
    assert.match(login, /setAuthCookies/, "login delivers tokens via cookies");
    assert.doesNotMatch(login, /ok\(\{[^}]*accessToken/i, "login body must not contain the access token");
    assert.doesNotMatch(login, /ok\(\{[^}]*refreshToken/i, "login body must not contain the refresh token");
    const refresh = src("src/app/api/admin/auth/refresh/route.ts");
    assert.doesNotMatch(refresh, /ok\(\{[^}]*refreshToken/i, "refresh body must not echo the refresh token");
    const client = src("src/lib/admin-client/auth-fetch.ts");
    assert.doesNotMatch(client, /localStorage|sessionStorage/i, "tokens must not live in web storage");
    assert.doesNotMatch(client, /accessToken|refreshToken/i, "client must not handle raw auth tokens");
  });

  it("5. authentication cookies carry secure attributes", () => {
    const cookies = src("src/lib/admin/cookies.ts");
    assert.match(cookies, /httpOnly:\s*true/, "auth cookies must be HttpOnly");
    assert.match(cookies, /secure:\s*c\.useSecureCookies/, "auth cookies must be Secure in production/https");
    assert.match(cookies, /sameSite:\s*"lax"/, "auth cookies need a SameSite policy");
    assert.match(cookies, /path:\s*"\/"/, "__Host- cookies require Path=/");
    assert.doesNotMatch(cookies, /domain:/i, "__Host- cookies must not set Domain");
    for (const n of ["__Host-jaadex_at", "__Host-jaadex_rt", "__Host-jaadex_csrf"]) {
      assert.ok(cookies.includes(n), `expected cookie name ${n}`);
    }
    const config = src("src/lib/admin/auth-config.ts");
    assert.match(config, /useSecureCookies/, "secure-cookie decision must be centralized");
    // __Host- cookies are rejected without Secure even on localhost.
    assert.match(config, /useSecureCookies:\s*true/, "__Host- cookies must always be Secure");
  });

  it("6. every protected surface re-verifies authorization server-side", () => {
    const dashboard = src("src/app/admin/dashboard/page.tsx");
    assert.match(dashboard, /requireAdminFromToken/, "dashboard must authorize server-side");
    const me = src("src/app/api/admin/auth/me/route.ts");
    assert.match(me, /requireAdminFromToken/, "/me must authorize server-side");
    const refresh = src("src/app/api/admin/auth/refresh/route.ts");
    assert.match(refresh, /rotateRefresh|verifyRefresh/i, "refresh must verify the presented token");
    const login = src("src/app/api/admin/auth/login/route.ts");
    assert.match(login, /validateCsrf/, "login POST must pass CSRF validation");
  });

  it("7. sensitive values are never written to logs", () => {
    // Scan client + server auth sources for log calls that interpolate
    // secret-bearing *variables* (static words like "OTP email skipped"
    // in a fixed message are safe; `${otp}` / `, password` are not).
    const files = [
      "src/components/admin/AdminLoginForm.tsx",
      "src/components/admin/AdminRegisterForm.tsx",
      "src/lib/admin-client/auth-fetch.ts",
      "src/app/api/admin/auth/login/route.ts",
      "src/app/api/admin/auth/register/route.ts",
      "src/app/api/admin/auth/register/verify-otp/route.ts",
      "src/app/api/admin/auth/refresh/route.ts",
      "src/lib/admin/mailer.ts",
    ];
    for (const f of files) {
      const code = src(f);
      for (const m of code.matchAll(/console\.(log|debug|info|warn|error)\(([^)]*)\)/g)) {
        // Fail only when a secret-bearing *variable* is interpolated or
        // passed (e.g. `${otp}`, `, password`); fixed prose mentioning a
        // word like "OTP email skipped" carries no secret value.
        assert.doesNotMatch(
          m[2],
          /\$\{\s*(password|otp|token|secret|pepper|hash|smtp|pass)\b/i,
          `secret interpolation in log in ${f}: ${m[2].slice(0, 80)}`,
        );
        assert.doesNotMatch(
          m[2],
          /[+,(]\s*(password|otp|accessToken|refreshToken|csrfToken|smtpPass|otpPepper)\b/,
          `secret variable in log in ${f}: ${m[2].slice(0, 80)}`,
        );
      }
    }
  });

  it("8. auth responses are non-cacheable and referrer policy is set", () => {
    const respond = src("src/lib/admin/respond.ts");
    assert.match(respond, /no-store/, "auth API envelope must send Cache-Control: no-store");
    const nextConfig = src("next.config.ts");
    assert.match(nextConfig, /Referrer-Policy/, "a Referrer-Policy must be configured");
    assert.match(nextConfig, /strict-origin-when-cross-origin/, "referrer policy must be strict");
  });

  it("9. public pages and auth validation flows still work", () => {
    assert.equal(
      loginSchema.safeParse({ email: "admin@example.com", password: "x".repeat(12) }).success,
      true,
    );
    assert.equal(loginSchema.safeParse({ email: "admin@example.com", password: "" }).success, false);
    assert.equal(
      registerSchema.safeParse({ name: "Test Admin", email: "admin@example.com", password: "StrongPass123", confirmPassword: "StrongPass123" }).success,
      true,
    );
    assert.equal(verifyOtpSchema.safeParse({ email: "admin@example.com", otp: "123456" }).success, true);
    assert.equal(verifyOtpSchema.safeParse({ email: "admin@example.com", otp: "12ab" }).success, false);
    const loginPage = src("src/app/admin/login/page.tsx");
    assert.match(loginPage, /AdminLoginForm/, "public login page still renders the form");
    const registerPage = src("src/app/admin/register/page.tsx");
    assert.match(registerPage, /AdminRegisterForm/, "public register page still renders the form");
  });

  it("10. logged-out session checks stay quiet and setup hint leaks nothing per-email", () => {
    const me = src("src/app/api/admin/auth/me/route.ts");
    assert.match(me, /authenticated:\s*false/, "/me answers unauthenticated without 401 noise");
    assert.match(me, /authenticated:\s*true/, "/me still flags real sessions");
    assert.match(me, /forbidden/, "insufficient role is still a real 403");
    const nav = src("src/components/admin/AdminNavLink.tsx");
    assert.match(nav, /authenticated\s*===\s*true/, "nav grants Dashboard only on an authenticated flag");
    // Instant first paint comes from a boolean display hint — never a token.
    assert.match(nav, /sessionStorage/, "nav caches a display hint for instant paint");
    assert.doesNotMatch(nav, /sessionStorage[^;]*[Tt]oken/, "display hint must never hold a token");
    const form = src("src/components/admin/AdminLoginForm.tsx");
    assert.match(form, /register\/status/, "setup hint is driven by the public status flag");
    assert.match(form, /initial setup first/, "zero-admin setup banner exists");
    assert.match(form, /\/admin\/register/, "banner links to registration");
    assert.match(form, /Invalid email or password/, "login failure stays generic (no per-email oracle)");
  });
});
