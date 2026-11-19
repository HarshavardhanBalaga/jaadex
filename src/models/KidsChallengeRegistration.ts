/** Kids Creative Challenge registration. One per student per website account (a parent may register siblings). */
import mongoose, { Document, Model, Schema, Types } from "mongoose";

/** Payment is not collected yet: every registration starts as pending. */
export type KidsChallengePaymentStatus = "pending" | "paid";

export interface KidsChallengeRegistrationDoc extends Document {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  parentName: string;
  parentEmail: string;
  parentPhone: string;
  studentName: string;
  studentClass: number;
  studentAge: number;
  schoolName: string;
  city: string;
  state: string;
  consent: boolean;
  paymentStatus: KidsChallengePaymentStatus;
  createdAt: Date;
  updatedAt: Date;
}

/** Case-insensitive, so "Anil" and "anil" count as the same student. */
export const STUDENT_NAME_COLLATION = { locale: "en", strength: 2 } as const;

const KidsChallengeRegistrationSchema = new Schema<KidsChallengeRegistrationDoc>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    parentName: { type: String, required: true, trim: true, maxlength: 80 },
    parentEmail: { type: String, required: true, lowercase: true, trim: true, maxlength: 254 },
    parentPhone: { type: String, required: true, trim: true, maxlength: 16 },
    studentName: { type: String, required: true, trim: true, maxlength: 80 },
    studentClass: { type: Number, required: true, min: 1, max: 10 },
    studentAge: { type: Number, required: true, min: 4, max: 16 },
    schoolName: { type: String, required: true, trim: true, maxlength: 120 },
    city: { type: String, required: true, trim: true, maxlength: 60 },
    state: { type: String, required: true, trim: true, maxlength: 60 },
    consent: { type: Boolean, required: true },
    paymentStatus: { type: String, enum: ["pending", "paid"], required: true, default: "pending" },
  },
  { timestamps: true, collection: "kids_challenge_registrations" },
);

// The same account can't register the same student twice.
KidsChallengeRegistrationSchema.index({ userId: 1, studentName: 1 }, { unique: true, collation: STUDENT_NAME_COLLATION });
KidsChallengeRegistrationSchema.index({ createdAt: -1 });

// Dev hot reload keeps mongoose.models alive: drop the old model so schema edits apply without a restart.
if (process.env.NODE_ENV === "development" && mongoose.models.KidsChallengeRegistration) mongoose.deleteModel("KidsChallengeRegistration");

export const KidsChallengeRegistrationModel: Model<KidsChallengeRegistrationDoc> =
  mongoose.models.KidsChallengeRegistration ??
  mongoose.model<KidsChallengeRegistrationDoc>("KidsChallengeRegistration", KidsChallengeRegistrationSchema);
