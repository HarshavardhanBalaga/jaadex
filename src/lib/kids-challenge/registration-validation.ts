/** Kids Creative Challenge registration validation shared by client + server. Strict: rejects unknown fields. */
import { z } from "zod";

export { fieldErrorsOf } from "../workshops/registration-validation.ts";

/** Indian states and union territories, for the State dropdown. */
export const INDIAN_STATES = [
  "Andaman and Nicobar Islands",
  "Andhra Pradesh",
  "Arunachal Pradesh",
  "Assam",
  "Bihar",
  "Chandigarh",
  "Chhattisgarh",
  "Dadra and Nagar Haveli and Daman and Diu",
  "Delhi",
  "Goa",
  "Gujarat",
  "Haryana",
  "Himachal Pradesh",
  "Jammu and Kashmir",
  "Jharkhand",
  "Karnataka",
  "Kerala",
  "Ladakh",
  "Lakshadweep",
  "Madhya Pradesh",
  "Maharashtra",
  "Manipur",
  "Meghalaya",
  "Mizoram",
  "Nagaland",
  "Odisha",
  "Puducherry",
  "Punjab",
  "Rajasthan",
  "Sikkim",
  "Tamil Nadu",
  "Telangana",
  "Tripura",
  "Uttar Pradesh",
  "Uttarakhand",
  "West Bengal",
] as const;

export const MIN_CLASS = 1;
export const MAX_CLASS = 10;
export const MIN_AGE = 4;
export const MAX_AGE = 16;

export const kidsChallengeRegistrationSchema = z
  .object({
    parentName: z.string().trim().min(2, "Enter the parent/guardian name.").max(80, "Keep the name under 80 characters."),
    parentEmail: z.string().trim().toLowerCase().min(3, "Enter a valid email address.").max(254).email("Enter a valid email address."),
    // Exactly 10 digits, no country code or separators.
    parentPhone: z.string().trim().regex(/^[0-9]{10}$/, "Enter a 10-digit phone number."),
    studentName: z.string().trim().min(2, "Enter the student's name.").max(80, "Keep the name under 80 characters."),
    studentClass: z.coerce
      .number("Choose the student's class.")
      .int("Choose the student's class.")
      .min(MIN_CLASS, "Choose the student's class.")
      .max(MAX_CLASS, "Only Classes 1–10 can take part."),
    studentAge: z.coerce
      .number("Enter the student's age.")
      .int("Enter the age in whole years.")
      .min(MIN_AGE, `Age must be between ${MIN_AGE} and ${MAX_AGE}.`)
      .max(MAX_AGE, `Age must be between ${MIN_AGE} and ${MAX_AGE}.`),
    schoolName: z.string().trim().min(2, "Enter the school name.").max(120, "Keep the school name under 120 characters."),
    city: z.string().trim().min(2, "Enter the city.").max(60, "Keep the city under 60 characters."),
    state: z.enum(INDIAN_STATES, "Choose a state."),
    consent: z.literal(true, "Parent/guardian consent is required."),
    // Honeypot: real users leave it empty; bots fill it. Must stay empty.
    website: z.string().max(0, "Invalid submission.").optional().default(""),
  })
  .strict();

export type KidsChallengeRegistrationInput = z.infer<typeof kidsChallengeRegistrationSchema>;
