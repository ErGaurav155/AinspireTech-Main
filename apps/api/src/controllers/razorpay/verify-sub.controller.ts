import { Request, Response } from "express";
import crypto from "crypto";
import {
  initializeSubscriptionTokens,
  SUBSCRIPTION_TOKEN_ALLOWANCE,
} from "@/services/token.service";
import { getAuth } from "@clerk/express";
import { connectToDatabase } from "@/config/database.config";
import WebSubscription from "@/models/web/Websubcription.model";
import InstaSubscription from "@/models/insta/InstaSubscription.model";
import CallSubscription from "@/models/call/CallSubscription.model";
import WhatsAppWorkspace from "@/models/whatsapp/WhatsAppWorkspace.model";
import {
  activateDashboardPackageSubscription,
  activateMetaAdsSubscription,
  activateWebsiteMaintenanceSubscription,
} from "@/services/packages/package-subscription.service";
import { cancelRazorPaySubscription } from "@/services/subscription.service";
import { getRazorpay } from "@/utils/util";
import {
  activateCallPaidSubscription,
  activateWhatsAppPaidSubscription,
  downgradeCallWorkspaceToFree,
  downgradeWhatsAppSubscriptionToFree,
} from "@/services/billing/paid-subscription.service";

export interface VerifyBody {
  subscription_id: string;
  razorpay_payment_id?: string;
  razorpay_signature?: string;
  chatbotType?: string;
  productId?: string;
  subscriptionType?: string;
  subscriptionKind?:
    | "web"
    | "insta"
    | "call"
    | "whatsapp"
    | "package"
    | "meta-ads"
    | "website-maintenance";
  billingCycle?: "monthly" | "yearly";
  previousSubscriptionId?: string;
  previousSubscriptionType?: "web" | "insta" | "call" | "whatsapp";
}

const PAID_PAYMENT_STATUSES = new Set(["captured"]);

