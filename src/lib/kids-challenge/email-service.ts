/**
 * Admin custom emails to Kids Challenge parents (SERVER-ONLY). Mirrors the workshop email service:
 * one document per message, every recipient's delivery tracked on it, delivery one at a time with an
 * atomic per-recipient claim, failed/stuck recipients requeued on retry.
 */
import "server-only";
import { Types } from "mongoose";
import { connectToDatabase } from "@/lib/mongodb";
import { getAdminAuthConfig } from "@/lib/admin/auth-config";
import { sendWorkshopEmail } from "@/lib/admin/mailer";
import { buildKidsChallengeUpdateEmail } from "@/lib/kids-challenge/confirmation-email";
import type { KidsChallengeEmailInput } from "@/lib/kids-challenge/email-validation";
import { MAX_TOTAL_ATTACHMENT_BYTES, formatBytes } from "@/lib/workshops/attachment-rules";
import { KidsChallengeRegistrationModel } from "@/models/KidsChallengeRegistration";
import { KidsChallengeEmailModel, type KidsEmailAudience, type KidsRecipientStatus } from "@/models/KidsChallengeEmail";
import { KidsChallengeEmailAttachmentModel } from "@/models/KidsChallengeEmailAttachment";

/** A recipient claimed longer ago than this is treated as stuck (the process stopped mid-send). */
const STUCK_SENDING_MS = 10 * 60 * 1000;

function errorReason(err: unknown): string {
  const message = err instanceof Error ? err.message : String(err);
  return message.replace(/\s+/g, " ").trim().slice(0, 300) || "Unknown error";
}

/** lean() may hand back a BSON Binary instead of a Node Buffer for binary fields. */
function toBuffer(value: unknown): Buffer {
  if (Buffer.isBuffer(value)) return value;
  const inner = (value as { buffer?: unknown }).buffer;
  if (inner instanceof Uint8Array) return Buffer.from(inner);
  return Buffer.from(value as Uint8Array);
}

/* ------------------------------------------------------------------ attachments */

/** Store one checked upload until the email is sent. Unsent uploads expire after a day. */
export async function saveKidsEmailAttachment(file: { filename: string; contentType: string; bytes: Buffer }, uploadedBy: string): Promise<{ id: string }> {
  await connectToDatabase();
  const doc = await KidsChallengeEmailAttachmentModel.create({
    filename: file.filename,
    contentType: file.contentType,
    size: file.bytes.length,
    data: file.bytes,
    uploadedBy,
  });
  return { id: String(doc._id) };
}

type AttachmentMeta = { attachmentId: Types.ObjectId; filename: string; contentType: string; size: number };

/**
 * Link uploads to a new email in one atomic step (only unused uploads), so the same file can't be
 * claimed by two sends and the total size limit can't be bypassed.
 */
async function linkKidsAttachments(ids: string[], emailId: Types.ObjectId): Promise<{ ok: true; meta: AttachmentMeta[] } | { ok: false; message: string }> {
  if (ids.length === 0) return { ok: true, meta: [] };
  const objectIds = [...new Set(ids)].map((id) => new Types.ObjectId(id));
  const found = await KidsChallengeEmailAttachmentModel.find({ _id: { $in: objectIds }, linked: false }).select({ filename: 1, contentType: 1, size: 1 }).lean();
  if (found.length !== objectIds.length) return { ok: false, message: "An attachment expired or was already sent. Remove it and attach it again." };
  const total = found.reduce((sum, a) => sum + a.size, 0);
  if (total > MAX_TOTAL_ATTACHMENT_BYTES) return { ok: false, message: `Attachments add up to ${formatBytes(total)}; keep them under ${formatBytes(MAX_TOTAL_ATTACHMENT_BYTES)}.` };
  const linked = await KidsChallengeEmailAttachmentModel.updateMany({ _id: { $in: objectIds }, linked: false }, { $set: { linked: true, emailId } });
  if (linked.modifiedCount !== objectIds.length) {
    // Another send took one of them meanwhile: undo ours.
    await KidsChallengeEmailAttachmentModel.updateMany({ emailId }, { $set: { linked: false, emailId: null } });
    return { ok: false, message: "An attachment was already sent. Remove it and attach it again." };
  }
  return { ok: true, meta: found.map((a) => ({ attachmentId: a._id, filename: a.filename, contentType: a.contentType, size: a.size })) };
}

