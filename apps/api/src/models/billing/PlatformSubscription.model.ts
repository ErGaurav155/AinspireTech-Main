import mongoose, { Document, Model, Schema, Types } from "mongoose";
import type { BillingOwnerType } from "@rocketreplai/shared/platform";

export interface IPlatformSubscription extends Document {
  ownerType: BillingOwnerType;
  ownerId: Types.ObjectId;
  kind: "base" | "service" | "legacy";
  planId: Types.ObjectId;
  planCode: string;
  planRevision: number;
  provider: "razorpay" | "manual" | "legacy";
  providerSubscriptionId?: string;
  providerCustomerId?: string;
  checkoutIdempotencyKey?: string;
  status:
    | "pending"
    | "trialing"
    | "active"
    | "past_due"
    | "paused"
    | "cancelled"
    | "expired";
  billingInterval: "monthly" | "yearly";
  currentPeriodStart?: Date;
  currentPeriodEnd?: Date;
  gracePeriodEnd?: Date;
  cancelAtPeriodEnd: boolean;
  cancelledAt?: Date;
  pendingChange?: {
    planId: Types.ObjectId;
    planCode: string;
    effectiveAt: Date;
    status: "pending" | "applied" | "cancelled";
  };
  entitlementSnapshot?: {
    features: Record<string, boolean>;
    limits: Record<string, number>;
  };
  legacySource?: { model: string; id: string };
  lastProviderEventAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const PlatformSubscriptionSchema = new Schema<IPlatformSubscription>(
  {
    ownerType: {
      type: String,
      enum: ["WORKSPACE", "AGENCY"],
      required: true,
    },
    ownerId: { type: Schema.Types.ObjectId, required: true, index: true },
    kind: {
      type: String,
      enum: ["base", "service", "legacy"],
      default: "base",
      index: true,
    },
    planId: {
      type: Schema.Types.ObjectId,
      ref: "PlanDefinition",
      required: true,
    },
    planCode: { type: String, required: true, trim: true, lowercase: true },
    planRevision: { type: Number, required: true, min: 1 },
    provider: {
      type: String,
      enum: ["razorpay", "manual", "legacy"],
      required: true,
    },
    providerSubscriptionId: String,
    providerCustomerId: String,
    checkoutIdempotencyKey: String,
    status: {
      type: String,
      enum: [
        "pending",
        "trialing",
        "active",
        "past_due",
        "paused",
        "cancelled",
        "expired",
      ],
      default: "pending",
      index: true,
    },
    billingInterval: {
      type: String,
      enum: ["monthly", "yearly"],
      required: true,
    },
    currentPeriodStart: Date,
    currentPeriodEnd: Date,
    gracePeriodEnd: Date,
    cancelAtPeriodEnd: { type: Boolean, default: false },
    cancelledAt: Date,
    pendingChange: {
      planId: { type: Schema.Types.ObjectId, ref: "PlanDefinition" },
      planCode: String,
      effectiveAt: Date,
      status: { type: String, enum: ["pending", "applied", "cancelled"] },
    },
    entitlementSnapshot: {
      features: { type: Schema.Types.Mixed, default: {} },
      limits: { type: Schema.Types.Mixed, default: {} },
    },
    legacySource: {
      model: String,
      id: String,
    },
    lastProviderEventAt: Date,
  },
  { timestamps: true },
);

PlatformSubscriptionSchema.index({ ownerType: 1, ownerId: 1, status: 1 });
PlatformSubscriptionSchema.index(
  { provider: 1, providerSubscriptionId: 1 },
  { unique: true, sparse: true },
);
PlatformSubscriptionSchema.index(
  { checkoutIdempotencyKey: 1 },
  { unique: true, sparse: true },
);
PlatformSubscriptionSchema.index(
  { ownerType: 1, ownerId: 1, kind: 1, status: 1 },
);
PlatformSubscriptionSchema.index(
  { "legacySource.model": 1, "legacySource.id": 1 },
  { unique: true, sparse: true },
);

const PlatformSubscription =
  (mongoose.models?.PlatformSubscription ||
    mongoose.model<IPlatformSubscription>(
      "PlatformSubscription",
      PlatformSubscriptionSchema,
    )) as Model<IPlatformSubscription>;

export default PlatformSubscription;
