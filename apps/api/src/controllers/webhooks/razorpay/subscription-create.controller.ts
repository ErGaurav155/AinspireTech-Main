// apps/api/controllers/webhooks/razorpay/subscription-create.controller.ts
import { Request, Response } from "express";
import crypto from "crypto";
import { connectToDatabase } from "@/config/database.config";
import InstaSubscription from "@/models/insta/InstaSubscription.model";
import WebSubscription from "@/models/web/Websubcription.model";
import CallSubscription from "@/models/call/CallSubscription.model";
import WhatsAppWorkspace from "@/models/whatsapp/WhatsAppWorkspace.model";
import ContentCreationSubscription from "@/models/packages/ContentCreationSubscription.model";
import MetaAdsSubscription from "@/models/packages/MetaAdsSubscription.model";
import PackageSubscription from "@/models/packages/PackageSubscription.model";
import WebsiteMaintenanceSubscription from "@/models/packages/WebsiteMaintenanceSubscription.model";
import WebChatbot from "@/models/web/WebChatbot.model";
import User from "@/models/user.model";
import { cancelRazorPaySubscription } from "@/services/subscription.service";
import {
  sendSubscriptionEmailToOwner,
  sendSubscriptionEmailToUser,
} from "@/services/sendEmail.service";
import {
  activateCallPaidSubscription,
  activateWhatsAppPaidSubscription,
  downgradeWhatsAppSubscriptionToFree,
  renewCallPaidSubscription,
  renewWhatsAppPaidSubscription,
} from "@/services/billing/paid-subscription.service";

