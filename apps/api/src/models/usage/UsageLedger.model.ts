import mongoose, { Document, Model, Schema, Types } from "mongoose";
import type { BillingOwnerType, EntitlementLimit } from "@rocketreplai/shared/platform";

export interface IUsageLedger extends Document {
  idempotencyKey: string;
  ownerType: BillingOwnerType;
  ownerId: Types.ObjectId;
  workspaceId?: Types.ObjectId;
  metric: EntitlementLimit;
  amount: number;
  periodKey: string;
  source: string;
  status: "pending" | "applied" | "rejected" | "reversed";
  metadata: Record<string, unknown>;
  reversedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const UsageLedgerSchema = new Schema<IUsageLedger>(
  {
    idempotencyKey: { type: String, required: true, unique: true },
    ownerType: {
      type: String,
      enum: ["WORKSPACE", "AGENCY"],
      required: true,
    },
    ownerId: { type: Schema.Types.ObjectId, required: true, index: true },
    workspaceId: { type: Schema.Types.ObjectId, ref: "Workspace", index: true },
    metric: { type: String, required: true },
    amount: { type: Number, required: true },
    periodKey: { type: String, required: true },
    source: { type: String, required: true, maxlength: 160 },
    status: {
      type: String,
      enum: ["pending", "applied", "rejected", "reversed"],
      default: "pending",
      index: true,
    },
    metadata: { type: Schema.Types.Mixed, default: {} },
    reversedAt: Date,
  },
  { timestamps: true },
);

UsageLedgerSchema.index({ ownerType: 1, ownerId: 1, metric: 1, createdAt: -1 });

const UsageLedger = (mongoose.models?.UsageLedger ||
  mongoose.model<IUsageLedger>(
    "UsageLedger",
    UsageLedgerSchema,
  )) as Model<IUsageLedger>;

export default UsageLedger;
