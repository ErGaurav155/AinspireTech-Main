import mongoose, { Document, Model, Schema, Types } from "mongoose";

export interface IPlatformAuditLog extends Document {
  actorUserId: string;
  agencyId?: Types.ObjectId;
  workspaceId?: Types.ObjectId;
  action: string;
  targetType: string;
  targetId?: string;
  metadata: Record<string, unknown>;
  ipAddress?: string;
  createdAt: Date;
  updatedAt: Date;
}

const PlatformAuditLogSchema = new Schema<IPlatformAuditLog>(
  {
    actorUserId: { type: String, required: true, index: true },
    agencyId: { type: Schema.Types.ObjectId, ref: "Agency", index: true },
    workspaceId: { type: Schema.Types.ObjectId, ref: "Workspace", index: true },
    action: { type: String, required: true, trim: true, maxlength: 160 },
    targetType: { type: String, required: true, trim: true, maxlength: 100 },
    targetId: { type: String, trim: true, maxlength: 200 },
    metadata: { type: Schema.Types.Mixed, default: {} },
    ipAddress: { type: String, maxlength: 100 },
  },
  { timestamps: true },
);

PlatformAuditLogSchema.index({ agencyId: 1, createdAt: -1 });
PlatformAuditLogSchema.index({ workspaceId: 1, createdAt: -1 });
PlatformAuditLogSchema.index({ action: 1, createdAt: -1 });

const PlatformAuditLog = (mongoose.models?.PlatformAuditLog ||
  mongoose.model<IPlatformAuditLog>(
    "PlatformAuditLog",
    PlatformAuditLogSchema,
  )) as Model<IPlatformAuditLog>;

export default PlatformAuditLog;