const activateVerifiedSubscription = async ({
  userId,
  subscription_id,
  razorpay_payment_id,
  chatbotType,
  productId,
  subscriptionType,
  subscriptionKind,
  billingCycle,
  previousSubscriptionId,
  previousSubscriptionType,
  razorpaySubscription,
}: VerifyBody & {
  userId: string;
  razorpaySubscription?: any;
}) => {
  await connectToDatabase();

  const notes = razorpaySubscription?.notes || {};
  const targetChatbotType =
    chatbotType || productId || notes.productId || subscriptionType;
  const requestedKind =
    subscriptionKind || subscriptionType || notes.subscriptionType;
  const currentSubscriptionKind =
    requestedKind === "package"
      ? "package"
      : requestedKind === "meta-ads"
        ? "meta-ads"
        : requestedKind === "website-maintenance"
          ? "website-maintenance"
          : requestedKind === "insta"
            ? "insta"
            : requestedKind === "call"
              ? "call"
              : requestedKind === "whatsapp"
                ? "whatsapp"
                : "web";
  const resolvedBillingCycle = billingCycle || notes.billingCycle || "monthly";
  const expiresAt = razorpaySubscription?.current_end
    ? new Date(razorpaySubscription.current_end * 1000)
    : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

  if (currentSubscriptionKind !== "package" && !targetChatbotType) {
    throw new Error("Unable to determine subscription product");
  }

  if (currentSubscriptionKind === "package") {
    const packageId = productId || notes.packageId || notes.productId;
    if (!packageId) {
      throw new Error("Unable to determine dashboard package");
    }

    const packageSubscription = await activateDashboardPackageSubscription({
      clerkId: userId,
      packageId,
      subscriptionId: subscription_id,
      billingCycle: "monthly",
      expiresAt,
      razorpayPaymentId: razorpay_payment_id,
      offerId: notes.offerId,
    });

    return {
      success: true,
      message: "Package subscription activated successfully",
      packageId,
      packageName: packageSubscription.packageName,
      subscriptionId: subscription_id,
      paymentId: razorpay_payment_id,
    };
  }

  if (currentSubscriptionKind === "meta-ads") {
    const planId = productId || notes.productId;
    if (!planId) {
      throw new Error("Unable to determine Meta Ads plan");
    }

    const subscription = await activateMetaAdsSubscription({
      clerkId: userId,
      planId,
      subscriptionId: subscription_id,
      expiresAt,
      razorpayPaymentId: razorpay_payment_id,
    });

    return {
      success: true,
      message: "Meta Ads subscription activated successfully",
      planId,
      planName: subscription.planName,
      subscriptionId: subscription_id,
      paymentId: razorpay_payment_id,
    };
  }

  if (currentSubscriptionKind === "website-maintenance") {
    const planId = productId || notes.productId;
    if (!planId) {
      throw new Error("Unable to determine website maintenance plan");
    }

    const subscription = await activateWebsiteMaintenanceSubscription({
      clerkId: userId,
      planId,
      subscriptionId: subscription_id,
      expiresAt,
      razorpayPaymentId: razorpay_payment_id,
      offerId: notes.offerId,
    });

    return {
      success: true,
      message: "Website maintenance subscription activated successfully",
      planId,
      planName: subscription.planName,
      subscriptionId: subscription_id,
      paymentId: razorpay_payment_id,
    };
  }

  if (currentSubscriptionKind === "call") {
    await cancelPreviousSubscriptionAfterPayment({
      clerkId: userId,
      previousSubscriptionId:
        previousSubscriptionId || notes.previousSubscriptionId,
      previousSubscriptionType:
        previousSubscriptionType || notes.previousSubscriptionType,
    });

    const subscription = await activateCallPaidSubscription({
      clerkId: userId,
      planType: productId || notes.productId || targetChatbotType,
      subscriptionId: subscription_id,
      plan: productId || notes.productId || targetChatbotType,
      billingCycle: resolvedBillingCycle,
      expiresAt,
      minutesLimit: Number(notes.minutesLimit),
      numberLimit: Number(notes.numberLimit),
      concurrentCallLimit: Number(notes.concurrentCallLimit),
      agentLimit: Number(notes.agentLimit),
      overageRate: Number(notes.overageRate),
    });

    return {
      success: true,
      message: "AI Call subscription activated successfully",
      planId: subscription.planType,
      subscriptionId: subscription_id,
      paymentId: razorpay_payment_id,
    };
  }

  if (currentSubscriptionKind === "whatsapp") {
    await cancelPreviousSubscriptionAfterPayment({
      clerkId: userId,
      previousSubscriptionId:
        previousSubscriptionId || notes.previousSubscriptionId,
      previousSubscriptionType:
        previousSubscriptionType || notes.previousSubscriptionType,
    });

    const workspace = await activateWhatsAppPaidSubscription({
      clerkId: userId,
      productId: productId || notes.productId || targetChatbotType,
      subscriptionId: subscription_id,
      billingCycle: resolvedBillingCycle,
      expiresAt,
      razorpayPaymentId: razorpay_payment_id,
      offerId: notes.offerId,
    });

    return {
      success: true,
      message: "WhatsApp subscription activated successfully",
      planId: workspace.subscription.plan,
      subscriptionId: subscription_id,
      paymentId: razorpay_payment_id,
    };
  }

  if (currentSubscriptionKind === "web") {
    await initializeSubscriptionTokens(userId, targetChatbotType);
  }

  await cancelPreviousSubscriptionAfterPayment({
    clerkId: userId,
    previousSubscriptionId:
      previousSubscriptionId || notes.previousSubscriptionId,
    previousSubscriptionType:
      previousSubscriptionType || notes.previousSubscriptionType,
  });

  if (currentSubscriptionKind === "insta") {
    await InstaSubscription.findOneAndUpdate(
      { subscriptionId: subscription_id },
      {
        $set: {
          clerkId: userId,
          chatbotType: targetChatbotType,
          subscriptionId: subscription_id,
          plan: productId || razorpaySubscription?.plan_id || targetChatbotType,
          billingCycle: resolvedBillingCycle,
          status: "active",
          expiresAt,
          updatedAt: new Date(),
        },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    );
  } else {
    await WebSubscription.findOneAndUpdate(
      { subscriptionId: subscription_id },
      {
        $set: {
          clerkId: userId,
          chatbotType: targetChatbotType,
          chatbotName:
            targetChatbotType === "chatbot-lead-generation"
              ? "Lead Generation"
              : targetChatbotType === "chatbot-education"
                ? "Education (MCQ)"
                : targetChatbotType,
          subscriptionId: subscription_id,
          plan: productId || targetChatbotType,
          billingCycle: resolvedBillingCycle,
          status: "active",
          expiresAt,
          productId,
          updatedAt: new Date(),
        },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    );
  }

  return {
    success: true,
    message: "Subscription activated successfully",
    chatbotType: targetChatbotType,
    subscriptionTokens:
      currentSubscriptionKind === "web"
        ? SUBSCRIPTION_TOKEN_ALLOWANCE
        : undefined,
    subscriptionId: subscription_id,
    paymentId: razorpay_payment_id,
  };
};

const cancelPreviousSubscriptionAfterPayment = async ({
  clerkId,
  previousSubscriptionId,
  previousSubscriptionType,
}: {
  clerkId: string;
  previousSubscriptionId?: string;
  previousSubscriptionType?: "web" | "insta" | "call" | "whatsapp";
}) => {
  if (!previousSubscriptionId || !previousSubscriptionType) return;

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
              status: "active",
            });

  if (!previousSubscription) {
    console.warn("Previous subscription not found or already inactive", {
      previousSubscriptionId,
      previousSubscriptionType,
      clerkId,
    });
    return;
  }

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
    await downgradeCallWorkspaceToFree(clerkId);
  } else if (previousSubscriptionType === "whatsapp") {
    await downgradeWhatsAppSubscriptionToFree(previousSubscriptionId);
  } else {
    await WebSubscription.findOneAndUpdate(
      { subscriptionId: previousSubscriptionId, clerkId },
      cancellationUpdate,
    );
  }
};

