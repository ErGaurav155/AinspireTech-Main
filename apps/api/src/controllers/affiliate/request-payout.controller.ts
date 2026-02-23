// controllers/affiliate/request-payout.controller.ts
import { Request, Response } from "express";
import { getAuth } from "@clerk/express";
import { connectToDatabase } from "@/config/database.config";
import Affiliate from "@/models/affiliate/Affiliate";
import Payout from "@/models/affiliate/Payout";

// POST /api/affiliates/request-payout - Request a payout
export const requestPayoutController = async (req: Request, res: Response) => {
  try {
    const { userId: clerkId } = getAuth(req);

    if (!clerkId) {
      return res.status(401).json({
        success: false,
        error: "Unauthorized",
        timestamp: new Date().toISOString(),
      });
    }

    const { amount } = req.body;

    if (!amount || typeof amount !== "number" || amount <= 0) {
      return res.status(400).json({
        success: false,
        error: "Invalid payout amount",
        timestamp: new Date().toISOString(),
      });
    }

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

    // Check if payment details exist
    if (!affiliate.paymentDetails) {
      return res.status(400).json({
        success: false,
        error: "Please add payment details before requesting payout",
        timestamp: new Date().toISOString(),
      });
    }

    // Check if sufficient balance
    if (amount > affiliate.pendingEarnings) {
      return res.status(400).json({
        success: false,
        error: "Insufficient balance",
        timestamp: new Date().toISOString(),
      });
    }

    // Check minimum payout (₹1000)
    if (amount < 1000) {
      return res.status(400).json({
        success: false,
        error: "Minimum payout amount is ₹1000",
        timestamp: new Date().toISOString(),
      });
    }

    // Get current period
    const currentDate = new Date();
    const period = `${currentDate.getFullYear()}-${(currentDate.getMonth() + 1)
      .toString()
      .padStart(2, "0")}`;

    // Create payout request
    const payout = await Payout.create({
      affiliateId: affiliate._id,
      amount,
      period,
      status: "processing",
      paymentMethod: affiliate.paymentDetails.method,
      paymentDetails: affiliate.paymentDetails,
    });

    // Update affiliate earnings
    affiliate.pendingEarnings -= amount;
    await affiliate.save();

    return res.status(200).json({
      success: true,
      data: {
        message: "Payout request submitted successfully",
        payout: {
          id: payout._id,
          amount: payout.amount,
          status: payout.status,
          period: payout.period,
        },
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error("Error requesting payout:", error);
    return res.status(500).json({
      success: false,
      error: error.message || "Internal server error",
      timestamp: new Date().toISOString(),
    });
  }
};
