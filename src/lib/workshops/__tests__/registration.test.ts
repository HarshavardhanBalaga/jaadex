/**
 * Workshop registration tests (no DB, no server-only imports).
 * Validation + CSV are tested directly; authorization and the seat-limit
 * guarantees are asserted via source structure, like auth-url-leakage.test.ts.
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { registrationSchema, registrationSettingsSchema } from "../registration-validation.ts";
import { buildRegistrationsCsv, registrationsCsvFilename } from "../registration-csv.ts";
import { buildRegistrationConfirmationEmail, buildWorkshopUpdateEmail } from "../registration-email.ts";
import { workshopEmailSchema } from "../workshop-email-validation.ts";
import { MAX_ATTACHMENT_BYTES, checkAttachment, precheckAttachment, safeAttachmentName } from "../attachment-rules.ts";

const root = process.cwd();
const src = (p: string): string => readFileSync(join(root, p), "utf8");

const good = { name: "Priya Sharma", phone: "9876543210", email: " Priya@Example.com ", website: "" };

describe("workshop registration validation", () => {
  it("accepts a valid registration and normalises email", () => {
    const parsed = registrationSchema.safeParse(good);
    assert.equal(parsed.success, true);
    assert.equal(parsed.data?.phone, "9876543210");
    assert.equal(parsed.data?.email, "priya@example.com");
  });

  it("rejects bad input", () => {
    assert.equal(registrationSchema.safeParse({ ...good, name: "A" }).success, false);
    assert.equal(registrationSchema.safeParse({ ...good, name: "x".repeat(81) }).success, false);
    assert.equal(registrationSchema.safeParse({ ...good, phone: "12345" }).success, false);
    assert.equal(registrationSchema.safeParse({ ...good, phone: "98765abcde" }).success, false);
    assert.equal(registrationSchema.safeParse({ ...good, phone: "+919876543210" }).success, false);
    assert.equal(registrationSchema.safeParse({ ...good, phone: "98765 43210" }).success, false);
    assert.equal(registrationSchema.safeParse({ ...good, phone: "98765432100" }).success, false);
    assert.equal(registrationSchema.safeParse({ ...good, email: "not-an-email" }).success, false);
    assert.equal(registrationSchema.safeParse({ ...good, phone: undefined }).success, false);
  });

  it("rejects a filled honeypot and unknown fields", () => {
    assert.equal(registrationSchema.safeParse({ ...good, website: "spam.example" }).success, false);
    assert.equal(registrationSchema.safeParse({ ...good, workshopId: "x" }).success, false);
  });

  it("validates admin settings", () => {
    assert.equal(registrationSettingsSchema.safeParse({ enabled: true, capacity: null }).success, true);
    assert.equal(registrationSettingsSchema.safeParse({ enabled: false, capacity: 50 }).success, true);
    assert.equal(registrationSettingsSchema.safeParse({ enabled: true, capacity: 0 }).success, false);
    assert.equal(registrationSettingsSchema.safeParse({ enabled: true, capacity: 2.5 }).success, false);
    assert.equal(registrationSettingsSchema.safeParse({ enabled: "yes", capacity: null }).success, false);
    assert.equal(registrationSettingsSchema.safeParse({ enabled: true }).success, false);
    assert.equal(registrationSettingsSchema.safeParse({ enabled: true, capacity: null, extra: 1 }).success, false);
  });
});

describe("workshop registration CSV", () => {
  const createdAt = new Date("2026-11-11T10:00:00.000Z");

  it("adds a BOM, a header and quoted cells", () => {
    const csv = buildRegistrationsCsv([
      { name: 'Ravi "RK" Kumar', phone: "+919876543210", email: "ravi@example.com", createdAt, emailStatus: "sent" },
      { name: "Old Row", phone: "9876543210", email: "old@example.com", createdAt, emailStatus: null },
    ]);
    assert.ok(csv.startsWith("﻿"));
    const [header, row, oldRow] = csv.slice(1).split("\r\n");
    assert.equal(header, '"Name","Phone","Email","Registered at (UTC)","Confirmation email"');
    assert.equal(row, '"Ravi ""RK"" Kumar","+919876543210","ravi@example.com","2026-11-11T10:00:00.000Z","sent"');
    assert.match(oldRow, /,"not sent"$/);
  });

  it("neutralises spreadsheet formulas", () => {
    const csv = buildRegistrationsCsv([{ name: "=HYPERLINK(\"http://evil\")", phone: "9876543210", email: "@x.com", createdAt, emailStatus: "failed" }]);
    assert.match(csv, /"'=HYPERLINK/);
    assert.match(csv, /"'@x\.com"/);
    assert.match(csv, /"9876543210"/);
    assert.match(buildRegistrationsCsv([{ name: "-1+1", phone: "+1", email: "a@b.c", createdAt, emailStatus: "skipped" }]), /"'-1\+1","\+1"/);
  });

  it("builds a header-safe filename", () => {
    assert.equal(registrationsCsvFilename("AI Film & Animation: Bootcamp!"), "ai-film-animation-bootcamp-registrations.csv");
    assert.equal(registrationsCsvFilename("చిత్రం"), "workshop-registrations.csv");
  });
});

describe("workshop registration confirmation email", () => {
  const base = { name: "Priya Sharma", workshopTitle: "AI Filmmaking", date: "2026-12-05T00:00:00.000Z", location: "RTIH, Mangalagiri", workshopsUrl: "https://jaadex.example/workshops" };

  it("confirms the registration with the workshop details", () => {
    const { subject, text } = buildRegistrationConfirmationEmail(base);
    assert.equal(subject, "You're registered: AI Filmmaking");
    assert.match(text, /^Hi Priya Sharma,/);
    assert.match(text, /registering for "AI Filmmaking"/);
    assert.match(text, /When & where: 5 December 2026 · RTIH, Mangalagiri/);
    assert.match(text, /https:\/\/jaadex\.example\/workshops/);
  });

  it("says 'to be announced' for an undated workshop", () => {
    const { text } = buildRegistrationConfirmationEmail({ ...base, date: null, location: "" });
    assert.match(text, /When & where: Date and location to be announced/);
  });

  it("keeps line breaks out of the subject and greeting", () => {
    const { subject, text } = buildRegistrationConfirmationEmail({ ...base, name: "Eve\r\nBcc: x@evil.com", workshopTitle: "AI\r\nBcc: y@evil.com" });
    assert.doesNotMatch(subject, /[\r\n]/);
    assert.match(text, /^Hi Eve Bcc: x@evil\.com,\n/);
  });
});

describe("admin custom emails to registrants", () => {
  const ok = { subject: "Venue details", message: "Please arrive by 9:30 AM at Hall B.", audience: "all" };
  const id = "6af408bb8ea6e5380f5456a4";

  it("validates the composer input", () => {
    assert.equal(workshopEmailSchema.safeParse(ok).success, true);
    assert.equal(workshopEmailSchema.safeParse({ ...ok, audience: "selected", registrationIds: [id] }).success, true);
    assert.equal(workshopEmailSchema.safeParse({ ...ok, audience: "selected", registrationIds: [] }).success, false);
    assert.equal(workshopEmailSchema.safeParse({ ...ok, audience: "selected", registrationIds: ["not-an-id"] }).success, false);
    assert.equal(workshopEmailSchema.safeParse({ ...ok, subject: "  " }).success, false);
    assert.equal(workshopEmailSchema.safeParse({ ...ok, message: "x".repeat(5001) }).success, false);
    assert.equal(workshopEmailSchema.safeParse({ ...ok, audience: "everyone" }).success, false);
    assert.equal(workshopEmailSchema.safeParse({ ...ok, bcc: "x@evil.com" }).success, false);
  });

  it("greets by name, keeps the message as written, and adds the workshop footer", () => {
    const { subject, text } = buildWorkshopUpdateEmail({
      name: "Priya",
      workshopTitle: "AI Filmmaking",
      date: "2026-12-05T00:00:00.000Z",
      location: "RTIH, Mangalagiri",
      workshopsUrl: "https://jaadex.example/workshops",
      subject: "Venue\r\nBcc: x@evil.com",
      message: "Line one.\n\nLine two.",
    });
    assert.doesNotMatch(subject, /[\r\n]/);
    assert.match(text, /^Hi Priya,\n\nLine one\.\n\nLine two\.\n\n/);
    assert.match(text, /Workshop: AI Filmmaking\nWhen & where: 5 December 2026 · RTIH, Mangalagiri/);
  });

  it("only admins send, delivery is tracked per recipient, and delete cascades", () => {
    const route = src("src/app/api/workshops/[id]/emails/route.ts");
    const retry = src("src/app/api/workshops/[id]/emails/[emailId]/retry/route.ts");
    const service = src("src/lib/workshops/workshop-email-service.ts");
    const post = route.slice(route.indexOf("export async function POST"), route.indexOf("export async function GET"));
    assert.ok(post.indexOf("validateCsrf(request)") < post.indexOf("requireAdminFromToken(access)"));
    assert.match(post, /workshopEmailSchema\.safeParse/);
    assert.match(post, /after\(\(\) =>\s*deliverWorkshopEmail\(emailId\)/);
    assert.match(route.slice(route.indexOf("export async function GET")), /requireAdminFromToken\(access\)/);
    assert.ok(retry.indexOf("validateCsrf(request)") < retry.indexOf("requireAdminFromToken(access)"));
    assert.match(service, /^import "server-only";/m);
    assert.match(service, /"recipients\.\$\.status": "sending"/);
    assert.match(service, /arrayFilters/);
    assert.match(service, /"recipients\.\$\[r\]\.attempts": 1/);
    assert.match(service, /"recipients\.\$\[r\]\.lastError"/);
    assert.match(service, /_id: \{ \$in: input\.registrationIds/);
    assert.match(src("src/lib/workshops/registration-service.ts"), /WorkshopEmailModel\.deleteMany\(\{ workshopId \}\)/);
    assert.match(src("src/components/admin/WorkshopEmailComposer.tsx"), /workshopEmailSchema\.safeParse\(/);
  });
});

describe("email attachments", () => {
  const bytes = (...head: number[]) => new Uint8Array([...head, 1, 2, 3, 4]);

  it("accepts real PDFs, images and Office files", () => {
    assert.deepEqual(checkAttachment("schedule.pdf", bytes(0x25, 0x50, 0x44, 0x46)), { ok: true, contentType: "application/pdf" });
    assert.equal(checkAttachment("venue.JPG", bytes(0xff, 0xd8, 0xff)).ok, true);
    assert.equal(checkAttachment("map.png", bytes(0x89, 0x50, 0x4e, 0x47)).ok, true);
    assert.equal(checkAttachment("agenda.docx", bytes(0x50, 0x4b, 0x03, 0x04)).ok, true);
    assert.equal(checkAttachment("old.doc", bytes(0xd0, 0xcf, 0x11, 0xe0)).ok, true);
  });

  it("rejects disallowed types, disguised files, empty and oversized files", () => {
    assert.equal(checkAttachment("setup.exe", bytes(0x4d, 0x5a)).ok, false);
    assert.equal(checkAttachment("page.html", bytes(0x3c, 0x68)).ok, false);
    // An executable renamed to .pdf
    assert.equal(checkAttachment("invoice.pdf", bytes(0x4d, 0x5a, 0x90, 0x00)).ok, false);
    assert.equal(checkAttachment("empty.pdf", new Uint8Array()).ok, false);
    assert.notEqual(precheckAttachment("big.pdf", MAX_ATTACHMENT_BYTES + 1), null);
    assert.equal(precheckAttachment("ok.pdf", MAX_ATTACHMENT_BYTES), null);
  });

  it("cleans file names for mail headers", () => {
    assert.equal(safeAttachmentName("C:\\fakepath\\Venue \"map\".pdf"), "Venue map.pdf");
    assert.equal(safeAttachmentName("../../etc/passwd.pdf"), "passwd.pdf");
    assert.equal(safeAttachmentName("a\r\nBcc: x.pdf"), "aBcc x.pdf");
    assert.equal(safeAttachmentName(".pdf"), "attachment.pdf");
  });

  it("composer limits attachment count; upload is admin-only and checks content", () => {
    const id = "6af408bb8ea6e5380f5456a4";
    const base = { subject: "Venue details", message: "Please arrive by 9:30 AM at Hall B.", audience: "all" };
    assert.equal(workshopEmailSchema.safeParse({ ...base, attachmentIds: [id] }).success, true);
    assert.equal(workshopEmailSchema.safeParse({ ...base, attachmentIds: Array(6).fill(id) }).success, false);
    const upload = src("src/app/api/workshops/[id]/emails/attachments/route.ts");
    assert.ok(upload.indexOf("validateCsrf(request)") < upload.indexOf("requireAdminFromToken(access)"));
    assert.match(upload, /content-length/);
    assert.match(upload, /checkAttachment\(filename, bytes\)/);
    const service = src("src/lib/workshops/workshop-email-service.ts");
    assert.match(service, /workshopId, linked: false \},\s*\{ \$set: \{ linked: true, emailId \} \}/);
    assert.match(service, /MAX_TOTAL_ATTACHMENT_BYTES/);
    assert.match(src("src/models/WorkshopEmailAttachment.ts"), /expireAfterSeconds: 24 \* 60 \* 60, partialFilterExpression: \{ linked: false \}/);
    assert.match(src("src/lib/workshops/registration-service.ts"), /WorkshopEmailAttachmentModel\.deleteMany\(\{ workshopId \}\)/);
  });
});

describe("workshop registration authorization", () => {
  const userRoute = src("src/app/api/workshops/[id]/registrations/route.ts");
  const exportRoute = src("src/app/api/workshops/[id]/registrations/export/route.ts");
  const settingsRoute = src("src/app/api/workshops/[id]/registration/route.ts");
  const service = src("src/lib/workshops/registration-service.ts");

  it("registration POST needs a signed-in user and is rate limited", () => {
    const post = userRoute.slice(userRoute.indexOf("export async function POST"), userRoute.indexOf("export async function GET"));
    assert.match(post, /getCurrentUser\(\)/);
    assert.match(post, /status:\s*401|, 401\)/);
    assert.match(post, /checkRateLimit\(`workshop-register:\$\{user\.id\}`/);
    assert.match(post, /registrationSchema\.safeParse/);
    assert.match(post, /isValidObjectId\(id\)/);
  });

  it("admin reads require an admin session", () => {
    const get = userRoute.slice(userRoute.indexOf("export async function GET"));
    assert.match(get, /requireAdminFromToken\(access\)/);
    assert.match(exportRoute, /requireAdminFromToken\(access\)/);
    assert.match(exportRoute, /text\/csv/);
    assert.match(exportRoute, /no-store/);
  });

  it("settings PATCH requires CSRF + admin session + zod", () => {
    assert.ok(settingsRoute.indexOf("validateCsrf(request)") < settingsRoute.indexOf("requireAdminFromToken(access)"));
    assert.match(settingsRoute, /registrationSettingsSchema\.safeParse/);
  });

  it("seat limit is enforced atomically and released on failure", () => {
    assert.match(service, /^import "server-only";/m);
    assert.match(service, /\$inc: \{ registrationCount: 1 \}/);
    assert.match(service, /\$lt: \["\$registrationCount", "\$registration\.capacity"\]/);
    assert.match(service, /\$inc: \{ registrationCount: -1 \}/);
    assert.match(service, /isDuplicateKeyError\(err\)/);
  });

  it("confirmation email is sent after the response, tracked, and resendable by admins only", () => {
    assert.match(userRoute, /after\(\(\) =>\s*sendRegistrationConfirmation\(registrationId\)/);
    assert.match(src("src/models/WorkshopRegistration.ts"), /confirmationEmail: \{/);
    assert.match(service, /"confirmationEmail\.attempts": 1/);
    assert.match(service, /"confirmationEmail\.lastError"/);
    assert.match(service, /"confirmationEmail\.status": \{ \$in: \["failed", "skipped"\] \}/);
    assert.match(src("src/lib/admin/mailer.ts"), /from: c\.mailFrom, to, subject: email\.subject/);
    const resend = src("src/app/api/workshops/[id]/registrations/[registrationId]/resend-email/route.ts");
    assert.ok(resend.indexOf("validateCsrf(request)") < resend.indexOf("requireAdminFromToken(access)"));
    assert.match(resend, /isValidObjectId\(registrationId\)/);
  });

  it("counts come from real registrations, and a stale counter heals itself", () => {
    const queries = src("src/lib/workshops/queries.ts");
    assert.match(queries, /WorkshopRegistrationModel\.aggregate/);
    assert.doesNotMatch(queries, /count: d\.registrationCount/);
    assert.match(service, /async function syncRegistrationCount/);
    assert.match(service, /registrationCount: observed \}, \{ \$set: \{ registrationCount: actual \} \}/);
    assert.match(service, /await syncRegistrationCount\(workshopId\);\s*reserved = await reserveSeat\(workshopId\);/);
  });

  it("one registration per account, email and phone, and workshop delete cascades", () => {
    const model = src("src/models/WorkshopRegistration.ts");
    assert.match(model, /index\(\{ workshopId: 1, userId: 1 \}, \{ unique: true \}\)/);
    assert.match(model, /index\(\{ workshopId: 1, email: 1 \}, \{ unique: true \}\)/);
    assert.match(model, /index\(\{ workshopId: 1, phone: 1 \}, \{ unique: true \}\)/);
    assert.match(service, /\$or: \[\{ userId \}, \{ email: input\.email \}, \{ phone: input\.phone \}\]/);
    assert.match(service, /keyPattern/);
    assert.match(service, /export async function registeredWorkshopIds/);
    assert.match(userRoute, /contact_already_registered/);
    const form = src("src/components/workshops/WorkshopRegisterForm.tsx");
    assert.match(form, /"already_registered"/);
    const registerPage = src("src/app/workshops/[id]/register/page.tsx");
    assert.match(registerPage, /registeredWorkshopIds\(user\)/);
    assert.match(registerPage, /alreadyRegistered \?/);
    assert.match(src("src/app/api/workshops/[id]/route.ts"), /deleteWorkshopRegistrations\(id\)/);
  });

  it("client forms validate with the shared zod schemas", () => {
    assert.match(src("src/components/workshops/WorkshopRegisterForm.tsx"), /registrationSchema\.safeParse\(/);
    assert.match(src("src/components/admin/WorkshopRegistrationsDialog.tsx"), /registrationSettingsSchema\.safeParse\(/);
  });
});
