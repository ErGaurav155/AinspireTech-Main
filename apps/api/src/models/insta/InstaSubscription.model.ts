import mongoose, { Schema, Document, Model } from "mongoose";

export interface ISubscription extends Document {
  clerkId: string;
  chatbotType: "Insta-Automation-Pro";
  subscriptionId: string;
  plan: string;
  billingCycle: "monthly" | "yearly";
  status: "active" | "cancelled" | "expired";
  createdAt: Date;
  expiresAt: Date;
  cancelledAt?: Date;
  updatedAt: Date;
}

const SubscriptionSchema = new mongoose.Schema(
  {
    clerkId: {
      type: String,
      required: true,
    },
    chatbotType: {
      type: String,
      required: true,
    },
    subscriptionId: {
      type: String,
      required: true,
      unique: true, // Ensure the order ID is unique
    },
    plan: {
      type: String,
      required: true,
      trim: true,
      maxlength: 50,
    },
    billingCycle: {
      type: String,
      enum: ["monthly", "yearly"],
      required: true,
    },

    status: {
      type: String,
      required: true,
      enum: ["active", "expired", "cancelled"],
      default: "active",
    },
    expiresAt: {
      type: Date,
      required: true,
    },
    cancelledAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  },
);
const InstaSubscription = (mongoose.models?.InstaSubscription ||
  mongoose.model<ISubscription>(
    "InstaSubscription",
    SubscriptionSchema,
  )) as Model<ISubscription>;

export default InstaSubscription;
