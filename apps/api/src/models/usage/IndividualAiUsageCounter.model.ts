import mongoose, { Document, Model, Schema } from "mongoose";

export interface IIndividualAiUsageCounter extends Document {
  userId: string;
  bucketKey: string;
  periodKey: string;
  used: number;
  limitSnapshot: number;
  periodStart: Date;
  periodEnd: Date;
  createdAt: Date;
  updatedAt: Date;
}

const IndividualAiUsageCounterSchema =
  new Schema<IIndividualAiUsageCounter>(
    {
      userId: { type: String, required: true, index: true },
      bucketKey: { type: String, required: true },
      periodKey: { type: String, required: true },
      used: { type: Number, required: true, default: 0, min: 0 },
      limitSnapshot: { type: Number, required: true, min: 0 },
      periodStart: { type: Date, required: true },
      periodEnd: { type: Date, required: true, index: true },
    },
    { timestamps: true },
  );

IndividualAiUsageCounterSchema.index(
  { userId: 1, bucketKey: 1, periodKey: 1 },
  { unique: true },
);

const IndividualAiUsageCounter =
  (mongoose.models?.IndividualAiUsageCounter ||
    mongoose.model<IIndividualAiUsageCounter>(
      "IndividualAiUsageCounter",
      IndividualAiUsageCounterSchema,
    )) as Model<IIndividualAiUsageCounter>;

export default IndividualAiUsageCounter;
