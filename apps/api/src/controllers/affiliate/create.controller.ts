import { Request, Response } from "express";
import { connectToDatabase } from "@/config/database.config";
import Affiliate from "@/models/affiliate/Affiliate";
import User from "@/models/user.model";
import { getAuth } from "@clerk/express";

// Helper function to generate affiliate code
function generateAffiliateCode(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let result = "";
  for (let i = 0; i < 8; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

// POST /api/affiliates/create - Create new affiliate
export const createAffiliateController = async (
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

    // Get user
    const user = await User.findOne({ clerkId });
    if (!user) {
      return res.status(404).json({
        success: false,
        error: "User not found",
        timestamp: new Date().toISOString(),
      });
    }

    // Check if already an affiliate
    const existingAffiliate = await Affiliate.findOne({ userId: clerkId });
    if (existingAffiliate) {
      return res.status(200).json({
        success: true,
        data: existingAffiliate,
        timestamp: new Date().toISOString(),
      });
    }

    // Generate unique affiliate code
    let affiliateCode: string = "";
    let isUnique = false;
    while (!isUnique) {
      const newCode = generateAffiliateCode();
      const existing = await Affiliate.findOne({ affiliateCode: newCode });
      if (!existing) {
        affiliateCode = newCode;
        isUnique = true;
      }
    }

    // Prepare payment details
    let paymentDetails;
    if (paymentMethod === "bank") {
      paymentDetails = {
        method: "bank",
        accountName,
        accountNumber,
        bankName,
        ifscCode,
      };
    } else if (paymentMethod === "upi") {
      paymentDetails = {
        method: "upi",
        upiId,
      };
    } else if (paymentMethod === "paypal") {
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

    // Create affiliate
    const affiliate = await Affiliate.create({
      userId: clerkId,
      affiliateCode,
      paymentDetails,
      status: "active",
      commissionRate: 0.3,
      monthlyMonths: 10,
      yearlyYears: 3,
    });

    return res.status(201).json({
      success: true,
      data: {
        success: true,
        affiliate: affiliate,
        affiliateLink: `${process.env.APP_URL}?ref=${affiliateCode}`,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error("Error creating affiliate:", error);
    return res.status(500).json({
      success: false,
      error: error.message || "Internal server error",
      timestamp: new Date().toISOString(),
    });
  }
};
