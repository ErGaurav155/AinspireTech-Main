import mongoose, { Schema, Document } from "mongoose";

export interface IRateLimitWindow extends Document {
  windowStart: Date;
  windowEnd: Date;
  globalCalls: number;
  appLimit: number;
  accountsProcessed: number;
  isAutomationPaused: boolean;
  status: "active" | "completed" | "archived";
  metadata?: {
    totalAccounts: number;
    freeUsers: number;
    proUsers: number;
  };
  createdAt: Date;
  updatedAt: Date;
}

const RateLimitWindowSchema = new Schema<IRateLimitWindow>(
  {
    windowStart: { type: Date, required: true, unique: true },
    windowEnd: { type: Date, required: true },
    globalCalls: { type: Number, default: 0 },
    appLimit: { type: Number, required: true },
    accountsProcessed: { type: Number, default: 0 },
    isAutomationPaused: { type: Boolean, default: false },
    status: {
      type: String,
      enum: ["active", "completed", "archived"],
      default: "active",
    },
    metadata: {
      totalAccounts: { type: Number },
      freeUsers: { type: Number },
      proUsers: { type: Number },
    },
  },
  { timestamps: true },
);

RateLimitWindowSchema.index({ windowStart: -1 });
RateLimitWindowSchema.index({ status: 1, windowStart: -1 });

const RateLimitWindow =
  mongoose.models?.RateLimitWindow ||
  mongoose.model<IRateLimitWindow>("RateLimitWindow", RateLimitWindowSchema);

export default RateLimitWindow;
