/**
 * Kids Challenge custom (admin-written) email tests. Schema and template are tested directly;
 * recipient resolution, delivery claims, retry and attachment linking via source structure.
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { kidsChallengeEmailSchema, kidsEmailListQuerySchema } from "../email-validation.ts";
import { buildKidsChallengeUpdateEmail } from "../confirmation-email.ts";
import { MAX_ATTACHMENTS } from "../../workshops/attachment-rules.ts";

const src = (p: string): string => readFileSync(join(process.cwd(), p), "utf8");
const ID = "0123456789abcdef01234567";

const good = { subject: "Submission deadline", message: "Please submit your comic by Friday.", audience: "paid", registrationIds: [], attachmentIds: [] };

describe("custom email schema", () => {
  it("accepts every audience", () => {
    for (const audience of ["paid", "pending", "all"]) assert.equal(kidsChallengeEmailSchema.safeParse({ ...good, audience }).success, true, audience);
    assert.equal(kidsChallengeEmailSchema.safeParse({ ...good, audience: "selected", registrationIds: [ID] }).success, true);
  });

  it("rejects bad input", () => {
    const bad = (patch: Record<string, unknown>) => kidsChallengeEmailSchema.safeParse({ ...good, ...patch }).success;
    assert.equal(bad({ subject: "Hi" }), false);
    assert.equal(bad({ subject: "x".repeat(151) }), false);
    assert.equal(bad({ message: "short" }), false);
    assert.equal(bad({ message: "x".repeat(5001) }), false);
    assert.equal(bad({ audience: "everyone" }), false);
    assert.equal(bad({ audience: "selected", registrationIds: [] }), false);
    assert.equal(bad({ audience: "selected", registrationIds: ["not-an-id"] }), false);
    assert.equal(bad({ attachmentIds: Array.from({ length: MAX_ATTACHMENTS + 1 }, () => ID) }), false);
    assert.equal(bad({ extra: true }), false);
  });

  it("list query: page only", () => {
    assert.equal(kidsEmailListQuerySchema.parse({}).page, 1);
    assert.equal(kidsEmailListQuerySchema.safeParse({ page: "0" }).success, false);
    assert.equal(kidsEmailListQuerySchema.safeParse({ limit: "500" }).success, false);
  });
});

const base = {
  parentName: "Lakshmi Rao",
  studentName: "Anil Rao",
  studentClass: 5,
  subject: "Submission deadline",
  message: "First paragraph.\n\nSecond paragraph.",
  challengeUrl: "https://www.jaadex.com/kids-creative-challenge",
  registerUrl: "https://www.jaadex.com/kids-creative-challenge/register",
  siteUrl: "https://www.jaadex.com",
};

describe("custom email template", () => {
  it("greets the parent, keeps the admin's paragraphs and adds the child's registration", () => {
    const { text, html } = buildKidsChallengeUpdateEmail({ ...base, paid: true });
    assert.ok(text.startsWith("Hi Lakshmi Rao,"));
    assert.ok(text.includes("First paragraph.\n\nSecond paragraph."));
    assert.ok(text.includes("Student: Anil Rao") && text.includes("Class: Class 5") && text.includes("Registration: Confirmed"));
    assert.equal((html.match(/First paragraph\.|Second paragraph\./g) ?? []).length, 2);
  });

  it("paid parents get the challenge link; unpaid parents get Complete payment", () => {
    const paid = buildKidsChallengeUpdateEmail({ ...base, paid: true });
    assert.ok(paid.html.includes("View the challenge") && paid.html.includes(base.challengeUrl));
    assert.equal(paid.html.includes("Complete payment"), false);
    const pending = buildKidsChallengeUpdateEmail({ ...base, paid: false });
    assert.ok(pending.html.includes("Complete payment") && pending.html.includes(base.registerUrl));
    assert.ok(pending.text.includes("Registration: Payment pending"));
  });

  it("subject stays on one line and names are escaped", () => {
    const e = buildKidsChallengeUpdateEmail({ ...base, paid: true, subject: "Hello\r\nBcc: x@evil.com", parentName: "<b>x</b>" });
    assert.equal(/[\r\n]/.test(e.subject), false);
    assert.equal(e.html.includes("<b>x</b>"), false);
    assert.ok(e.html.includes("&lt;b&gt;x&lt;/b&gt;"));
  });
});

describe("delivery guarantees", () => {
  const service = src("src/lib/kids-challenge/email-service.ts");

  it("recipients are resolved on the server by payment status; selected only matches existing registrations", () => {
    const fn = service.slice(service.indexOf("function audienceFilter"));
    assert.match(fn, /audience === "paid"\) return \{ paymentStatus: "paid" \}/);
    assert.match(fn, /audience === "pending"\) return \{ paymentStatus: \{ \$ne: "paid" \} \}/);
    assert.match(fn, /audience === "selected"\) return \{ _id: \{ \$in:/);
    assert.match(service, /KidsChallengeRegistrationModel\.find\(audienceFilter\(input\.audience, input\.registrationIds\)\)/);
  });

  it("each recipient is claimed pending → sending before sending", () => {
    const deliver = service.slice(service.indexOf("export async function deliverKidsChallengeEmail"));
    assert.match(deliver, /recipients: \{ \$elemMatch: \{ registrationId: r\.registrationId, status: "pending" \} \}/);
    assert.match(deliver, /"recipients\.\$\.status": "sending"/);
    assert.ok(deliver.indexOf("claimed.modifiedCount === 0") < deliver.indexOf("sendWorkshopEmail("));
  });

  it("retry requeues failed, skipped and stuck recipients only", () => {
    const retry = service.slice(service.indexOf("export async function requeueFailedKidsRecipients"));
    assert.match(retry, /"r\.status": \{ \$in: \["failed", "skipped"\] \}/);
    assert.match(retry, /"r\.status": "sending", "r\.lastAttemptAt": \{ \$lt: stuckBefore \}/);
  });

  it("attachments are linked atomically and rolled back on a race", () => {
    const link = service.slice(service.indexOf("async function linkKidsAttachments"));
    assert.match(link, /updateMany\(\{ _id: \{ \$in: objectIds \}, linked: false \}/);
    assert.match(link, /linked\.modifiedCount !== objectIds\.length/);
    assert.match(link, /\$set: \{ linked: false, emailId: null \}/);
    assert.match(src("src/models/KidsChallengeEmailAttachment.ts"), /expireAfterSeconds: 24 \* 60 \* 60, partialFilterExpression: \{ linked: false \}/);
  });

  it("delivery runs after the response, for sends and retries", () => {
    for (const route of ["src/app/api/admin/kids-challenge/emails/route.ts", "src/app/api/admin/kids-challenge/emails/[emailId]/retry/route.ts"]) {
      assert.match(src(route), /after\(\(\) =>\s*deliverKidsChallengeEmail\(emailId\)/, route);
    }
  });

  it("uploads are size-checked before reading and content-checked after", () => {
    const upload = src("src/app/api/admin/kids-challenge/emails/attachments/route.ts");
    assert.ok(upload.indexOf('headers.get("content-length")') < upload.indexOf("request.formData()"));
    assert.match(upload, /checkAttachment\(filename, bytes\)/);
  });
});

describe("email tracking on the dashboard", () => {
  it("analytics reports confirmation emails over paid registrations and custom emails per recipient", () => {
    const service = src("src/lib/kids-challenge/admin-service.ts");
    const stats = service.slice(service.indexOf("async function kidsEmailStats"));
    assert.match(stats, /\$match: \{ paymentStatus: "paid" \}/);
    assert.match(stats, /\$unwind: "\$recipients"/);
    assert.match(stats, /\$group: \{ _id: "\$recipients\.status"/);
    assert.match(service, /emails,\s*\};/);
  });

  it("the composer re-checks recipients and asks for confirmation before sending", () => {
    const composer = src("src/components/admin/kids/KidsChallengeEmailComposer.tsx");
    const submit = composer.slice(composer.indexOf("async function onSubmit"), composer.indexOf("async function send("));
    assert.match(submit, /getAdminJson<\{ audienceCounts: AudienceCounts \}>\("\/api\/admin\/kids-challenge\/emails\?page=1"/);
    assert.match(submit, /setConfirmSend\(/);
    assert.doesNotMatch(submit, /method: "POST"/);
    assert.match(composer, /<ConfirmDialog\s+title=\{`Send to \$\{confirmSend\.count\}/);
  });
});

