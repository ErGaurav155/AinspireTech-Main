import mongoose, { Document, Model, Schema, Types } from "mongoose";
import type { BillingOwnerType } from "@rocketreplai/shared/platform";

export interface IPurchasedAddon extends Document {
  ownerType: BillingOwnerType;
  ownerId: Types.ObjectId;
  addonId: Types.ObjectId;
  addonCode: string;
  addonRevision: number;
  quantity: number;
  provider: "razorpay" | "manual" | "legacy";
  providerReference?: string;
  checkoutIdempotencyKey?: string;
  status: "pending" | "active" | "past_due" | "cancelled" | "expired";
  currentPeriodStart?: Date;
  currentPeriodEnd?: Date;
  cancelAtPeriodEnd: boolean;
  pendingChange?: {
    quantity: number;
    effectiveAt?: Date;
    status: "pending" | "applied" | "cancelled";
  };
  createdAt: Date;
  updatedAt: Date;
}

const PurchasedAddonSchema = new Schema<IPurchasedAddon>(
  {
    ownerType: {
      type: String,
      enum: ["WORKSPACE", "AGENCY"],
      required: true,
    },
    ownerId: { type: Schema.Types.ObjectId, required: true, index: true },
    addonId: {
      type: Schema.Types.ObjectId,
      ref: "AddonDefinition",
      required: true,
    },
    addonCode: { type: String, required: true, trim: true, lowercase: true },
    addonRevision: { type: Number, required: true, min: 1 },
    quantity: { type: Number, required: true, min: 1, default: 1 },
    provider: {
      type: String,
      enum: ["razorpay", "manual", "legacy"],
      required: true,
    },
    providerReference: String,
    checkoutIdempotencyKey: String,
    status: {
      type: String,
      enum: ["pending", "active", "past_due", "cancelled", "expired"],
      default: "pending",
      index: true,
    },
    currentPeriodStart: Date,
    currentPeriodEnd: Date,
    cancelAtPeriodEnd: { type: Boolean, default: false },
    pendingChange: {
      quantity: { type: Number, min: 0 },
      effectiveAt: Date,
      status: { type: String, enum: ["pending", "applied", "cancelled"] },
    },
  },
  { timestamps: true },
);

PurchasedAddonSchema.index({ ownerType: 1, ownerId: 1, status: 1 });
PurchasedAddonSchema.index(
  { provider: 1, providerReference: 1 },
  { unique: true, sparse: true },
);
PurchasedAddonSchema.index(
  { checkoutIdempotencyKey: 1 },
  { unique: true, sparse: true },
);

const PurchasedAddon = (mongoose.models?.PurchasedAddon ||
  mongoose.model<IPurchasedAddon>(
    "PurchasedAddon",
    PurchasedAddonSchema,
  )) as Model<IPurchasedAddon>;

export default PurchasedAddon;
