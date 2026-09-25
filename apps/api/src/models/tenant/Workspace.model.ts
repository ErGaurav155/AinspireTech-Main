import mongoose, { Document, Model, Schema, Types } from "mongoose";
import type { BillingOwnerType } from "@rocketreplai/shared/platform";

export interface IWorkspace extends Document {
  clerkOrganizationId?: string;
  agencyId?: Types.ObjectId;
  name: string;
  slug: string;
  ownerUserId?: string;
  ownerEmail: string;
  ownerContactName?: string;
  phone?: string;
  businessInformation: Record<string, unknown>;
  status: "pending" | "active" | "suspended" | "archived";
  billingOwnerType: BillingOwnerType;
  billingOwnerId: Types.ObjectId;
  legacyOwnerClerkId?: string;
  migrationVersion?: string;
  createdAt: Date;
  updatedAt: Date;
}

const WorkspaceSchema = new Schema<IWorkspace>(
  {
    clerkOrganizationId: { type: String, trim: true },
    agencyId: { type: Schema.Types.ObjectId, ref: "Agency", index: true },
    name: { type: String, required: true, trim: true, maxlength: 160 },
    slug: { type: String, required: true, trim: true, lowercase: true },
    ownerUserId: { type: String, index: true },
    ownerEmail: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },
    ownerContactName: { type: String, trim: true, maxlength: 160 },
    phone: { type: String, trim: true, maxlength: 40 },
    businessInformation: { type: Schema.Types.Mixed, default: {} },
    status: {
      type: String,
      enum: ["pending", "active", "suspended", "archived"],
      default: "pending",
      index: true,
    },
    billingOwnerType: {
      type: String,
      enum: ["WORKSPACE", "AGENCY"],
      required: true,
    },
    billingOwnerId: { type: Schema.Types.ObjectId, required: true, index: true },
    legacyOwnerClerkId: { type: String, index: true },
    migrationVersion: String,
  },
  { timestamps: true },
);

WorkspaceSchema.index(
  { clerkOrganizationId: 1 },
  { unique: true, sparse: true },
);
WorkspaceSchema.index({ agencyId: 1, slug: 1 }, { unique: true });
WorkspaceSchema.index({ billingOwnerType: 1, billingOwnerId: 1, status: 1 });
WorkspaceSchema.index(
  { legacyOwnerClerkId: 1 },
  { unique: true, sparse: true },
);

const Workspace = (mongoose.models?.Workspace ||
  mongoose.model<IWorkspace>("Workspace", WorkspaceSchema)) as Model<IWorkspace>;

export default Workspace;
