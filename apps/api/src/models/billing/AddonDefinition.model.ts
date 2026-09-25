import mongoose, { Document, Model, Schema } from "mongoose";
import type {
  AccountType,
  FeatureEntitlements,
  LimitEntitlements,
} from "@rocketreplai/shared/platform";

export interface IAddonDefinition extends Document {
  code: string;
  revision: number;
  name: string;
  accountTypes: AccountType[];
  price: number;
  currency: string;
  billingInterval: "monthly" | "yearly";
  entitlementChanges: {
    features: FeatureEntitlements;
    limits: LimitEntitlements;
  };
  limitOperation: "add" | "replace";
  razorpay: { productId?: string; planId?: string; offerId?: string };
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const AddonDefinitionSchema = new Schema<IAddonDefinition>(
  {
    code: { type: String, required: true, trim: true, lowercase: true },
    revision: { type: Number, required: true, min: 1, default: 1 },
    name: { type: String, required: true, trim: true, maxlength: 160 },
    accountTypes: {
      type: [String],
      enum: ["BUSINESS", "AGENCY"],
      required: true,
    },
    price: { type: Number, required: true, min: 0 },
    currency: { type: String, required: true, default: "INR", uppercase: true },
    billingInterval: {
      type: String,
      enum: ["monthly", "yearly"],
      required: true,
    },
    entitlementChanges: {
      features: { type: Schema.Types.Mixed, default: {} },
      limits: { type: Schema.Types.Mixed, default: {} },
    },
    limitOperation: {
      type: String,
      enum: ["add", "replace"],
      default: "add",
    },
    razorpay: {
      productId: String,
      planId: String,
      offerId: String,
    },
    active: { type: Boolean, default: false, index: true },
  },
  { timestamps: true },
);

AddonDefinitionSchema.index({ code: 1, revision: 1 }, { unique: true });
AddonDefinitionSchema.index(
  { "razorpay.planId": 1 },
  { unique: true, sparse: true },
);

const AddonDefinition = (mongoose.models?.AddonDefinition ||
  mongoose.model<IAddonDefinition>(
    "AddonDefinition",
    AddonDefinitionSchema,
  )) as Model<IAddonDefinition>;

export default AddonDefinition;
