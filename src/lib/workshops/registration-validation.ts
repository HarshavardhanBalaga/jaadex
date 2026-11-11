/** Workshop registration validation shared by client + server. Strict: rejects unknown fields. */
import { z } from "zod";

export const registrationSchema = z
  .object({
    name: z.string().trim().min(2, "Enter your name.").max(80, "Keep your name under 80 characters."),
    // Exactly 10 digits, no country code or separators.
    phone: z.string().trim().regex(/^[0-9]{10}$/, "Enter a 10-digit phone number."),
    email: z.string().trim().toLowerCase().min(3, "Enter a valid email address.").max(254).email("Enter a valid email address."),
    // Honeypot: real users leave it empty; bots fill it. Must stay empty.
    website: z.string().max(0, "Invalid submission.").optional().default(""),
  })
  .strict();

export type RegistrationInput = z.infer<typeof registrationSchema>;

export const MAX_CAPACITY = 100_000;

/** Admin registration settings. capacity null = unlimited seats. */
export const registrationSettingsSchema = z
  .object({
    enabled: z.boolean("Choose whether registration is open."),
    capacity: z
      .number("Enter a whole number of seats.")
      .int("Enter a whole number of seats.")
      .min(1, "Allow at least 1 seat.")
      .max(MAX_CAPACITY, `Keep it under ${MAX_CAPACITY.toLocaleString("en-IN")} seats.`)
      .nullable(),
  })
  .strict();

export type RegistrationSettings = z.infer<typeof registrationSettingsSchema>;

/** Validation failures as { field: [messages] }, the same shape the API returns. */
export function fieldErrorsOf(error: z.ZodError): Record<string, string[]> {
  return z.flattenError(error).fieldErrors as Record<string, string[]>;
}
