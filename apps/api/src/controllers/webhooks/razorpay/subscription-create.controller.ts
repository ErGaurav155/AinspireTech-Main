// app/api/webhooks/subscription/route.ts or similar Express route file
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

  // Get user
  const user = await User.findOne({ clerkId });
  if (!user) {
    throw new Error("User not found");
  }

  // Check for existing subscription
  let existingSubscription = null;
  if (subscriptionType === "instagram") {
    existingSubscription = await InstaSubscription.findOne({
      clerkId,
      chatbotType,
      status: "active",
    });
  } else {
    existingSubscription = await WebSubscription.findOne({
      clerkId,
      chatbotType,
      status: "active",
    });
  }

  if (existingSubscription) {
    throw new Error(
      `Active subscription already exists for this ${subscriptionType} chatbot type`,
    );
  }

  // Calculate expiry date (from current_end in webhook)
  const expiresAt = subscriptionData.current_end
    ? new Date(subscriptionData.current_end * 1000)
    : new Date();

  // Get plan price
  let subscriptionPrice = subscriptionData.amount / 100; // Convert from paise to rupees

  // Common subscription data
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

  // Create subscription based on type
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

  // Handle referral if exists
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

      user.referredBy = affiliate._id;
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
  // Try to update in both models
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

// Razorpay webhook handler endpoint (like the second code)
export const razorpaySubsCreateOrChargeWebhookController = async (
  req: Request,
  res: Response,
) => {
  try {
    // Get raw body for signature verification
    const rawBody = (req as any).rawBody || JSON.stringify(req.body);
    const body = typeof rawBody === "string" ? JSON.parse(rawBody) : rawBody;

    // Verify Razorpay signature
    const razorpaySignature = req.headers["x-razorpay-signature"] as string;
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;

    if (!webhookSecret) {
      console.error("RAZORPAY_WEBHOOK_SECRET not configured");
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
      console.error("Invalid Razorpay webhook signature");
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
        await handleWebhookSubscriptionCreate(payload);
        break;

      case "subscription.charged":
        const chargeAt = subscription.charge_at;
        const nextBillingDate = new Date(chargeAt * 1000);
        await handleSubscriptionCharged(subscriptionId, nextBillingDate);
        break;

      default:
        console.log(`Unhandled Razorpay event: ${event}`);
        return res.status(400).json({
          success: false,
          error: "Unhandled event type",
          timestamp: new Date().toISOString(),
        });
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
