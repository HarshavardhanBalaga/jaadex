/**
 * Route protection guard. Scans EVERY src/app/api/**\/route.ts and every exported handler in it,
 * and fails when a handler is not in a known protection class:
 *   admin   → requireAdminFromToken(access) checked before any other work; non-GET also validateCsrf first
 *   user    → getCurrentUser() with a 401 when signed out
 *   webhook → Razorpay HMAC signature verified before the body is parsed
 *   public  → explicitly allowlisted with a reason (auth flows, health, public catalogue)
 * A new route that fits none of these fails the suite, so nothing ships unprotected by accident.
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { join, sep } from "node:path";

const API_ROOT = join(process.cwd(), "src", "app", "api");
const METHOD_RE = /export async function (GET|POST|PATCH|PUT|DELETE)\b/g;

type Handler = { route: string; method: string; body: string };

/** "kids-challenge/payments/order" style route paths with each exported handler's source. */
function handlers(): Handler[] {
  const files = (readdirSync(API_ROOT, { recursive: true }) as string[]).filter((f) => f.endsWith(`${sep}route.ts`) || f === "route.ts");
  const out: Handler[] = [];
  for (const file of files) {
    const route = file.split(sep).slice(0, -1).join("/");
    const src = readFileSync(join(API_ROOT, file), "utf8");
    const starts = [...src.matchAll(METHOD_RE)].map((m) => ({ method: m[1], index: m.index ?? 0 }));
    starts.forEach((s, i) => out.push({ route, method: s.method, body: src.slice(s.index, starts[i + 1]?.index ?? src.length) }));
  }
  return out;
}

/** Public on purpose. Each entry: route pattern, methods, reason. */
const PUBLIC: { pattern: RegExp; methods: string[]; reason: string }[] = [
  { pattern: /^admin\/auth\//, methods: ["GET", "POST"], reason: "admin sign-in, registration, OTP, password and session flows" },
  { pattern: /^auth\//, methods: ["GET", "POST"], reason: "website user sign-in, registration, OTP and password flows" },
  { pattern: /^health$/, methods: ["GET"], reason: "uptime check, no data" },
  { pattern: /^workshops$/, methods: ["GET"], reason: "public workshop catalogue shown on the site" },
];

/** Admin-only. Everything under these patterns that is not listed as public or user. */
const ADMIN: RegExp[] = [/^admin\//, /^workshops(\/|$)/, /^kids-challenge\/registrations\/export$/];

/** Signed-in website user (parent). */
const USER: { route: string; method: string }[] = [
  { route: "contact", method: "POST" },
  { route: "kids-challenge/registrations", method: "POST" },
  { route: "kids-challenge/payments/order", method: "POST" },
  { route: "kids-challenge/payments/verify", method: "POST" },
  { route: "kids-challenge/payments/failed", method: "POST" },
  { route: "workshops/[id]/registrations", method: "POST" },
];

/** Authenticated by a provider signature instead of a session. */
const WEBHOOK: { route: string; method: string }[] = [{ route: "kids-challenge/payments/webhook", method: "POST" }];

/** Awaits allowed before the admin check: they only read the request/cookies, never data. */
const PRE_AUTH_AWAITS = /^await (validateCsrf\(|readAuthCookies\(|cookies\()/;

type Kind = "public" | "user" | "webhook" | "admin" | null;

function classify(h: Handler): Kind {
  if (PUBLIC.some((p) => p.pattern.test(h.route) && p.methods.includes(h.method))) return "public";
  if (USER.some((u) => u.route === h.route && u.method === h.method)) return "user";
  if (WEBHOOK.some((w) => w.route === h.route && w.method === h.method)) return "webhook";
  if (ADMIN.some((a) => a.test(h.route))) return "admin";
  return null;
}

const all = handlers();
const label = (h: Handler) => `${h.method} /api/${h.route}`;

describe("API route protection", () => {
  it("finds the API routes", () => {
    assert.ok(all.length >= 40, `expected the full route set, found ${all.length}`);
  });

  it("every handler is admin, user, webhook or an allowlisted public route", () => {
    const unclassified = all.filter((h) => classify(h) === null).map(label);
    assert.deepEqual(unclassified, [], `Unprotected/unclassified handlers: protect them, or allowlist them in route-protection.test.ts with a reason.`);
  });

  it("admin handlers verify the admin session before doing any work", () => {
    for (const h of all.filter((x) => classify(x) === "admin")) {
      const auth = h.body.indexOf("requireAdminFromToken(");
      assert.ok(auth > -1, `${label(h)} must call requireAdminFromToken`);
      assert.match(h.body, /if \(!checked\.ok\) return /, `${label(h)} must return when the admin check fails`);
      // Nothing but CSRF/cookie reads may run before the admin check.
      const before = h.body.slice(0, auth);
      for (const a of before.match(/await [^\n;]+/g) ?? []) {
        assert.match(a, PRE_AUTH_AWAITS, `${label(h)} runs "${a.trim()}" before the admin check`);
      }
    }
  });

  it("admin handlers that change data also check CSRF before the admin check", () => {
    for (const h of all.filter((x) => classify(x) === "admin" && x.method !== "GET")) {
      const csrf = h.body.indexOf("validateCsrf(");
      assert.ok(csrf > -1, `${label(h)} must call validateCsrf`);
      assert.ok(csrf < h.body.indexOf("requireAdminFromToken("), `${label(h)} must check CSRF before the session`);
      assert.match(h.body, /if \(csrfError\) return /, `${label(h)} must return when CSRF fails`);
    }
  });

  it("user handlers require a signed-in user and answer 401 otherwise", () => {
    for (const h of all.filter((x) => classify(x) === "user")) {
      const auth = h.body.indexOf("getCurrentUser()");
      assert.ok(auth > -1, `${label(h)} must call getCurrentUser`);
      assert.match(h.body, /if \(!user\) return [^\n]*401/, `${label(h)} must return 401 when signed out`);
    }
  });

  it("webhooks verify the provider signature over the raw body before parsing it", () => {
    for (const h of all.filter((x) => classify(x) === "webhook")) {
      const verify = h.body.indexOf("verifyWebhookSignature(");
      assert.ok(verify > -1, `${label(h)} must verify the signature`);
      assert.ok(h.body.indexOf("request.text()") < verify, `${label(h)} must read the raw body`);
      assert.ok(verify < h.body.indexOf("JSON.parse("), `${label(h)} must verify before parsing`);
    }
  });

  it("public auth flows that change state still check CSRF (except OAuth redirects)", () => {
    for (const h of all.filter((x) => classify(x) === "public" && x.method !== "GET")) {
      assert.match(h.body, /validateCsrf\(/, `${label(h)} must call validateCsrf`);
    }
  });

  it("every allowlisted public route still exists (no stale exceptions)", () => {
    for (const p of PUBLIC) assert.ok(all.some((h) => p.pattern.test(h.route)), `stale public allowlist entry: ${p.pattern} (${p.reason})`);
    for (const u of [...USER, ...WEBHOOK]) assert.ok(all.some((h) => h.route === u.route && h.method === u.method), `stale entry: ${u.method} /api/${u.route}`);
  });
});
