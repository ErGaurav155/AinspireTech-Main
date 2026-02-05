// models/Referral.ts
import { Schema, model, models } from "mongoose";

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
  }
);

// Compound index for unique referral per user per product
ReferralSchema.index(
  { referredUserId: 1, productType: 1 },
  { unique: true, partialFilterExpression: { status: "active" } }
);

const AffiReferral =
  models?.AffiReferral || model("AffiReferral", ReferralSchema);
export default AffiReferral;
