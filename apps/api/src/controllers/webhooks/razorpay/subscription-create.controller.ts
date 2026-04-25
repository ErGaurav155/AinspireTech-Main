// apps/api/controllers/webhooks/razorpay/subscription-create.controller.ts
import { Request, Response } from "express";
import crypto from "crypto";
import { connectToDatabase } from "@/config/database.config";
import InstaSubscription from "@/models/insta/InstaSubscription.model";
import WebSubscription from "@/models/web/Websubcription.model";
import User from "@/models/user.model";
import Affiliate from "@/models/affiliate/Affiliate";
import AffiReferral from "@/models/affiliate/Referral";
import AffiCommissionRecord from "@/models/affiliate/CommissionRecord";

async function handleWebhookSubscriptionCreate(payload: any) {
  const subscriptionData = payload.subscription?.entity;
  const notes = subscriptionData?.notes || {};
  console.log("notes:", notes);

  const subscriptionType = notes.subscriptionType;
  const clerkId = notes.buyerId;
  const chatbotType = notes.productId;
  const referralCode = notes.referralCode;
  const plan = subscriptionData.plan_id;
  const billingCycle = notes.billingCycle;
  const notesAmount = Number(notes.amount);
  const entityAmount = Number(subscriptionData.amount);
  const subscriptionPrice = Number.isFinite(notesAmount) && notesAmount > 0
    ? notesAmount
    : Number.isFinite(entityAmount) && entityAmount > 0
      ? entityAmount / 100
      : 0;

  console.log("subscriptionData:", subscriptionData);
  console.log("Billing cycle:", billingCycle);
  console.log("Resolved subscription price:", subscriptionPrice);

  // Find or create user
  let user = await User.findOne({ clerkId: clerkId });
  if (!user) {
    user = await User.create({
      clerkId: clerkId,
      email: subscriptionData.email || `${clerkId}@temp.com`,
      totalReplies: 0,
      replyLimit: 200,
      accountLimit: 1,
      hasUsedReferral: false,
    });
  }

  let existingSubscription = null;

  if (subscriptionType === "insta") {
    existingSubscription = await InstaSubscription.findOne({
      subscriptionId: subscriptionData.id,
    });
  } else {
    existingSubscription = await WebSubscription.findOne({
      subscriptionId: subscriptionData.id,
    });
  }

  if (existingSubscription) {
    return { subscription: existingSubscription, referral: null };
  }

  if (subscriptionPrice <= 0) {
    console.error("Invalid subscription price resolved from webhook", {
      notesAmount: notes.amount,
      entityAmount: subscriptionData.amount,
      subscriptionId: subscriptionData.id,
    });
    return { subscription: null, referral: null };
  }

  const expiresAt = subscriptionData.current_end
    ? new Date(subscriptionData.current_end * 1000)
    : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

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

  if (subscriptionType === "insta") {
    newSubscription = await InstaSubscription.create(commonData);
  } else {
    newSubscription = await WebSubscription.create({
      ...commonData,
      chatbotName: notes.chatbotName || "AI Assistance",
      chatbotMessage: "Hi, How May I help you?",
    });
  }

  let referralRecord = null;

  // Handle referral if code exists and user hasn't used referral
  if (
    referralCode &&
    referralCode !== "null" &&
    referralCode !== "undefined" &&
    !user.hasUsedReferral
  ) {
    console.log("Processing referral with code:", referralCode);

    const affiliate = await Affiliate.findOne({
      affiliateCode: referralCode,
      status: "active",
    });

    console.log("Found affiliate:", affiliate?._id);

    if (affiliate && affiliate.userId !== clerkId.toString()) {
      const commissionRate = affiliate.commissionRate || 0.25;

      let monthlyCommission = 0;
      let yearlyCommission = 0;
      let monthsRemaining = 0;
      let yearsRemaining = 0;

      if (billingCycle === "monthly") {
        monthlyCommission = Number(subscriptionPrice) * Number(commissionRate);
        monthsRemaining = Number(affiliate.monthlyMonths) || 10;
        yearlyCommission = 0;
        yearsRemaining = 0;
      } else if (billingCycle === "yearly") {
        yearlyCommission = Number(subscriptionPrice) * Number(commissionRate);
        yearsRemaining = Number(affiliate.yearlyYears) || 3;
        monthlyCommission = 0;
        monthsRemaining = 0;
      } else {
        console.error("Unknown billing cycle:", billingCycle);
        return { subscription: newSubscription, referral: null };
      }

      const productType =
        subscriptionType === "insta" ? "insta-automation" : "web-chatbot";
      const subscriptionModel =
        subscriptionType === "insta" ? "InstaSubscription" : "WebSubscription";
      const productName =
        chatbotType ||
        (subscriptionType === "insta" ? "Instagram Automation" : "Web Chatbot");

      // Create referral record
      referralRecord = await AffiReferral.create({
        affiliateId: affiliate._id.toString(),
        referredUserId: clerkId.toString(),
        productType,
        subscriptionId: newSubscription._id.toString(),
        subscriptionModel,
        subscriptionType: billingCycle,
        chatbotType:
          subscriptionType === "web-chatbot" ? chatbotType : undefined,
        instaPlan: subscriptionType === "insta" ? chatbotType : undefined,
        subscriptionPrice: Number(subscriptionPrice),
        commissionRate: Number(commissionRate),
        monthlyCommission: Number(monthlyCommission),
        yearlyCommission: Number(yearlyCommission),
        totalCommissionEarned: 0,
        monthsRemaining: Number(monthsRemaining),
        yearsRemaining: Number(yearsRemaining),
        status: "active",
        lastCommissionDate: new Date(),
        nextCommissionDate: expiresAt,
      });

      console.log("Created referral record:", referralRecord._id);

      // Calculate commission amount for this period
      const commissionAmount =
        billingCycle === "monthly"
          ? Number(monthlyCommission)
          : Number(yearlyCommission);

      if (commissionAmount > 0) {
        const periodKey = new Date().toISOString().slice(0, 7);
        const commissionRecord = await AffiCommissionRecord.create({
          affiliateId: affiliate._id.toString(),
          referralId: referralRecord._id.toString(),
          referredUserId: user._id.toString(),
          amount: Number(commissionAmount),
          period: periodKey,
          productType,
          productName,
          subscriptionType: billingCycle,
          status: "pending",
        });

        console.log("Created commission record:", commissionRecord._id);

        // Update affiliate earnings
        const currentPending = Number(affiliate.pendingEarnings) || 0;
        const currentTotal = Number(affiliate.totalEarnings) || 0;

        affiliate.pendingEarnings = currentPending + Number(commissionAmount);
        affiliate.totalEarnings = currentTotal + Number(commissionAmount);
        affiliate.totalReferrals = Number(affiliate.totalReferrals) + 1;
        affiliate.activeReferrals = Number(affiliate.activeReferrals) + 1;
        await affiliate.save();
      }

      user.referredBy = affiliate._id.toString();
      user.hasUsedReferral = true;
      await user.save();
    }
  }

  return { subscription: newSubscription, referral: referralRecord };
}

