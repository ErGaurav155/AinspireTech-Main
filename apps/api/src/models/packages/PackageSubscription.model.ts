import mongoose, { Document, Model, Schema } from "mongoose";

export type DashboardPackageId =
  | "package-starter"
  | "package-whatsapp"
  | "package-call"
  | "package-complete";

export type DashboardPackageServiceKey = "insta" | "web" | "whatsapp" | "call";

export interface IPackageSubscription extends Document {
  clerkId: string;
  packageId: DashboardPackageId;
  packageName: string;
  subscriptionId: string;
  plan: string;
  billingCycle: "monthly";
  amountInr: number;
  includedServices: DashboardPackageServiceKey[];
  status: "active" | "cancelled" | "expired";
  razorpayPaymentId?: string;
  offerId?: string;
  expiresAt: Date;
  cancelledAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const PackageSubscriptionSchema = new Schema<IPackageSubscription>(
  {
    clerkId: { type: String, required: true, index: true },
    packageId: {
      type: String,
      required: true,
      enum: [
        "package-starter",
        "package-whatsapp",
        "package-call",
        "package-complete",
      ],
    },
    packageName: { type: String, required: true },
    subscriptionId: { type: String, required: true, unique: true },
    plan: { type: String, required: true },
    billingCycle: { type: String, enum: ["monthly"], default: "monthly" },
    amountInr: { type: Number, required: true },
    includedServices: {
      type: [String],
      default: [],
      enum: ["insta", "web", "whatsapp", "call"],
    },
    status: {
      type: String,
      enum: ["active", "cancelled", "expired"],
      default: "active",
      index: true,
    },
    razorpayPaymentId: String,
    offerId: String,
    expiresAt: { type: Date, required: true },
    cancelledAt: Date,
  },
  { timestamps: true },
);

PackageSubscriptionSchema.index({ clerkId: 1, status: 1 });
PackageSubscriptionSchema.index({ packageId: 1, status: 1 });
PackageSubscriptionSchema.index({ expiresAt: 1 });

const PackageSubscription =
  (mongoose.models?.PackageSubscription ||
    mongoose.model<IPackageSubscription>(
      "PackageSubscription",
      PackageSubscriptionSchema,
    )) as Model<IPackageSubscription>;

export default PackageSubscription;
