/** Workshop reads shared by the public page, admin dashboard and API. */
import { workshopInterest } from "@/lib/contact/validation";
import { connectToDatabase } from "@/lib/mongodb";
import { isWorkshopUpcoming } from "@/lib/workshops/format";
import { WORKSHOP_TITLE_COLLATION, WorkshopModel } from "@/models/Workshop";
import { WorkshopRegistrationModel } from "@/models/WorkshopRegistration";

const LIST_FIELDS = { title: 1, description: 1, date: 1, location: 1, image: 1, registration: 1 };

export const DUPLICATE_TITLE_MESSAGE = "A workshop with this title already exists. Please use a different title.";

/** True if another workshop already uses this title. Pass `exceptId` when editing so a workshop can keep its own title. */
export async function isWorkshopTitleTaken(title: string, exceptId?: string): Promise<boolean> {
  await connectToDatabase();
  const existing = await WorkshopModel.exists(exceptId ? { title, _id: { $ne: exceptId } } : { title }).collation(WORKSHOP_TITLE_COLLATION);
  return existing !== null;
}

/** The unique title index rejected a write: two saves raced past isWorkshopTitleTaken. */
export function isDuplicateKeyError(err: unknown): boolean {
  return typeof err === "object" && err !== null && "code" in err && (err as { code: number }).code === 11000;
}

/** Enquiry-form topics for upcoming workshops: undated first, then soonest first. Skips the images, so it stays cheap. */
export async function listUpcomingWorkshopInterests(): Promise<string[]> {
  await connectToDatabase();
  const docs = await WorkshopModel.find({}).select({ title: 1, date: 1 }).sort({ date: 1 }).lean();
  const upcoming = docs.filter((d) => isWorkshopUpcoming(d.date ? new Date(d.date).toISOString() : null));
  // Set: titles written before the unique rule existed may still repeat.
  return [...new Set(upcoming.map((d) => workshopInterest(d.title)))];
}

/** Undated ("to be announced") workshops first, then newest date first. No limit returns all. */
export async function listWorkshops(limit = Infinity) {
  await connectToDatabase();
  // Two queries: a descending date sort would put undated workshops last, where the limit could cut them off.
  const toMongoLimit = (n: number) => (Number.isFinite(n) ? n : 0); // Mongo treats limit 0 as "no limit".
  const undated = await WorkshopModel.find({ date: null })
    .select(LIST_FIELDS)
    .sort({ createdAt: -1 })
    .limit(toMongoLimit(limit))
    .lean();
  const remaining = limit - undated.length;
  const dated =
    remaining > 0
      ? await WorkshopModel.find({ date: { $ne: null } })
          .select(LIST_FIELDS)
          .sort({ date: -1 })
          .limit(toMongoLimit(remaining))
          .lean()
      : [];
  const workshops = [...undated, ...dated];
  // Seats taken = real registration rows, so counts stay right even if a row is removed outside the app.
  // (Workshop.registrationCount is only the atomic gate for reserving a seat.)
  const counts = new Map(
    (
      await WorkshopRegistrationModel.aggregate<{ _id: unknown; n: number }>([
        { $match: { workshopId: { $in: workshops.map((d) => d._id) } } },
        { $group: { _id: "$workshopId", n: { $sum: 1 } } },
      ])
    ).map((c) => [String(c._id), c.n]),
  );
  return workshops.map((d) => ({
    id: String(d._id),
    title: d.title,
    description: d.description,
    date: d.date ? new Date(d.date).toISOString() : null,
    location: d.location ?? "",
    image: d.image,
    // Workshops saved before registration existed read as "closed, unlimited, none taken".
    registration: {
      enabled: d.registration?.enabled ?? false,
      capacity: d.registration?.capacity ?? null,
      count: counts.get(String(d._id)) ?? 0,
    },
  }));
}
