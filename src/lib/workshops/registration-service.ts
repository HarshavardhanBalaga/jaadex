/**
 * Workshop registration rules (SERVER-ONLY). Routes stay thin: they handle auth,
 * rate limits and validation, then call in here. Notifications plug in here later.
 */
import "server-only";
import { Types } from "mongoose";
import { connectToDatabase } from "@/lib/mongodb";
import { isWorkshopUpcoming } from "@/lib/workshops/format";
import { isDuplicateKeyError } from "@/lib/workshops/queries";
import {
  escapeRegex,
  type RegistrationInput,
  type RegistrationListQuery,
  type RegistrationSettings,
} from "@/lib/workshops/registration-validation";
import type { CurrentUser } from "@/lib/user/session";
import { WorkshopModel } from "@/models/Workshop";
import { WorkshopRegistrationModel, type ConfirmationEmailStatus } from "@/models/WorkshopRegistration";
import { WorkshopEmailModel } from "@/models/WorkshopEmail";
import { WorkshopEmailAttachmentModel } from "@/models/WorkshopEmailAttachment";
import { getAdminAuthConfig } from "@/lib/admin/auth-config";
import { sendWorkshopEmail } from "@/lib/admin/mailer";
import { buildRegistrationConfirmationEmail } from "@/lib/workshops/registration-email";

const DAY_MS = 24 * 60 * 60 * 1000;

export type RegisterResult =
  | { ok: true; registrationId: string }
  | { ok: false; reason: "not_found" | "closed" | "completed" | "full" | "already_registered" }
  /** Another account already registered with this email or phone. */
  | { ok: false; reason: "contact_taken"; field: "email" | "phone" };

type Duplicate = { ok: false; reason: "already_registered" } | { ok: false; reason: "contact_taken"; field: "email" | "phone" };

/** Which of the person's details is already registered for this workshop, if any. */
async function findDuplicate(workshopId: string, userId: Types.ObjectId, input: RegistrationInput): Promise<Duplicate | null> {
  const existing = await WorkshopRegistrationModel.findOne({
    workshopId,
    $or: [{ userId }, { email: input.email }, { phone: input.phone }],
  })
    .select({ userId: 1, email: 1 })
    .lean();
  if (!existing) return null;
  if (String(existing.userId) === String(userId)) return { ok: false, reason: "already_registered" };
  return { ok: false, reason: "contact_taken", field: existing.email === input.email ? "email" : "phone" };
}

/** The unique index that refused a racing insert, mapped to the same results as findDuplicate. */
function duplicateFromKeyError(err: unknown): Duplicate {
  const pattern = (err as { keyPattern?: Record<string, unknown> }).keyPattern ?? {};
  if ("email" in pattern) return { ok: false, reason: "contact_taken", field: "email" };
  if ("phone" in pattern) return { ok: false, reason: "contact_taken", field: "phone" };
  return { ok: false, reason: "already_registered" };
}

/** Mongo filter matching what isWorkshopUpcoming() accepts: undated, or not yet past its day. */
function upcomingFilter() {
  return { $or: [{ date: null }, { date: { $gte: new Date(Date.now() - DAY_MS) } }] };
}

/**
 * Re-align the seat counter with the real registration rows, e.g. after a row was
 * deleted outside the app. Compare-and-set: if a sign-up moves the counter while we
 * count, the write is skipped, so a live reservation is never wiped out.
 */
async function syncRegistrationCount(workshopId: string): Promise<void> {
  const w = await WorkshopModel.findById(workshopId).select({ registrationCount: 1 }).lean();
  if (!w) return;
  const observed = w.registrationCount ?? 0;
  const actual = await WorkshopRegistrationModel.countDocuments({ workshopId });
  if (actual !== observed) {
    await WorkshopModel.updateOne({ _id: workshopId, registrationCount: observed }, { $set: { registrationCount: actual } });
  }
}

/** One atomic $inc guarded by the capacity, so two people can never take the last seat. */
function reserveSeat(workshopId: string) {
  return WorkshopModel.findOneAndUpdate(
    {
      _id: workshopId,
      "registration.enabled": true,
      $and: [
        upcomingFilter(),
        { $or: [{ "registration.capacity": null }, { $expr: { $lt: ["$registrationCount", "$registration.capacity"] } }] },
      ],
    },
    { $inc: { registrationCount: 1 } },
  )
    .select({ _id: 1 })
    .lean();
}

