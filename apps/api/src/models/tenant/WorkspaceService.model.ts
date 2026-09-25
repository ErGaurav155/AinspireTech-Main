import mongoose, { Document, Model, Schema, Types } from "mongoose";
import type { PlatformService } from "@rocketreplai/shared/platform";

export interface IWorkspaceService extends Document {
  workspaceId: Types.ObjectId;
  service: PlatformService;
  enabled: boolean;
  setupStatus: "not_started" | "in_progress" | "connected" | "error";
  configuredBy?: string;
  lastError?: string;
  metadata: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

const WorkspaceServiceSchema = new Schema<IWorkspaceService>(
  {
    workspaceId: {
      type: Schema.Types.ObjectId,
      ref: "Workspace",
      required: true,
      index: true,
    },
    service: {
      type: String,
      enum: ["WHATSAPP", "INSTAGRAM", "WEBSITE", "CALL"],
      required: true,
    },
    enabled: { type: Boolean, default: false, index: true },
    setupStatus: {
      type: String,
      enum: ["not_started", "in_progress", "connected", "error"],
      default: "not_started",
    },
    configuredBy: String,
    lastError: { type: String, maxlength: 1000 },
    metadata: { type: Schema.Types.Mixed, default: {} },
  },
  { timestamps: true },
);

WorkspaceServiceSchema.index(
  { workspaceId: 1, service: 1 },
  { unique: true },
);

const WorkspaceService = (mongoose.models?.WorkspaceService ||
  mongoose.model<IWorkspaceService>(
    "WorkspaceService",
    WorkspaceServiceSchema,
  )) as Model<IWorkspaceService>;

export default WorkspaceService;