/* ------------------------------------------------------------------ create / deliver / retry */

/** Who an audience means, resolved on the server. "selected" only ever matches registrations that exist. */
function audienceFilter(audience: KidsEmailAudience, registrationIds: string[]): Record<string, unknown> {
  if (audience === "paid") return { paymentStatus: "paid" };
  if (audience === "pending") return { paymentStatus: { $ne: "paid" } };
  if (audience === "selected") return { _id: { $in: [...new Set(registrationIds)].map((id) => new Types.ObjectId(id)) } };
  return {};
}

export type CreateKidsEmailResult =
  | { ok: true; id: string; recipientCount: number }
  | { ok: false; reason: "no_recipients" }
  | { ok: false; reason: "attachments_invalid"; message: string };

/** Save the message with every recipient pending. Delivery runs separately (deliverKidsChallengeEmail). */
export async function createKidsChallengeEmail(input: KidsChallengeEmailInput, sentBy: string): Promise<CreateKidsEmailResult> {
  await connectToDatabase();
  const regs = await KidsChallengeRegistrationModel.find(audienceFilter(input.audience, input.registrationIds))
    .select({ parentName: 1, parentEmail: 1, studentName: 1 })
    .sort({ createdAt: 1 })
    .lean();
  if (regs.length === 0) return { ok: false, reason: "no_recipients" };
  const emailId = new Types.ObjectId();
  const attachments = await linkKidsAttachments(input.attachmentIds, emailId);
  if (!attachments.ok) return { ok: false, reason: "attachments_invalid", message: attachments.message };
  const doc = await KidsChallengeEmailModel.create({
    _id: emailId,
    subject: input.subject,
    message: input.message,
    audience: input.audience,
    sentBy,
    // One email per registration: each one is about that child, so siblings' parents get one per child.
    recipients: regs.map((r) => ({ registrationId: r._id, parentName: r.parentName, parentEmail: r.parentEmail, studentName: r.studentName, status: "pending" })),
    attachments: attachments.meta,
  });
  return { ok: true, id: String(doc._id), recipientCount: regs.length };
}

/**
 * Send to every pending recipient, one at a time (easy on the SMTP provider). Each recipient is
 * claimed (pending → sending) before sending, so two runs never email the same parent.
 * Never throws for SMTP problems: failures are stored per recipient.
 */
