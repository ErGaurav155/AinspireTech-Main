// models/insta/ReplyLog.model.ts
import mongoose, { Schema, Document } from "mongoose";

export interface IReplyLog extends Document {
  userId: string;
  accountId: string;
  templateId?: string;
  templateName?: string;

  // Comment/Story details
  commentId: string;
  commentText: string;
  commenterUsername: string;
  commenterUserId: string;
  mediaId: string;

  // Reply details
  replyText?: string;
  replyType?: "comment" | "dm" | "both" | "none";

  // DM flow tracking
  dmFlowStage?: string; // 'initial' | 'welcome' | 'check_follow' | 'waiting_for_follow' | 'waiting_for_email' | 'waiting_for_phone' | 'email_collected' | 'phone_collected' | 'final_link'
  dmMessageId?: string;

  // Follow tracking
  followChecked?: boolean;
  userFollows?: boolean;

  // Email/Phone collection
  emailCollected?: string;
  phoneCollected?: string;

  // Link tracking
  linkSent?: boolean;

  // Status
  success: boolean;
  responseTime?: number;
  errorMessage?: string;

  // Queue status
  wasQueued?: boolean;
  queuedAt?: Date;
  processedAt?: Date;

  createdAt: Date;
  updatedAt: Date;
}

const ReplyLogSchema = new Schema<IReplyLog>(
  {
    userId: { type: String, required: true, index: true },
    accountId: { type: String, required: true, index: true },
    templateId: { type: String, index: true },
    templateName: { type: String },

    // Comment/Story details
    commentId: { type: String, required: true, unique: true },
    commentText: { type: String, required: true },
    commenterUsername: { type: String, required: true },
    commenterUserId: { type: String, required: true, index: true },
    mediaId: { type: String, required: true, index: true },

    // Reply details
    replyText: { type: String },
    replyType: {
      type: String,
      enum: ["comment", "dm", "both", "none"],
      default: "none",
    },

    // DM flow tracking
    dmFlowStage: { type: String },
    dmMessageId: { type: String },

    // Follow tracking
    followChecked: { type: Boolean, default: false },
    userFollows: { type: Boolean },

    // Email/Phone collection
    emailCollected: { type: String },
    phoneCollected: { type: String },

    // Link tracking
    linkSent: { type: Boolean, default: false },

    // Status
    success: { type: Boolean, required: true },
    responseTime: { type: Number },
    errorMessage: { type: String },

    // Queue status
    wasQueued: { type: Boolean, default: false },
    queuedAt: { type: Date },
    processedAt: { type: Date },
  },
  { timestamps: true },
);

// Indexes for performance
ReplyLogSchema.index({ userId: 1, createdAt: -1 });
ReplyLogSchema.index({ accountId: 1, createdAt: -1 });
ReplyLogSchema.index({ templateId: 1, createdAt: -1 });
ReplyLogSchema.index({ success: 1, createdAt: -1 });
ReplyLogSchema.index({ wasQueued: 1, createdAt: -1 });
ReplyLogSchema.index(
  { userId: 1, commenterUserId: 1, dmFlowStage: 1 },
  { sparse: true },
);

const InstaReplyLog =
  mongoose.models?.InstaReplyLog ||
  mongoose.model<IReplyLog>("InstaReplyLog", ReplyLogSchema);

export default InstaReplyLog;
