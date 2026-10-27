/** Workshop form validation shared by the API routes. Accepts a form-js schema, nothing else. */
import { z } from "zod";

/** Upper bound on the stored schema, so one form cannot bloat the collection. */
export const MAX_FORM_SCHEMA_BYTES = 200_000;

/**
 * form-js exports `{ type: "default", schemaVersion, components: [...] }`. We check the
 * shape that matters to us and keep the rest, since form-js owns the full format.
 */
export const workshopFormSchema = z
  .object({
    type: z.literal("default"),
    components: z.array(z.record(z.string(), z.unknown())).max(300),
  })
  .loose()
  .refine((schema) => JSON.stringify(schema).length <= MAX_FORM_SCHEMA_BYTES, {
    message: "Form is too large to save. Remove some fields and try again.",
  });

export const createWorkshopFormSchema = z.object({
  workshopId: z.string().regex(/^[a-f\d]{24}$/i, "Invalid workshop id."),
  schema: workshopFormSchema,
});

export const updateWorkshopFormSchema = z.object({
  schema: workshopFormSchema,
});

export type WorkshopFormSchemaInput = z.infer<typeof workshopFormSchema>;
