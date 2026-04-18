import { Request, Response } from "express";
import crypto from "crypto";
import { initializeSubscriptionTokens } from "@/services/token.service";
import { getAuth } from "@clerk/express";
import { connectToDatabase } from "@/config/database.config";
import WebSubscription from "@/models/web/Websubcription.model";

export interface VerifyBody {
  subscription_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
  chatbotType?: string;
  productId?: string;
  subscriptionType?: string;
}

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

      // Initialize subscription tokens (1 million tokens per chatbot)
      await initializeSubscriptionTokens(userId, targetChatbotType);

      // Create or update WebSubscription record
      const subscriptionData = {
        clerkId: userId,
        chatbotType: targetChatbotType,
        chatbotName:
          targetChatbotType === "chatbot-lead-generation"
            ? "Lead Generation"
            : targetChatbotType === "chatbot-education"
              ? "Education (MCQ)"
              : targetChatbotType,
        razorpaySubscriptionId: subscription_id,
        status: "active",
        startedAt: new Date(),
        productId: productId,
      };

      await WebSubscription.findOneAndUpdate(
        { clerkId: userId, chatbotType: targetChatbotType },
        subscriptionData,
        { upsert: true, new: true },
      );

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
