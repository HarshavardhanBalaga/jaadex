/**
 * AdminOtp model. Stores only HMAC hashes. TTL is cleanup only;
 * expiry/attempts/consumed are always validated in application logic.
 */
import mongoose, { Document, Model, Schema, Types } from "mongoose";

export type AdminOtpPurpose = "register" | "password-reset";
export type AdminOtpStatus = "active" | "consumed" | "expired" | "locked";

export interface AdminOtpDoc extends Document {
  _id: Types.ObjectId;
  adminId: Types.ObjectId;
  purpose: AdminOtpPurpose;
  otpHash: string;
  expiresAt: Date;
  attempts: number;
  maxAttempts: number;
  resendCount: number;
  lastSentAt: Date;
  consumedAt: Date | null;
  status: AdminOtpStatus;
  createdAt: Date;
  updatedAt: Date;
}

const AdminOtpSchema = new Schema<AdminOtpDoc>(
  {
    adminId: { type: Schema.Types.ObjectId, ref: "Admin", required: true },
    purpose: { type: String, enum: ["register", "password-reset"], required: true, default: "register" },
    otpHash: { type: String, required: true, select: false },
    expiresAt: { type: Date, required: true },
    attempts: { type: Number, required: true, default: 0, min: 0 },
    maxAttempts: { type: Number, required: true, min: 1, max: 10 },
    resendCount: { type: Number, required: true, default: 0, min: 0 },
    lastSentAt: { type: Date, required: true },
    consumedAt: { type: Date, default: null },
    status: {
      type: String,
      enum: ["active", "consumed", "expired", "locked"],
      required: true,
      default: "active",
    },
  },
  { timestamps: true, collection: "admin_otps" },
);

AdminOtpSchema.index({ adminId: 1, purpose: 1, status: 1 });
AdminOtpSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const AdminOtpModel: Model<AdminOtpDoc> =
  mongoose.models.AdminOtp ?? mongoose.model<AdminOtpDoc>("AdminOtp", AdminOtpSchema);