async function handleSubscriptionCharged(
  subscriptionId: string,
  nextBillingDate: Date,
) {
  // Update subscription
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

  const subscription = instaUpdate || webUpdate;

  if (subscription) {
    console.log(`Subscription ${subscriptionId} charged successfully`);

    // Find active referral for this subscription
    const referral = await AffiReferral.findOne({
      subscriptionId: subscription._id.toString(),
      status: "active",
    });

    if (referral && referral.status === "active") {
      // Check if referral has remaining months/years
      let commissionAmount = 0;
      let updatedMonthsRemaining = Number(referral.monthsRemaining);
      let updatedYearsRemaining = Number(referral.yearsRemaining);

      if (
        referral.subscriptionType === "monthly" &&
        updatedMonthsRemaining > 0
      ) {
        commissionAmount = Number(referral.monthlyCommission);
        updatedMonthsRemaining -= 1;
      } else if (
        referral.subscriptionType === "yearly" &&
        updatedYearsRemaining > 0
      ) {
        commissionAmount = Number(referral.yearlyCommission);
        updatedYearsRemaining -= 1;
      }

      if (commissionAmount > 0) {
        const periodKey = new Date().toISOString().slice(0, 7);
        const commissionRecord = await AffiCommissionRecord.create({
          affiliateId: referral.affiliateId,
          referralId: referral._id.toString(),
          referredUserId: referral.referredUserId,
          amount: Number(commissionAmount),
          period: periodKey,
          productType: referral.productType,
          productName:
            referral.productType === "web-chatbot"
              ? referral.chatbotType || "Web Chatbot"
              : referral.instaPlan || "Instagram Automation",
          subscriptionType: referral.subscriptionType,
          status: "pending",
        });

        console.log(
          `Created commission record for renewal: ${commissionRecord._id}`,
        );

        // Update affiliate pending earnings
        const affiliate = await Affiliate.findOne({
          _id: referral.affiliateId,
        });
        if (affiliate) {
          const currentPending = Number(affiliate.pendingEarnings) || 0;
          const currentTotal = Number(affiliate.totalEarnings) || 0;

          affiliate.pendingEarnings = currentPending + Number(commissionAmount);
          affiliate.totalEarnings = currentTotal + Number(commissionAmount);
          await affiliate.save();
        }

        // Update referral record
        const currentTotalEarned = Number(referral.totalCommissionEarned) || 0;
        referral.totalCommissionEarned =
          currentTotalEarned + Number(commissionAmount);
        referral.monthsRemaining = updatedMonthsRemaining;
        referral.yearsRemaining = updatedYearsRemaining;
        referral.lastCommissionDate = new Date();
        referral.nextCommissionDate = nextBillingDate;

        if (
          (referral.subscriptionType === "monthly" &&
            updatedMonthsRemaining <= 0) ||
          (referral.subscriptionType === "yearly" && updatedYearsRemaining <= 0)
        ) {
          referral.status = "completed";
          referral.completionDate = new Date();
        }

        await referral.save();
      }
    }
  } else {
    console.warn(`Subscription ${subscriptionId} not found`);
  }
}

export const razorpaySubsCreateOrChargeWebhookController = async (
  req: Request,
  res: Response,
) => {
  try {
    const rawBody = (req as any).rawBody || JSON.stringify(req.body);
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
      console.error("Invalid signature");
      return res.status(401).json({
        success: false,
        error: "Invalid signature",
        timestamp: new Date().toISOString(),
      });
    }

    const body = typeof rawBody === "string" ? JSON.parse(rawBody) : rawBody;
    console.log("Webhook event:", body.event);

    const event = body.event;
    const payload = body.payload;
    const subscription = payload.subscription?.entity;
    const subscriptionId = subscription?.id;

    await connectToDatabase();

    switch (event) {
      case "subscription.activated":
      case "subscription.charged": {
        const instaExists = await InstaSubscription.findOne({ subscriptionId });
        const webExists = await WebSubscription.findOne({ subscriptionId });
        const exists = instaExists || webExists;

        if (!exists) {
          console.log("Creating new subscription from webhook");
          await handleWebhookSubscriptionCreate(payload);
        }

        const nextBillingDate = subscription?.current_end
          ? new Date(subscription.current_end * 1000)
          : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

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
