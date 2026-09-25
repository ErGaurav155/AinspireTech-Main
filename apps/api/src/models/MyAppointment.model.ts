import { Schema, model, models, Document, Model, Types } from "mongoose";

export interface IAppointment extends Document {
  workspaceId?: Types.ObjectId;
  name: string;
  phone: string;
  address?: string;
  email: string;
  subject: string;
  message?: string;
  createdAt: Date;
}

const AppointmentSchema = new Schema<IAppointment>({
  workspaceId: { type: Schema.Types.ObjectId, ref: "Workspace", index: true },
  name: { type: String, required: true, trim: true },
  phone: { type: String, required: true },
  address: { type: String, trim: true },
  email: { type: String, required: true },
  subject: { type: String, required: true, trim: true },
  message: { type: String, trim: true },
  createdAt: { type: Date, default: Date.now },
});

AppointmentSchema.index({ workspaceId: 1, createdAt: -1 });

const MyAppointment = (models?.Appointment ||
  model<IAppointment>("Appointment", AppointmentSchema)) as Model<IAppointment>;

export default MyAppointment;
