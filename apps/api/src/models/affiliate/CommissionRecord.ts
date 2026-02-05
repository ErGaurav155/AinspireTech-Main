// models/CommissionRecord.ts
import { Schema, model, models } from "mongoose";

const CommissionRecordSchema = new Schema(
  {
    affiliateId: {
      type: String,
      required: true,
    },
    referralId: {
      type: String,
      required: true,
    },
    referredUserId: {
      type: String,
      required: true,
    },

    // Commission details
    amount: {
      type: Number,
      required: true,
    },
    period: {
      type: String, // Format: "2024-01"
      required: true,
    },

    // Product details
    productType: {
      type: String,
      enum: ["web-chatbot", "insta-automation"],
      required: true,
    },
    productName: {
      type: String,
      required: true,
    },
    subscriptionType: {
      type: String,
      enum: ["monthly", "yearly"],
      required: true,
    },

    // Status
    status: {
      type: String,
      enum: ["pending", "paid"],
      default: "pending",
    },

    // Payout info
    payoutId: String,
    payoutDate: Date,
  },
  {
    timestamps: true,
  }
);

// Index for faster queries
CommissionRecordSchema.index({ affiliateId: 1, status: 1 });
CommissionRecordSchema.index({ period: 1, status: 1 });

const AffiCommissionRecord =
  models?.AffiCommissionRecord ||
  model("AffiCommissionRecord", CommissionRecordSchema);
export default AffiCommissionRecord;