/**
 * Reserve a seat, then save the registration. If saving fails, the seat is handed
 * back. No transaction needed, so it also works on a standalone Mongo.
 */
export async function registerForWorkshop(workshopId: string, user: CurrentUser, input: RegistrationInput): Promise<RegisterResult> {
  await connectToDatabase();
  const userId = new Types.ObjectId(user.id);
  const duplicate = await findDuplicate(workshopId, userId, input);
  if (duplicate) return duplicate;

  let reserved = await reserveSeat(workshopId);
  if (!reserved) {
    // Looks full: the counter may be stale, so re-align it with the real rows and try once more.
    await syncRegistrationCount(workshopId);
    reserved = await reserveSeat(workshopId);
  }

  if (!reserved) {
    // Work out which rule refused, so the visitor gets an accurate message.
    const w = await WorkshopModel.findById(workshopId).select({ date: 1, registration: 1 }).lean();
    if (!w) return { ok: false, reason: "not_found" };
    if (!w.registration?.enabled) return { ok: false, reason: "closed" };
    if (!isWorkshopUpcoming(w.date ? new Date(w.date).toISOString() : null)) return { ok: false, reason: "completed" };
    return { ok: false, reason: "full" };
  }

  let registrationId: string;
  try {
    const created = await WorkshopRegistrationModel.create({
      workshopId,
      userId,
      name: input.name,
      phone: input.phone,
      email: input.email,
      status: "confirmed",
      // The route sends the confirmation after responding; until then it is pending.
      confirmationEmail: { status: "pending", attempts: 0, lastAttemptAt: null, sentAt: null, lastError: null },
    });
    registrationId = String(created._id);
  } catch (err) {
    await WorkshopModel.updateOne({ _id: workshopId }, { $inc: { registrationCount: -1 } });
    // A racing submit with the same account, email or phone: a unique index caught it.
    if (isDuplicateKeyError(err)) return duplicateFromKeyError(err);
    throw err;
  }
  return { ok: true, registrationId };
}

/** Admin-facing failure reason: one line, capped, never more than the SMTP error message itself. */
function emailErrorReason(err: unknown): string {
  const message = err instanceof Error ? err.message : String(err);
  return message.replace(/\s+/g, " ").trim().slice(0, 300) || "Unknown error";
}

/**
 * Send the confirmation email for one registration and record the outcome on it.
 * Never throws for SMTP problems: a failed send is stored as "failed" for admins to resend.
 */
export async function sendRegistrationConfirmation(registrationId: string): Promise<ConfirmationEmailStatus | null> {
  await connectToDatabase();
  const reg = await WorkshopRegistrationModel.findById(registrationId).select({ workshopId: 1, name: 1, email: 1 }).lean();
  if (!reg) return null;
  const w = await WorkshopModel.findById(reg.workshopId).select({ title: 1, date: 1, location: 1 }).lean();
  if (!w) return null;
  const email = buildRegistrationConfirmationEmail({
    name: reg.name,
    workshopTitle: w.title,
    date: w.date ? new Date(w.date).toISOString() : null,
    location: w.location ?? "",
    workshopsUrl: `${getAdminAuthConfig().appUrl}/workshops`,
  });
  const now = new Date();
  let set: Record<string, unknown>;
  try {
    const result = await sendWorkshopEmail(reg.email, email);
    set = result === "sent"
      ? { "confirmationEmail.status": "sent", "confirmationEmail.sentAt": now, "confirmationEmail.lastError": null }
      : { "confirmationEmail.status": "skipped", "confirmationEmail.lastError": "Email is not configured on the server (SMTP)." };
  } catch (err) {
    set = { "confirmationEmail.status": "failed", "confirmationEmail.lastError": emailErrorReason(err) };
  }
  await WorkshopRegistrationModel.updateOne(
    { _id: registrationId },
    { $set: { ...set, "confirmationEmail.lastAttemptAt": now }, $inc: { "confirmationEmail.attempts": 1 } },
  );
  return set["confirmationEmail.status"] as ConfirmationEmailStatus;
}

