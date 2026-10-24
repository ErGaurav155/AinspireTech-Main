import mongoose, { Document, Model, Schema } from "mongoose";

export interface IPromotionCode extends Document {
  code: string;
  name: string;
  razorpayOfferId: string;
  accountTypes: Array<"BUSINESS" | "AGENCY">;
  planCodes: string[];
  productIds: string[];
  billingIntervals: Array<"monthly" | "yearly">;
  durationCycles?: number;
  validFrom?: Date;
  validUntil?: Date;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const PromotionCodeSchema = new Schema<IPromotionCode>(
  {
    code: { type: String, required: true, trim: true, uppercase: true, unique: true },
    name: { type: String, required: true, trim: true, maxlength: 160 },
    razorpayOfferId: { type: String, required: true, trim: true, index: true },
    accountTypes: {
      type: [String],
      enum: ["BUSINESS", "AGENCY"],
      default: ["BUSINESS", "AGENCY"],
    },
    planCodes: { type: [String], default: [] },
    productIds: { type: [String], default: [] },
    billingIntervals: {
      type: [String],
      enum: ["monthly", "yearly"],
      default: ["monthly", "yearly"],
    },
    durationCycles: { type: Number, min: 1, max: 120 },
    validFrom: Date,
    validUntil: Date,
    active: { type: Boolean, default: true, index: true },
  },
  { timestamps: true },
);

PromotionCodeSchema.index({ active: 1, validFrom: 1, validUntil: 1 });

const PromotionCode =
  (mongoose.models?.PromotionCode ||
    mongoose.model<IPromotionCode>("PromotionCode", PromotionCodeSchema)) as Model<IPromotionCode>;

export default PromotionCode;
