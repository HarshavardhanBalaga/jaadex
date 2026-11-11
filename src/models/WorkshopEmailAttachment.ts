/**
 * A file uploaded for an admin email. Uploaded first (linked: false), then linked to the
 * email when it is sent. Files never sent are removed automatically after a day.
 */
import mongoose, { Document, Model, Schema, Types } from "mongoose";

export interface WorkshopEmailAttachmentDoc extends Document {
  _id: Types.ObjectId;
  workshopId: Types.ObjectId;
  /** Set when the email is sent. */
  emailId: Types.ObjectId | null;
  linked: boolean;
  filename: string;
  contentType: string;
  size: number;
  data: Buffer;
  uploadedBy: string;
  createdAt: Date;
  updatedAt: Date;
}

const WorkshopEmailAttachmentSchema = new Schema<WorkshopEmailAttachmentDoc>(
  {
    workshopId: { type: Schema.Types.ObjectId, ref: "Workshop", required: true },
    emailId: { type: Schema.Types.ObjectId, ref: "WorkshopEmail", default: null },
    linked: { type: Boolean, required: true, default: false },
    filename: { type: String, required: true, maxlength: 120 },
    contentType: { type: String, required: true, maxlength: 120 },
    size: { type: Number, required: true, min: 1 },
    data: { type: Buffer, required: true },
    uploadedBy: { type: String, required: true, maxlength: 254 },
  },
  { timestamps: true, collection: "workshop_email_attachments" },
);

WorkshopEmailAttachmentSchema.index({ emailId: 1 });
WorkshopEmailAttachmentSchema.index({ workshopId: 1 });
// Uploaded but never sent (composer closed, file removed): delete after 24 hours.
WorkshopEmailAttachmentSchema.index({ createdAt: 1 }, { expireAfterSeconds: 24 * 60 * 60, partialFilterExpression: { linked: false } });

// Dev hot reload keeps mongoose.models alive: drop the old model so schema edits apply without a restart.
if (process.env.NODE_ENV === "development" && mongoose.models.WorkshopEmailAttachment) mongoose.deleteModel("WorkshopEmailAttachment");

export const WorkshopEmailAttachmentModel: Model<WorkshopEmailAttachmentDoc> =
  mongoose.models.WorkshopEmailAttachment ??
  mongoose.model<WorkshopEmailAttachmentDoc>("WorkshopEmailAttachment", WorkshopEmailAttachmentSchema);
