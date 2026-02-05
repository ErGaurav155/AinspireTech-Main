import mongoose, { Schema, Document } from "mongoose";

export interface IReplyLog extends Document {
  // User and account info
  userId: string;
  accountId: string;
  templateId?: string;
  templateName?: string;

  // Comment info
  commentId: string;
  commentText: string;
  commenterUsername: string;
  commenterUserId: string;
  mediaId: string;

  // Reply info
  replyText?: string;
  replyType: "comment" | "dm" | "both";

  // DM flow info
  dmFlowStage?: "initial" | "follow_check" | "follow_reminder" | "final_link";
  dmMessageId?: string;
  followChecked?: boolean;
  userFollows?: boolean;
  linkSent?: boolean;

  // Performance
  success: boolean;
  responseTime: number; // milliseconds
  errorMessage?: string;

  // Rate limit info
  wasQueued: boolean;
  queueId?: string;
  processedAfterQueue?: boolean;

  // Metadata
  ipAddress?: string;
  userAgent?: string;

  createdAt: Date;
}

const ReplyLogSchema = new Schema<IReplyLog>(
  {
    userId: { type: String, required: true, index: true },
    accountId: { type: String, required: true, index: true },
    templateId: { type: String },
    templateName: { type: String },

    commentId: { type: String, required: true, unique: true },
    commentText: { type: String, required: true },
    commenterUsername: { type: String, required: true },
    commenterUserId: { type: String, required: true, index: true },
    mediaId: { type: String, required: true, index: true },

    replyText: { type: String },
    replyType: {
      type: String,
      enum: ["comment", "dm", "both"],
      default: "both",
    },

    dmFlowStage: {
      type: String,
      enum: ["initial", "follow_check", "follow_reminder", "final_link"],
    },
    dmMessageId: { type: String },
    followChecked: { type: Boolean },
    userFollows: { type: Boolean },
    linkSent: { type: Boolean },

    success: { type: Boolean, required: true },
    responseTime: { type: Number, required: true },
    errorMessage: { type: String },

    wasQueued: { type: Boolean, default: false },
    queueId: { type: String },
    processedAfterQueue: { type: Boolean },

    ipAddress: { type: String },
    userAgent: { type: String },
  },
  { timestamps: true },
);

// Indexes for analytics
ReplyLogSchema.index({ createdAt: -1 });
ReplyLogSchema.index({ userId: 1, createdAt: -1 });
ReplyLogSchema.index({ accountId: 1, success: 1 });
ReplyLogSchema.index({ commenterUserId: 1, createdAt: -1 });

const InstaReplyLog =
  mongoose.models?.InstaReplyLog ||
  mongoose.model<IReplyLog>("InstaReplyLog", ReplyLogSchema);

export default InstaReplyLog;
