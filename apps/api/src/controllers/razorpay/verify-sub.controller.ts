import { Request, Response } from "express";
import crypto from "crypto";
import { initializeSubscriptionTokens } from "@/services/token.service";
import { getAuth } from "@clerk/express";
import { connectToDatabase } from "@/config/database.config";
import WebSubscription from "@/models/web/Websubcription.model";
import InstaSubscription from "@/models/insta/InstaSubscription.model";
import { cancelRazorPaySubscription } from "@/services/subscription.service";

export interface VerifyBody {
  subscription_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
  chatbotType?: string;
  productId?: string;
  subscriptionType?: string;
  subscriptionKind?: "web" | "insta";
  billingCycle?: "monthly" | "yearly";
  previousSubscriptionId?: string;
  previousSubscriptionType?: "web" | "insta";
}

const cancelPreviousSubscriptionAfterPayment = async ({
  clerkId,
  previousSubscriptionId,
  previousSubscriptionType,
}: {
  clerkId: string;
  previousSubscriptionId?: string;
  previousSubscriptionType?: "web" | "insta";
}) => {
  if (!previousSubscriptionId || !previousSubscriptionType) return;

  const previousSubscription =
    previousSubscriptionType === "insta"
      ? await InstaSubscription.findOne({
          subscriptionId: previousSubscriptionId,
          clerkId,
          status: "active",
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

    // Validate required parameters
    if (!subscription_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({
        success: false,
        error:
          "Missing required parameters: subscription_id, razorpay_payment_id, razorpay_signature are required",
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

    // Verify signature
    const HMAC = crypto.createHmac("sha256", secret);
    const data = `${razorpay_payment_id}|${subscription_id}`;
    HMAC.update(data, "utf8");
    const generatedSignature = HMAC.digest("hex");

    console.log("Signature verification:", {
      received: razorpay_signature,
      generated: generatedSignature,
      data: data,
    });

    if (generatedSignature !== razorpay_signature) {
      return res.status(400).json({
        success: false,
        error: "Invalid payment signature",
        timestamp: new Date().toISOString(),
      });
    }

    // Initialize subscription tokens and create/update subscription record
    try {
      await connectToDatabase();

      // Determine chatbot type
      const targetChatbotType = (chatbotType || subscriptionType)!;
      const currentSubscriptionKind =
        subscriptionKind || (subscriptionType === "insta" ? "insta" : "web");

      // Initialize subscription tokens (1 million tokens per chatbot)
      if (currentSubscriptionKind === "web") {
        await initializeSubscriptionTokens(userId, targetChatbotType);
      }

      await cancelPreviousSubscriptionAfterPayment({
        clerkId: userId,
        previousSubscriptionId,
        previousSubscriptionType,
      });

      if (currentSubscriptionKind === "web") {
        const subscriptionData = {
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
          billingCycle: billingCycle || "monthly",
          status: "active",
          expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          productId: productId,
          updatedAt: new Date(),
        };

        await WebSubscription.findOneAndUpdate(
          { subscriptionId: subscription_id },
          { $set: subscriptionData },
          { upsert: true, new: true, setDefaultsOnInsert: true },
        );
      }

      console.log(
        "Subscription tokens initialized and record created for user:",
        userId,
        "chatbot:",
        targetChatbotType,
      );

      return res.status(200).json({
        success: true,
        data: {
          success: true,
          message: "Subscription activated successfully",
          chatbotType: targetChatbotType,
          subscriptionTokens: 1000000,
          subscriptionId: subscription_id,
          paymentId: razorpay_payment_id,
        },
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
