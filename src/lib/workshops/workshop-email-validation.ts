/** Admin custom-email validation shared by the composer + API. Strict: rejects unknown fields. */
import { z } from "zod";
import { MAX_ATTACHMENTS } from "./attachment-rules.ts";

export const SUBJECT_MAX = 150;
export const MESSAGE_MAX = 5000;

export const workshopEmailSchema = z
  .object({
    subject: z.string().trim().min(3, "Enter a subject (min 3 characters).").max(SUBJECT_MAX, `Keep the subject under ${SUBJECT_MAX} characters.`),
    message: z.string().trim().min(10, "Write a message (min 10 characters).").max(MESSAGE_MAX, `Keep the message under ${MESSAGE_MAX} characters.`),
    audience: z.enum(["all", "selected"], "Choose who receives this email."),
    registrationIds: z.array(z.string().regex(/^[0-9a-f]{24}$/i, "Invalid recipient.")).max(2000).default([]),
    // Ids returned by the attachment upload endpoint.
    attachmentIds: z
      .array(z.string().regex(/^[0-9a-f]{24}$/i, "Invalid attachment."))
      .max(MAX_ATTACHMENTS, `Attach up to ${MAX_ATTACHMENTS} files.`)
      .default([]),
  })
  .strict()
  .superRefine((v, ctx) => {
    if (v.audience === "selected" && v.registrationIds.length === 0) {
      ctx.addIssue({ code: "custom", path: ["registrationIds"], message: "Select at least one registrant." });
    }
  });

export type WorkshopEmailInput = z.infer<typeof workshopEmailSchema>;
