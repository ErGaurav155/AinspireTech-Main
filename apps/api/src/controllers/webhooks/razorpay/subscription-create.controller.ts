// apps/api/controllers/webhooks/razorpay/subscription-create.controller.ts
import { Request, Response } from "express";
import crypto from "crypto";
import { connectToDatabase } from "@/config/database.config";
import InstaSubscription from "@/models/insta/InstaSubscription.model";
import WebSubscription from "@/models/web/Websubcription.model";
import CallSubscription from "@/models/call/CallSubscription.model";
import WebChatbot from "@/models/web/WebChatbot.model";
import User from "@/models/user.model";
import Affiliate from "@/models/affiliate/Affiliate";
import AffiReferral from "@/models/affiliate/Referral";
import AffiCommissionRecord from "@/models/affiliate/CommissionRecord";
import { cancelRazorPaySubscription } from "@/services/subscription.service";
import { initializeSubscriptionTokens } from "@/services/token.service";
import {
  sendSubscriptionEmailToOwner,
  sendSubscriptionEmailToUser,
} from "@/services/sendEmail.service";

async function finalizeSubscriptionReplacementFromNotes(notes: any) {
  const previousSubscriptionId = notes.previousSubscriptionId;
  const previousSubscriptionType = notes.previousSubscriptionType;
  const clerkId = notes.buyerId;

  if (!previousSubscriptionId || !previousSubscriptionType || !clerkId) return;

  const previousSubscription =
    previousSubscriptionType === "insta"
      ? await InstaSubscription.findOne({
          subscriptionId: previousSubscriptionId,
          clerkId,
          status: "active",
        })
      : previousSubscriptionType === "call"
        ? await CallSubscription.findOne({
            subscriptionId: previousSubscriptionId,
            clerkId,
            status: "active",
          })
        : await WebSubscription.findOne({
            subscriptionId: previousSubscriptionId,
            clerkId,
            status: "active",
          });

  if (!previousSubscription) return;

  try {
    await cancelRazorPaySubscription(
      previousSubscriptionId,
      "Changed billing cycle after successful payment",
      "Immediate",
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (!/invalid|cancel|status/i.test(message)) {
      console.error("Failed to cancel previous Razorpay subscription:", error);
      throw error;
    }
    console.warn("Previous Razorpay subscription appears already inactive:", {
      previousSubscriptionId,
      message,
    });
  }

  const cancellationUpdate = {
    $set: {
      status: "cancelled",
      cancelledAt: new Date(),
      updatedAt: new Date(),
    },
  };

  if (previousSubscriptionType === "insta") {
    await InstaSubscription.findOneAndUpdate(
      { subscriptionId: previousSubscriptionId, clerkId },
      cancellationUpdate,
    );
  } else if (previousSubscriptionType === "call") {
    await CallSubscription.findOneAndUpdate(
      { subscriptionId: previousSubscriptionId, clerkId },
      cancellationUpdate,
    );
  } else {
    await WebSubscription.findOneAndUpdate(
      { subscriptionId: previousSubscriptionId, clerkId },
      cancellationUpdate,
    );
  }
}

async function handleWebhookSubscriptionCreate(payload: any) {
  const subscriptionData = payload.subscription?.entity;
  const notes = subscriptionData?.notes || {};

  const subscriptionType = notes.subscriptionType;
  const clerkId = notes.buyerId;
  const chatbotType = notes.productId;
  const referralCode = notes.referralCode;
  const plan = subscriptionData.plan_id;
  const billingCycle = notes.billingCycle;
  const notesAmount = Number(notes.amount);
  const entityAmount = Number(subscriptionData.amount);
  const subscriptionPrice =
    Number.isFinite(notesAmount) && notesAmount > 0
      ? notesAmount
      : Number.isFinite(entityAmount) && entityAmount > 0
        ? entityAmount / 100
        : 0;

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
  } else if (subscriptionType === "call") {
    existingSubscription = await CallSubscription.findOne({
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
    const replyLimit = Number(notes.planLimit);
    const accountLimit = Number(notes.accountLimit);

    if (Number.isFinite(replyLimit) && Number.isFinite(accountLimit)) {
      await User.findOneAndUpdate(
        { clerkId },
        {
          $set: {
            replyLimit,
            accountLimit,
            updatedAt: new Date(),
          },
        },
      );
    }
  } else if (subscriptionType === "call") {
    newSubscription = await CallSubscription.create({
      ...commonData,
      planType: chatbotType,
      minutesLimit: Number(notes.minutesLimit) || 1000,
      numberLimit: Number(notes.numberLimit) || 1,
      agentLimit: Number(notes.agentLimit) || 3,
      overageRate: Number(notes.overageRate) || 5,
    });
  } else {
    newSubscription = await WebSubscription.create({
      ...commonData,
      chatbotName: notes.chatbotName || "AI Assistance",
      chatbotMessage: "Hi, How May I help you?",
    });
    await initializeSubscriptionTokens(clerkId, chatbotType);

    if (notes.chatbotId) {
      await WebChatbot.findOneAndUpdate(
        { _id: notes.chatbotId, clerkId },
        {
          $set: {
            subscriptionId: subscriptionData.id,
            isActive: true,
            updatedAt: new Date(),
          },
        },
      );
    }
  }

  await finalizeSubscriptionReplacementFromNotes(notes);

  const email = notes.email || user.email;
  if (email) {
    void Promise.allSettled([
      sendSubscriptionEmailToOwner({
        email,
        userDbId: clerkId,
        subscriptionId: subscriptionData.id,
      }),
      sendSubscriptionEmailToUser({
        email,
        userDbId: clerkId,
        agentId: chatbotType,
        subscriptionId: subscriptionData.id,
      }),
    ]).then((results) => {
      results.forEach((result) => {
        if (result.status === "rejected") {
          console.warn("Webhook subscription email failed:", result.reason);
        }
      });
    });
  }

  let referralRecord = null;

  const normalizedReferralCode =
    typeof referralCode === "string" ? referralCode.trim() : "";

  // Handle referral per product so one referred customer can credit multiple subscriptions.
  if (
    normalizedReferralCode &&
    normalizedReferralCode !== "null" &&
    normalizedReferralCode !== "undefined"
  ) {
    const affiliate = await Affiliate.findOne({
      affiliateCode: normalizedReferralCode,
      status: "active",
    });

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
        subscriptionType === "insta"
          ? "insta-automation"
          : subscriptionType === "call"
            ? "call-assistant"
            : "web-chatbot";
      const subscriptionModel =
        subscriptionType === "insta"
          ? "InstaSubscription"
          : subscriptionType === "call"
            ? "CallSubscription"
            : "WebSubscription";
      const productName =
        chatbotType ||
        (subscriptionType === "insta"
          ? "Instagram Automation"
          : subscriptionType === "call"
            ? "AI Call Assistant"
            : "Web Chatbot");

      const existingReferral = await AffiReferral.findOne({
        referredUserId: clerkId.toString(),
        productType,
        status: "active",
      });

      if (existingReferral) {
        existingReferral.subscriptionId = newSubscription._id.toString();
        existingReferral.subscriptionModel = subscriptionModel;
        existingReferral.subscriptionType = billingCycle;
        existingReferral.subscriptionPrice = Number(subscriptionPrice);
        existingReferral.commissionRate = Number(commissionRate);
        existingReferral.monthlyCommission = Number(monthlyCommission);
        existingReferral.yearlyCommission = Number(yearlyCommission);
        existingReferral.chatbotType =
          subscriptionType === "web" || subscriptionType === "call"
            ? chatbotType
            : undefined;
        existingReferral.instaPlan =
          subscriptionType === "insta" ? chatbotType : undefined;
        existingReferral.nextCommissionDate = expiresAt;
        await existingReferral.save();

        referralRecord = existingReferral;
        return { subscription: newSubscription, referral: referralRecord };
      }

      // Create referral record
      referralRecord = await AffiReferral.create({
        affiliateId: affiliate._id.toString(),
        referredUserId: clerkId.toString(),
        productType,
        subscriptionId: newSubscription._id.toString(),
        subscriptionModel,
        subscriptionType: billingCycle,
        chatbotType:
          subscriptionType === "web" ? chatbotType : undefined,
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
          referredUserId: clerkId.toString(),
          amount: Number(commissionAmount),
          period: periodKey,
          productType,
          productName,
          subscriptionType: billingCycle,
          status: "pending",
        });

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
  const [instaUpdate, webUpdate, callUpdate] = await Promise.all([
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
    CallSubscription.findOneAndUpdate(
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

  const subscription = instaUpdate || webUpdate || callUpdate;

  if (subscription) {
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
            (referral as any).productType === "web-chatbot"
              ? referral.chatbotType || "Web Chatbot"
              : (referral as any).productType === "call-assistant"
                ? referral.chatbotType || "AI Call Assistant"
                : referral.instaPlan || "Instagram Automation",
          subscriptionType: referral.subscriptionType,
          status: "pending",
        });

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
        const callExists = await CallSubscription.findOne({ subscriptionId });
        const exists = instaExists || webExists || callExists;
        let createdFromWebhook = false;

        if (!exists) {
          await handleWebhookSubscriptionCreate(payload);
          createdFromWebhook = true;
        }

        if (!createdFromWebhook) {
          const nextBillingDate = subscription?.current_end
            ? new Date(subscription.current_end * 1000)
            : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

          await handleSubscriptionCharged(subscriptionId, nextBillingDate);
        }
        break;
      }

      default:
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
