import mongoose, { Schema, Document, Model } from "mongoose";

export interface ISubscription extends Document {
  clerkId: string;
  chatbotType:
    | "chatbot-customer-support"
    | "chatbot-e-commerce"
    | "chatbot-lead-generation"
    | "chatbot-education";
  subscriptionId: string;
  chatbotName: string;
  chatbotMessage: string;
  plan: string;
  billingCycle: "monthly" | "yearly";
  status: "active" | "cancelled" | "expired";
  createdAt: Date;
  expiresAt: Date;
  cancelledAt?: Date;
  updatedAt: Date;
}

const SubscriptionSchema = new Schema<ISubscription>(
  {
    clerkId: {
      type: String,
      required: true,
    },
    chatbotName: {
      type: String,
      default: "AI Assistance",
    },
    chatbotMessage: {
      type: String,
      default: "Hi,How May i help you?",
    },
    chatbotType: {
      type: String,
      required: true,
      enum: [
        "chatbot-customer-support",
        "chatbot-e-commerce",
        "chatbot-lead-generation",
        "chatbot-education",
      ],
    },
    subscriptionId: {
      type: String,
      required: true,
      unique: true,
    },
    plan: {
      type: String,
      required: true,
      trim: true,
      maxlength: 50,
    },
    billingCycle: {
      type: String,
      required: true,
      enum: ["monthly", "yearly"],
    },
    status: {
      type: String,
      required: true,
      enum: ["active", "cancelled", "expired"],
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

// Indexes for optimized queries
SubscriptionSchema.index({ clerkId: 1, status: 1 });
SubscriptionSchema.index({ chatbotType: 1, status: 1 });
SubscriptionSchema.index({ expiresAt: 1 });
SubscriptionSchema.index({ status: 1, expiresAt: 1 });

const WebSubscription =
  mongoose.models?.WebSubscription ||
  mongoose.model<ISubscription>("WebSubscription", SubscriptionSchema);

export default WebSubscription;
