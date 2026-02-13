import { Request, Response } from "express";
import { connectToDatabase } from "@/config/database.config";
import Affiliate from "@/models/affiliate/Affiliate";
import CommissionRecord from "@/models/affiliate/CommissionRecord";
import Payout from "@/models/affiliate/Payout";
import Referral from "@/models/affiliate/Referral";
import User from "@/models/user.model";
import { getAuth } from "@clerk/express";

// GET /api/affiliates/dashboard - Get affiliate dashboard data
export const getAffiliateDashboardController = async (
  req: Request,
  res: Response,
) => {
  try {
    await connectToDatabase();

    // Get clerkId from auth headers
    const { userId: clerkId } = getAuth(req);

    if (!clerkId) {
      return res.status(401).json({
        success: false,
        error: "Unauthorized",
        timestamp: new Date().toISOString(),
      });
    }

    const user = await User.findOne({ clerkId });
    if (!user) {
      return res.status(404).json({
        success: false,
        error: "User not found",
        timestamp: new Date().toISOString(),
      });
    }

    const affiliate = await Affiliate.findOne({ userId: clerkId });
    if (!affiliate) {
      return res.status(200).json({
        success: true,
        data: { isAffiliate: false },
        timestamp: new Date().toISOString(),
      });
    }

    // Get referrals with subscription details
    const referrals = await Referral.find({ affiliateId: affiliate._id })
      .populate("referredUserId", "name email")
      .sort({ createdAt: -1 });

    // Get commission records for current month
    const currentDate = new Date();
    const currentPeriod = `${currentDate.getFullYear()}-${(
      currentDate.getMonth() + 1
    )
      .toString()
      .padStart(2, "0")}`;

    const monthlyCommissions = await CommissionRecord.find({
      affiliateId: affiliate._id,
      period: currentPeriod,
      status: "pending",
    });

    // Get payout history
    const payoutHistory = await Payout.find({ affiliateId: affiliate._id })
      .sort({ createdAt: -1 })
      .limit(10);

    // Calculate stats
    const stats = {
      totalReferrals: affiliate.totalReferrals || 0,
      activeReferrals: affiliate.activeReferrals || 0,
      totalEarnings: affiliate.totalEarnings || 0,
      pendingEarnings: affiliate.pendingEarnings || 0,
      paidEarnings: affiliate.paidEarnings || 0,
      monthlyEarnings: monthlyCommissions.reduce(
        (sum, c) => sum + (c.amount || 0),
        0,
      ),
      webChatbotReferrals: referrals.filter(
        (r) => r.productType === "web-chatbot",
      ).length,
      instaReferrals: referrals.filter(
        (r) => r.productType === "insta-automation",
      ).length,
    };

    return res.status(200).json({
      success: true,
      data: {
        isAffiliate: true,
        affiliate,
        stats,
        referrals,
        monthlyCommissions,
        payoutHistory,
        affiliateLink: `${process.env.APP_URL}?ref=${affiliate.affiliateCode}`,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error("Error fetching dashboard:", error);
    return res.status(500).json({
      success: false,
      error: error.message || "Internal server error",
      timestamp: new Date().toISOString(),
    });
  }
};
