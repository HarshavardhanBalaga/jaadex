/** Workshop registration model. One per website account per workshop. */
import mongoose, { Document, Model, Schema, Types } from "mongoose";

export type WorkshopRegistrationStatus = "confirmed";

/** skipped = SMTP not configured (local dev). Rows saved before email tracking have no value. */
export type ConfirmationEmailStatus = "pending" | "sent" | "failed" | "skipped";

export interface ConfirmationEmail {
  status: ConfirmationEmailStatus;
  attempts: number;
  lastAttemptAt: Date | null;
  sentAt: Date | null;
  /** Short failure reason for admins. Never contains credentials. */
  lastError: string | null;
}

export interface WorkshopRegistrationDoc extends Document {
  _id: Types.ObjectId;
  workshopId: Types.ObjectId;
  userId: Types.ObjectId;
  name: string;
  phone: string;
  email: string;
  status: WorkshopRegistrationStatus;
  confirmationEmail?: ConfirmationEmail;
  createdAt: Date;
  updatedAt: Date;
}

const WorkshopRegistrationSchema = new Schema<WorkshopRegistrationDoc>(
  {
    workshopId: { type: Schema.Types.ObjectId, ref: "Workshop", required: true },
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    name: { type: String, required: true, trim: true, maxlength: 80 },
    phone: { type: String, required: true, trim: true, maxlength: 16 },
    email: { type: String, required: true, lowercase: true, trim: true, maxlength: 254 },
    status: { type: String, enum: ["confirmed"], required: true, default: "confirmed" },
    confirmationEmail: {
      status: { type: String, enum: ["pending", "sent", "failed", "skipped"] },
      attempts: { type: Number, default: 0, min: 0 },
      lastAttemptAt: { type: Date, default: null },
      sentAt: { type: Date, default: null },
      lastError: { type: String, default: null, maxlength: 300 },
    },
  },
  { timestamps: true, collection: "workshop_registrations" },
);

// One seat per person per workshop: the same account, email or phone can't register twice.
// Email and phone are normalised by registrationSchema first, so formatting can't dodge these.
WorkshopRegistrationSchema.index({ workshopId: 1, userId: 1 }, { unique: true });
WorkshopRegistrationSchema.index({ workshopId: 1, email: 1 }, { unique: true });
WorkshopRegistrationSchema.index({ workshopId: 1, phone: 1 }, { unique: true });
WorkshopRegistrationSchema.index({ workshopId: 1, createdAt: -1 });

// Dev hot reload keeps mongoose.models alive: drop the old model so schema edits apply without a restart.
if (process.env.NODE_ENV === "development" && mongoose.models.WorkshopRegistration) mongoose.deleteModel("WorkshopRegistration");

export const WorkshopRegistrationModel: Model<WorkshopRegistrationDoc> =
  mongoose.models.WorkshopRegistration ??
  mongoose.model<WorkshopRegistrationDoc>("WorkshopRegistration", WorkshopRegistrationSchema);
