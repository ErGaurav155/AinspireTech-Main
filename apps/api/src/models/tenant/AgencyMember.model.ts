import mongoose, { Document, Model, Schema, Types } from "mongoose";
import type { PlatformPermission, PlatformRole } from "@rocketreplai/shared/platform";

export interface IAgencyMember extends Document {
  agencyId: Types.ObjectId;
  userId: string;
  clerkMembershipId?: string;
  role: Extract<PlatformRole, "AGENCY_OWNER" | "AGENCY_ADMIN" | "AGENCY_STAFF">;
  permissions: PlatformPermission[];
  deniedPermissions: PlatformPermission[];
  status: "invited" | "active" | "suspended" | "removed";
  invitedBy?: string;
  createdAt: Date;
  updatedAt: Date;
}

const AgencyMemberSchema = new Schema<IAgencyMember>(
  {
    agencyId: {
      type: Schema.Types.ObjectId,
      ref: "Agency",
      required: true,
      index: true,
    },
    userId: { type: String, required: true, index: true },
    clerkMembershipId: { type: String, trim: true },
    role: {
      type: String,
      enum: ["AGENCY_OWNER", "AGENCY_ADMIN", "AGENCY_STAFF"],
      required: true,
    },
    permissions: { type: [String], default: [] },
    deniedPermissions: { type: [String], default: [] },
    status: {
      type: String,
      enum: ["invited", "active", "suspended", "removed"],
      default: "active",
      index: true,
    },
    invitedBy: String,
  },
  { timestamps: true },
);

AgencyMemberSchema.index({ agencyId: 1, userId: 1 }, { unique: true });
AgencyMemberSchema.index(
  { clerkMembershipId: 1 },
  { unique: true, sparse: true },
);

const AgencyMember = (mongoose.models?.AgencyMember ||
  mongoose.model<IAgencyMember>(
    "AgencyMember",
    AgencyMemberSchema,
  )) as Model<IAgencyMember>;

export default AgencyMember;