// POST /api/razorpay/subscription/verify - Verify Razorpay payment
export const verifyRazorpayPaymentController = async (
  req: Request,
  res: Response,
) => {
  try {
    const { userId } = getAuth(req);
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: "Unauthorized",
        timestamp: new Date().toISOString(),
      });
    }

    const {
      subscription_id,
      razorpay_payment_id,
      razorpay_signature,
      chatbotType,
      productId,
      subscriptionType,
      subscriptionKind,
      billingCycle,
      previousSubscriptionId,
      previousSubscriptionType,
    }: VerifyBody = req.body;

    if (!subscription_id) {
      return res.status(400).json({
        success: false,
        error: "Missing required parameter: subscription_id is required",
        timestamp: new Date().toISOString(),
      });
    }

    // For subscriptions, we need chatbot type
    if (!chatbotType && !subscriptionType) {
      return res.status(400).json({
        success: false,
        error:
          "chatbotType or subscriptionType is required for subscription verification",
        timestamp: new Date().toISOString(),
      });
    }

    const secret = process.env.RAZORPAY_KEY_SECRET;
    if (!secret) {
      console.error("RAZORPAY_KEY_SECRET not configured");
      return res.status(500).json({
        success: false,
        error: "Payment gateway configuration error",
        timestamp: new Date().toISOString(),
      });
    }

    if (!razorpay_payment_id || !razorpay_signature) {
      const razorpay = getRazorpay();
      const subscription = await razorpay.subscriptions.fetch(subscription_id);

      if (
        subscription.notes?.buyerId &&
        subscription.notes.buyerId !== userId
      ) {
        return res.status(403).json({
          success: false,
          error: "Subscription does not belong to this user",
          timestamp: new Date().toISOString(),
        });
      }

      const payments = await razorpay.payments.all({
        subscription_id,
        count: 10,
      } as any);

      const paidPayment = payments.items?.find((payment: any) =>
        PAID_PAYMENT_STATUSES.has(payment.status),
      );

      if (!paidPayment) {
        return res.status(409).json({
          success: false,
          error: `Payment is not confirmed yet. Current status: ${subscription.status}`,
          timestamp: new Date().toISOString(),
        });
      }

      const activationResult = await activateVerifiedSubscription({
        userId,
        subscription_id,
        chatbotType,
        productId,
        subscriptionType,
        subscriptionKind,
        billingCycle,
        previousSubscriptionId,
        previousSubscriptionType,
        razorpaySubscription: subscription,
        razorpay_payment_id: paidPayment?.id,
      });

      return res.status(200).json({
        success: true,
        data: activationResult,
        timestamp: new Date().toISOString(),
      });
    }

    const HMAC = crypto.createHmac("sha256", secret);
    const data = `${razorpay_payment_id}|${subscription_id}`;
    HMAC.update(data, "utf8");
    const generatedSignature = HMAC.digest("hex");

    if (generatedSignature !== razorpay_signature) {
      return res.status(400).json({
        success: false,
        error: "Invalid payment signature",
        timestamp: new Date().toISOString(),
      });
    }

    // Initialize subscription tokens and create/update subscription record
    try {
      const activationResult = await activateVerifiedSubscription({
        userId,
        subscription_id,
        razorpay_payment_id,
        chatbotType,
        productId,
        subscriptionType,
        subscriptionKind,
        billingCycle,
        previousSubscriptionId,
        previousSubscriptionType,
      });

      return res.status(200).json({
        success: true,
        data: activationResult,
        timestamp: new Date().toISOString(),
      });
    } catch (tokenError: any) {
      console.error("Error initializing subscription tokens:", tokenError);
      return res.status(500).json({
        success: false,
        error: tokenError.message || "Failed to activate subscription",
        timestamp: new Date().toISOString(),
      });
    }
  } catch (error: any) {
    console.error("Payment verification error:", error);
    return res.status(500).json({
      success: false,
      error: error.message || "An error occurred during payment verification",
      timestamp: new Date().toISOString(),
    });
  }
};
