import { Schema, model, models, Document, Model } from "mongoose";

export interface IEmailNotificationLog extends Document {
  key: string;
  type: string;
  userId: string;
  sentAt: Date;
  expiresAt: Date;
}

const EmailNotificationLogSchema = new Schema<IEmailNotificationLog>(
  {
    key: { type: String, required: true, unique: true },
    type: { type: String, required: true },
    userId: { type: String, required: true, index: true },
    sentAt: { type: Date, default: Date.now },
    expiresAt: { type: Date, required: true },
  },
  { timestamps: true },
);

EmailNotificationLogSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

const EmailNotificationLog = (models?.EmailNotificationLog ||
  model<IEmailNotificationLog>(
    "EmailNotificationLog",
    EmailNotificationLogSchema,
  )) as Model<IEmailNotificationLog>;

export default EmailNotificationLog;
