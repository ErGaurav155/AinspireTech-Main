// models/Payout.ts
import { Schema, model, models, Document, Model } from "mongoose";

export interface IPayout extends Document {
  affiliateId: string;
  amount: number;
  period: string;
  status: "processing" | "completed" | "failed";
  paymentMethod: "bank" | "upi" | "paypal";
  paymentDetails?: Record<string, unknown>;
  transactionId?: string;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}
const PayoutSchema = new Schema(
  {
    affiliateId: {
      type: String,
      required: true,
    },
    amount: {
      type: Number,
      required: true,
    },
    period: {
      type: String, // Format: "2024-01"
      required: true,
    },
    status: {
      type: String,
      enum: ["processing", "completed", "failed"],
      default: "processing",
    },
    paymentMethod: {
      type: String,
      enum: ["bank", "upi", "paypal"],
      required: true,
    },
    paymentDetails: Schema.Types.Mixed,
    transactionId: String,
    notes: String,
  },
  {
    timestamps: true,
  },
);

const AffiPayout = (models?.AffiPayout ||
  model<IPayout>("AffiPayout", PayoutSchema)) as Model<IPayout>;

export default AffiPayout;
