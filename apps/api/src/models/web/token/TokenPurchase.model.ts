import mongoose, { Schema, Document, Model } from "mongoose";

export interface ITokenPurchase extends Document {
  userId: string;
  tokensPurchased: number;
  amount: number;
  currency: string;
  razorpayOrderId: string;
  expiresAt?: Date;
  isOneTime: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const TokenPurchaseSchema = new Schema<ITokenPurchase>(
  {
    userId: {
      type: String,
      required: true,
      index: true,
    },
    tokensPurchased: {
      type: Number,
      required: true,
      min: 1000,
    },
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    currency: {
      type: String,
      required: true,
      default: "INR",
    },
    razorpayOrderId: {
      type: String,
      required: true,
      unique: true,
    },
    expiresAt: {
      type: Date,
    },
    isOneTime: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
TokenPurchaseSchema.index({ createdAt: 1 });
TokenPurchaseSchema.index({ expiresAt: 1 });

const TokenPurchase =
  mongoose.models?.TokenPurchase ||
  mongoose.model<ITokenPurchase>("TokenPurchase", TokenPurchaseSchema);

export default TokenPurchase;
