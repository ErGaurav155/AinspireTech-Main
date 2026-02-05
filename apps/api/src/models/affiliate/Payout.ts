// models/Payout.ts
import { Schema, model, models } from "mongoose";

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
  }
);

const AffiPayout = models?.AffiPayout || model("AffiPayout", PayoutSchema);
export default AffiPayout;
