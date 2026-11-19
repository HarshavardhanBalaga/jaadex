/** Razorpay webhook events already processed (by x-razorpay-event-id), so a redelivered event is never handled twice. */
import mongoose, { Document, Model, Schema } from "mongoose";

export interface RazorpayWebhookEventDoc extends Document {
  eventId: string;
  event: string;
  createdAt: Date;
}

const RazorpayWebhookEventSchema = new Schema<RazorpayWebhookEventDoc>(
  {
    eventId: { type: String, required: true, maxlength: 64 },
    event: { type: String, required: true, maxlength: 64 },
  },
  { timestamps: { createdAt: true, updatedAt: false }, collection: "razorpay_webhook_events" },
);

// The unique index is the dedupe: a second insert of the same event id fails atomically.
RazorpayWebhookEventSchema.index({ eventId: 1 }, { unique: true });

// Dev hot reload keeps mongoose.models alive: drop the old model so schema edits apply without a restart.
if (process.env.NODE_ENV === "development" && mongoose.models.RazorpayWebhookEvent) mongoose.deleteModel("RazorpayWebhookEvent");

export const RazorpayWebhookEventModel: Model<RazorpayWebhookEventDoc> =
  mongoose.models.RazorpayWebhookEvent ?? mongoose.model<RazorpayWebhookEventDoc>("RazorpayWebhookEvent", RazorpayWebhookEventSchema);
