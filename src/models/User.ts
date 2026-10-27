/** Website user (visitor) model. Separate from Admin: a user account never grants admin access. */
import mongoose, { Document, Model, Schema, Types } from "mongoose";

export type UserStatus = "pending" | "active" | "disabled";

export interface UserDoc extends Document {
  _id: Types.ObjectId;
  name: string;
  email: string;
  passwordHash: string;
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
    passwordHash: { type: String, required: true, select: false },
    status: { type: String, enum: ["pending", "active", "disabled"], required: true, default: "pending" },
    emailVerifiedAt: { type: Date, default: null },
    lastLoginAt: { type: Date, default: null },
  },
  { timestamps: true, collection: "users" },
);

UserSchema.index({ email: 1 }, { unique: true });

export const UserModel: Model<UserDoc> = mongoose.models.User ?? mongoose.model<UserDoc>("User", UserSchema);
