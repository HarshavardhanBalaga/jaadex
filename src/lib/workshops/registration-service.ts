/**
 * Workshop registration rules (SERVER-ONLY). Routes stay thin: they handle auth,
 * rate limits and validation, then call in here. Notifications plug in here later.
 */
import "server-only";
import { Types } from "mongoose";
import { connectToDatabase } from "@/lib/mongodb";
import { isWorkshopUpcoming } from "@/lib/workshops/format";
import { isDuplicateKeyError } from "@/lib/workshops/queries";
import type { RegistrationInput, RegistrationSettings } from "@/lib/workshops/registration-validation";
import type { CurrentUser } from "@/lib/user/session";
import { WorkshopModel } from "@/models/Workshop";
import { WorkshopRegistrationModel } from "@/models/WorkshopRegistration";

const DAY_MS = 24 * 60 * 60 * 1000;

export type RegisterResult =
  | { ok: true }
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

  try {
    await WorkshopRegistrationModel.create({
      workshopId,
      userId,
      name: input.name,
      phone: input.phone,
      email: input.email,
      status: "confirmed",
    });
  } catch (err) {
    await WorkshopModel.updateOne({ _id: workshopId }, { $inc: { registrationCount: -1 } });
    // A racing submit with the same account, email or phone: a unique index caught it.
    if (isDuplicateKeyError(err)) return duplicateFromKeyError(err);
    throw err;
  }
  return { ok: true };
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

/** Newest first. Used by the admin list and the CSV export. */
export async function listRegistrations(workshopId: string) {
  await connectToDatabase();
  const docs = await WorkshopRegistrationModel.find({ workshopId })
    .select({ name: 1, phone: 1, email: 1, createdAt: 1 })
    .sort({ createdAt: -1 })
    .lean();
  return docs.map((d) => ({
    id: String(d._id),
    name: d.name,
    phone: d.phone,
    email: d.email,
    createdAt: new Date(d.createdAt),
  }));
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

/** Removing a workshop removes its registrations too, so none are left orphaned. */
export async function deleteWorkshopRegistrations(workshopId: string): Promise<void> {
  await connectToDatabase();
  await WorkshopRegistrationModel.deleteMany({ workshopId });
}
