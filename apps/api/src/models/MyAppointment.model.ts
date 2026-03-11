import { Schema, model, models, Document, Model } from "mongoose";

export interface IAppointment extends Document {
  name: string;
  phone: string;
  address?: string;
  email: string;
  subject: string;
  message?: string;
  createdAt: Date;
}

const AppointmentSchema = new Schema<IAppointment>({
  name: { type: String, required: true, trim: true },
  phone: { type: String, required: true },
  address: { type: String, trim: true },
  email: { type: String, required: true },
  subject: { type: String, required: true, trim: true },
  message: { type: String, trim: true },
  createdAt: { type: Date, default: Date.now },
});

const MyAppointment = (models?.Appointment ||
  model<IAppointment>("Appointment", AppointmentSchema)) as Model<IAppointment>;

export default MyAppointment;