export async function deliverKidsChallengeEmail(emailId: string): Promise<void> {
  await connectToDatabase();
  const doc = await KidsChallengeEmailModel.findById(emailId).select({ subject: 1, message: 1, recipients: 1 }).lean();
  if (!doc) return;
  const pending = doc.recipients.filter((x) => x.status === "pending");
  if (pending.length === 0) return;
  const { appUrl } = getAdminAuthConfig();
  // Current class and payment state, so the button matches the registration at send time.
  const regs = new Map(
    (
      await KidsChallengeRegistrationModel.find({ _id: { $in: pending.map((r) => r.registrationId) } })
        .select({ studentClass: 1, paymentStatus: 1 })
        .lean()
    ).map((r) => [String(r._id), r]),
  );
  // Loaded once and reused for every recipient.
  const files = (await KidsChallengeEmailAttachmentModel.find({ emailId }).select({ filename: 1, contentType: 1, data: 1 }).lean()).map((a) => ({
    filename: a.filename,
    contentType: a.contentType,
    content: toBuffer(a.data),
  }));

  for (const r of pending) {
    const claimed = await KidsChallengeEmailModel.updateOne(
      { _id: emailId, recipients: { $elemMatch: { registrationId: r.registrationId, status: "pending" } } },
      { $set: { "recipients.$.status": "sending", "recipients.$.lastAttemptAt": new Date() } },
    );
    if (claimed.modifiedCount === 0) continue;

    const reg = regs.get(String(r.registrationId));
    let set: Record<string, unknown>;
    if (!reg) {
      set = { "recipients.$[r].status": "failed", "recipients.$[r].lastError": "This registration no longer exists." };
    } else {
      const email = buildKidsChallengeUpdateEmail({
        parentName: r.parentName,
        studentName: r.studentName,
        studentClass: reg.studentClass,
        paid: reg.paymentStatus === "paid",
        subject: doc.subject,
        message: doc.message,
        challengeUrl: `${appUrl}/kids-creative-challenge`,
        registerUrl: `${appUrl}/kids-creative-challenge/register`,
        siteUrl: appUrl,
      });
      try {
        const result = await sendWorkshopEmail(r.parentEmail, email, files);
        set =
          result === "sent"
            ? { "recipients.$[r].status": "sent", "recipients.$[r].sentAt": new Date(), "recipients.$[r].lastError": null }
            : { "recipients.$[r].status": "skipped", "recipients.$[r].lastError": "Email is not configured on the server (SMTP)." };
      } catch (err) {
        set = { "recipients.$[r].status": "failed", "recipients.$[r].lastError": errorReason(err) };
      }
    }
    await KidsChallengeEmailModel.updateOne(
      { _id: emailId },
      { $set: set, $inc: { "recipients.$[r].attempts": 1 } },
      { arrayFilters: [{ "r.registrationId": r.registrationId }] },
    );
  }
}

export type RetryKidsEmailResult = { ok: true; queued: number } | { ok: false; reason: "not_found" | "nothing_to_retry" };

/** Put failed, skipped and stuck recipients back to pending. The caller then runs deliverKidsChallengeEmail. */
export async function requeueFailedKidsRecipients(emailId: string): Promise<RetryKidsEmailResult> {
  await connectToDatabase();
  const stuckBefore = new Date(Date.now() - STUCK_SENDING_MS);
  const doc = await KidsChallengeEmailModel.findById(emailId).select({ recipients: 1 }).lean();
  if (!doc) return { ok: false, reason: "not_found" };
  const retryable = doc.recipients.filter(
    (r) => r.status === "failed" || r.status === "skipped" || (r.status === "sending" && r.lastAttemptAt !== null && r.lastAttemptAt < stuckBefore),
  ).length;
  if (retryable === 0) return { ok: false, reason: "nothing_to_retry" };
  await KidsChallengeEmailModel.updateOne(
    { _id: emailId },
    { $set: { "recipients.$[r].status": "pending" } },
    { arrayFilters: [{ $or: [{ "r.status": { $in: ["failed", "skipped"] } }, { "r.status": "sending", "r.lastAttemptAt": { $lt: stuckBefore } }] }] },
  );
  return { ok: true, queued: retryable };
}

/* ------------------------------------------------------------------ reads */

type Counts = { total: number; sent: number; failed: number; sending: number };

function countsOf(recipients: { status: KidsRecipientStatus }[]): Counts {
  const count = (statuses: KidsRecipientStatus[]) => recipients.filter((r) => statuses.includes(r.status)).length;
  return { total: recipients.length, sent: count(["sent"]), failed: count(["failed", "skipped"]), sending: count(["pending", "sending"]) };
}

export type KidsEmailSummary = {
  id: string;
  subject: string;
  message: string;
  audience: KidsEmailAudience;
  sentBy: string;
  createdAt: string;
  counts: Counts;
  attachments: { filename: string; size: number }[];
};

export type KidsEmailRecipientRow = {
  registrationId: string;
  parentName: string;
  parentEmail: string;
  studentName: string;
  status: KidsRecipientStatus;
  attempts: number;
  sentAt: string | null;
  lastError: string | null;
};

