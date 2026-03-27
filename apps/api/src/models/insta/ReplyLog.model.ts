// models/insta/ReplyLog.model.ts
import mongoose, { Schema, Document, Model } from "mongoose";

export interface IReplyLog extends Document {
  userId: string;
  accountId: string;
  templateId?: string;
  templateName?: string;
  automationType?: "comments" | "stories" | "dms";

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
  dmFlowStage?: string;
  dmMessageId?: string;

  // Follow tracking
  followChecked?: boolean;
  userFollows?: boolean;

  // Email/Phone collection
  emailCollected?: string;
  phoneCollected?: string;

  // Link tracking
  linkSent?: boolean;

  // Follow-up DM tracking
  followUpCount: number;
  lastFollowUpAt?: Date;
  followUpCompleted: boolean;

  // Status
  success: boolean;
  responseTime?: number;
  errorMessage?: string;

  // Queue status
  queueId?: string;
  processedAfterQueue?: boolean;
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
    automationType: {
      type: String,
      enum: ["comments", "stories", "dms"],
      default: "comments",
    },

    commentId: { type: String, required: true, unique: true },
    commentText: { type: String, required: true },
    commenterUsername: { type: String, required: true },
    commenterUserId: { type: String, required: true, index: true },
    mediaId: { type: String, required: true, index: true },

    replyText: { type: String },
    replyType: {
      type: String,
      enum: ["comment", "dm", "both", "none"],
      default: "none",
    },

    dmFlowStage: { type: String },
    dmMessageId: { type: String },

    followChecked: { type: Boolean, default: false },
    userFollows: { type: Boolean },

    emailCollected: { type: String },
    phoneCollected: { type: String },

    linkSent: { type: Boolean, default: false },

    // Follow-up DM tracking
    followUpCount: { type: Number, default: 0 },
    lastFollowUpAt: { type: Date },
    followUpCompleted: { type: Boolean, default: false },

    success: { type: Boolean, required: true },
    responseTime: { type: Number },
    errorMessage: { type: String },

    queueId: { type: String },
    processedAfterQueue: { type: Boolean, default: false },
    wasQueued: { type: Boolean, default: false },
    queuedAt: { type: Date },
    processedAt: { type: Date },
  },
  { timestamps: true },
);

ReplyLogSchema.index({ userId: 1, createdAt: -1 });
ReplyLogSchema.index({ accountId: 1, createdAt: -1 });
ReplyLogSchema.index({ templateId: 1, createdAt: -1 });
ReplyLogSchema.index({ success: 1, createdAt: -1 });
ReplyLogSchema.index({ wasQueued: 1, createdAt: -1 });
ReplyLogSchema.index(
  { userId: 1, commenterUserId: 1, dmFlowStage: 1 },
  { sparse: true },
);
// Index for follow-up processing
ReplyLogSchema.index(
  { templateId: 1, followUpCompleted: 1, dmFlowStage: 1 },
  { sparse: true },
);

const InstaReplyLog = (mongoose.models?.InstaReplyLog ||
  mongoose.model<IReplyLog>(
    "InstaReplyLog",
    ReplyLogSchema,
  )) as Model<IReplyLog>;

export default InstaReplyLog;
