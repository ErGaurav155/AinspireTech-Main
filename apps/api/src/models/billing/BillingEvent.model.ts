import mongoose, { Document, Model, Schema } from "mongoose";

export interface IBillingEvent extends Document {
  provider: "razorpay";
  providerEventId: string;
  eventType: string;
  providerResourceId?: string;
  payloadHash: string;
  status: "received" | "processing" | "processed" | "ignored" | "failed";
  attempts: number;
  error?: string;
  receivedAt: Date;
  processedAt?: Date;
  metadata: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

const BillingEventSchema = new Schema<IBillingEvent>(
  {
    provider: { type: String, enum: ["razorpay"], required: true },
    providerEventId: { type: String, required: true },
    eventType: { type: String, required: true, index: true },
    providerResourceId: { type: String, index: true },
    payloadHash: { type: String, required: true },
    status: {
      type: String,
      enum: ["received", "processing", "processed", "ignored", "failed"],
      default: "received",
      index: true,
    },
    attempts: { type: Number, default: 0, min: 0 },
    error: { type: String, maxlength: 2000 },
    receivedAt: { type: Date, required: true, default: Date.now },
    processedAt: Date,
    metadata: { type: Schema.Types.Mixed, default: {} },
  },
  { timestamps: true },
);

BillingEventSchema.index(
  { provider: 1, providerEventId: 1 },
  { unique: true },
);
BillingEventSchema.index({ status: 1, receivedAt: 1 });

const BillingEvent = (mongoose.models?.BillingEvent ||
  mongoose.model<IBillingEvent>(
    "BillingEvent",
    BillingEventSchema,
  )) as Model<IBillingEvent>;

export default BillingEvent;
