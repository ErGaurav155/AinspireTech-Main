import { Request, Response } from "express";
import twilio from "twilio";

const accountSid = process.env.TWILIO_ACCOUNT_SID!;
const authToken = process.env.TWILIO_AUTH_TOKEN!;
const verifySid = process.env.TWILIO_VERIFY_SERVICE_SID!;

const client = twilio(accountSid, authToken);

// POST /api/web/verify-otp - Verify OTP
export const verifyOtpController = async (req: Request, res: Response) => {
  try {
    const { phone, OTP } = req.body;

    if (!phone || !OTP) {
      return res.status(400).json({
        success: false,
        error: "Phone number and OTP code are required",
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

    let verificationResponse;
    try {
      verificationResponse = await client.verify.v2
        .services(verifySid)
        .verificationChecks.create({
          to: phone,
          code: OTP,
        });
    } catch (twilioError: any) {
      console.error("Twilio verification error:", twilioError);

      // Handle specific Twilio errors
      if (twilioError.code === 20404) {
        return res.status(400).json({
          success: false,
          error: "Invalid verification service",
          timestamp: new Date().toISOString(),
        });
      } else if (twilioError.code === 60202) {
        return res.status(400).json({
          success: false,
          error: "OTP verification attempt limit reached",
          timestamp: new Date().toISOString(),
        });
      } else if (twilioError.code === 60200) {
        return res.status(400).json({
          success: false,
          error: "Invalid phone number format",
          timestamp: new Date().toISOString(),
        });
      }

      throw twilioError;
    }

    if (verificationResponse.status === "approved") {
      return res.status(200).json({
        success: true,
        data: {
          message: "OTP verified successfully",
          verified: true,
        },
        timestamp: new Date().toISOString(),
      });
    } else {
      return res.status(400).json({
        success: false,
        error: "Invalid OTP",
        timestamp: new Date().toISOString(),
      });
    }
  } catch (error: any) {
    console.error("Error verifying OTP:", error);
    return res.status(500).json({
      success: false,
      error: "Failed to verify OTP",
      timestamp: new Date().toISOString(),
    });
  }
};
