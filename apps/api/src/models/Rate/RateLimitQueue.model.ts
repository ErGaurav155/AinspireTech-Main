import mongoose, { Schema, Document } from "mongoose";

export interface IRateLimitQueue extends Document {
  clerkId: string;
  instagramAccountId: string;
  actionType:
    | "comment_reply"
    | "dm_initial"
    | "dm_follow_check"
    | "dm_final_link";
  actionPayload: any;
  priority: number;
  status: "pending" | "processing" | "completed" | "failed";
  windowStart: Date;
  retryCount: number;
  maxRetries: number;
  errorMessage?: string;
  processingStartedAt?: Date;
  processingCompletedAt?: Date;
  metadata?: {
    reason?: string;
    commentId?: string;
    recipientId?: string;
    templateId?: string;
    stage?: string;
  };
  createdAt: Date;
  updatedAt: Date;
}

const RateLimitQueueSchema = new Schema<IRateLimitQueue>(
  {
    clerkId: { type: String, required: true, index: true },
    instagramAccountId: { type: String, required: true, index: true },
    actionType: {
      type: String,
      enum: ["comment_reply", "dm_initial", "dm_follow_check", "dm_final_link"],
      required: true,
    },
    actionPayload: { type: Schema.Types.Mixed, required: true },
    priority: { type: Number, default: 5, min: 1, max: 10 },
    status: {
      type: String,
      enum: ["pending", "processing", "completed", "failed"],
      default: "pending",
    },
    windowStart: { type: Date, required: true, index: true },
    retryCount: { type: Number, default: 0 },
    maxRetries: { type: Number, default: 3 },
    errorMessage: { type: String },
    processingStartedAt: { type: Date },
    processingCompletedAt: { type: Date },
    metadata: {
      reason: { type: String },
      commentId: { type: String },
      recipientId: { type: String },
      templateId: { type: String },
      stage: { type: String },
    },
  },
  { timestamps: true },
);

// Indexes for queue processing
RateLimitQueueSchema.index({ status: 1, priority: 1, createdAt: 1 });
RateLimitQueueSchema.index({ windowStart: 1, status: 1 });
RateLimitQueueSchema.index({ createdAt: 1 }, { expireAfterSeconds: 172800 }); // Auto-delete after 48 hours

const RateLimitQueue =
  mongoose.models?.RateLimitQueue ||
  mongoose.model<IRateLimitQueue>("RateLimitQueue", RateLimitQueueSchema);

export default RateLimitQueue;
