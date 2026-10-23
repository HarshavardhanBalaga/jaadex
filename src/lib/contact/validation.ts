/** Contact/enquiry validation shared by client + server. Strict: rejects unknown fields. */
import { z } from "zod";

export const interests = [
  "JaaDeX Animate for Schools",
  "AI Filmmaking Courses",
  "Animation and Storytelling",
  "Partnership or Collaboration",
  "Product Demonstration",
  "General Enquiry",
] as const;

export const contactSchema = z
  .object({
    name: z.string().trim().min(2, "Enter your name.").max(80),
    email: z.string().trim().toLowerCase().min(3).max(254).email("Enter a valid email address."),
    organization: z.string().trim().max(100).default(""),
    interest: z.enum(interests, "Choose a topic."),
    message: z.string().trim().min(10, "Tell us a little more (min 10 characters).").max(2000),
    // Honeypot: real users leave it empty; bots fill it. Must stay empty.
    website: z.string().max(0, "Invalid submission.").optional().default(""),
  })
  .strict();

export type ContactInput = z.infer<typeof contactSchema>;
