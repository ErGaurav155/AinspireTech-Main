import mongoose, { Schema, Document } from "mongoose";

export interface IInstagramAccount extends Document {
  userId: string; // Clerk user ID
  instagramId: string; // Instagram Business Account ID
  userInstaId: string;
  username: string;
  accessToken: string;
  refreshToken?: string;
  tokenExpiresAt?: Date;
  isActive: boolean;
  accountReply: number;
  accountFollowCheck: number;
  accountDMSent: number;
  lastActivity: Date;
  profilePicture?: string;
  followersCount?: number;
  followingCount?: number;
  mediaCount?: number;
  createdAt: Date;
  updatedAt: Date;

  // Settings
  autoReplyEnabled: boolean;
  autoDMEnabled: boolean;
  followCheckEnabled: boolean;
  requireFollowForFreeUsers: boolean;

  // Rate limiting
  metaCallsThisHour: number;
  lastMetaCallAt: Date;
  isMetaRateLimited: boolean;
  metaRateLimitResetAt?: Date;
}

const InstagramAccountSchema = new Schema<IInstagramAccount>(
  {
    userId: { type: String, required: true, index: true },
    instagramId: { type: String, required: true, unique: true },
    userInstaId: { type: String, unique: true, sparse: true },
    username: { type: String, required: true },
    accessToken: { type: String, required: true },
    refreshToken: { type: String },
    tokenExpiresAt: { type: Date },
    isActive: { type: Boolean, default: true },
    accountReply: { type: Number, default: 0 },
    accountFollowCheck: { type: Number, default: 0 },
    accountDMSent: { type: Number, default: 0 },
    lastActivity: { type: Date, default: Date.now },
    profilePicture: { type: String },
    followersCount: { type: Number },
    followingCount: { type: Number },
    mediaCount: { type: Number },

    autoReplyEnabled: { type: Boolean, default: true },
    autoDMEnabled: { type: Boolean, default: true },
    followCheckEnabled: { type: Boolean, default: true },
    requireFollowForFreeUsers: { type: Boolean, default: false },

    metaCallsThisHour: { type: Number, default: 0 },
    lastMetaCallAt: { type: Date, default: Date.now },
    isMetaRateLimited: { type: Boolean, default: false },
    metaRateLimitResetAt: { type: Date },
  },
  { timestamps: true },
);

// Indexes for performance
InstagramAccountSchema.index({ userId: 1, isActive: 1 });
InstagramAccountSchema.index({ instagramId: 1, isActive: 1 });
InstagramAccountSchema.index({ lastActivity: -1 });

const InstagramAccount =
  mongoose.models?.InstagramAccount ||
  mongoose.model<IInstagramAccount>("InstagramAccount", InstagramAccountSchema);

export default InstagramAccount;
