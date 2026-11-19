/** Admin-written email to Kids Challenge parents. One document per message, recipients embedded. */
import mongoose, { Document, Model, Schema, Types } from "mongoose";

/** sending = claimed by a delivery run (stops two runs emailing the same parent); skipped = SMTP not configured. */
export type KidsRecipientStatus = "pending" | "sending" | "sent" | "failed" | "skipped";
export type KidsEmailAudience = "paid" | "pending" | "all" | "selected";

export interface KidsChallengeEmailRecipient {
  registrationId: Types.ObjectId;
  /** Copied at send time so the history stays accurate. */
  parentName: string;
  parentEmail: string;
  studentName: string;
  status: KidsRecipientStatus;
  attempts: number;
  lastAttemptAt: Date | null;
  sentAt: Date | null;
  lastError: string | null;
}

export interface KidsChallengeEmailDoc extends Document {
  _id: Types.ObjectId;
  subject: string;
  message: string;
  audience: KidsEmailAudience;
  sentBy: string;
  recipients: KidsChallengeEmailRecipient[];
  /** File details for the history; the bytes live in kids_challenge_email_attachments. */
  attachments: { attachmentId: Types.ObjectId; filename: string; contentType: string; size: number }[];
  createdAt: Date;
  updatedAt: Date;
}

const RecipientSchema = new Schema<KidsChallengeEmailRecipient>(
  {
    registrationId: { type: Schema.Types.ObjectId, ref: "KidsChallengeRegistration", required: true },
    parentName: { type: String, required: true, maxlength: 80 },
    parentEmail: { type: String, required: true, maxlength: 254 },
    studentName: { type: String, required: true, maxlength: 80 },
    status: { type: String, enum: ["pending", "sending", "sent", "failed", "skipped"], required: true, default: "pending" },
    attempts: { type: Number, default: 0, min: 0 },
    lastAttemptAt: { type: Date, default: null },
    sentAt: { type: Date, default: null },
    lastError: { type: String, default: null, maxlength: 300 },
  },
  { _id: false },
);

const KidsChallengeEmailSchema = new Schema<KidsChallengeEmailDoc>(
  {
    subject: { type: String, required: true, trim: true, maxlength: 150 },
    message: { type: String, required: true, trim: true, maxlength: 5000 },
    audience: { type: String, enum: ["paid", "pending", "all", "selected"], required: true },
    sentBy: { type: String, required: true, maxlength: 254 },
    recipients: { type: [RecipientSchema], default: [] },
    attachments: {
      type: [
        new Schema(
          {
            attachmentId: { type: Schema.Types.ObjectId, ref: "KidsChallengeEmailAttachment", required: true },
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
  { timestamps: true, collection: "kids_challenge_emails" },
);

KidsChallengeEmailSchema.index({ createdAt: -1 });
// "Messages sent" in a registration's detail window.
KidsChallengeEmailSchema.index({ "recipients.registrationId": 1, createdAt: -1 });

// Dev hot reload keeps mongoose.models alive: drop the old model so schema edits apply without a restart.
if (process.env.NODE_ENV === "development" && mongoose.models.KidsChallengeEmail) mongoose.deleteModel("KidsChallengeEmail");

export const KidsChallengeEmailModel: Model<KidsChallengeEmailDoc> =
  mongoose.models.KidsChallengeEmail ?? mongoose.model<KidsChallengeEmailDoc>("KidsChallengeEmail", KidsChallengeEmailSchema);
