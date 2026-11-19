/**
 * Kids Creative Challenge payment ledger: one row per Razorpay order, kept forever as payment history.
 * The registration holds the final state (paid/pending); this holds every attempt, including failures.
 * Parent/student details are copied in at order time so history stays searchable and readable on its own.
 */
import mongoose, { Document, Model, Schema, Types } from "mongoose";

export type KidsChallengePaymentStatus = "created" | "paid" | "failed";
/** Which path confirmed the payment. */
export type KidsChallengePaymentSource = "checkout" | "webhook" | "admin_sync";

export interface KidsChallengePaymentDoc extends Document {
  _id: Types.ObjectId;
  registrationId: Types.ObjectId;
  userId: Types.ObjectId;
  orderId: string;
  amountPaise: number;
  currency: string;
  status: KidsChallengePaymentStatus;
  /** Latest Razorpay payment id seen for this order (the successful one once paid). */
  paymentId: string | null;
  /** upi | card | netbanking | wallet | emi | … as reported by Razorpay. */
  method: string | null;
  /** Razorpay's fee and GST on that fee, in paise (known once captured). */
  feePaise: number | null;
  taxPaise: number | null;
  /** Failed payment attempts on this order (Checkout lets the parent retry inside the same order). */
  failedAttempts: number;
  /** Razorpay ids of the failed attempts; makes failure recording idempotent (client report + webhook). */
  failedPaymentIds: string[];
  errorCode: string | null;
  errorDescription: string | null;
  confirmedBy: KidsChallengePaymentSource | null;
  paidAt: Date | null;
  lastFailedAt: Date | null;
  studentName: string;
  parentName: string;
  parentEmail: string;
  parentPhone: string;
  createdAt: Date;
  updatedAt: Date;
}

const KidsChallengePaymentSchema = new Schema<KidsChallengePaymentDoc>(
  {
    registrationId: { type: Schema.Types.ObjectId, ref: "KidsChallengeRegistration", required: true },
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    orderId: { type: String, required: true, maxlength: 64 },
    amountPaise: { type: Number, required: true, min: 0 },
    currency: { type: String, required: true, default: "INR", maxlength: 3 },
    status: { type: String, enum: ["created", "paid", "failed"], required: true, default: "created" },
    paymentId: { type: String, default: null, maxlength: 64 },
    method: { type: String, default: null, maxlength: 32 },
    feePaise: { type: Number, default: null },
    taxPaise: { type: Number, default: null },
    failedAttempts: { type: Number, default: 0, min: 0 },
    failedPaymentIds: { type: [String], default: [] },
    errorCode: { type: String, default: null, maxlength: 64 },
    errorDescription: { type: String, default: null, maxlength: 300 },
    confirmedBy: { type: String, enum: ["checkout", "webhook", "admin_sync", null], default: null },
    paidAt: { type: Date, default: null },
    lastFailedAt: { type: Date, default: null },
    studentName: { type: String, required: true, maxlength: 80 },
    parentName: { type: String, required: true, maxlength: 80 },
    parentEmail: { type: String, required: true, maxlength: 254 },
    parentPhone: { type: String, required: true, maxlength: 16 },
  },
  { timestamps: true, collection: "kids_challenge_payments" },
);

KidsChallengePaymentSchema.index({ orderId: 1 }, { unique: true });
KidsChallengePaymentSchema.index({ registrationId: 1, createdAt: -1 });
KidsChallengePaymentSchema.index({ status: 1, createdAt: -1 });
KidsChallengePaymentSchema.index({ createdAt: -1 });
KidsChallengePaymentSchema.index({ paidAt: -1 });

// Dev hot reload keeps mongoose.models alive: drop the old model so schema edits apply without a restart.
if (process.env.NODE_ENV === "development" && mongoose.models.KidsChallengePayment) mongoose.deleteModel("KidsChallengePayment");

export const KidsChallengePaymentModel: Model<KidsChallengePaymentDoc> =
  mongoose.models.KidsChallengePayment ?? mongoose.model<KidsChallengePaymentDoc>("KidsChallengePayment", KidsChallengePaymentSchema);
