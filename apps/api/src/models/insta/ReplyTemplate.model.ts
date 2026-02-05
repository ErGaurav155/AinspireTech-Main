import mongoose, { Schema, Document } from "mongoose";

export interface IReplyTemplateContent {
  text: string;
  link: string;
  buttonTitle?: string;
}

export interface IReplyTemplate extends Document {
  userId: string;
  accountId: string;
  name: string;
  mediaId: string; // Instagram media ID (post ID)
  mediaUrl?: string;

  // Comment reply settings
  reply: string[]; // Multiple reply options (randomly chosen)

  // DM automation settings
  isFollow: boolean; // true = requires follow, false = no follow required
  content: IReplyTemplateContent[]; // Multiple content options

  // Trigger words
  triggers?: string[];

  // Timing
  delaySeconds: number; // Delay before sending DM

  // Statistics
  usageCount: number;
  lastUsed: Date;

  // Status
  isActive: boolean;
  priority: number; // Higher number = higher priority

  // Settings per user tier
  settingsByTier: {
    free: {
      requireFollow: boolean;
      skipFollowCheck: boolean;
      directLink: boolean;
    };
    pro: {
      requireFollow: boolean;
      useAdvancedFlow: boolean;
      maxRetries: number;
    };
  };

  createdAt: Date;
  updatedAt: Date;
}

const ReplyTemplateSchema = new Schema<IReplyTemplate>(
  {
    userId: { type: String, required: true, index: true },
    accountId: { type: String, required: true, index: true },
    name: { type: String, required: true },
    mediaId: { type: String, required: true, index: true },
    mediaUrl: { type: String },
    // openDm: { type: String, required: true, trim: true, maxlength: 500 },

    reply: { type: [String], required: true },

    isFollow: { type: Boolean, default: true },
    content: [
      {
        text: { type: String, required: true },
        link: { type: String, required: true },
        buttonTitle: { type: String, default: "Get Access" },
      },
    ],

    triggers: { type: [String] },

    delaySeconds: { type: Number, default: 0 },

    usageCount: { type: Number, default: 0 },
    lastUsed: { type: Date },

    isActive: { type: Boolean, default: true },
    priority: { type: Number, default: 1 },

    settingsByTier: {
      free: {
        requireFollow: { type: Boolean, default: false },
        skipFollowCheck: { type: Boolean, default: true },
        directLink: { type: Boolean, default: true },
      },
      pro: {
        requireFollow: { type: Boolean, default: true },
        useAdvancedFlow: { type: Boolean, default: true },
        maxRetries: { type: Number, default: 3 },
      },
    },
  },
  { timestamps: true },
);

// Indexes
ReplyTemplateSchema.index({ userId: 1, mediaId: 1, isActive: 1 });
ReplyTemplateSchema.index({ accountId: 1, mediaId: 1 });
ReplyTemplateSchema.index({ triggers: 1 });

const InstaReplyTemplate =
  mongoose.models?.InstaReplyTemplate ||
  mongoose.model<IReplyTemplate>("InstaReplyTemplate", ReplyTemplateSchema);

export default InstaReplyTemplate;
