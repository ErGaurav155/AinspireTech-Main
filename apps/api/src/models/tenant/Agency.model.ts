import mongoose, { Document, Model, Schema, Types } from "mongoose";

export interface IAgency extends Document {
  clerkOrganizationId?: string;
  name: string;
  slug: string;
  ownerUserId: string;
  status: "pending" | "active" | "suspended" | "archived";
  trialStatus?: "active" | "converted" | "expired" | "ineligible";
  trialStartedAt?: Date;
  trialEndsAt?: Date;
  trialIdentityHash?: string;
  branding: Record<string, unknown>;
  settings: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

const AgencySchema = new Schema<IAgency>(
  {
    clerkOrganizationId: { type: String, trim: true },
    name: { type: String, required: true, trim: true, maxlength: 160 },
    slug: { type: String, required: true, trim: true, lowercase: true },
    ownerUserId: { type: String, required: true, index: true },
    status: {
      type: String,
      enum: ["pending", "active", "suspended", "archived"],
      default: "pending",
      index: true,
    },
    trialStatus: {
      type: String,
      enum: ["active", "converted", "expired", "ineligible"],
      index: true,
    },
    trialStartedAt: Date,
    trialEndsAt: { type: Date, index: true },
    trialIdentityHash: { type: String, select: false },
    branding: { type: Schema.Types.Mixed, default: {} },
    settings: { type: Schema.Types.Mixed, default: {} },
  },
  { timestamps: true },
);

AgencySchema.index(
  { clerkOrganizationId: 1 },
  { unique: true, sparse: true },
);
AgencySchema.index({ slug: 1 }, { unique: true });
AgencySchema.index({ ownerUserId: 1, status: 1 });
AgencySchema.index({ trialStatus: 1, trialEndsAt: 1 });

const Agency = (mongoose.models?.Agency ||
  mongoose.model<IAgency>("Agency", AgencySchema)) as Model<IAgency>;

export type AgencyId = Types.ObjectId;
export default Agency;
