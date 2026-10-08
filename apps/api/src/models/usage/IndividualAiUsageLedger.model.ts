import mongoose, { Document, Model, Schema } from "mongoose";
import type { IndividualAiService } from "@/config/individual-ai-catalog.config";

export interface IIndividualAiUsageLedger extends Document {
  idempotencyKey: string;
  userId: string;
  service: IndividualAiService;
  amount: number;
  periodKey: string;
  source: string;
  status: "applied" | "rejected";
  allocations: Array<{ bucketKey: string; amount: number }>;
  metadata: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

const IndividualAiUsageLedgerSchema = new Schema<IIndividualAiUsageLedger>(
  {
    idempotencyKey: { type: String, required: true, unique: true },
    userId: { type: String, required: true, index: true },
    service: {
      type: String,
      enum: ["website", "instagram", "whatsapp"],
      required: true,
      index: true,
    },
    amount: { type: Number, required: true, min: 1 },
    periodKey: { type: String, required: true },
    source: { type: String, required: true, maxlength: 160 },
    status: {
      type: String,
      enum: ["applied", "rejected"],
      required: true,
      index: true,
    },
    allocations: {
      type: [
        {
          bucketKey: { type: String, required: true },
          amount: { type: Number, required: true, min: 1 },
          _id: false,
        },
      ],
      default: [],
    },
    metadata: { type: Schema.Types.Mixed, default: {} },
  },
  { timestamps: true },
);

IndividualAiUsageLedgerSchema.index({
  userId: 1,
  periodKey: 1,
  service: 1,
  status: 1,
  createdAt: -1,
});

const IndividualAiUsageLedger =
  (mongoose.models?.IndividualAiUsageLedger ||
    mongoose.model<IIndividualAiUsageLedger>(
      "IndividualAiUsageLedger",
      IndividualAiUsageLedgerSchema,
    )) as Model<IIndividualAiUsageLedger>;

export default IndividualAiUsageLedger;
