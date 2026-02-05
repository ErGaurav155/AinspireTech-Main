import { Schema, model, models } from "mongoose";

// Define Appointment Schema
const AppointmentSchema = new Schema({
  name: {
    type: String,
    required: true,
    trim: true,
  },
  phone: {
    type: String,
    required: true,
  },
  address: {
    type: String,
    trim: true,
  },
  email: {
    type: String,
    required: true,
  },
  subject: {
    type: String,
    required: true,
    trim: true,
  },
  message: {
    type: String,
    trim: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

// Export the Appointment model
const MyAppointment =
  models?.Appointment || model("Appointment", AppointmentSchema);

export default MyAppointment;
