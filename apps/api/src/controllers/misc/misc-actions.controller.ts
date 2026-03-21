import { Request, Response } from "express";
import { connectToDatabase } from "@/config/database.config";
import User from "@/models/user.model";
import { Resend } from "resend";
import { Twilio } from "twilio";
import MyAppointment from "@/models/MyAppointment.model";
import WebChatbot from "@/models/web/WebChatbot.model";

const twilioClient = new Twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN,
);

const resend = new Resend(process.env.RESEND_API_KEY);

// OWNER EMAIL
export const sendSubscriptionEmailToOwnerController = async (
  req: Request,
  res: Response,
) => {
  try {
    const { email, userId, subscriptionId } = req.body;

    if (!email || !userId || !subscriptionId) {
      return res.status(400).json({
        success: false,
        error: "email, userId, subscriptionId required",
        timestamp: new Date().toISOString(),
      });
    }

    await resend.emails.send({
      from: "notifications@rocketreplai.com",
      to: email,
      subject: "New Subscription Alert",
      html: `
        <div style="font-family: Arial; padding: 20px;">
          <h2>🎉 New Subscription</h2>
          <p>User ID: ${userId}</p>
          <p>Subscription ID: ${subscriptionId}</p>
          <p>${new Date().toLocaleString()}</p>
        </div>
      `,
    });

    return res.status(200).json({
      success: true,
      message: "Email sent",
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

// USER EMAIL
export const sendSubscriptionEmailToUserController = async (
  req: Request,
  res: Response,
) => {
  try {
    const { email, userId, agentId, subscriptionId } = req.body;

    if (!email || !userId || !agentId || !subscriptionId) {
      return res.status(400).json({
        success: false,
        error: "Missing fields",
      });
    }

    await resend.emails.send({
      from: "notifications@rocketreplai.com",
      to: email,
      subject: "Subscription Confirmed",
      html: `
        <div style="font-family: Arial; padding: 20px;">
          <h2>✅ Subscription Confirmed</h2>
          <p>Agent ID: ${agentId}</p>
          <p>User ID: ${userId}</p>
          <p>Subscription ID: ${subscriptionId}</p>
        </div>
      `,
    });

    return res.status(200).json({
      success: true,
      message: "Email sent",
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

// APPOINTMENT EMAIL
export const sendAppointmentEmailToUserController = async (
  req: Request,
  res: Response,
) => {
  try {
    const { email, data } = req.body;

    if (!email || !data || !Array.isArray(data)) {
      return res.status(400).json({
        success: false,
        error: "Invalid input",
      });
    }

    const name = data[0]?.answer || "Not provided";
    const userEmail = data[1]?.answer || "Not provided";
    const details = data[3]?.answer || "No details";

    await resend.emails.send({
      from: "notifications@rocketreplai.com",
      to: email,
      subject: "New Appointment Booked",
      html: `
        <div style="font-family: Arial; padding: 20px;">
          <h2>📅 Appointment Booked</h2>
          <p>Name: ${name}</p>
          <p>Email: ${userEmail}</p>
          <p>Details: ${details}</p>
        </div>
      `,
    });

    return res.status(200).json({
      success: true,
      message: "Appointment email sent",
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};
// POST /api/misc/send-whatsapp-info - Send WhatsApp notification
export const sendWhatsAppInfoController = async (
  req: Request,
  res: Response,
) => {
  try {
    const { data, userId, chatbotType } = req.body;

    if (!data || !Array.isArray(data)) {
      return res.status(400).json({
        success: false,
        error: "data array is required",
        timestamp: new Date().toISOString(),
      });
    }

    // Validate Twilio configuration
    if (
      !process.env.TWILIO_ACCOUNT_SID ||
      !process.env.TWILIO_AUTH_TOKEN ||
      !process.env.NEXT_PUBLIC_TWILIO_NUMBER
    ) {
      return res.status(500).json({
        success: false,
        error: "WhatsApp configuration is missing",
        timestamp: new Date().toISOString(),
      });
    }

    await connectToDatabase();

    let phoneNumber;

    if (!userId) {
      // Use default WhatsApp number
      phoneNumber = process.env.WHATSAPP_NUMBER;
    } else {
      // Get user's phone number
      const user = await User.findOne({ clerkId: userId }).exec();

      if (!user) {
        return res.status(404).json({
          success: false,
          error: "User not found",
          timestamp: new Date().toISOString(),
        });
      }

      const chatbot = await WebChatbot.findOne({
        clerkId: userId,
        type: chatbotType,
      }).exec();

      if (!chatbot) {
        return res.status(404).json({
          success: false,
          error: "Chatbot not found",
          timestamp: new Date().toISOString(),
        });
      }

      if (!chatbot.phone) {
        return res.status(400).json({
          success: false,
          error: "User phone number not available",
          timestamp: new Date().toISOString(),
        });
      }

      phoneNumber = chatbot.phone;
    }

    // Format phone number for WhatsApp
    const formattedPhoneNumber = phoneNumber.startsWith("+")
      ? phoneNumber
      : `+${phoneNumber}`;
    const whatsappNumber = `whatsapp:${formattedPhoneNumber}`;

    const result = await twilioClient.messages.create({
      from: `whatsapp:${process.env.NEXT_PUBLIC_TWILIO_NUMBER}`,
      to: whatsappNumber,
      body: `New Appointment Booking:\nName: ${data[0]?.answer || "Not provided"}\nEmail: ${data[1]?.answer || "Not provided"}\nPhone: ${data[2]?.answer || "Not provided"}\nMessage: ${data[3]?.answer || "No message"}`,
    });

    return res.status(200).json({
      success: true,
      data: {
        message: "WhatsApp notification sent successfully",
        sid: result.sid,
        to: whatsappNumber,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error("WhatsApp send error:", error);
    return res.status(500).json({
      success: false,
      error: error.message || "Failed to send WhatsApp notification",
      timestamp: new Date().toISOString(),
    });
  }
};

// Helper function to format appointment
const formatAppointment = (appointment: any) => {
  return {
    _id: appointment._id.toString(),
    name: appointment.name,
    phone: appointment.phone,
    address: appointment.address || "",
    email: appointment.email,
    subject: appointment.subject,
    message: appointment.message || "",
    createdAt: appointment.createdAt.toISOString(),
  };
};

// POST /misc/appointments - Create a new appointment
export const createAppointmentController = async (
  req: Request,
  res: Response,
) => {
  try {
    const SECRET_KEY = process.env.API_KEY || "";

    const apiKey = req.headers["x-api-key"] as string;

    if (!apiKey) {
      return res.status(401).json({
        success: false,
        error: "Unauthorized: No API key provided",
        timestamp: new Date().toISOString(),
      });
    }

    if (apiKey !== SECRET_KEY) {
      return res.status(401).json({
        success: false,
        error: "Unauthorized: Invalid API key",
        timestamp: new Date().toISOString(),
      });
    }

    const appointmentData = req.body;

    // Validate required fields
    if (
      !appointmentData.name ||
      !appointmentData.email ||
      !appointmentData.phone
    ) {
      return res.status(400).json({
        success: false,
        error: "Name, email, and phone are required",
        timestamp: new Date().toISOString(),
      });
    }

    // Connect to database
    await connectToDatabase();

    // Create new appointment
    const newAppointment = await MyAppointment.create({
      name: appointmentData.name.trim(),
      email: appointmentData.email.trim().toLowerCase(),
      phone: appointmentData.phone.trim(),
      address: appointmentData.address?.trim() || "",
      subject: appointmentData.subject?.trim() || "General Inquiry",
      message: appointmentData.message?.trim() || "",
      createdAt: new Date(),
      source: appointmentData.source || "website-form",
    });

    return res.status(201).json({
      success: true,
      data: formatAppointment(newAppointment),
      message: "Appointment created successfully",
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error("❌ Error creating appointment:", error);

    let errorMessage = "Failed to create appointment";

    if (error.name === "ValidationError") {
      errorMessage = "Validation error: " + error.message;
    } else if (error.name === "MongoServerError") {
      if (error.code === 11000) {
        errorMessage = "An appointment with this email already exists";
      } else {
        errorMessage = "Database error: " + error.message;
      }
    }

    return res.status(500).json({
      success: false,
      error: errorMessage,
      timestamp: new Date().toISOString(),
    });
  }
};
