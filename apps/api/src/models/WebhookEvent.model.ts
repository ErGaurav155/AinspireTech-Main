import mongoose, { Document, Model, Schema } from "mongoose";

export interface IWebhookEvent extends Document {
  provider: "clerk" | "razorpay";
  providerEventId: string;
  eventType: string;
  payloadHash: string;
  status: "processing" | "processed" | "ignored" | "failed";
  attempts: number;
  error?: string;
  processedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const WebhookEventSchema = new Schema<IWebhookEvent>(
  {
    provider: { type: String, enum: ["clerk", "razorpay"], required: true },
    providerEventId: { type: String, required: true },
    eventType: { type: String, required: true, index: true },
    payloadHash: { type: String, required: true },
    status: {
      type: String,
      enum: ["processing", "processed", "ignored", "failed"],
      default: "processing",
      index: true,
    },
    attempts: { type: Number, default: 1, min: 1 },
    error: { type: String, maxlength: 2000 },
    processedAt: Date,
  },
  { timestamps: true },
);

WebhookEventSchema.index(
  { provider: 1, providerEventId: 1 },
  { unique: true },
);
WebhookEventSchema.index({ status: 1, updatedAt: 1 });

const WebhookEvent = (mongoose.models?.WebhookEvent ||
  mongoose.model<IWebhookEvent>(
    "WebhookEvent",
    WebhookEventSchema,
  )) as Model<IWebhookEvent>;

export default WebhookEvent;
