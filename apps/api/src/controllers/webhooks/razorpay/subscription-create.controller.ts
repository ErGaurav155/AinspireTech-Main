// app/api/webhooks/subscription/route.ts (or Express route file)

import { Request, Response } from "express";
import crypto from "crypto";
import { connectToDatabase } from "@/config/database.config";
import InstaSubscription from "@/models/insta/InstaSubscription.model";
import WebSubscription from "@/models/web/Websubcription.model";
import User from "@/models/user.model";
import Affiliate from "@/models/affiliate/Affiliate";
import AffiReferral from "@/models/affiliate/Referral";

// Helper function to handle subscription creation from webhook
async function handleWebhookSubscriptionCreate(payload: any) {
  const subscriptionData = payload.subscription?.entity;
  const notes = subscriptionData?.notes || {};
  const subscriptionType = notes.subscriptionType;
  const clerkId = notes.buyerId;
  const chatbotType = notes.chatbotType;
  const referralCode = notes.referralCode;
  const plan = subscriptionData.plan_id;
  const billingCycle = subscriptionData.period === 1 ? "monthly" : "yearly";

  const user = await User.findOne({ clerkId });
  if (!user) {
    throw new Error("User not found");
  }

  let existingSubscription = null;

  if (subscriptionType === "instagram") {
    existingSubscription = await InstaSubscription.findOne({
      subscriptionId: subscriptionData.id,
    });
  } else {
    existingSubscription = await WebSubscription.findOne({
      subscriptionId: subscriptionData.id,
    });
  }

  if (existingSubscription) {
    return existingSubscription;
  }

  const expiresAt = subscriptionData.current_end
    ? new Date(subscriptionData.current_end * 1000)
    : new Date();

  const subscriptionPrice = subscriptionData.amount / 100;

  const commonData = {
    clerkId,
    chatbotType,
    plan,
    subscriptionId: subscriptionData.id,
    billingCycle,
    status: "active",
    createdAt: new Date(subscriptionData.start_at * 1000),
    expiresAt,
    updatedAt: new Date(),
  };

  let newSubscription;

  if (subscriptionType === "instagram") {
    newSubscription = await InstaSubscription.create(commonData);
  } else {
    newSubscription = await WebSubscription.create({
      ...commonData,
      chatbotName: "AI Assistance",
      chatbotMessage: "Hi, How May I help you?",
    });
  }

  let referralRecord = null;

  if (referralCode && !user.hasUsedReferral) {
    const affiliate = await Affiliate.findOne({
      affiliateCode: referralCode,
      status: "active",
    });

    if (affiliate && affiliate.userId.toString() !== clerkId.toString()) {
      const commissionRate = affiliate.commissionRate || 0.3;

      const monthlyCommission =
        billingCycle === "monthly" ? subscriptionPrice * commissionRate : 0;

      const yearlyCommission =
        billingCycle === "yearly" ? subscriptionPrice * commissionRate : 0;

      const productType =
        subscriptionType === "instagram" ? "insta-automation" : "web-chatbot";

      const subscriptionModel =
        subscriptionType === "instagram"
          ? "InstaSubscription"
          : "WebSubscription";

      referralRecord = await AffiReferral.create({
        affiliateId: affiliate._id,
        referredUserId: clerkId,
        productType,
        subscriptionId: newSubscription._id,
        subscriptionModel,
        subscriptionType: billingCycle,
        chatbotType,
        subscriptionPrice,
        commissionRate,
        monthlyCommission,
        yearlyCommission,
        monthsRemaining:
          billingCycle === "monthly" ? affiliate.monthlyMonths || 10 : 0,
        yearsRemaining:
          billingCycle === "yearly" ? affiliate.yearlyYears || 3 : 0,
        lastCommissionDate: new Date(),
        nextCommissionDate: expiresAt,
        status: "active",
      });

      user.referredBy = affiliate._id.toString();
      user.hasUsedReferral = true;
      await user.save();

      affiliate.totalReferrals += 1;
      affiliate.activeReferrals += 1;
      await affiliate.save();
    }
  }

  return { subscription: newSubscription, referral: referralRecord };
}

// Helper function to handle subscription charged webhook
async function handleSubscriptionCharged(
  subscriptionId: string,
  nextBillingDate: Date,
) {
  const [instaUpdate, webUpdate] = await Promise.all([
    InstaSubscription.findOneAndUpdate(
      { subscriptionId },
      {
        $set: {
          status: "active",
          expiresAt: nextBillingDate,
          updatedAt: new Date(),
        },
      },
      { new: true },
    ),
    WebSubscription.findOneAndUpdate(
      { subscriptionId },
      {
        $set: {
          status: "active",
          expiresAt: nextBillingDate,
          updatedAt: new Date(),
        },
      },
      { new: true },
    ),
  ]);

  if (instaUpdate || webUpdate) {
    console.log(`Subscription ${subscriptionId} charged successfully`);
  } else {
    console.warn(`Subscription ${subscriptionId} not found`);
  }
}

// Razorpay webhook controller
export const razorpaySubsCreateOrChargeWebhookController = async (
  req: Request,
  res: Response,
) => {
  try {
    const rawBody = (req as any).rawBody || JSON.stringify(req.body);
    const body = typeof rawBody === "string" ? JSON.parse(rawBody) : rawBody;

    const razorpaySignature = req.headers["x-razorpay-signature"] as string;

    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;

    if (!webhookSecret) {
      return res.status(500).json({
        success: false,
        error: "Webhook configuration error",
        timestamp: new Date().toISOString(),
      });
    }

    const expectedSignature = crypto
      .createHmac("sha256", webhookSecret)
      .update(rawBody)
      .digest("hex");

    if (expectedSignature !== razorpaySignature) {
      return res.status(401).json({
        success: false,
        error: "Invalid signature",
        timestamp: new Date().toISOString(),
      });
    }

    const event = body.event;
    const payload = body.payload;
    const subscription = payload.subscription?.entity;
    const subscriptionId = subscription?.id;

    await connectToDatabase();

    switch (event) {
      case "subscription.activated":
      case "subscription.charged": {
        const exists =
          (await InstaSubscription.findOne({ subscriptionId })) ||
          (await WebSubscription.findOne({ subscriptionId }));

        if (!exists) {
          await handleWebhookSubscriptionCreate(payload);
        }

        const nextBillingDate = subscription?.current_end
          ? new Date(subscription.current_end * 1000)
          : new Date();

        await handleSubscriptionCharged(subscriptionId, nextBillingDate);

        break;
      }

      default:
        console.log(`Unhandled Razorpay event: ${event}`);
        break;
    }

    return res.status(200).json({
      success: true,
      data: {
        message: "Webhook processed successfully",
        event,
        subscriptionId,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error("Razorpay webhook error:", error);

    return res.status(500).json({
      success: false,
      error: "Webhook handler failed",
      details: error.message,
      timestamp: new Date().toISOString(),
    });
  }
};
