import mongoose, { Document, Model, Schema } from "mongoose";

export type WebsiteMaintenancePlanId = "website-maintenance";

export interface IWebsiteMaintenanceSubscription extends Document {
  clerkId: string;
  planId: WebsiteMaintenancePlanId;
  planName: string;
  subscriptionId: string;
  amountInr: number;
  billingCycle: "monthly";
  status: "active" | "cancelled" | "expired";
  razorpayPaymentId?: string;
  offerId?: string;
  expiresAt: Date;
  cancelledAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const WebsiteMaintenanceSubscriptionSchema =
  new Schema<IWebsiteMaintenanceSubscription>(
    {
      clerkId: { type: String, required: true, index: true },
      planId: {
        type: String,
        required: true,
        enum: ["website-maintenance"],
      },
      planName: { type: String, required: true },
      subscriptionId: { type: String, required: true, unique: true },
      amountInr: { type: Number, required: true },
      billingCycle: { type: String, enum: ["monthly"], default: "monthly" },
      status: {
        type: String,
        enum: ["active", "cancelled", "expired"],
        default: "active",
        index: true,
      },
      razorpayPaymentId: String,
      offerId: String,
      expiresAt: { type: Date, required: true },
      cancelledAt: Date,
    },
    { timestamps: true },
  );

WebsiteMaintenanceSubscriptionSchema.index({ clerkId: 1, status: 1 });
WebsiteMaintenanceSubscriptionSchema.index({ planId: 1, status: 1 });

const WebsiteMaintenanceSubscription =
  (mongoose.models?.WebsiteMaintenanceSubscription ||
    mongoose.model<IWebsiteMaintenanceSubscription>(
      "WebsiteMaintenanceSubscription",
      WebsiteMaintenanceSubscriptionSchema,
    )) as Model<IWebsiteMaintenanceSubscription>;

export default WebsiteMaintenanceSubscription;
