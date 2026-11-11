/** Workshop model. Stores exactly the fields taken by the admin create form. */
import mongoose, { Document, Model, Schema, Types } from "mongoose";

export interface WorkshopDoc extends Document {
  _id: Types.ObjectId;
  title: string;
  description: string;
  /** null = date to be announced. */
  date: Date | null;
  /** "" = location to be announced. */
  location: string;
  /** Image stored as a data URL (uploaded file, capped at ~4 MB base64). */
  image: string;
  /** Admin-controlled sign-ups. capacity null = unlimited seats. */
  registration: { enabled: boolean; capacity: number | null };
  /** Confirmed seats taken. Only changed with atomic $inc (see registration-service). */
  registrationCount: number;
  createdAt: Date;
  updatedAt: Date;
}

const WorkshopSchema = new Schema<WorkshopDoc>(
  {
    title: { type: String, required: true, trim: true, maxlength: 140 },
    description: { type: String, required: true, trim: true, maxlength: 3000 },
    date: { type: Date, default: null },
    location: { type: String, default: "", trim: true, maxlength: 200 },
    image: { type: String, required: true },
    registration: {
      enabled: { type: Boolean, default: false },
      capacity: { type: Number, default: null, min: 1 },
    },
    registrationCount: { type: Number, default: 0, min: 0 },
  },
  { timestamps: true, collection: "workshops" },
);

/** Titles compare case-insensitively: "AI Film" and "ai film" are the same workshop. */
export const WORKSHOP_TITLE_COLLATION = { locale: "en", strength: 2 };

WorkshopSchema.index({ date: -1 });
WorkshopSchema.index({ title: 1 }, { unique: true, collation: WORKSHOP_TITLE_COLLATION });

// Dev hot reload keeps mongoose.models alive: drop the old model so schema edits apply without a restart.
if (process.env.NODE_ENV === "development" && mongoose.models.Workshop) mongoose.deleteModel("Workshop");

export const WorkshopModel: Model<WorkshopDoc> =
  mongoose.models.Workshop ?? mongoose.model<WorkshopDoc>("Workshop", WorkshopSchema);