// controllers/affiliate/update-payment-details.controller.ts
import { Request, Response } from "express";
import { getAuth } from "@clerk/express";
import { connectToDatabase } from "@/config/database.config";
import Affiliate from "@/models/affiliate/Affiliate";

// PUT /api/affiliates/payment-details - Update payment details
export const updatePaymentDetailsController = async (
  req: Request,
  res: Response,
) => {
  try {
    const { userId: clerkId } = getAuth(req);

    if (!clerkId) {
      return res.status(401).json({
        success: false,
        error: "Unauthorized",
        timestamp: new Date().toISOString(),
      });
    }

    const {
      paymentMethod,
      accountName,
      accountNumber,
      bankName,
      ifscCode,
      upiId,
      paypalEmail,
    } = req.body;

    await connectToDatabase();

    // Find affiliate
    const affiliate = await Affiliate.findOne({ userId: clerkId });

    if (!affiliate) {
      return res.status(404).json({
        success: false,
        error: "Affiliate record not found",
        timestamp: new Date().toISOString(),
      });
    }

    // Prepare payment details based on method
    let paymentDetails;

    if (paymentMethod === "bank") {
      if (!accountName || !accountNumber || !bankName || !ifscCode) {
        return res.status(400).json({
          success: false,
          error: "Missing required bank details",
          timestamp: new Date().toISOString(),
        });
      }
      paymentDetails = {
        method: "bank",
        accountName,
        accountNumber,
        bankName,
        ifscCode,
      };
    } else if (paymentMethod === "upi") {
      if (!upiId) {
        return res.status(400).json({
          success: false,
          error: "UPI ID is required",
          timestamp: new Date().toISOString(),
        });
      }
      paymentDetails = {
        method: "upi",
        upiId,
      };
    } else if (paymentMethod === "paypal") {
      if (!paypalEmail) {
        return res.status(400).json({
          success: false,
          error: "PayPal email is required",
          timestamp: new Date().toISOString(),
        });
      }
      paymentDetails = {
        method: "paypal",
        paypalEmail,
      };
    } else {
      return res.status(400).json({
        success: false,
        error: "Invalid payment method",
        timestamp: new Date().toISOString(),
      });
    }

    // Update affiliate with payment details
    affiliate.paymentDetails = paymentDetails;
    await affiliate.save();

    return res.status(200).json({
      success: true,
      data: {
        message: "Payment details updated successfully",
        paymentDetails: affiliate.paymentDetails,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error("Error updating payment details:", error);
    return res.status(500).json({
      success: false,
      error: error.message || "Internal server error",
      timestamp: new Date().toISOString(),
    });
  }
};
