/** Workshop validation shared by client + server. Strict: rejects unknown fields. */
import { z } from "zod";

export const workshopSchema = z
  .object({
    title: z.string().trim().min(3, "Enter a title (min 3 characters).").max(140),
    description: z.string().trim().min(10, "Enter a description (min 10 characters).").max(3000),
    date: z.coerce.date<Date>("Pick a valid date."),
    location: z.string().trim().min(2, "Enter a location.").max(200),
    // Data URL produced by the browser FileReader, e.g. "data:image/png;base64,....".
    image: z
      .string()
      .regex(/^data:image\/(png|jpe?g|webp|gif);base64,/, "Upload an image file (PNG, JPG, WEBP or GIF).")
      .max(4_500_000, "Image too large — keep it under 3 MB."),
  })
  .strict();

export type WorkshopInput = z.infer<typeof workshopSchema>;