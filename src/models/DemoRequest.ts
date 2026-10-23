/** Demo / contact request model. Stores exactly the fields shown on the enquiry form. */
import mongoose, { Document, Model, Schema, Types } from "mongoose";

export type DemoRequestStatus = "new" | "read" | "archived";

export interface DemoRequestDoc extends Document {
  _id: Types.ObjectId;
  name: string;
  email: string;
  organization: string;
  interest: string;
  message: string;
  status: DemoRequestStatus;
  createdAt: Date;
  updatedAt: Date;
}

const DemoRequestSchema = new Schema<DemoRequestDoc>(
  {
    name: { type: String, required: true, trim: true, maxlength: 80 },
    email: { type: String, required: true, lowercase: true, trim: true, maxlength: 254 },
    organization: { type: String, default: "", trim: true, maxlength: 100 },
    interest: { type: String, required: true, trim: true, maxlength: 80 },
    message: { type: String, required: true, trim: true, maxlength: 2000 },
    status: { type: String, enum: ["new", "read", "archived"], required: true, default: "new" },
  },
  { timestamps: true, collection: "demo_requests" },
);

DemoRequestSchema.index({ status: 1, createdAt: -1 });
DemoRequestSchema.index({ createdAt: -1 });

export const DemoRequestModel: Model<DemoRequestDoc> =
  mongoose.models.DemoRequest ?? mongoose.model<DemoRequestDoc>("DemoRequest", DemoRequestSchema);
