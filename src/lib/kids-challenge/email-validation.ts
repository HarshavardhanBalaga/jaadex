/** Kids Challenge admin custom-email validation, shared by the composer and the API. Strict: rejects unknown fields. */
import { z } from "zod";
import { MAX_ATTACHMENTS } from "../workshops/attachment-rules.ts";

export const KIDS_SUBJECT_MAX = 150;
export const KIDS_MESSAGE_MAX = 5000;
export const KIDS_EMAIL_PAGE_LIMIT = 20;

const objectId = (message: string) => z.string().regex(/^[0-9a-f]{24}$/i, message);

export const kidsChallengeEmailSchema = z
  .object({
    subject: z.string().trim().min(3, "Enter a subject (min 3 characters).").max(KIDS_SUBJECT_MAX, `Keep the subject under ${KIDS_SUBJECT_MAX} characters.`),
    message: z.string().trim().min(10, "Write a message (min 10 characters).").max(KIDS_MESSAGE_MAX, `Keep the message under ${KIDS_MESSAGE_MAX} characters.`),
    /** paid = confirmed parents · pending = awaiting payment · all = everyone · selected = ticked rows. */
    audience: z.enum(["paid", "pending", "all", "selected"], "Choose who receives this email."),
    registrationIds: z.array(objectId("Invalid recipient.")).max(2000, "Select up to 2,000 parents.").default([]),
    // Ids returned by the attachment upload endpoint.
    attachmentIds: z.array(objectId("Invalid attachment.")).max(MAX_ATTACHMENTS, `Attach up to ${MAX_ATTACHMENTS} files.`).default([]),
  })
  .strict()
  .superRefine((v, ctx) => {
    if (v.audience === "selected" && v.registrationIds.length === 0) {
      ctx.addIssue({ code: "custom", path: ["registrationIds"], message: "Select at least one parent." });
    }
  });

export type KidsChallengeEmailInput = z.infer<typeof kidsChallengeEmailSchema>;

export const kidsEmailListQuerySchema = z
  .object({
    page: z.coerce.number("Page must be a number.").int().min(1, "Page starts at 1.").default(1),
  })
  .strict();

export const AUDIENCE_LABEL = {
  paid: "Paid parents",
  pending: "Parents awaiting payment",
  all: "All parents",
  selected: "Selected parents",
} as const;
