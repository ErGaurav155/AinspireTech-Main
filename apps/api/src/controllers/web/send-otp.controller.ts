import { Request, Response } from "express";
import twilio from "twilio";

const accountSid = process.env.TWILIO_ACCOUNT_SID!;
const authToken = process.env.TWILIO_AUTH_TOKEN!;
const verifySid = process.env.TWILIO_VERIFY_SERVICE_SID!;

const client = twilio(accountSid, authToken);

// POST /api/web/send-otp - Send OTP via Twilio
export const sendOtpController = async (req: Request, res: Response) => {
  try {
    const { fullPhoneNumber } = req.body;

    if (!fullPhoneNumber) {
      return res.status(400).json({
        success: false,
        error: "Phone number is required",
        timestamp: new Date().toISOString(),
      });
    }

    // Validate Twilio credentials
    if (!accountSid || !authToken || !verifySid) {
      console.error("Twilio credentials missing");
      return res.status(500).json({
        success: false,
        error: "SMS service configuration error",
        timestamp: new Date().toISOString(),
      });
    }

    const otpResponse = await client.verify.v2
      .services(verifySid)
      .verifications.create({
        to: fullPhoneNumber,
        channel: "sms",
      });

    return res.status(200).json({
      success: true,
      data: {
        success: true,
        message: "OTP sent successfully",
        sid: otpResponse.sid,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error("Error sending OTP:", error);

    // Handle specific Twilio errors
    let errorMessage = "Failed to send OTP";
    if (error.code === 20404) {
      errorMessage = "Invalid Twilio Verify Service SID";
    } else if (error.code === 60200) {
      errorMessage = "Invalid phone number format";
    } else if (error.code === 60203) {
      errorMessage = "Maximum send attempts reached";
    } else if (error.message) {
      errorMessage = error.message;
    }

    return res.status(500).json({
      success: false,
      error: errorMessage,
      timestamp: new Date().toISOString(),
    });
  }
};
