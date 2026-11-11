/** Admin-written email to a workshop's registrants. One document per message, recipients embedded. */
import mongoose, { Document, Model, Schema, Types } from "mongoose";

/** sending = claimed by a delivery run (stops two runs emailing the same person); skipped = SMTP not configured. */
export type RecipientStatus = "pending" | "sending" | "sent" | "failed" | "skipped";

export interface WorkshopEmailRecipient {
  registrationId: Types.ObjectId;
  /** Copied at send time so the history stays accurate. */
  name: string;
  email: string;
  status: RecipientStatus;
  attempts: number;
  lastAttemptAt: Date | null;
  sentAt: Date | null;
  lastError: string | null;
}

export interface WorkshopEmailDoc extends Document {
  _id: Types.ObjectId;
  workshopId: Types.ObjectId;
  subject: string;
  message: string;
  audience: "all" | "selected";
  sentBy: string;
  recipients: WorkshopEmailRecipient[];
  /** File details for the history; the bytes live in workshop_email_attachments. */
  attachments: { attachmentId: Types.ObjectId; filename: string; contentType: string; size: number }[];
  createdAt: Date;
  updatedAt: Date;
}

const RecipientSchema = new Schema<WorkshopEmailRecipient>(
  {
    registrationId: { type: Schema.Types.ObjectId, ref: "WorkshopRegistration", required: true },
    name: { type: String, required: true, maxlength: 80 },
    email: { type: String, required: true, maxlength: 254 },
    status: { type: String, enum: ["pending", "sending", "sent", "failed", "skipped"], required: true, default: "pending" },
    attempts: { type: Number, default: 0, min: 0 },
    lastAttemptAt: { type: Date, default: null },
    sentAt: { type: Date, default: null },
    lastError: { type: String, default: null, maxlength: 300 },
  },
  { _id: false },
);

const WorkshopEmailSchema = new Schema<WorkshopEmailDoc>(
  {
    workshopId: { type: Schema.Types.ObjectId, ref: "Workshop", required: true },
    subject: { type: String, required: true, trim: true, maxlength: 150 },
    message: { type: String, required: true, trim: true, maxlength: 5000 },
    audience: { type: String, enum: ["all", "selected"], required: true },
    sentBy: { type: String, required: true, maxlength: 254 },
    recipients: { type: [RecipientSchema], default: [] },
    attachments: {
      type: [
        new Schema(
          {
            attachmentId: { type: Schema.Types.ObjectId, ref: "WorkshopEmailAttachment", required: true },
            filename: { type: String, required: true, maxlength: 120 },
            contentType: { type: String, required: true, maxlength: 120 },
            size: { type: Number, required: true },
          },
          { _id: false },
        ),
      ],
      default: [],
    },
  },
  { timestamps: true, collection: "workshop_emails" },
);

WorkshopEmailSchema.index({ workshopId: 1, createdAt: -1 });

// Dev hot reload keeps mongoose.models alive: drop the old model so schema edits apply without a restart.
if (process.env.NODE_ENV === "development" && mongoose.models.WorkshopEmail) mongoose.deleteModel("WorkshopEmail");

export const WorkshopEmailModel: Model<WorkshopEmailDoc> =
  mongoose.models.WorkshopEmail ?? mongoose.model<WorkshopEmailDoc>("WorkshopEmail", WorkshopEmailSchema);