/** A pending email older than this is treated as stuck (the process stopped mid-send). */
const STUCK_PENDING_MS = 10 * 60 * 1000;

export type ResendResult =
  | { ok: true; status: ConfirmationEmailStatus }
  | { ok: false; reason: "not_found" | "already_sent_or_in_progress" };

/**
 * Admin resend. The atomic claim (status → pending) only succeeds for failed, skipped,
 * untracked (older rows) or stuck emails, so a double-click can't send twice and a
 * delivered confirmation can't be re-sent.
 */
export async function resendRegistrationConfirmation(workshopId: string, registrationId: string): Promise<ResendResult> {
  await connectToDatabase();
  const claimed = await WorkshopRegistrationModel.findOneAndUpdate(
    {
      _id: registrationId,
      workshopId,
      $or: [
        { "confirmationEmail.status": { $in: ["failed", "skipped"] } },
        { "confirmationEmail.status": { $exists: false } },
        { "confirmationEmail.status": "pending", "confirmationEmail.lastAttemptAt": { $lt: new Date(Date.now() - STUCK_PENDING_MS) } },
        { "confirmationEmail.status": "pending", "confirmationEmail.lastAttemptAt": null, createdAt: { $lt: new Date(Date.now() - STUCK_PENDING_MS) } },
      ],
    },
    { $set: { "confirmationEmail.status": "pending", "confirmationEmail.lastAttemptAt": new Date() } },
  )
    .select({ _id: 1 })
    .lean();
  if (!claimed) {
    const exists = await WorkshopRegistrationModel.exists({ _id: registrationId, workshopId });
    return { ok: false, reason: exists ? "already_sent_or_in_progress" : "not_found" };
  }
  const status = await sendRegistrationConfirmation(registrationId);
  return status ? { ok: true, status } : { ok: false, reason: "not_found" };
}

export type SettingsResult =
  | { ok: true; registration: { enabled: boolean; capacity: number | null; count: number } }
  | { ok: false; reason: "not_found" | "completed" | "capacity_below_count"; count?: number };

/** Opening needs an upcoming workshop; closing is always allowed. Capacity can't drop below seats already taken. */
export async function updateRegistrationSettings(workshopId: string, settings: RegistrationSettings): Promise<SettingsResult> {
  await connectToDatabase();
  const w = await WorkshopModel.findById(workshopId).select({ date: 1 }).lean();
  if (!w) return { ok: false, reason: "not_found" };
  if (settings.enabled && !isWorkshopUpcoming(w.date ? new Date(w.date).toISOString() : null)) {
    return { ok: false, reason: "completed" };
  }
  // Judge the seat limit against real registrations, not a stale counter.
  await syncRegistrationCount(workshopId);
  // The count guard sits in the same atomic update, so a sign-up landing meanwhile can't slip past it.
  const updated = await WorkshopModel.findOneAndUpdate(
    settings.capacity === null
      ? { _id: workshopId }
      : { _id: workshopId, registrationCount: { $lte: settings.capacity } },
    { $set: { "registration.enabled": settings.enabled, "registration.capacity": settings.capacity } },
    { returnDocument: "after", runValidators: true },
  )
    .select({ registration: 1, registrationCount: 1 })
    .lean();
  if (!updated) {
    const current = await WorkshopModel.findById(workshopId).select({ registrationCount: 1 }).lean();
    if (!current) return { ok: false, reason: "not_found" };
    return { ok: false, reason: "capacity_below_count", count: current.registrationCount ?? 0 };
  }
  return {
    ok: true,
    registration: {
      enabled: updated.registration?.enabled ?? false,
      capacity: updated.registration?.capacity ?? null,
      count: updated.registrationCount ?? 0,
    },
  };
}

const ROW_FIELDS = { name: 1, phone: 1, email: 1, createdAt: 1, confirmationEmail: 1 } as const;

type RegistrationRowDoc = {
  _id: Types.ObjectId;
  name: string;
  phone: string;
  email: string;
  createdAt: Date;
  confirmationEmail?: { status?: ConfirmationEmailStatus; sentAt?: Date | null; lastError?: string | null; attempts?: number };
};

