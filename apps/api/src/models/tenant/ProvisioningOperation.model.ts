import mongoose, { Document, Model, Schema, Types } from "mongoose";

export interface IProvisioningOperation extends Document {
  idempotencyKey: string;
  operation:
    | "CREATE_AGENCY"
    | "CREATE_BUSINESS_WORKSPACE"
    | "CREATE_CLIENT_WORKSPACE"
    | "INVITE_WORKSPACE_MEMBER";
  agencyId?: Types.ObjectId;
  workspaceId?: Types.ObjectId;
  requestedBy: string;
  status: "pending" | "processing" | "complete" | "failed";
  completedSteps: string[];
  clerkOrganizationId?: string;
  clerkInvitationId?: string;
  attempts: number;
  lastError?: string;
  nextRetryAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const ProvisioningOperationSchema = new Schema<IProvisioningOperation>(
  {
    idempotencyKey: { type: String, required: true, unique: true },
    operation: {
      type: String,
      enum: [
        "CREATE_AGENCY",
        "CREATE_BUSINESS_WORKSPACE",
        "CREATE_CLIENT_WORKSPACE",
        "INVITE_WORKSPACE_MEMBER",
      ],
      required: true,
    },
    agencyId: { type: Schema.Types.ObjectId, ref: "Agency", index: true },
    workspaceId: { type: Schema.Types.ObjectId, ref: "Workspace", index: true },
    requestedBy: { type: String, required: true, index: true },
    status: {
      type: String,
      enum: ["pending", "processing", "complete", "failed"],
      default: "pending",
      index: true,
    },
    completedSteps: { type: [String], default: [] },
    clerkOrganizationId: String,
    clerkInvitationId: String,
    attempts: { type: Number, default: 0, min: 0 },
    lastError: { type: String, maxlength: 2000 },
    nextRetryAt: Date,
  },
  { timestamps: true },
);

ProvisioningOperationSchema.index({ status: 1, nextRetryAt: 1 });

const ProvisioningOperation =
  (mongoose.models?.ProvisioningOperation ||
    mongoose.model<IProvisioningOperation>(
      "ProvisioningOperation",
      ProvisioningOperationSchema,
    )) as Model<IProvisioningOperation>;

export default ProvisioningOperation;