const NON_CORE_SUBSCRIPTION_TYPES = new Set([
  "package",
  "meta-ads",
  "website-maintenance",
  "content-creation",
]);

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
        : previousSubscriptionType === "whatsapp"
          ? await WhatsAppWorkspace.findOne({
              clerkId,
              "subscription.subscriptionId": previousSubscriptionId,
              "subscription.status": "active",
            })
          : await WebSubscription.findOne({
              subscriptionId: previousSubscriptionId,
              clerkId,
              chatbotType: "chatbot-lead-generation",
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
  } else if (previousSubscriptionType === "whatsapp") {
    await downgradeWhatsAppSubscriptionToFree(previousSubscriptionId);
  } else {
    await WebSubscription.findOneAndUpdate(
      {
        subscriptionId: previousSubscriptionId,
        clerkId,
        chatbotType: "chatbot-lead-generation",
      },
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

  if (NON_CORE_SUBSCRIPTION_TYPES.has(subscriptionType)) {
    console.info("Skipping core subscription webhook handling", {
      subscriptionType,
      subscriptionId: subscriptionData?.id,
    });
    return { subscription: null };
  }

  if (
    subscriptionType === "web" &&
    chatbotType !== "chatbot-lead-generation"
  ) {
    console.info("Skipping unsupported web chatbot subscription", {
      subscriptionId: subscriptionData?.id,
    });
    return { subscription: null };
  }

  // Find or create user
  const buyerEmail = (
    subscriptionData.email ||
    notes.email ||
    `${clerkId}@temp.com`
  ).toLowerCase();
  let user = await User.findOne({ clerkId: clerkId });
  if (!user) {
    try {
      user = await User.findOneAndUpdate(
        { clerkId },
        {
          $set: {
            clerkId,
            email: buyerEmail,
            updatedAt: new Date(),
          },
          $setOnInsert: {
            totalReplies: 0,
            replyLimit: 200,
            accountLimit: 1,
            createdAt: new Date(),
          },
        },
        { new: true, upsert: true },
      );
    } catch (error: any) {
      if (error?.code !== 11000) throw error;

      user = await User.findOneAndUpdate(
        { email: buyerEmail },
        {
          $set: {
            clerkId,
            email: buyerEmail,
            updatedAt: new Date(),
          },
        },
        { new: true },
      );
    }
  }

  if (!user) {
    throw new Error(`Could not resolve user for Clerk id ${clerkId}`);
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
  } else if (subscriptionType === "whatsapp") {
    existingSubscription = await WhatsAppWorkspace.findOne({
      "subscription.subscriptionId": subscriptionData.id,
    });
  } else {
    existingSubscription = await WebSubscription.findOne({
      subscriptionId: subscriptionData.id,
      chatbotType: "chatbot-lead-generation",
    });
  }

  if (existingSubscription) {
    return { subscription: existingSubscription };
  }

  if (subscriptionPrice <= 0) {
    console.error("Invalid subscription price resolved from webhook", {
      notesAmount: notes.amount,
      entityAmount: subscriptionData.amount,
      subscriptionId: subscriptionData.id,
    });
    return { subscription: null };
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
    newSubscription = await activateCallPaidSubscription({
      clerkId,
      planType: chatbotType,
      subscriptionId: subscriptionData.id,
      plan,
      billingCycle,
      expiresAt,
      minutesLimit: Number(notes.minutesLimit) || 200,
      numberLimit:
        Number(notes.concurrentCallLimit) || Number(notes.numberLimit) || 3,
      concurrentCallLimit:
        Number(notes.concurrentCallLimit) || Number(notes.numberLimit) || 3,
      agentLimit: Number(notes.agentLimit) || 1,
      overageRate: Number(notes.overageRate) || 5,
    });
  } else if (subscriptionType === "whatsapp") {
    newSubscription = await activateWhatsAppPaidSubscription({
      clerkId,
      productId: chatbotType,
      subscriptionId: subscriptionData.id,
      billingCycle,
      expiresAt,
      razorpayPaymentId: payload.payment?.entity?.id,
      offerId: notes.offerId,
    });
  } else {
    newSubscription = await WebSubscription.create({
      ...commonData,
      chatbotName: notes.chatbotName || "AI Assistance",
      chatbotMessage: "Hi, How May I help you?",
    });
    if (notes.chatbotId) {
      await WebChatbot.findOneAndUpdate(
        {
          _id: notes.chatbotId,
          clerkId,
          type: "chatbot-lead-generation",
        },
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

  return { subscription: newSubscription };
}

async function handleSubscriptionCharged(
  subscriptionId: string,
  nextBillingDate: Date,
) {
  // Update subscription
  const [
    instaUpdate,
    webUpdate,
    callUpdate,
    whatsAppUpdate,
    packageUpdate,
    metaAdsUpdate,
    websiteMaintenanceUpdate,
    contentCreationUpdate,
  ] = await Promise.all([
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
      {
        subscriptionId,
        chatbotType: "chatbot-lead-generation",
      },
      {
        $set: {
          status: "active",
          expiresAt: nextBillingDate,
          updatedAt: new Date(),
        },
      },
      { new: true },
    ),
    renewCallPaidSubscription({ subscriptionId, expiresAt: nextBillingDate }),
    renewWhatsAppPaidSubscription({
      subscriptionId,
      expiresAt: nextBillingDate,
    }),
    PackageSubscription.findOneAndUpdate(
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
    MetaAdsSubscription.findOneAndUpdate(
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
    WebsiteMaintenanceSubscription.findOneAndUpdate(
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
    ContentCreationSubscription.findOneAndUpdate(
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

  const subscription =
    instaUpdate ||
    webUpdate ||
    callUpdate ||
    whatsAppUpdate ||
    packageUpdate ||
    metaAdsUpdate ||
    websiteMaintenanceUpdate ||
    contentCreationUpdate;

  if (!subscription) {
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
        const webExists = await WebSubscription.findOne({
          subscriptionId,
          chatbotType: "chatbot-lead-generation",
        });
        const callExists = await CallSubscription.findOne({ subscriptionId });
        const whatsAppExists = await WhatsAppWorkspace.findOne({
          "subscription.subscriptionId": subscriptionId,
        });
        const packageExists = await PackageSubscription.findOne({
          subscriptionId,
        });
        const metaAdsExists = await MetaAdsSubscription.findOne({
          subscriptionId,
        });
        const websiteMaintenanceExists =
          await WebsiteMaintenanceSubscription.findOne({
            subscriptionId,
          });
        const contentCreationExists =
          await ContentCreationSubscription.findOne({
            subscriptionId,
          });
        const exists =
          instaExists ||
          webExists ||
          callExists ||
          whatsAppExists ||
          packageExists ||
          metaAdsExists ||
          websiteMaintenanceExists ||
          contentCreationExists;
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
