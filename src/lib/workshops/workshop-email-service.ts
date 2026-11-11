/**
 * Admin custom emails to a workshop's registrants (SERVER-ONLY).
 * Every recipient's delivery is tracked on the message document.
 */
import "server-only";
import { Types } from "mongoose";
import { connectToDatabase } from "@/lib/mongodb";
import { getAdminAuthConfig } from "@/lib/admin/auth-config";
import { sendWorkshopEmail } from "@/lib/admin/mailer";
import { buildWorkshopUpdateEmail } from "@/lib/workshops/registration-email";
import type { WorkshopEmailInput } from "@/lib/workshops/workshop-email-validation";
import { WorkshopModel } from "@/models/Workshop";
import { WorkshopEmailModel, type RecipientStatus } from "@/models/WorkshopEmail";
import { WorkshopRegistrationModel } from "@/models/WorkshopRegistration";
import { WorkshopEmailAttachmentModel } from "@/models/WorkshopEmailAttachment";
import { MAX_TOTAL_ATTACHMENT_BYTES, formatBytes } from "@/lib/workshops/attachment-rules";

/** A recipient claimed longer ago than this is treated as stuck (the process stopped mid-send). */
const STUCK_SENDING_MS = 10 * 60 * 1000;

export type CreateResult =
  | { ok: true; id: string; recipientCount: number }
  | { ok: false; reason: "not_found" | "no_recipients" }
  | { ok: false; reason: "attachments_invalid"; message: string };

/** Store one checked upload until the email is sent. Unsent uploads expire after a day. */
export async function saveAttachment(
  workshopId: string,
  file: { filename: string; contentType: string; bytes: Buffer },
  uploadedBy: string,
): Promise<{ ok: true; id: string } | { ok: false; reason: "not_found" }> {
  await connectToDatabase();
  if (!(await WorkshopModel.exists({ _id: workshopId }))) return { ok: false, reason: "not_found" };
  const doc = await WorkshopEmailAttachmentModel.create({
    workshopId,
    filename: file.filename,
    contentType: file.contentType,
    size: file.bytes.length,
    data: file.bytes,
    uploadedBy,
  });
  return { ok: true, id: String(doc._id) };
}

type AttachmentMeta = { attachmentId: Types.ObjectId; filename: string; contentType: string; size: number };

/**
 * Link uploads to a new email in one atomic step (only unused uploads of this workshop),
 * so the same file can't be claimed by two sends and the total size limit can't be bypassed.
 */
async function linkAttachments(workshopId: string, ids: string[], emailId: Types.ObjectId): Promise<{ ok: true; meta: AttachmentMeta[] } | { ok: false; message: string }> {
  if (ids.length === 0) return { ok: true, meta: [] };
  const objectIds = [...new Set(ids)].map((id) => new Types.ObjectId(id));
  const found = await WorkshopEmailAttachmentModel.find({ _id: { $in: objectIds }, workshopId, linked: false })
    .select({ filename: 1, contentType: 1, size: 1 })
    .lean();
  if (found.length !== objectIds.length) return { ok: false, message: "An attachment expired or was already sent. Remove it and attach it again." };
  const total = found.reduce((sum, a) => sum + a.size, 0);
  if (total > MAX_TOTAL_ATTACHMENT_BYTES) return { ok: false, message: `Attachments add up to ${formatBytes(total)}; keep them under ${formatBytes(MAX_TOTAL_ATTACHMENT_BYTES)}.` };
  const linked = await WorkshopEmailAttachmentModel.updateMany(
    { _id: { $in: objectIds }, workshopId, linked: false },
    { $set: { linked: true, emailId } },
  );
  if (linked.modifiedCount !== objectIds.length) {
    // Another send took one of them meanwhile: undo ours.
    await WorkshopEmailAttachmentModel.updateMany({ emailId }, { $set: { linked: false, emailId: null } });
    return { ok: false, message: "An attachment was already sent. Remove it and attach it again." };
  }
  return { ok: true, meta: found.map((a) => ({ attachmentId: a._id, filename: a.filename, contentType: a.contentType, size: a.size })) };
}

