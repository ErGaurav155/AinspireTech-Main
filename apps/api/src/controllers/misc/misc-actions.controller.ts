import { Request, Response } from "express";
import { connectToDatabase } from "@/config/database.config";
import User from "@/models/user.model";
import InstaSubscription from "@/models/insta/InstaSubscription.model";
import Transaction from "@/models/transaction.model";
import nodemailer from "nodemailer";
import { Twilio } from "twilio";
import { getRazorpay } from "@/utils/util";
import MyAppointment from "@/models/MyAppointment.model";

const twilioClient = new Twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN,
);

// POST /api/misc/send-subscription-email-owner - Send subscription email to owner
export const sendSubscriptionEmailToOwnerController = async (
  req: Request,
  res: Response,
) => {
  try {
    const { email, userId, subscriptionId } = req.body;

    if (!email || !userId || !subscriptionId) {
      return res.status(400).json({
        success: false,
        error: "email, userDbId, and subscriptionId are required",
        timestamp: new Date().toISOString(),
      });
    }

    // Validate email configuration
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
      return res.status(500).json({
        success: false,
        error: "Email configuration is missing",
        timestamp: new Date().toISOString(),
      });
    }

    const transporter = nodemailer.createTransport({
      service: "Gmail",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: "New Subscription Alert",
      text: `Congratulations! A customer has subscribed. UserID: ${userId}, SubscriptionID: ${subscriptionId}`,
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #3B82F6;">🎉 New Subscription Alert</h2>
          <p>A new customer has subscribed to your service!</p>
          <div style="background-color: #f3f4f6; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <p><strong>User ID:</strong> ${userId}</p>
            <p><strong>Subscription ID:</strong> ${subscriptionId}</p>
            <p><strong>Timestamp:</strong> ${new Date().toLocaleString()}</p>
          </div>
          <p>Please check your dashboard for more details.</p>
        </div>
      `,
    };

    await transporter.sendMail(mailOptions);

    return res.status(200).json({
      success: true,
      data: {
        message: "Subscription email sent to owner successfully",
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error("Error sending subscription email to owner:", error);
    return res.status(500).json({
      success: false,
      error: error.message || "Failed to send subscription email to owner",
      timestamp: new Date().toISOString(),
    });
  }
};

// POST /api/misc/send-subscription-email-user - Send subscription email to user
export const sendSubscriptionEmailToUserController = async (
  req: Request,
  res: Response,
) => {
  try {
    const { email, userId, agentId, subscriptionId } = req.body;

    if (!email || !userId || !agentId || !subscriptionId) {
      return res.status(400).json({
        success: false,
        error: "email, userDbId, agentId, and subscriptionId are required",
        timestamp: new Date().toISOString(),
      });
    }

    // Validate email configuration
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
      return res.status(500).json({
        success: false,
        error: "Email configuration is missing",
        timestamp: new Date().toISOString(),
      });
    }

    const transporter = nodemailer.createTransport({
      service: "Gmail",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: "Subscription Confirmation",
      text: `Congratulations! You have subscribed to AgentID: ${agentId}, UserID: ${userId}, SubscriptionID: ${subscriptionId}. Please add code widget provided on webchatbot dashboard to your website code so it easily appears on your website.`,
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #10B981;">✅ Subscription Confirmed!</h2>
          <p>Thank you for subscribing to our service!</p>
          <div style="background-color: #f0f9ff; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <p><strong>Agent ID:</strong> ${agentId}</p>
            <p><strong>Your User ID:</strong> ${userId}</p>
            <p><strong>Subscription ID:</strong> ${subscriptionId}</p>
            <p><strong>Subscription Date:</strong> ${new Date().toLocaleDateString()}</p>
          </div>
          <p><strong>Next Steps:</strong> Please add the code widget provided on your webchatbot dashboard to your website code so the chatbot appears on your website.</p>
          <p style="margin-top: 20px; color: #6B7280;">If you have any questions, please contact our support team.</p>
        </div>
      `,
    };

    await transporter.sendMail(mailOptions);

    return res.status(200).json({
      success: true,
      data: {
        message: "Subscription email sent to user successfully",
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error("Error sending subscription email to user:", error);
    return res.status(500).json({
      success: false,
      error: error.message || "Failed to send subscription email to user",
      timestamp: new Date().toISOString(),
    });
  }
};

// POST /api/misc/send-appointment-email - Send appointment email to user
export const sendAppointmentEmailToUserController = async (
  req: Request,
  res: Response,
) => {
  try {
    const { email, data } = req.body;

    if (!email || !data || !Array.isArray(data)) {
      return res.status(400).json({
        success: false,
        error: "email and data array are required",
        timestamp: new Date().toISOString(),
      });
    }

    // Validate email configuration
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
      return res.status(500).json({
        success: false,
        error: "Email configuration is missing",
        timestamp: new Date().toISOString(),
      });
    }

    const transporter = nodemailer.createTransport({
      service: "Gmail",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    const name = data[0]?.answer || "Not provided";
    const userEmail = data[1]?.answer || "Not provided";
    const details = data[3]?.answer || "No additional details";

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: "New Appointment Booked",
      text: `New appointment booked! Name: ${name}, Email: ${userEmail}, Details: ${details}. Please go to dashboard to get detailed appointment information.`,
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #8B5CF6;">📅 New Appointment Booked</h2>
          <p>A new appointment has been booked through your chatbot!</p>
          <div style="background-color: #f5f3ff; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <p><strong>Name:</strong> ${name}</p>
            <p><strong>Email:</strong> ${userEmail}</p>
            <p><strong>Details:</strong> ${details}</p>
            <p><strong>Booking Time:</strong> ${new Date().toLocaleString()}</p>
          </div>
          <p>Please check your dashboard for complete appointment details and follow-up actions.</p>
        </div>
      `,
    };

    await transporter.sendMail(mailOptions);

    return res.status(200).json({
      success: true,
      data: {
        message: "Appointment email sent successfully",
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error("Error sending appointment email:", error);
    return res.status(500).json({
      success: false,
      error: error.message || "Failed to send appointment email",
      timestamp: new Date().toISOString(),
    });
  }
};

// POST /api/misc/send-whatsapp-info - Send WhatsApp notification
export const sendWhatsAppInfoController = async (
  req: Request,
  res: Response,
) => {
  try {
    const { data, userId } = req.body;

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

      if (!user.phone) {
        return res.status(400).json({
          success: false,
          error: "User phone number not available",
          timestamp: new Date().toISOString(),
        });
      }

      phoneNumber = user.phone;
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
