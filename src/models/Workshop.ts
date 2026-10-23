/** Workshop model. Stores exactly the fields taken by the admin create form. */
import mongoose, { Document, Model, Schema, Types } from "mongoose";

export interface WorkshopDoc extends Document {
  _id: Types.ObjectId;
  title: string;
  description: string;
  date: Date;
  location: string;
  /** Image stored as a data URL (uploaded file, capped at ~4 MB base64). */
  image: string;
  createdAt: Date;
  updatedAt: Date;
}

const WorkshopSchema = new Schema<WorkshopDoc>(
  {
    title: { type: String, required: true, trim: true, maxlength: 140 },
    description: { type: String, required: true, trim: true, maxlength: 3000 },
    date: { type: Date, required: true },
    location: { type: String, required: true, trim: true, maxlength: 200 },
    image: { type: String, required: true },
  },
  { timestamps: true, collection: "workshops" },
);

WorkshopSchema.index({ date: -1 });

export const WorkshopModel: Model<WorkshopDoc> =
  mongoose.models.Workshop ?? mongoose.model<WorkshopDoc>("Workshop", WorkshopSchema);