import { Document, Model, Schema, model, models } from "mongoose";

export interface IAppointmentNotificationLog extends Document {
  userId: string;
  source: "web" | "insta" | "call" | "whatsapp" | "misc";
  sourceRef?: string;
  appointment: {
    customerName: string;
    customerPhone: string;
    customerEmail: string;
    service: string;
    preferredDate: string;
    preferredTime: string;
    summary: string;
    dashboardUrl: string;
  };
  channels: Array<{
    channel: "email" | "whatsapp";
    address: string;
    status: "sent" | "skipped" | "failed";
    providerMessageId?: string;
    error?: string;
    sentAt?: Date;
  }>;
  createdAt: Date;
  updatedAt: Date;
}

const AppointmentNotificationLogSchema =
  new Schema<IAppointmentNotificationLog>(
    {
      userId: { type: String, required: true, index: true },
      source: {
        type: String,
        enum: ["web", "insta", "call", "whatsapp", "misc"],
        required: true,
        index: true,
      },
      sourceRef: String,
      appointment: {
        customerName: { type: String, default: "" },
        customerPhone: { type: String, default: "" },
        customerEmail: { type: String, default: "" },
        service: { type: String, default: "" },
        preferredDate: { type: String, default: "" },
        preferredTime: { type: String, default: "" },
        summary: { type: String, default: "" },
        dashboardUrl: { type: String, default: "" },
      },
      channels: [
        {
          channel: { type: String, enum: ["email", "whatsapp"], required: true },
          address: { type: String, default: "" },
          status: {
            type: String,
            enum: ["sent", "skipped", "failed"],
            required: true,
          },
          providerMessageId: String,
          error: String,
          sentAt: Date,
        },
      ],
    },
    { timestamps: true },
  );

AppointmentNotificationLogSchema.index({ userId: 1, createdAt: -1 });
AppointmentNotificationLogSchema.index({ source: 1, createdAt: -1 });

const AppointmentNotificationLog =
  (models?.AppointmentNotificationLog ||
    model<IAppointmentNotificationLog>(
      "AppointmentNotificationLog",
      AppointmentNotificationLogSchema,
    )) as Model<IAppointmentNotificationLog>;

export default AppointmentNotificationLog;
