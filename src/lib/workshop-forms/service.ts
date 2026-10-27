/**
 * Workshop form data access (SERVER-ONLY). Used by the admin API routes and the
 * /admin/forms pages, so both read and write the same way.
 */
import "server-only";
import type { Types } from "mongoose";
import { connectToDatabase } from "@/lib/mongodb";
import { WorkshopModel } from "@/models/Workshop";
import { WorkshopFormModel } from "@/models/WorkshopForm";
import type { WorkshopFormSchemaInput } from "./validation";

export interface WorkshopFormRow {
  id: string;
  title: string;
  date: string; // ISO
  location: string;
  image: string; // data URL
  hasForm: boolean;
  formUpdatedAt: string | null; // ISO, only when hasForm
}

export interface WorkshopWithForm {
  workshop: { id: string; title: string; date: string; location: string };
  form: { schema: WorkshopFormSchemaInput; updatedAt: string | null } | null;
}

export type WorkshopFormWriteResult =
  | { ok: true; updatedAt: string }
  | { ok: false; code: "workshop_not_found" | "form_exists" | "form_not_found" };

function iso(value: Date | string): string {
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}

/** Every workshop (newest date first) with whether it already has a form. */
export async function listWorkshopsWithFormStatus(): Promise<WorkshopFormRow[]> {
  await connectToDatabase();
  const [workshops, forms] = await Promise.all([
    WorkshopModel.find({}).select({ title: 1, date: 1, location: 1, image: 1 }).sort({ date: -1 }).lean(),
    // Only the metadata: schemas can be large and the list does not need them.
    WorkshopFormModel.find({}).select({ workshopId: 1, updatedAt: 1 }).lean(),
  ]);
  const formUpdatedById = new Map(
    forms.map((f) => [String(f.workshopId), f.updatedAt ? iso(f.updatedAt) : null] as const),
  );
  return workshops.map((w) => {
    const id = String(w._id);
    const hasForm = formUpdatedById.has(id);
    return {
      id,
      title: w.title,
      date: iso(w.date),
      location: w.location,
      image: w.image,
      hasForm,
      formUpdatedAt: formUpdatedById.get(id) ?? null,
    };
  });
}

/** One workshop plus its form (if any). Null when the workshop does not exist. */
export async function getWorkshopWithForm(workshopId: string): Promise<WorkshopWithForm | null> {
  await connectToDatabase();
  const workshop = await WorkshopModel.findById(workshopId).select({ title: 1, date: 1, location: 1 }).lean();
  if (!workshop) return null;
  const form = await WorkshopFormModel.findOne({ workshopId }).select({ definition: 1, updatedAt: 1 }).lean();
  return {
    workshop: {
      id: String(workshop._id),
      title: workshop.title,
      date: iso(workshop.date),
      location: workshop.location,
    },
    form: form
      ? {
          schema: form.definition as WorkshopFormSchemaInput,
          updatedAt: form.updatedAt ? iso(form.updatedAt) : null,
        }
      : null,
  };
}

/** Creates the workshop's single form. The unique index on workshopId blocks duplicates. */
export async function createWorkshopForm(input: {
  workshopId: string;
  schema: WorkshopFormSchemaInput;
  adminId: Types.ObjectId;
}): Promise<WorkshopFormWriteResult> {
  await connectToDatabase();
  const workshopExists = await WorkshopModel.exists({ _id: input.workshopId });
  if (!workshopExists) return { ok: false, code: "workshop_not_found" };
  try {
    const created = await WorkshopFormModel.create({
      workshopId: input.workshopId,
      definition: input.schema,
      updatedBy: input.adminId,
    });
    return { ok: true, updatedAt: iso(created.updatedAt) };
  } catch (err) {
    if (typeof err === "object" && err !== null && "code" in err && err.code === 11000) {
      return { ok: false, code: "form_exists" };
    }
    throw err;
  }
}

/** Replaces the schema of the workshop's existing form. Never creates one. */
export async function updateWorkshopForm(input: {
  workshopId: string;
  schema: WorkshopFormSchemaInput;
  adminId: Types.ObjectId;
}): Promise<WorkshopFormWriteResult> {
  await connectToDatabase();
  const updated = await WorkshopFormModel.findOneAndUpdate(
    { workshopId: input.workshopId },
    { definition: input.schema, updatedBy: input.adminId },
    { returnDocument: "after" },
  )
    .select({ updatedAt: 1 })
    .lean();
  if (!updated) return { ok: false, code: "form_not_found" };
  return { ok: true, updatedAt: iso(updated.updatedAt) };
}
