/**
 * Website-user Google sign-in tests (no network, no Atlas, no server-only imports).
 * Pure name helper is exercised directly; routes and the account service are checked
 * as source text, in the same style as user-auth.test.ts.
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { displayNameFromProfile } from "../google-profile.ts";

const root = process.cwd();
const src = (p: string): string => readFileSync(join(root, p), "utf8");

const startRoute = "src/app/api/auth/google/start/route.ts";
const callbackRoute = "src/app/api/auth/google/callback/route.ts";

describe("displayNameFromProfile", () => {
  it("uses the Google name when present, collapsing whitespace", () => {
    assert.equal(displayNameFromProfile({ name: "  Priya\t  Sharma ", email: "p@example.com" }), "Priya Sharma");
  });

  it("falls back to the email local part when the name is missing or blank", () => {
    assert.equal(displayNameFromProfile({ name: null, email: "priya.s@example.com" }), "priya.s");
    assert.equal(displayNameFromProfile({ name: "   ", email: "ravi@example.com" }), "ravi");
  });

  it("caps long names and strips control characters", () => {
    const long = displayNameFromProfile({ name: "A".repeat(200), email: "a@example.com" });
    assert.equal(long.length, 80);
    assert.doesNotMatch(displayNameFromProfile({ name: "Eve\r\nBcc: x", email: "e@example.com" }), /[\r\n]/);
  });

  it("never returns an empty name", () => {
    assert.equal(displayNameFromProfile({ name: null, email: "@example.com" }), "JaaDeX user");
  });
});

describe("website-user Google sign-in", () => {
  it("start and callback are GET-only and never accept POST", () => {
    for (const path of [startRoute, callbackRoute]) {
      const route = src(path);
      assert.match(route, /export async function GET/, `${path} is GET`);
      assert.doesNotMatch(route, /export async function POST/, `${path} must not accept POST`);
    }
  });

  it("start validates next with safeNext and stores it in the transaction cookie", () => {
    const route = src(startRoute);
    assert.match(route, /safeNext\(new URL\(request\.url\)\.searchParams\.get\("next"\)\)/, "next is sanitised before use");
    assert.match(route, /\{ \.\.\.createOAuthTransaction\(\), next \}/, "next travels in the txn cookie");
    assert.match(route, /setOAuthTxnCookie\(USER_GOOGLE_TXN_COOKIE, txn\)/);
    assert.match(route, /checkRateLimit\(`user-google-start:/, "start is rate limited");
  });

  it("callback consumes the transaction before anything else and checks state", () => {
    const route = src(callbackRoute);
    const consume = route.indexOf("consumeOAuthTxnCookie(USER_GOOGLE_TXN_COOKIE)");
    const exchange = route.indexOf("exchangeGoogleCode(");
    assert.ok(consume > 0, "consumes the txn cookie");
    assert.ok(consume < exchange, "consumes the txn before the code exchange");
    assert.match(route, /statesMatch\(params\.get\("state"\), txn\.state\)/, "state is checked");
    assert.match(route, /verifyGoogleIdToken\(idToken, \{ clientId: google\.clientId, nonce: txn\.nonce \}\)/, "nonce is checked");
    assert.match(route, /checkRateLimit\(`user-google-cb:/, "callback is rate limited");
  });

  it("every callback failure goes through the generic login error, and next is re-validated", () => {
    const route = src(callbackRoute);
    assert.match(route, /const next = safeNext\(txn\.next\)/, "next is re-validated in the callback");
    assert.match(route, /noStoreRedirect\(new URL\(next, adminAppUrl\(request\)\)\)/, "success redirects to a safe same-site path");
    const failures = route.match(/return userGoogleLoginFailed\(/g) ?? [];
    assert.ok(failures.length >= 6, "each failure path returns the generic error");
  });

  it("callback logs only reason codes, never codes, tokens or emails", () => {
    const route = src(callbackRoute);
    for (const m of route.matchAll(/console\.(log|debug|info|warn|error)\(([^)]*)\)/g)) {
      assert.doesNotMatch(m[2], /\b(code|idToken|profile|email|txn|params)\b/, `log must not carry secrets: ${m[2]}`);
    }
    assert.doesNotMatch(route, /console\.(log|debug)\(/);
  });

  it("uses a cookie name separate from the admin transaction cookie", () => {
    const user = src("src/lib/user/google-routes.ts");
    const admin = src("src/lib/admin/google-routes.ts");
    assert.match(user, /USER_GOOGLE_TXN_COOKIE = "__Host-jaadex_user_oauth"/);
    assert.match(admin, /ADMIN_GOOGLE_TXN_COOKIE = "__Host-jaadex_admin_oauth"/);
  });

  it("the User model has a partial unique index on googleSub", () => {
    const model = src("src/models/User.ts");
    assert.match(model, /uniq_user_google_sub/);
    assert.match(model, /\{ googleSub: \{ \$type: "string" \} \}/, "index is partial, so unlinked accounts don't collide");
  });

  it("account linking is race-safe and never lets another Google account take over a user", () => {
    const service = src("src/lib/user/google-login.ts");
    assert.match(service, /\{ _id: user\._id, googleSub: null \}/, "link is conditional on no googleSub");
    assert.match(service, /if \(user\.googleSub && user\.googleSub !== profile\.sub\) return \{ outcome: "invalid" \}/);
    assert.match(service, /if \(user\.status === "disabled"\) return \{ outcome: "invalid" \}/, "disabled users are refused");
  });

  it("taking over a pending registration discards its password and open OTPs", () => {
    const service = src("src/lib/user/google-login.ts");
    assert.match(service, /\$unset: \{ passwordHash: 1 \}/);
    assert.match(service, /UserOtpModel\.updateMany\(\{ userId: user\._id, status: "active" \}, \{ \$set: \{ status: "expired" \} \}\)/);
  });

  it("password login gives Google-only accounts the same generic error as a wrong password", () => {
    const login = src("src/app/api/auth/login/route.ts");
    assert.doesNotMatch(login, /"google_account"/, "login must not reveal how an account signs in");
    assert.match(login, /if \(r\.outcome !== "ok"\) return fail\("invalid_credentials"/);
  });

  it("the Google buttons are plain links, so no client SDK or CSP change is needed", () => {
    const button = src("src/components/auth/GoogleSignInButton.tsx");
    assert.match(button, /href=\{`\/api\/auth\/google\/start\?next=\$\{encodeURIComponent\(next\)\}`\}/);
    assert.doesNotMatch(button, /accounts\.google\.com\/gsi|<script/);
  });
});
