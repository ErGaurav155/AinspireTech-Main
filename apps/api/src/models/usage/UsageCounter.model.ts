import mongoose, { Document, Model, Schema, Types } from "mongoose";
import type { BillingOwnerType, EntitlementLimit } from "@rocketreplai/shared/platform";

export interface IUsageCounter extends Document {
  ownerType: BillingOwnerType;
  ownerId: Types.ObjectId;
  workspaceId?: Types.ObjectId;
  metric: EntitlementLimit;
  periodKey: string;
  used: number;
  reserved: number;
  limitSnapshot?: number;
  periodStart: Date;
  periodEnd: Date;
  createdAt: Date;
  updatedAt: Date;
}

const UsageCounterSchema = new Schema<IUsageCounter>(
  {
    ownerType: {
      type: String,
      enum: ["WORKSPACE", "AGENCY"],
      required: true,
    },
    ownerId: { type: Schema.Types.ObjectId, required: true, index: true },
    workspaceId: { type: Schema.Types.ObjectId, ref: "Workspace", index: true },
    metric: {
      type: String,
      enum: [
        "clientWorkspaces",
        "teamMembers",
        "aiTokens",
        "conversations",
        "instagramAccounts",
        "whatsappAccounts",
        "websiteChatbots",
        "callAssistants",
        "instagramAccountsPerWorkspace",
        "whatsappAccountsPerWorkspace",
        "websiteChatbotsPerWorkspace",
        "callAssistantsPerWorkspace",
      ],
      required: true,
    },
    periodKey: { type: String, required: true },
    used: { type: Number, default: 0, min: 0 },
    reserved: { type: Number, default: 0, min: 0 },
    limitSnapshot: Number,
    periodStart: { type: Date, required: true },
    periodEnd: { type: Date, required: true, index: true },
  },
  { timestamps: true },
);

UsageCounterSchema.index(
  { ownerType: 1, ownerId: 1, metric: 1, periodKey: 1 },
  { unique: true },
);
UsageCounterSchema.index({ workspaceId: 1, metric: 1, periodEnd: 1 });

const UsageCounter = (mongoose.models?.UsageCounter ||
  mongoose.model<IUsageCounter>(
    "UsageCounter",
    UsageCounterSchema,
  )) as Model<IUsageCounter>;

export default UsageCounter;
