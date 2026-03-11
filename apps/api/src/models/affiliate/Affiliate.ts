// models/affiliate/Affiliate.ts
import { Schema, model, models, Document, Model } from "mongoose";
export interface IPaymentDetails {
  method: "bank" | "upi" | "paypal";
  accountName?: string;
  accountNumber?: string;
  bankName?: string;
  ifscCode?: string;
  upiId?: string;
  paypalEmail?: string;
}

export interface IAffiliate extends Document {
  userId: string;
  affiliateCode: string;
  status: "active" | "suspended";
  paymentDetails?: IPaymentDetails | null;
  commissionRate: number;
  monthlyMonths: number;
  yearlyYears: number;
  totalEarnings: number;
  pendingEarnings: number;
  paidEarnings: number;
  totalReferrals: number;
  activeReferrals: number;
  lastPayoutDate?: Date;
  createdAt: Date;
  updatedAt: Date;
}
const PaymentDetailsSchema = new Schema({
  method: {
    type: String,
    enum: ["bank", "upi", "paypal"],
    required: true,
  },
  accountName: String,
  accountNumber: String,
  bankName: String,
  ifscCode: String,
  upiId: String,
  paypalEmail: String,
});

const AffiliateSchema = new Schema(
  {
    userId: {
      type: String,
      required: true,
      unique: true,
    },
    affiliateCode: {
      type: String,
      required: true,
      unique: true,
    },
    status: {
      type: String,
      enum: ["active", "suspended"],
      default: "active",
    },

    // ✅ OPTIONAL - User can add this later when requesting payout
    paymentDetails: {
      type: PaymentDetailsSchema,
      required: false,
      default: null,
    },

    // Commission settings
    commissionRate: {
      type: Number,
      default: 0.25, // 25%
    },
    monthlyMonths: {
      type: Number,
      default: 10,
    },
    yearlyYears: {
      type: Number,
      default: 3,
    },

    // Stats
    totalEarnings: {
      type: Number,
      default: 0,
    },
    pendingEarnings: {
      type: Number,
      default: 0,
    },
    paidEarnings: {
      type: Number,
      default: 0,
    },
    totalReferrals: {
      type: Number,
      default: 0,
    },
    activeReferrals: {
      type: Number,
      default: 0,
    },
    lastPayoutDate: Date,
  },
  {
    timestamps: true,
  },
);

const Affiliate = (models?.Affiliate ||
  model<IAffiliate>("Affiliate", AffiliateSchema)) as Model<IAffiliate>;

export default Affiliate;
