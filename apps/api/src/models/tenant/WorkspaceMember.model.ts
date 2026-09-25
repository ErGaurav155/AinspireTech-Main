import mongoose, { Document, Model, Schema, Types } from "mongoose";
import type { PlatformPermission, PlatformRole } from "@rocketreplai/shared/platform";

export interface IWorkspaceMember extends Document {
  workspaceId: Types.ObjectId;
  userId: string;
  clerkMembershipId?: string;
  role: Extract<PlatformRole, "CLIENT_OWNER" | "CLIENT_MEMBER">;
  permissions: PlatformPermission[];
  deniedPermissions: PlatformPermission[];
  status: "invited" | "active" | "suspended" | "removed";
  invitedBy?: string;
  createdAt: Date;
  updatedAt: Date;
}

const WorkspaceMemberSchema = new Schema<IWorkspaceMember>(
  {
    workspaceId: {
      type: Schema.Types.ObjectId,
      ref: "Workspace",
      required: true,
      index: true,
    },
    userId: { type: String, required: true, index: true },
    clerkMembershipId: { type: String, trim: true },
    role: {
      type: String,
      enum: ["CLIENT_OWNER", "CLIENT_MEMBER"],
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

WorkspaceMemberSchema.index(
  { workspaceId: 1, userId: 1 },
  { unique: true },
);
WorkspaceMemberSchema.index(
  { clerkMembershipId: 1 },
  { unique: true, sparse: true },
);

const WorkspaceMember = (mongoose.models?.WorkspaceMember ||
  mongoose.model<IWorkspaceMember>(
    "WorkspaceMember",
    WorkspaceMemberSchema,
  )) as Model<IWorkspaceMember>;

export default WorkspaceMember;
