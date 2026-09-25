import mongoose, { Document, Model, Schema, Types } from "mongoose";
import type { PlatformPermission } from "@rocketreplai/shared/platform";

export interface IAgencyClient extends Document {
  agencyId: Types.ObjectId;
  workspaceId: Types.ObjectId;
  status: "provisioning" | "active" | "suspended" | "archived";
  defaultPermissions: PlatformPermission[];
  createdBy: string;
  archivedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const AgencyClientSchema = new Schema<IAgencyClient>(
  {
    agencyId: {
      type: Schema.Types.ObjectId,
      ref: "Agency",
      required: true,
      index: true,
    },
    workspaceId: {
      type: Schema.Types.ObjectId,
      ref: "Workspace",
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: ["provisioning", "active", "suspended", "archived"],
      default: "provisioning",
      index: true,
    },
    defaultPermissions: { type: [String], default: [] },
    createdBy: { type: String, required: true },
    archivedAt: Date,
  },
  { timestamps: true },
);

AgencyClientSchema.index({ agencyId: 1, workspaceId: 1 }, { unique: true });
AgencyClientSchema.index({ agencyId: 1, status: 1, createdAt: -1 });

const AgencyClient = (mongoose.models?.AgencyClient ||
  mongoose.model<IAgencyClient>(
    "AgencyClient",
    AgencyClientSchema,
  )) as Model<IAgencyClient>;

export default AgencyClient;
