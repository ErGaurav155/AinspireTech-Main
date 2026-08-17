import mongoose, { Document, Model, Schema } from "mongoose";

export interface IAdminAuditLog extends Document {
  actorClerkId: string;
  action: string;
  targetType: string;
  targetId: string;
  reason: string;
  before?: Record<string, unknown>;
  after?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

const AdminAuditLogSchema = new Schema<IAdminAuditLog>(
  {
    actorClerkId: { type: String, required: true, index: true },
    action: { type: String, required: true, trim: true, maxlength: 100 },
    targetType: { type: String, required: true, trim: true, maxlength: 100 },
    targetId: { type: String, required: true, trim: true, maxlength: 200 },
    reason: { type: String, required: true, trim: true, maxlength: 500 },
    before: { type: Schema.Types.Mixed },
    after: { type: Schema.Types.Mixed },
    metadata: { type: Schema.Types.Mixed },
  },
  { timestamps: true },
);

AdminAuditLogSchema.index({ createdAt: -1 });
AdminAuditLogSchema.index({ targetType: 1, targetId: 1, createdAt: -1 });

const AdminAuditLog = (mongoose.models?.AdminAuditLog ||
  mongoose.model<IAdminAuditLog>(
    "AdminAuditLog",
    AdminAuditLogSchema,
  )) as Model<IAdminAuditLog>;

export default AdminAuditLog;
