import mongoose, { Document, Model, Schema } from "mongoose";

export interface ICallSubscription extends Document {
  clerkId: string;
  planType: "call-starter" | "call-growth" | "call-enterprise";
  subscriptionId: string;
  plan: string;
  billingCycle: "monthly" | "yearly";
  status: "active" | "cancelled" | "expired";
  minutesLimit: number;
  numberLimit: number;
  agentLimit: number;
  overageRate: number;
  createdAt: Date;
  expiresAt: Date;
  cancelledAt?: Date;
  updatedAt: Date;
}

const CallSubscriptionSchema = new Schema<ICallSubscription>(
  {
    clerkId: { type: String, required: true, index: true },
    planType: {
      type: String,
      required: true,
      enum: ["call-starter", "call-growth", "call-enterprise"],
    },
    subscriptionId: { type: String, required: true, unique: true },
    plan: { type: String, required: true },
    billingCycle: {
      type: String,
      enum: ["monthly", "yearly"],
      required: true,
    },
    status: {
      type: String,
      enum: ["active", "cancelled", "expired"],
      default: "active",
    },
    minutesLimit: { type: Number, default: 1000 },
    numberLimit: { type: Number, default: 1 },
    agentLimit: { type: Number, default: 3 },
    overageRate: { type: Number, default: 5 },
    expiresAt: { type: Date, required: true },
    cancelledAt: Date,
  },
  { timestamps: true },
);

CallSubscriptionSchema.index({ clerkId: 1, status: 1 });
CallSubscriptionSchema.index({ planType: 1, status: 1 });

const CallSubscription = (mongoose.models?.CallSubscription ||
  mongoose.model<ICallSubscription>(
    "CallSubscription",
    CallSubscriptionSchema,
  )) as Model<ICallSubscription>;

export default CallSubscription;