/** Save the message with every recipient pending. Delivery runs separately (deliverWorkshopEmail). */
export async function createWorkshopEmail(workshopId: string, input: WorkshopEmailInput, sentBy: string): Promise<CreateResult> {
  await connectToDatabase();
  if (!(await WorkshopModel.exists({ _id: workshopId }))) return { ok: false, reason: "not_found" };
  // Selected ids are filtered to this workshop, so a stray id can never email someone else's registrant.
  const filter =
    input.audience === "all"
      ? { workshopId }
      : { workshopId, _id: { $in: input.registrationIds.map((id) => new Types.ObjectId(id)) } };
  const regs = await WorkshopRegistrationModel.find(filter).select({ name: 1, email: 1 }).sort({ createdAt: 1 }).lean();
  if (regs.length === 0) return { ok: false, reason: "no_recipients" };
  const emailId = new Types.ObjectId();
  const attachments = await linkAttachments(workshopId, input.attachmentIds, emailId);
  if (!attachments.ok) return { ok: false, reason: "attachments_invalid", message: attachments.message };
  const doc = await WorkshopEmailModel.create({
    _id: emailId,
    workshopId,
    subject: input.subject,
    message: input.message,
    audience: input.audience,
    sentBy,
    recipients: regs.map((r) => ({ registrationId: r._id, name: r.name, email: r.email, status: "pending" })),
    attachments: attachments.meta,
  });
  return { ok: true, id: String(doc._id), recipientCount: regs.length };
}

/** lean() may hand back a BSON Binary instead of a Node Buffer for binary fields. */
function toBuffer(value: unknown): Buffer {
  if (Buffer.isBuffer(value)) return value;
  const inner = (value as { buffer?: unknown }).buffer;
  if (inner instanceof Uint8Array) return Buffer.from(inner);
  return Buffer.from(value as Uint8Array);
}

function errorReason(err: unknown): string {
  const message = err instanceof Error ? err.message : String(err);
  return message.replace(/\s+/g, " ").trim().slice(0, 300) || "Unknown error";
}

/**
 * Send to every pending recipient, one at a time (easy on the SMTP provider).
 * Each recipient is claimed (pending → sending) before sending, so two runs never
 * email the same person. Never throws for SMTP problems: failures are stored per recipient.
 */
export async function deliverWorkshopEmail(emailId: string): Promise<void> {
  await connectToDatabase();
  const doc = await WorkshopEmailModel.findById(emailId).select({ workshopId: 1, subject: 1, message: 1, recipients: 1 }).lean();
  if (!doc) return;
  const w = await WorkshopModel.findById(doc.workshopId).select({ title: 1, date: 1, location: 1 }).lean();
  if (!w) return;
  const workshopsUrl = `${getAdminAuthConfig().appUrl}/workshops`;
  // Loaded once and reused for every recipient.
  const files = (await WorkshopEmailAttachmentModel.find({ emailId }).select({ filename: 1, contentType: 1, data: 1 }).lean()).map((a) => ({
    filename: a.filename,
    contentType: a.contentType,
    content: toBuffer(a.data),
  }));

  for (const r of doc.recipients.filter((x) => x.status === "pending")) {
    const claimed = await WorkshopEmailModel.updateOne(
      { _id: emailId, recipients: { $elemMatch: { registrationId: r.registrationId, status: "pending" } } },
      { $set: { "recipients.$.status": "sending", "recipients.$.lastAttemptAt": new Date() } },
    );
    if (claimed.modifiedCount === 0) continue;

    const email = buildWorkshopUpdateEmail({
      name: r.name,
      workshopTitle: w.title,
      date: w.date ? new Date(w.date).toISOString() : null,
      location: w.location ?? "",
      subject: doc.subject,
      message: doc.message,
      workshopsUrl,
    });
    let set: Record<string, unknown>;
    try {
      const result = await sendWorkshopEmail(r.email, email, files);
      set =
        result === "sent"
          ? { "recipients.$[r].status": "sent", "recipients.$[r].sentAt": new Date(), "recipients.$[r].lastError": null }
          : { "recipients.$[r].status": "skipped", "recipients.$[r].lastError": "Email is not configured on the server (SMTP)." };
    } catch (err) {
      set = { "recipients.$[r].status": "failed", "recipients.$[r].lastError": errorReason(err) };
    }
    await WorkshopEmailModel.updateOne(
      { _id: emailId },
      { $set: set, $inc: { "recipients.$[r].attempts": 1 } },
      { arrayFilters: [{ "r.registrationId": r.registrationId }] },
    );
  }
}

