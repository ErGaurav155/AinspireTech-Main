import mongoose, { Schema, Document, Model } from "mongoose";

export interface ITokenBalance extends Document {
  userId: string;
  freeTokens: number;
  purchasedTokens: number;
  usedFreeTokens: number;
  usedPurchasedTokens: number;
  totalTokensUsed: number;
  lastResetAt: Date;
  nextResetAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const TokenBalanceSchema = new Schema<ITokenBalance>(
  {
    userId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    freeTokens: {
      type: Number,
      required: true,
      default: 10000,
      min: 0,
    },
    purchasedTokens: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
    },
    usedFreeTokens: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
    },
    usedPurchasedTokens: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
    },
    totalTokensUsed: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
    },
    lastResetAt: {
      type: Date,
      default: Date.now,
    },
    nextResetAt: {
      type: Date,
      default: () => new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    },
  },
  {
    timestamps: true,
  }
);

const TokenBalance =
  mongoose.models?.TokenBalance ||
  mongoose.model<ITokenBalance>("TokenBalance", TokenBalanceSchema);

export default TokenBalance;
