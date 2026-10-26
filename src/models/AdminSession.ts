/**
 * AdminSession model. One doc per refresh family; rotation is an atomic CAS
 * on currentRefreshHash. 30s grace on previousRefreshHash avoids false reuse
 * from coordinated retries; true reuse revokes the family.
 */
import mongoose, { Document, Model, Schema, Types } from "mongoose";

export type AdminAuthMethod = "password" | "google";

export interface AdminSessionDoc extends Document {
  _id: Types.ObjectId;
  familyId: string;
  adminId: Types.ObjectId;
  currentRefreshHash: string;
  previousRefreshHash: string | null;
  previousRotatedAt: Date | null;
  jti: string;
  expiresAt: Date;
  revokedAt: Date | null;
  revokeReason: string | null;
  ipHash: string | null;
  uaHash: string | null;
  authMethod: AdminAuthMethod;
  createdAt: Date;
  updatedAt: Date;
}

const AdminSessionSchema = new Schema<AdminSessionDoc>(
  {
    familyId: { type: String, required: true, unique: true },
    adminId: { type: Schema.Types.ObjectId, ref: "Admin", required: true },
    currentRefreshHash: { type: String, required: true, unique: true },
    previousRefreshHash: { type: String, default: null },
    previousRotatedAt: { type: Date, default: null },
    jti: { type: String, required: true },
    expiresAt: { type: Date, required: true },
    revokedAt: { type: Date, default: null },
    revokeReason: { type: String, default: null, maxlength: 200 },
    ipHash: { type: String, default: null },
    uaHash: { type: String, default: null },
    authMethod: { type: String, enum: ["password", "google"], default: "password" },
  },
  { timestamps: true, collection: "admin_sessions" },
);

AdminSessionSchema.index({ adminId: 1, revokedAt: 1, expiresAt: 1 });
// TTL is cleanup only; app always checks revokedAt/expiresAt.
AdminSessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const AdminSessionModel: Model<AdminSessionDoc> =
  mongoose.models.AdminSession ?? mongoose.model<AdminSessionDoc>("AdminSession", AdminSessionSchema);