export type RetryResult = { ok: true; queued: number } | { ok: false; reason: "not_found" | "nothing_to_retry" };

/** Put failed, skipped and stuck recipients back to pending. The caller then runs deliverWorkshopEmail. */
export async function requeueFailedRecipients(workshopId: string, emailId: string): Promise<RetryResult> {
  await connectToDatabase();
  const stuckBefore = new Date(Date.now() - STUCK_SENDING_MS);
  const doc = await WorkshopEmailModel.findOne({ _id: emailId, workshopId }).select({ recipients: 1 }).lean();
  if (!doc) return { ok: false, reason: "not_found" };
  const retryable = doc.recipients.filter(
    (r) => r.status === "failed" || r.status === "skipped" || (r.status === "sending" && r.lastAttemptAt !== null && r.lastAttemptAt < stuckBefore),
  ).length;
  if (retryable === 0) return { ok: false, reason: "nothing_to_retry" };
  await WorkshopEmailModel.updateOne(
    { _id: emailId, workshopId },
    { $set: { "recipients.$[r].status": "pending" } },
    {
      arrayFilters: [
        { $or: [{ "r.status": { $in: ["failed", "skipped"] } }, { "r.status": "sending", "r.lastAttemptAt": { $lt: stuckBefore } }] },
      ],
    },
  );
  return { ok: true, queued: retryable };
}

export type WorkshopEmailSummary = {
  id: string;
  subject: string;
  message: string;
  audience: "all" | "selected";
  sentBy: string;
  createdAt: string;
  counts: { sent: number; failed: number; sending: number };
  attachments: { filename: string; size: number }[];
  recipients: { registrationId: string; name: string; email: string; status: RecipientStatus; attempts: number; sentAt: string | null; lastError: string | null }[];
};

/** Newest first, with per-recipient status and totals. */
export async function listWorkshopEmails(workshopId: string): Promise<WorkshopEmailSummary[]> {
  await connectToDatabase();
  const docs = await WorkshopEmailModel.find({ workshopId }).sort({ createdAt: -1 }).limit(100).lean();
  return docs.map((d) => {
    const count = (statuses: RecipientStatus[]) => d.recipients.filter((r) => statuses.includes(r.status)).length;
    return {
      id: String(d._id),
      subject: d.subject,
      message: d.message,
      audience: d.audience,
      sentBy: d.sentBy,
      createdAt: new Date(d.createdAt).toISOString(),
      counts: { sent: count(["sent"]), failed: count(["failed", "skipped"]), sending: count(["pending", "sending"]) },
      attachments: (d.attachments ?? []).map((a) => ({ filename: a.filename, size: a.size })),
      recipients: d.recipients.map((r) => ({
        registrationId: String(r.registrationId),
        name: r.name,
        email: r.email,
        status: r.status,
        attempts: r.attempts ?? 0,
        sentAt: r.sentAt ? new Date(r.sentAt).toISOString() : null,
        lastError: r.lastError ?? null,
      })),
    };
  });
}
