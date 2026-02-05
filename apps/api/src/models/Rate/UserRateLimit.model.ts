import mongoose, { Schema, Document } from "mongoose";

export interface IAccountUsage {
  instagramAccountId: string;
  callsMade: number;
  lastCallAt: Date;
  accountUsername?: string;
  accountProfile?: string;
}

export interface IUserRateLimit extends Document {
  clerkId: string;
  windowStart: Date;
  totalCallsMade: number;
  tier: string;
  tierLimit: number;
  isAutomationPaused: boolean;
  accountUsage: IAccountUsage[];
  createdAt: Date;
  updatedAt: Date;
}

const UserRateLimitSchema = new Schema<IUserRateLimit>(
  {
    clerkId: { type: String, required: true },
    windowStart: { type: Date, required: true },
    totalCallsMade: { type: Number, default: 0 },
    tier: { type: String, required: true },
    tierLimit: { type: Number, required: true },
    isAutomationPaused: { type: Boolean, default: false },
    accountUsage: [
      {
        instagramAccountId: { type: String, required: true },
        callsMade: { type: Number, default: 0 },
        lastCallAt: { type: Date, default: Date.now },
        accountUsername: { type: String },
        accountProfile: { type: String },
      },
    ],
  },
  { timestamps: true },
);

// Compound index for fast lookups
UserRateLimitSchema.index({ clerkId: 1, windowStart: 1 }, { unique: true });
UserRateLimitSchema.index({ windowStart: 1, tier: 1 });

const RateUserRateLimit =
  mongoose.models?.RateUserRateLimit ||
  mongoose.model<IUserRateLimit>("RateUserRateLimit", UserRateLimitSchema);

export default RateUserRateLimit;
