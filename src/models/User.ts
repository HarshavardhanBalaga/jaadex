/** Website user (visitor) model. Separate from Admin: a user account never grants admin access. */
import mongoose, { Document, Model, Schema, Types } from "mongoose";

export type UserStatus = "pending" | "active" | "disabled";

export interface UserDoc extends Document {
  _id: Types.ObjectId;
  name: string;
  email: string;
  /** Absent for Google-only accounts. */
  passwordHash?: string | null;
  /** Google account id (OIDC `sub`) once linked. */
  googleSub?: string | null;
  status: UserStatus;
  emailVerifiedAt: Date | null;
  lastLoginAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<UserDoc>(
  {
    name: { type: String, required: true, trim: true, maxlength: 80 },
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      maxlength: 254,
      match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, "Invalid email"],
    },
    passwordHash: { type: String, default: null, select: false },
    googleSub: { type: String, default: null },
    status: { type: String, enum: ["pending", "active", "disabled"], required: true, default: "pending" },
    emailVerifiedAt: { type: Date, default: null },
    lastLoginAt: { type: Date, default: null },
  },
  { timestamps: true, collection: "users" },
);

UserSchema.index({ email: 1 }, { unique: true });
// One website account per Google account; unlinked (null) accounts are excluded from uniqueness.
UserSchema.index(
  { googleSub: 1 },
  { unique: true, partialFilterExpression: { googleSub: { $type: "string" } }, name: "uniq_user_google_sub" },
);

export const UserModel: Model<UserDoc> = mongoose.models.User ?? mongoose.model<UserDoc>("User", UserSchema);
