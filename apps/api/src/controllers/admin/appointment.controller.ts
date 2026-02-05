import { Request, Response } from "express";
import { connectToDatabase } from "@/config/database.config";
import MyAppointment from "@/models/MyAppointment.model";

// Helper function to format appointment
const formatAppointment = (appointment: any) => {
  return {
    _id: appointment._id.toString(),
    name: appointment.name,
    phone: appointment.phone,
    address: appointment.address,
    email: appointment.email,
    subject: appointment.subject,
    message: appointment.message || "",
    createdAt: appointment.createdAt.toISOString(),
  };
};

// GET /api/appointments - Get all appointments (admin only)
export const getAllAppointmentsController = async (
  req: Request,
  res: Response,
) => {
  try {
    // Connect to database
    await connectToDatabase();

    // Get all appointments
    const appointments = await MyAppointment.find({});

    // Format appointments
    const formattedAppointments = appointments.map(formatAppointment);

    return res.status(200).json({
      success: true,
      data: { formattedAppointments },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error fetching appointments:", error);
    return res.status(500).json({
      success: false,
      error: "Failed to fetch appointments",
      timestamp: new Date().toISOString(),
    });
  }
};
