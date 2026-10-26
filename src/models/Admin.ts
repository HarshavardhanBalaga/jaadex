/** Admin model. Repeat registration allowed; at most one pending/active superadmin via partial unique index. */
import mongoose, { Document, Model, Schema, Types } from "mongoose";

export type AdminRole = "superadmin" | "admin";
export type AdminStatus = "pending" | "active" | "disabled";

export interface AdminDoc extends Document {
  _id: Types.ObjectId;
  name: string;
  email: string;
  passwordHash: string;
  /** Google account id (OIDC `sub`), linked on first Google sign-in. */
  googleSub: string | null;
  role: AdminRole;
  status: AdminStatus;
  emailVerifiedAt: Date | null;
  lastLoginAt: Date | null;
  deactivatedAt: Date | null;
  deactivatedReason: string | null;
  createdAt: Date;
  updatedAt: Date;
}

const AdminSchema = new Schema<AdminDoc>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 80,
    },
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      maxlength: 254,
      match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, "Invalid email"],
    },
    passwordHash: { type: String, required: true, select: false },
    googleSub: { type: String, default: null },
    role: { type: String, enum: ["superadmin", "admin"], required: true },
    status: { type: String, enum: ["pending", "active", "disabled"], required: true, default: "pending" },
    emailVerifiedAt: { type: Date, default: null },
    lastLoginAt: { type: Date, default: null },
    deactivatedAt: { type: Date, default: null },
    deactivatedReason: { type: String, default: null, maxlength: 500 },
  },
  { timestamps: true, collection: "admins" },
);

AdminSchema.index({ email: 1 }, { unique: true });
AdminSchema.index({ status: 1 });
// One admin per Google account; null (not linked) is excluded from uniqueness.
AdminSchema.index(
  { googleSub: 1 },
  { unique: true, partialFilterExpression: { googleSub: { $type: "string" } }, name: "uniq_google_sub" },
);
// First admin is superadmin; later admins are plain admin: only one pending/active superadmin can ever exist.
AdminSchema.index(
  { role: 1 },
  {
    unique: true,
    partialFilterExpression: { role: "superadmin", status: { $in: ["pending", "active"] } },
    name: "uniq_single_superadmin",
  },
);

export const AdminModel: Model<AdminDoc> =
  mongoose.models.Admin ?? mongoose.model<AdminDoc>("Admin", AdminSchema);
