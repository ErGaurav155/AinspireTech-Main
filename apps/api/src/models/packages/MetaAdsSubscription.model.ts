import mongoose, { Document, Model, Schema } from "mongoose";

export type MetaAdsPlanId =
  | "meta-ads-5000"
  | "meta-ads-10000"
  | "meta-ads-15000"
  | "meta-ads-20000";

export interface IMetaAdsSubscription extends Document {
  clerkId: string;
  planId: MetaAdsPlanId;
  planName: string;
  subscriptionId: string;
  monthlyBudgetInr: number;
  billingCycle: "monthly";
  status: "active" | "cancelled" | "expired";
  razorpayPaymentId?: string;
  expiresAt: Date;
  cancelledAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const MetaAdsSubscriptionSchema = new Schema<IMetaAdsSubscription>(
  {
    clerkId: { type: String, required: true, index: true },
    planId: {
      type: String,
      required: true,
      enum: [
        "meta-ads-5000",
        "meta-ads-10000",
        "meta-ads-15000",
        "meta-ads-20000",
      ],
    },
    planName: { type: String, required: true },
    subscriptionId: { type: String, required: true, unique: true },
    monthlyBudgetInr: { type: Number, required: true },
    billingCycle: { type: String, enum: ["monthly"], default: "monthly" },
    status: {
      type: String,
      enum: ["active", "cancelled", "expired"],
      default: "active",
      index: true,
    },
    razorpayPaymentId: String,
    expiresAt: { type: Date, required: true },
    cancelledAt: Date,
  },
  { timestamps: true },
);

MetaAdsSubscriptionSchema.index({ clerkId: 1, status: 1 });
MetaAdsSubscriptionSchema.index({ planId: 1, status: 1 });

const MetaAdsSubscription =
  (mongoose.models?.MetaAdsSubscription ||
    mongoose.model<IMetaAdsSubscription>(
      "MetaAdsSubscription",
      MetaAdsSubscriptionSchema,
    )) as Model<IMetaAdsSubscription>;

export default MetaAdsSubscription;
