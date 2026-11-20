/**
 * Kids Challenge confirmation email tests (no DB, no SMTP). The template is tested directly;
 * "send once", resend rules and trigger placement are asserted via source structure.
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { buildKidsChallengeConfirmationEmail } from "../confirmation-email.ts";
import { adminRegistrationsQuerySchema } from "../admin-validation.ts";

const src = (p: string): string => readFileSync(join(process.cwd(), p), "utf8");

const input = {
  parentName: "Lakshmi Rao",
  studentName: "Anil Rao",
  studentClass: 5,
  schoolName: "ZP High School",
  amountPaise: 9900,
  paymentId: "pay_ABC123",
  paidAt: new Date("2026-01-02T10:00:00Z"), // 15:30 IST
  challengeUrl: "https://www.jaadex.com/kids-creative-challenge",
  siteUrl: "https://www.jaadex.com",
};

describe("confirmation email template", () => {
  it("has a one-line subject naming the student and the challenge", () => {
    const { subject } = buildKidsChallengeConfirmationEmail({ ...input, studentName: "Anil\r\nBcc: x@evil.com" });
    assert.equal(subject.includes("\n") || subject.includes("\r"), false);
    assert.match(buildKidsChallengeConfirmationEmail(input).subject, /^Registration confirmed: Anil Rao - kids creative challenge\[JaaDeX\]$/);
  });

  it("includes the payment facts in both parts", () => {
    const { text, html } = buildKidsChallengeConfirmationEmail(input);
    for (const part of [text, html]) {
      assert.ok(part.includes("Lakshmi Rao"));
      assert.ok(part.includes("₹99"));
      assert.ok(part.includes("pay_ABC123"));
      assert.ok(part.includes("Class 5"));
      assert.ok(part.includes("ZP High School"));
    }
    assert.match(text, /IST/);
    assert.ok(text.includes("https://www.jaadex.com/kids-creative-challenge"));
  });

  it("lists the steps after payment (not the already-done payment step)", () => {
    const { text } = buildKidsChallengeConfirmationEmail(input);
    assert.ok(text.includes("1. Student receives dashboard access after verification."));
    assert.equal(text.includes("completes payment."), false);
  });

  it("escapes names in the HTML and keeps markup out of the text part", () => {
    const { html, text } = buildKidsChallengeConfirmationEmail({ ...input, parentName: "<script>alert(1)</script>", studentName: 'A "B" & C' });
    assert.equal(html.includes("<script>alert(1)</script>"), false);
    assert.ok(html.includes("&lt;script&gt;"));
    assert.ok(html.includes("&quot;B&quot; &amp; C"));
    assert.equal(/<[a-z][^>]*>/i.test(text.replace("<script>alert(1)</script>", "")), false);
  });

  it("handles a missing payment id or date without crashing", () => {
    const { text } = buildKidsChallengeConfirmationEmail({ ...input, paymentId: null, paidAt: null });
    assert.ok(text.includes("Payment ID: —"));
  });
});

describe("admin email filter", () => {
  it("accepts the delivery states and rejects others", () => {
    for (const email of ["all", "sent", "failed", "not_sent", "pending"]) {
      assert.equal(adminRegistrationsQuerySchema.safeParse({ email }).success, true, email);
    }
    assert.equal(adminRegistrationsQuerySchema.safeParse({ email: "bounced" }).success, false);
    assert.equal(adminRegistrationsQuerySchema.parse({}).email, "all");
  });
});

describe("send once, resend safely", () => {
  const service = src("src/lib/kids-challenge/confirmation-service.ts");

  it("automatic send claims atomically: paid registrations with no confirmation yet", () => {
    const queue = service.slice(service.indexOf("export async function queueKidsConfirmation"), service.indexOf("export function scheduleKidsConfirmation"));
    assert.match(queue, /paymentStatus: "paid", "confirmationEmail\.status": \{ \$exists: false \}/);
    assert.match(queue, /findOneAndUpdate\(/);
    assert.ok(queue.indexOf("findOneAndUpdate(") < queue.indexOf("sendKidsConfirmation("));
  });

  it("resend requires a paid registration and refuses a send that is already in progress", () => {
    const resend = service.slice(service.indexOf("export async function resendKidsConfirmation"));
    assert.match(resend, /paymentStatus: "paid",/);
    assert.match(resend, /"confirmationEmail\.status": \{ \$in: \["sent", "failed", "skipped"\] \}/);
    assert.match(resend, /"confirmationEmail\.status": "pending", "confirmationEmail\.lastAttemptAt": \{ \$lt: stuckBefore \}/);
    assert.match(resend, /"in_progress"/);
    assert.match(resend, /"not_paid"/);
  });

  it("only sends for paid registrations and records every outcome", () => {
    const send = service.slice(service.indexOf("export async function sendKidsConfirmation"), service.indexOf("export async function queueKidsConfirmation"));
    assert.match(send, /findOne\(\{ _id: registrationId, paymentStatus: "paid" \}\)/);
    for (const status of ['"sent"', '"skipped"', '"failed"']) assert.ok(send.includes(`"confirmationEmail.status": ${status}`), status);
    assert.match(send, /\$inc: \{ "confirmationEmail\.attempts": 1 \}/);
  });

  it("email is scheduled only on the real paid transition, after the response", () => {
    assert.match(service, /after\(\(\) =>/);
    const triggers = [
      "src/app/api/kids-challenge/payments/verify/route.ts",
      "src/app/api/kids-challenge/payments/webhook/route.ts",
      "src/app/api/admin/kids-challenge/registrations/[id]/sync/route.ts",
    ];
    for (const route of triggers) {
      const code = src(route);
      assert.match(code, /if \(result\.status === "paid"\) scheduleKidsConfirmation\(/, route);
      assert.equal(code.split("scheduleKidsConfirmation(").length - 1, 1, `${route} schedules exactly once`);
    }
  });
});
