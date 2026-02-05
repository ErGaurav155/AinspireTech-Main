import { Request, Response } from "express";
import { connectToDatabase } from "@/config/database.config";
import Affiliate from "@/models/affiliate/Affiliate";
import InstaSubscription from "@/models/insta/InstaSubscription.model";
import WebSubscription from "@/models/web/Websubcription.model";
import CommissionRecord from "@/models/affiliate/CommissionRecord";
import Referral from "@/models/affiliate/Referral";

// Define Instagram pricing plans interface
interface InstagramPlan {
  id: string;
  name: string;
  price: number;
}

// Define product subscription details interface
interface ProductDetail {
  name: string;
  price: number;
}

// Instagram pricing plans
const instagramPricingPlans: InstagramPlan[] = [
  { id: "pro", name: "Pro Plan", price: 5 },
];

// Product subscription details with proper type safety
const productSubscriptionDetails: Record<string, ProductDetail> = {
  "basic-web": { name: "Basic Web Chatbot", price: 29.99 },
  "pro-web": { name: "Pro Web Chatbot", price: 59.99 },
  "enterprise-web": { name: "Enterprise Web Chatbot", price: 99.99 },
};

// Helper function to safely get product detail
const getProductDetail = (
  chatbotType: string | undefined,
): ProductDetail | null => {
  if (!chatbotType) return null;
  return productSubscriptionDetails[chatbotType] || null;
};

// GET /api/cron/process-commissions - Process affiliate commissions
export const processCommissionsController = async (
  req: Request,
  res: Response,
) => {
  try {
    // Check API key
    const cronKey = req.headers["x-cron-key"] as string;

    if (!cronKey || cronKey !== process.env.CRON_SECRET) {
      return res.status(401).json({
        error: "Unauthorized: Invalid cron key",
        timestamp: new Date().toISOString(),
      });
    }

    await connectToDatabase();

    const currentDate = new Date();
    const currentPeriod = `${currentDate.getFullYear()}-${(
      currentDate.getMonth() + 1
    )
      .toString()
      .padStart(2, "0")}`;

    console.log(`Processing commissions for period: ${currentPeriod}`);

    // Get all active referrals
    const activeReferrals = await Referral.find({
      status: "active",
    }).populate("referredUserId", "clerkId");

    let processedCount = 0;
    let totalCommission = 0;
    const commissionsProcessed: any[] = [];

    for (const referral of activeReferrals) {
      // Check if subscription is still active
      let subscriptionActive = false;
      let productName = "";

      if (referral.subscriptionModel === "WebSubscription") {
        const subscription = await WebSubscription.findById(
          referral.subscriptionId,
        );
        if (subscription && subscription.status === "active") {
          subscriptionActive = true;
          const productDetail = getProductDetail(referral.chatbotType);
          productName = productDetail?.name || "Web Chatbot";
        }
      } else if (referral.subscriptionModel === "InstaSubscription") {
        const subscription = await InstaSubscription.findById(
          referral.subscriptionId,
        );
        if (subscription && subscription.status === "active") {
          subscriptionActive = true;
          const planDetail = instagramPricingPlans.find(
            (p) => p.id === referral.instaPlan,
          );
          productName = planDetail?.name || "Instagram Automation";
        }
      }

      if (!subscriptionActive) {
        referral.status = "cancelled";
        await referral.save();
        continue;
      }

      // Process commission based on subscription type
      let commissionAmount = 0;
      let shouldProcess = false;

      if (
        referral.subscriptionType === "monthly" &&
        referral.monthsRemaining > 0
      ) {
        if (currentDate >= referral.nextCommissionDate) {
          commissionAmount =
            referral.monthlyCommission ||
            referral.subscriptionPrice * referral.commissionRate;
          referral.monthsRemaining -= 1;
          shouldProcess = true;
        }
      } else if (
        referral.subscriptionType === "yearly" &&
        referral.yearsRemaining > 0
      ) {
        // Check if it's time for yearly commission (once per year)
        const oneYearAgo = new Date();
        oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

        if (
          !referral.lastCommissionDate ||
          referral.lastCommissionDate <= oneYearAgo
        ) {
          commissionAmount =
            referral.yearlyCommission ||
            referral.subscriptionPrice * referral.commissionRate;
          referral.yearsRemaining -= 1;
          shouldProcess = true;
        }
      }

      if (shouldProcess && commissionAmount > 0) {
        // Create commission record
        const commissionRecord = await CommissionRecord.create({
          affiliateId: referral.affiliateId,
          referralId: referral._id,
          referredUserId: referral.referredUserId,
          amount: commissionAmount,
          period: currentPeriod,
          productType: referral.productType,
          productName,
          subscriptionType: referral.subscriptionType,
          status: "pending",
        });

        // Update affiliate earnings
        await Affiliate.findByIdAndUpdate(referral.affiliateId, {
          $inc: {
            pendingEarnings: commissionAmount,
            totalEarnings: commissionAmount,
          },
        });

        // Update referral
        referral.totalCommissionEarned += commissionAmount;
        referral.lastCommissionDate = currentDate;

        // Set next commission date
        const nextDate = new Date(currentDate);
        if (referral.subscriptionType === "monthly") {
          nextDate.setMonth(nextDate.getMonth() + 1);
        } else {
          nextDate.setFullYear(nextDate.getFullYear() + 1);
        }
        referral.nextCommissionDate = nextDate;

        // Check if commission period is completed
        if (referral.monthsRemaining === 0 && referral.yearsRemaining === 0) {
          referral.status = "completed";
          referral.completionDate = currentDate;
        }

        await referral.save();

        commissionsProcessed.push({
          referralId: referral._id,
          commission: commissionAmount,
          product: productName,
        });

        processedCount++;
        totalCommission += commissionAmount;
      }
    }

    return res.status(200).json({
      success: true,
      message: `Processed ${processedCount} referrals with $${totalCommission.toFixed(
        2,
      )} total commission`,
      processedCount,
      totalCommission,
      period: currentPeriod,
      commissions: commissionsProcessed,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error("Error processing commissions:", error);
    return res.status(500).json({
      success: false,
      error: error.message || "Internal server error",
      timestamp: new Date().toISOString(),
    });
  }
};
