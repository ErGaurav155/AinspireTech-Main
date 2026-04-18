import mongoose, { Schema, Document, Model } from "mongoose";

export interface ITokenBalance extends Document {
  userId: string;
  freeTokens: number;
  subscriptionTokens: Map<string, number>; // Tokens per subscribed chatbot
  usedFreeTokens: number;
  usedSubscriptionTokens: Map<string, number>; // Usage per chatbot
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
    subscriptionTokens: {
      type: Map,
      of: Number,
      default: {},
    },
    usedFreeTokens: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
    },
    usedSubscriptionTokens: {
      type: Map,
      of: Number,
      default: {},
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
  },
);
const TokenBalance = (mongoose.models?.TokenBalance ||
  mongoose.model<ITokenBalance>(
    "TokenBalance",
    TokenBalanceSchema,
  )) as Model<ITokenBalance>;

export default TokenBalance;
