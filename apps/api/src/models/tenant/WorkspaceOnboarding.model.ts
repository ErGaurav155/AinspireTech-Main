import mongoose, { Document, Model, Schema, Types } from "mongoose";
import type { PlatformService } from "@rocketreplai/shared/platform";

export interface IOnboardingStep {
  code: string;
  status: "pending" | "in_progress" | "complete" | "warning" | "error";
  completedAt?: Date;
  message?: string;
}

export interface IWorkspaceOnboarding extends Document {
  workspaceId: Types.ObjectId;
  status: "not_started" | "in_progress" | "complete" | "blocked";
  steps: IOnboardingStep[];
  serviceStates: Array<{
    service: PlatformService;
    status: "not_started" | "in_progress" | "connected" | "warning" | "error";
    lastError?: string;
    updatedAt: Date;
  }>;
  version: number;
  createdAt: Date;
  updatedAt: Date;
}

const WorkspaceOnboardingSchema = new Schema<IWorkspaceOnboarding>(
  {
    workspaceId: {
      type: Schema.Types.ObjectId,
      ref: "Workspace",
      required: true,
      unique: true,
      index: true,
    },
    status: {
      type: String,
      enum: ["not_started", "in_progress", "complete", "blocked"],
      default: "not_started",
    },
    steps: [
      {
        _id: false,
        code: { type: String, required: true },
        status: {
          type: String,
          enum: ["pending", "in_progress", "complete", "warning", "error"],
          default: "pending",
        },
        completedAt: Date,
        message: { type: String, maxlength: 1000 },
      },
    ],
    serviceStates: [
      {
        _id: false,
        service: {
          type: String,
          enum: ["WHATSAPP", "INSTAGRAM", "WEBSITE", "CALL"],
          required: true,
        },
        status: {
          type: String,
          enum: [
            "not_started",
            "in_progress",
            "connected",
            "warning",
            "error",
          ],
          default: "not_started",
        },
        lastError: { type: String, maxlength: 1000 },
        updatedAt: { type: Date, default: Date.now },
      },
    ],
    version: { type: Number, default: 1 },
  },
  { timestamps: true },
);

const WorkspaceOnboarding =
  (mongoose.models?.WorkspaceOnboarding ||
    mongoose.model<IWorkspaceOnboarding>(
      "WorkspaceOnboarding",
      WorkspaceOnboardingSchema,
    )) as Model<IWorkspaceOnboarding>;

export default WorkspaceOnboarding;
