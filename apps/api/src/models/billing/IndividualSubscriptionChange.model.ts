import mongoose, { Document, Model, Schema } from "mongoose";

export type IndividualSubscriptionKind =
  | "web"
  | "insta"
  | "whatsapp"
  | "call"
  | "package"
  | "meta-ads"
  | "website-maintenance"
  | "content-creation";

export interface IIndividualSubscriptionChange extends Document {
  clerkId: string;
  subscriptionId: string;
  subscriptionKind: IndividualSubscriptionKind;
  fromProviderPlanId: string;
  targetProviderPlanId: string;
  targetProductId: string;
  targetBillingCycle: "monthly" | "yearly";
  scheduleChangeAt: "now" | "cycle_end";
  effectiveAt?: Date;
  status: "pending" | "applied" | "cancelled" | "failed";
  metadata: Record<string, unknown>;
  appliedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const IndividualSubscriptionChangeSchema =
  new Schema<IIndividualSubscriptionChange>(
    {
      clerkId: { type: String, required: true, index: true },
      subscriptionId: { type: String, required: true, index: true },
      subscriptionKind: {
        type: String,
        required: true,
        enum: [
          "web",
          "insta",
          "whatsapp",
          "call",
          "package",
          "meta-ads",
          "website-maintenance",
          "content-creation",
        ],
      },
      fromProviderPlanId: { type: String, required: true },
      targetProviderPlanId: { type: String, required: true },
      targetProductId: { type: String, required: true },
      targetBillingCycle: {
        type: String,
        required: true,
        enum: ["monthly", "yearly"],
      },
      scheduleChangeAt: {
        type: String,
        required: true,
        enum: ["now", "cycle_end"],
      },
      effectiveAt: Date,
      status: {
        type: String,
        required: true,
        enum: ["pending", "applied", "cancelled", "failed"],
        default: "pending",
        index: true,
      },
      metadata: { type: Schema.Types.Mixed, default: {} },
      appliedAt: Date,
    },
    { timestamps: true },
  );

IndividualSubscriptionChangeSchema.index({
  subscriptionId: 1,
  status: 1,
  createdAt: -1,
});

const IndividualSubscriptionChange =
  (mongoose.models?.IndividualSubscriptionChange ||
    mongoose.model<IIndividualSubscriptionChange>(
      "IndividualSubscriptionChange",
      IndividualSubscriptionChangeSchema,
    )) as Model<IIndividualSubscriptionChange>;

export default IndividualSubscriptionChange;
