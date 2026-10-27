/** WorkshopForm model. One registration form per workshop, schema built in the form-js editor. */
import mongoose, { Document, Model, Schema, Types } from "mongoose";

export interface WorkshopFormDoc extends Document {
  _id: Types.ObjectId;
  /** The workshop this form belongs to. Unique: a workshop has at most one form. */
  workshopId: Types.ObjectId;
  /** form-js JSON schema, stored as-is. Shape is checked in lib/workshop-forms/validation.ts. */
  definition: Record<string, unknown>;
  updatedBy: Types.ObjectId | null;
  createdAt: Date;
  updatedAt: Date;
}

const WorkshopFormSchema = new Schema<WorkshopFormDoc>(
  {
    workshopId: { type: Schema.Types.ObjectId, ref: "Workshop", required: true, unique: true },
    definition: { type: Schema.Types.Mixed, required: true },
    updatedBy: { type: Schema.Types.ObjectId, ref: "Admin", default: null },
  },
  { timestamps: true, collection: "workshop_forms" },
);

export const WorkshopFormModel: Model<WorkshopFormDoc> =
  mongoose.models.WorkshopForm ?? mongoose.model<WorkshopFormDoc>("WorkshopForm", WorkshopFormSchema);
