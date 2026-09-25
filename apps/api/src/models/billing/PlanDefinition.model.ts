import mongoose, { Document, Model, Schema } from "mongoose";
import type {
  AccountType,
  FeatureEntitlements,
  LimitEntitlements,
} from "@rocketreplai/shared/platform";

export interface IPlanDefinition extends Document {
  code: string;
  revision: number;
  name: string;
  description?: string;
  accountType: AccountType;
  kind: "base" | "service" | "legacy";
  billingInterval: "monthly" | "yearly";
  price: number;
  currency: string;
  features: FeatureEntitlements;
  limits: LimitEntitlements;
  razorpay: {
    productId?: string;
    planId?: string;
    offerId?: string;
  };
  active: boolean;
  publishedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const PlanDefinitionSchema = new Schema<IPlanDefinition>(
  {
    code: { type: String, required: true, trim: true, lowercase: true },
    revision: { type: Number, required: true, min: 1, default: 1 },
    name: { type: String, required: true, trim: true, maxlength: 160 },
    description: { type: String, trim: true, maxlength: 1000 },
    accountType: {
      type: String,
      enum: ["BUSINESS", "AGENCY"],
      required: true,
      index: true,
    },
    kind: {
      type: String,
      enum: ["base", "service", "legacy"],
      default: "base",
      index: true,
    },
    billingInterval: {
      type: String,
      enum: ["monthly", "yearly"],
      required: true,
    },
    price: { type: Number, required: true, min: 0 },
    currency: { type: String, required: true, default: "INR", uppercase: true },
    features: { type: Schema.Types.Mixed, default: {} },
    limits: { type: Schema.Types.Mixed, default: {} },
    razorpay: {
      productId: String,
      planId: { type: String },
      offerId: String,
    },
    active: { type: Boolean, default: false, index: true },
    publishedAt: Date,
  },
  { timestamps: true },
);

PlanDefinitionSchema.index({ code: 1, revision: 1 }, { unique: true });
PlanDefinitionSchema.index(
  { "razorpay.planId": 1 },
  { unique: true, sparse: true },
);
PlanDefinitionSchema.index({ accountType: 1, active: 1, kind: 1 });

const PlanDefinition = (mongoose.models?.PlanDefinition ||
  mongoose.model<IPlanDefinition>(
    "PlanDefinition",
    PlanDefinitionSchema,
  )) as Model<IPlanDefinition>;

export default PlanDefinition;
