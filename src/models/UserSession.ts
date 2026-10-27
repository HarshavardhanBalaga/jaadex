/**
 * UserSession model. One doc per login; the cookie holds a random token and
 * only its SHA-256 is stored. TTL is cleanup only; app checks revokedAt/expiresAt.
 */
import mongoose, { Document, Model, Schema, Types } from "mongoose";

export interface UserSessionDoc extends Document {
  _id: Types.ObjectId;
  tokenHash: string;
  userId: Types.ObjectId;
  expiresAt: Date;
  revokedAt: Date | null;
  ipHash: string | null;
  uaHash: string | null;
  createdAt: Date;
  updatedAt: Date;
}

const UserSessionSchema = new Schema<UserSessionDoc>(
  {
    tokenHash: { type: String, required: true, unique: true },
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    expiresAt: { type: Date, required: true },
    revokedAt: { type: Date, default: null },
    ipHash: { type: String, default: null },
    uaHash: { type: String, default: null },
  },
  { timestamps: true, collection: "user_sessions" },
);

UserSessionSchema.index({ userId: 1, revokedAt: 1 });
UserSessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const UserSessionModel: Model<UserSessionDoc> =
  mongoose.models.UserSession ?? mongoose.model<UserSessionDoc>("UserSession", UserSessionSchema);