type EmailLean = {
  _id: Types.ObjectId;
  subject: string;
  message: string;
  audience: KidsEmailAudience;
  sentBy: string;
  createdAt: Date;
  recipients: { registrationId: Types.ObjectId; parentName: string; parentEmail: string; studentName: string; status: KidsRecipientStatus; attempts?: number; sentAt?: Date | null; lastError?: string | null }[];
  attachments?: { filename: string; size: number }[];
};

function toSummary(d: EmailLean): KidsEmailSummary {
  return {
    id: String(d._id),
    subject: d.subject,
    message: d.message,
    audience: d.audience,
    sentBy: d.sentBy,
    createdAt: new Date(d.createdAt).toISOString(),
    counts: countsOf(d.recipients),
    attachments: (d.attachments ?? []).map((a) => ({ filename: a.filename, size: a.size })),
  };
}

/** History, newest first, with delivery totals (recipients are loaded per email on demand). */
export async function listKidsChallengeEmails(page: number, limit: number) {
  await connectToDatabase();
  const [docs, total] = await Promise.all([
    KidsChallengeEmailModel.find({})
      .select({ subject: 1, message: 1, audience: 1, sentBy: 1, createdAt: 1, attachments: 1, "recipients.status": 1 })
      .sort({ createdAt: -1, _id: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean<EmailLean[]>(),
    KidsChallengeEmailModel.countDocuments({}),
  ]);
  const totalPages = Math.max(1, Math.ceil(total / limit));
  return {
    emails: docs.map(toSummary),
    pagination: { page, limit, total, totalPages, hasNextPage: page < totalPages, hasPrevPage: page > 1 },
  };
}

/** One email with every recipient's delivery. */
export async function getKidsChallengeEmail(emailId: string): Promise<(KidsEmailSummary & { recipients: KidsEmailRecipientRow[] }) | null> {
  await connectToDatabase();
  const d = await KidsChallengeEmailModel.findById(emailId).lean<EmailLean>();
  if (!d) return null;
  return {
    ...toSummary(d),
    recipients: d.recipients.map((r) => ({
      registrationId: String(r.registrationId),
      parentName: r.parentName,
      parentEmail: r.parentEmail,
      studentName: r.studentName,
      status: r.status,
      attempts: r.attempts ?? 0,
      sentAt: r.sentAt ? new Date(r.sentAt).toISOString() : null,
      lastError: r.lastError ?? null,
    })),
  };
}

/** How many parents each audience reaches right now (shown in the composer). */
export async function kidsEmailAudienceCounts(): Promise<{ all: number; paid: number; pending: number }> {
  await connectToDatabase();
  const [all, paid] = await Promise.all([KidsChallengeRegistrationModel.countDocuments({}), KidsChallengeRegistrationModel.countDocuments({ paymentStatus: "paid" })]);
  return { all, paid, pending: all - paid };
}

export type RegistrationMessage = { emailId: string; subject: string; createdAt: string; sentBy: string; status: KidsRecipientStatus; sentAt: string | null; lastError: string | null };

/** Custom emails this registration's parent was sent, newest first (detail window). */
export async function emailsForRegistration(registrationId: string): Promise<RegistrationMessage[]> {
  await connectToDatabase();
  const regId = new Types.ObjectId(registrationId);
  const docs = await KidsChallengeEmailModel.find({ "recipients.registrationId": regId })
    .select({ subject: 1, sentBy: 1, createdAt: 1, recipients: { $elemMatch: { registrationId: regId } } })
    .sort({ createdAt: -1 })
    .limit(50)
    .lean<EmailLean[]>();
  return docs.flatMap((d) => {
    const r = d.recipients[0];
    if (!r) return [];
    return [
      {
        emailId: String(d._id),
        subject: d.subject,
        createdAt: new Date(d.createdAt).toISOString(),
        sentBy: d.sentBy,
        status: r.status,
        sentAt: r.sentAt ? new Date(r.sentAt).toISOString() : null,
        lastError: r.lastError ?? null,
      },
    ];
  });
}
