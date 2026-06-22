import mongoose, { Document, Model, Schema } from "mongoose";

export type ContentCreationPlanId = "content-creation";

export interface IContentCreationSubscription extends Document {
  clerkId: string;
  planId: ContentCreationPlanId;
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

const ContentCreationSubscriptionSchema =
  new Schema<IContentCreationSubscription>(
    {
      clerkId: { type: String, required: true, index: true },
      planId: {
        type: String,
        required: true,
        enum: ["content-creation"],
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

ContentCreationSubscriptionSchema.index({ clerkId: 1, status: 1 });
ContentCreationSubscriptionSchema.index({ planId: 1, status: 1 });

const ContentCreationSubscription =
  (mongoose.models?.ContentCreationSubscription ||
    mongoose.model<IContentCreationSubscription>(
      "ContentCreationSubscription",
      ContentCreationSubscriptionSchema,
    )) as Model<IContentCreationSubscription>;

export default ContentCreationSubscription;
