// models/Referral.ts
import { Schema, model, models, Document, Model } from "mongoose";

export interface IReferral extends Document {
  affiliateId: string;
  referredUserId: string;
  productType: "web-chatbot" | "insta-automation";
  subscriptionId: string;
  subscriptionModel: "WebSubscription" | "InstaSubscription";
  subscriptionType: "monthly" | "yearly";
  chatbotType?: string;
  instaPlan?: string;
  subscriptionPrice: number;
  commissionRate: number;
  monthlyCommission?: number;
  yearlyCommission?: number;
  totalCommissionEarned: number;
  monthsRemaining: number;
  yearsRemaining: number;
  status: "active" | "paused" | "completed" | "cancelled";
  lastCommissionDate?: Date;
  nextCommissionDate?: Date;
  completionDate?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const ReferralSchema = new Schema(
  {
    affiliateId: {
      type: String,
      required: true,
    },
    referredUserId: {
      type: String,
      required: true,
    },

    // Product info
    productType: {
      type: String,
      enum: ["web-chatbot", "insta-automation"],
      required: true,
    },

    // Subscription details
    subscriptionId: {
      type: String,
      required: true,
    },
    subscriptionModel: {
      type: String,
      enum: ["WebSubscription", "InstaSubscription"],
      required: true,
    },
    subscriptionType: {
      type: String,
      enum: ["monthly", "yearly"],
      required: true,
    },

    // Product-specific details
    chatbotType: String, // For web chatbot
    instaPlan: String, // For instagram automation

    // Pricing
    subscriptionPrice: {
      type: Number,
      required: true,
    },
    commissionRate: {
      type: Number,
      default: 0.3,
    },
    monthlyCommission: {
      type: Number,
    },
    yearlyCommission: {
      type: Number,
    },

    // Commission tracking
    totalCommissionEarned: {
      type: Number,
      default: 0,
    },
    monthsRemaining: {
      type: Number,
      default: 10,
    },
    yearsRemaining: {
      type: Number,
      default: 3,
    },

    // Status tracking
    status: {
      type: String,
      enum: ["active", "paused", "completed", "cancelled"],
      default: "active",
    },

    // Dates
    lastCommissionDate: Date,
    nextCommissionDate: Date,
    completionDate: Date,
  },
  {
    timestamps: true,
  },
);

// Compound index for unique referral per user per product
ReferralSchema.index(
  { referredUserId: 1, productType: 1 },
  { unique: true, partialFilterExpression: { status: "active" } },
);

const AffiReferral = (models?.AffiReferral ||
  model<IReferral>("AffiReferral", ReferralSchema)) as Model<IReferral>;

export default AffiReferral;
