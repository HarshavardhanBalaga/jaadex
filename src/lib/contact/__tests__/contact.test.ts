/**
 * Contact/enquiry tests (no DB, no server-only imports).
 * Validation lives in lib/contact/validation.ts (client+server safe);
 * storage + admin-visibility are asserted via source structure.
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { contactSchema } from "../validation.ts";

const root = process.cwd();
const src = (p: string): string => readFileSync(join(root, p), "utf8");

describe("contact", () => {
  it("accepts a full enquiry and rejects bad input", () => {
    const good = {
      name: "Priya Sharma",
      email: "priya@example.com",
      organization: "Sunrise School",
      interest: "Product Demonstration",
      message: "We would like a demo for our school next month.",
      website: "",
    };
    assert.equal(contactSchema.safeParse(good).success, true);
    assert.equal(contactSchema.safeParse({ ...good, name: "A" }).success, false);
    assert.equal(contactSchema.safeParse({ ...good, email: "not-an-email" }).success, false);
    assert.equal(contactSchema.safeParse({ ...good, interest: "Free iPad" }).success, false);
    assert.equal(contactSchema.safeParse({ ...good, message: "short" }).success, false);
    assert.equal(contactSchema.safeParse({ ...good, website: "spam-bot" }).success, false);
    assert.equal(contactSchema.safeParse({ ...good, password: "extra" }).success, false);
  });

  it("submit endpoint is public POST-only with rate limiting and no secrets in logs", () => {
    const route = src("src/app/api/contact/route.ts");
    assert.match(route, /export async function POST/, "contact submit is POST-only");
    assert.doesNotMatch(route, /export async function GET/, "contact must not accept GET (URL) input");
    assert.match(route, /checkRateLimit/, "contact submit is rate limited");
    assert.match(route, /no-store/i, "contact responses must not be cached");
    assert.doesNotMatch(route, /console\.(log|debug)/, "contact route must not debug-log submissions");
    for (const m of route.matchAll(/console\.(info|warn|error)\(([^)]*)\)/g)) {
      assert.doesNotMatch(m[2], /\$\{\s*(name|email|message|organization)\b/i, "enquiry PII must not be interpolated into logs");
    }
  });

  it("enquiries render only inside the server-guarded dashboard", () => {
    const dash = src("src/app/admin/dashboard/page.tsx");
    assert.match(dash, /requireAdminFromToken/, "dashboard stays server-guarded");
    assert.match(dash, /DemoRequestModel/, "dashboard reads enquiries server-side");
    assert.match(dash, /select\(\{[^}]*name: 1[^}]*message: 1/, "dashboard selects only display fields");
    const form = src("src/components/ContactForm.tsx");
    assert.match(form, /method:\s*"POST"/, "enquiry travels in a POST body");
    assert.match(form, /\/api\/contact/, "form submits to the contact API");
    assert.doesNotMatch(form, /mailto:/, "form must not leak enquiry details via mailto URLs");
  });
});
