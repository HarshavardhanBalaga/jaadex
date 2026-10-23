/** Shared distributed rate-limit store. TTL on resetAt; app enforces counts. */
import mongoose, { Model, Schema } from "mongoose";

export interface RateLimitDoc {
  _id: string;
  count: number;
  resetAt: Date;
}

const RateLimitSchema = new Schema<RateLimitDoc>(
  {
    _id: { type: String, required: true },
    count: { type: Number, required: true, default: 0, min: 0 },
    resetAt: { type: Date, required: true },
  },
  { _id: false, collection: "rate_limits", timestamps: false },
);

RateLimitSchema.index({ resetAt: 1 }, { expireAfterSeconds: 0 });

export const RateLimitModel: Model<RateLimitDoc> =
  mongoose.models.RateLimit ?? mongoose.model<RateLimitDoc>("RateLimit", RateLimitSchema);
