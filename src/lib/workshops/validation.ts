/** Workshop validation shared by client + server. Strict: rejects unknown fields. */
import { z } from "zod";

export const workshopSchema = z
  .object({
    // Inner spaces collapsed so "AI  Film" and "AI Film" count as the same title.
    title: z
      .string()
      .trim()
      .min(3, "Enter a title (min 3 characters).")
      .max(140)
      .transform((v) => v.replace(/\s+/g, " ")),
    description: z.string().trim().min(10, "Enter a description (min 10 characters).").max(3000),
    // Blank date / location means "to be announced".
    date: z.preprocess((v) => (v === "" || v === undefined ? null : v), z.coerce.date<Date>("Pick a valid date.").nullable()),
    location: z
      .string()
      .trim()
      .max(200)
      .refine((v) => v === "" || v.length >= 2, "Enter a location.")
      .default(""),
    // Data URL produced by the browser FileReader, e.g. "data:image/png;base64,....".
    image: z
      .string()
      .regex(/^data:image\/(png|jpe?g|webp|gif);base64,/, "Upload an image file (PNG, JPG, WEBP or GIF).")
      .max(4_500_000, "Image too large — keep it under 3 MB."),
  })
  .strict();

/** Editing: leaving out the image keeps the one already stored. */
export const workshopUpdateSchema = workshopSchema.partial({ image: true });

export type WorkshopInput = z.infer<typeof workshopSchema>;