function toRow(d: RegistrationRowDoc) {
  return {
    id: String(d._id),
    name: d.name,
    phone: d.phone,
    email: d.email,
    createdAt: new Date(d.createdAt),
    // null = registered before email tracking existed.
    emailStatus: d.confirmationEmail?.status ?? null,
    emailSentAt: d.confirmationEmail?.sentAt ? new Date(d.confirmationEmail.sentAt) : null,
    emailError: d.confirmationEmail?.lastError ?? null,
    emailAttempts: d.confirmationEmail?.attempts ?? 0,
  };
}

/** All registrations, newest first. Used by the CSV export. */
export async function listRegistrations(workshopId: string) {
  await connectToDatabase();
  const docs = await WorkshopRegistrationModel.find({ workshopId }).select(ROW_FIELDS).sort({ createdAt: -1 }).lean<RegistrationRowDoc[]>();
  return docs.map(toRow);
}

/** Confirmation-email filter → Mongo condition. "not_sent" includes rows from before email tracking. */
const EMAIL_FILTERS: Record<Exclude<RegistrationListQuery["email"], "all">, Record<string, unknown>> = {
  sent: { "confirmationEmail.status": "sent" },
  failed: { "confirmationEmail.status": "failed" },
  pending: { "confirmationEmail.status": "pending" },
  not_sent: { $or: [{ "confirmationEmail.status": "skipped" }, { "confirmationEmail.status": { $exists: false } }] },
};

/**
 * Admin list: search, email-status filter, whitelisted sort and pagination, all in Mongo.
 * The _id tie-breaker keeps the order stable, so rows never repeat or go missing between pages.
 */
export async function queryRegistrations(workshopId: string, query: RegistrationListQuery) {
  await connectToDatabase();
  const and: Record<string, unknown>[] = [{ workshopId: new Types.ObjectId(workshopId) }];
  if (query.q) {
    const contains = new RegExp(escapeRegex(query.q), "i");
    and.push({ $or: [{ name: contains }, { email: contains }, { phone: contains }] });
  }
  if (query.email !== "all") and.push(EMAIL_FILTERS[query.email]);
  const filter = and.length === 1 ? and[0] : { $and: and };
  const dir = query.order === "asc" ? 1 : -1;

  const find = WorkshopRegistrationModel.find(filter)
    .select(ROW_FIELDS)
    .sort({ [query.sort]: dir, _id: dir })
    .skip((query.page - 1) * query.limit)
    .limit(query.limit);
  // Case-insensitive name order ("anil" next to "Anil").
  if (query.sort === "name") find.collation({ locale: "en", strength: 2 });

  const [docs, total] = await Promise.all([find.lean<RegistrationRowDoc[]>(), WorkshopRegistrationModel.countDocuments(filter)]);
  const totalPages = Math.max(1, Math.ceil(total / query.limit));
  return {
    registrations: docs.map(toRow),
    pagination: {
      page: query.page,
      limit: query.limit,
      total,
      totalPages,
      hasNextPage: query.page < totalPages,
      hasPrevPage: query.page > 1,
    },
  };
}

/** Workshops this user holds a seat in: by account, or by their account email used from another account. */
export async function registeredWorkshopIds(user: CurrentUser): Promise<Set<string>> {
  await connectToDatabase();
  const docs = await WorkshopRegistrationModel.find({
    $or: [{ userId: new Types.ObjectId(user.id) }, { email: user.email.toLowerCase() }],
  })
    .select({ workshopId: 1 })
    .lean();
  return new Set(docs.map((d) => String(d.workshopId)));
}

/** Title for the export filename, or null if the workshop is gone. */
export async function workshopTitle(workshopId: string): Promise<string | null> {
  await connectToDatabase();
  const w = await WorkshopModel.findById(workshopId).select({ title: 1 }).lean();
  return w?.title ?? null;
}

/** Removing a workshop removes its registrations and the emails sent to them, so none are left orphaned. */
export async function deleteWorkshopRegistrations(workshopId: string): Promise<void> {
  await connectToDatabase();
  await WorkshopRegistrationModel.deleteMany({ workshopId });
  await WorkshopEmailModel.deleteMany({ workshopId });
  await WorkshopEmailAttachmentModel.deleteMany({ workshopId });
}
