import { Request, Response } from "express";
import crypto from "crypto";
import { addPurchasedTokens } from "@/services/token.service";
import { getAuth } from "@clerk/express";

export interface VerifyBody {
  subscription_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
  tokens?: number;
  amount?: number;
  currency?: string;
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
      tokens,
      amount,
      currency,
    }: VerifyBody = req.body;

    // Validate required parameters
    if (!subscription_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({
        success: false,
        error:
          "Missing required parameters: subscription_id, razorpay_payment_id, razorpay_signature, amount, tokens, and currency are required",
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

    // Add tokens to user's balance
    try {
      if (tokens && amount && currency) {
        await addPurchasedTokens(userId, tokens, {
          razorpayOrderId: subscription_id,
          amount,
          currency,
        });
        console.log("Tokens added successfully for user:", userId);

        return res.status(200).json({
          success: true,
          data: {
            success: true,
            message: "Payment verified successfully",
            tokensAdded: tokens,
            amount: amount,
            currency: currency,
            subscriptionId: subscription_id,
            paymentId: razorpay_payment_id,
          },
          timestamp: new Date().toISOString(),
        });
      }
      return res.status(200).json({
        success: true,
        data: {
          success: true,
          message: "Payment verified successfully",
          subscriptionId: subscription_id,
          paymentId: razorpay_payment_id,
        },
        timestamp: new Date().toISOString(),
      });
    } catch (tokenError: any) {
      console.error("Error adding tokens:", tokenError);
      return res.status(500).json({
        success: false,
        error: tokenError.message || "Failed to add tokens to account",
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
