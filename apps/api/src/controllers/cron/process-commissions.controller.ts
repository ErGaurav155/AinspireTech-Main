// apps/api/controllers/cron/process-commissions.controller.ts
import { Request, Response } from "express";
import { connectToDatabase } from "@/config/database.config";
import AffiReferral from "@/models/affiliate/Referral";
import AffiCommissionRecord from "@/models/affiliate/CommissionRecord";
import Affiliate from "@/models/affiliate/Affiliate";
import InstaSubscription from "@/models/insta/InstaSubscription.model";
import WebSubscription from "@/models/web/Websubcription.model";

export const processCommissionsController = async (
  req: Request,
  res: Response,
) => {
  try {
    await connectToDatabase();

    const now = new Date();
    const currentPeriod = now.toISOString().slice(0, 7);

    // Find active referrals that need commission processing
    const referrals = await AffiReferral.find({
      status: "active",
      nextCommissionDate: { $lte: now },
    });

    let processedCount = 0;
    let totalCommission = 0;
    const results = [];

    for (const referral of referrals) {
      try {
        // Verify that the subscription is still active
        let subscriptionActive = false;
        if (referral.subscriptionModel === "WebSubscription") {
          const sub = await WebSubscription.findById(referral.subscriptionId);
          if (sub && sub.status === "active") subscriptionActive = true;
        } else if (referral.subscriptionModel === "InstaSubscription") {
          const sub = await InstaSubscription.findById(referral.subscriptionId);
          if (sub && sub.status === "active") subscriptionActive = true;
        }

        if (!subscriptionActive) {
          console.log(
            `Referral ${referral._id}: subscription inactive, marking as cancelled`,
          );
          referral.status = "cancelled";
          await referral.save();
          await Affiliate.findByIdAndUpdate(referral.affiliateId, {
            $inc: { activeReferrals: -1 },
          });
          continue;
        }

        // Determine commission amount and remaining periods
        let commissionAmount = 0;
        let updatedMonthsRemaining = referral.monthsRemaining;
        let updatedYearsRemaining = referral.yearsRemaining;

        if (
          referral.subscriptionType === "monthly" &&
          referral.monthsRemaining > 0
        ) {
          commissionAmount = referral?.monthlyCommission!;
          updatedMonthsRemaining -= 1;
        } else if (
          referral.subscriptionType === "yearly" &&
          referral.yearsRemaining > 0
        ) {
          commissionAmount = referral?.yearlyCommission!;
          updatedYearsRemaining -= 1;
        }

        if (commissionAmount <= 0) {
          console.log(`Referral ${referral._id}: no commission due`);
          continue;
        }

        // Check if commission for this period already exists
        const existing = await AffiCommissionRecord.findOne({
          referralId: referral._id,
          period: currentPeriod,
        });

        if (existing) {
          console.log(`Commission already exists for period ${currentPeriod}`);
          continue;
        }

        // Create commission record
        const commissionRecord = await AffiCommissionRecord.create({
          affiliateId: referral.affiliateId,
          referralId: referral._id,
          referredUserId: referral.referredUserId,
          amount: commissionAmount,
          period: currentPeriod,
          productType: referral.productType,
          productName:
            referral.productType === "web-chatbot"
              ? referral.chatbotType || "Web Chatbot"
              : referral.instaPlan || "Instagram Automation",
          subscriptionType: referral.subscriptionType,
          status: "pending",
        });

        // Update affiliate pending earnings
        await Affiliate.findByIdAndUpdate(referral.affiliateId, {
          $inc: {
            pendingEarnings: commissionAmount,
            totalEarnings: commissionAmount,
          },
        });

        // Update referral record
        referral.totalCommissionEarned += commissionAmount;
        referral.monthsRemaining = updatedMonthsRemaining;
        referral.yearsRemaining = updatedYearsRemaining;
        referral.lastCommissionDate = now;

        // Calculate next commission date
        const nextDate = new Date(now);
        if (referral.subscriptionType === "monthly") {
          nextDate.setMonth(nextDate.getMonth() + 1);
        } else {
          nextDate.setFullYear(nextDate.getFullYear() + 1);
        }
        referral.nextCommissionDate = nextDate;

        if (
          (referral.subscriptionType === "monthly" &&
            updatedMonthsRemaining <= 0) ||
          (referral.subscriptionType === "yearly" && updatedYearsRemaining <= 0)
        ) {
          referral.status = "completed";
          referral.completionDate = now;
          await Affiliate.findByIdAndUpdate(referral.affiliateId, {
            $inc: { activeReferrals: -1 },
          });
        }

        await referral.save();

        processedCount++;
        totalCommission += commissionAmount;
        results.push({
          referralId: referral._id,
          amount: commissionAmount,
          period: currentPeriod,
        });
      } catch (error) {
        console.error(`Error processing referral ${referral._id}:`, error);
      }
    }

    return res.status(200).json({
      success: true,
      data: {
        message: `Processed ${processedCount} referrals, total commission ${totalCommission}`,
        processedCount,
        totalCommission,
        period: currentPeriod,
        results,
      },
      timestamp: now.toISOString(),
    });
  } catch (error: any) {
    console.error("Commission processing error:", error);
    return res.status(500).json({
      success: false,
      error: error.message || "Internal server error",
      timestamp: new Date().toISOString(),
    });
  }
};
