// models/CommissionRecord.ts
import { Schema, model, models, Document, Model } from "mongoose";

export interface ICommissionRecord extends Document {
  affiliateId: string;
  referralId: string;
  referredUserId: string;
  amount: number;
  period: string;
  productType: "web-chatbot" | "insta-automation";
  productName: string;
  subscriptionType: "monthly" | "yearly";
  status: "pending" | "paid";
  payoutId?: string;
  payoutDate?: Date;
  createdAt: Date;
  updatedAt: Date;
}
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
  },
);

// Index for faster queries
CommissionRecordSchema.index({ affiliateId: 1, status: 1 });
CommissionRecordSchema.index({ period: 1, status: 1 });

const AffiCommissionRecord = (models?.AffiCommissionRecord ||
  model<ICommissionRecord>(
    "AffiCommissionRecord",
    CommissionRecordSchema,
  )) as Model<ICommissionRecord>;

export default AffiCommissionRecord;
