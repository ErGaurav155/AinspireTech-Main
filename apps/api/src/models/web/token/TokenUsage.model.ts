import mongoose, { Schema, Document, Model } from "mongoose";

export interface ITokenUsage extends Document {
  userId: string;
  chatbotId?: string;
  tokensUsed: number;
  totalCost: number;
  createdAt: Date;
  updatedAt: Date;
}

const TokenUsageSchema = new Schema<ITokenUsage>(
  {
    userId: {
      type: String,
      required: true,
      index: true,
    },
    chatbotId: {
      type: String,
      index: true,
    },
    tokensUsed: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
    },
    totalCost: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

const TokenUsage =
  mongoose.models?.TokenUsage ||
  mongoose.model<ITokenUsage>("TokenUsage", TokenUsageSchema);

export default TokenUsage;
