/**
 * UserOtp model. Stores only HMAC hashes. TTL is cleanup only;
 * expiry/attempts/consumed are always validated in application logic.
 */
import mongoose, { Document, Model, Schema, Types } from "mongoose";

export type UserOtpPurpose = "register" | "password-reset";
export type UserOtpStatus = "active" | "consumed" | "expired" | "locked";

export interface UserOtpDoc extends Document {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  purpose: UserOtpPurpose;
  otpHash: string;
  expiresAt: Date;
  attempts: number;
  maxAttempts: number;
  resendCount: number;
  lastSentAt: Date;
  consumedAt: Date | null;
  status: UserOtpStatus;
  createdAt: Date;
  updatedAt: Date;
}

const UserOtpSchema = new Schema<UserOtpDoc>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
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
  { timestamps: true, collection: "user_otps" },
);

UserOtpSchema.index({ userId: 1, purpose: 1, status: 1 });
UserOtpSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const UserOtpModel: Model<UserOtpDoc> =
  mongoose.models.UserOtp ?? mongoose.model<UserOtpDoc>("UserOtp", UserOtpSchema);
