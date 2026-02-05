import { Request, Response } from "express";
import crypto from "crypto";
import { connectToDatabase } from "@/config/database.config";
import { addPurchasedTokens } from "@/services/token.service";
import { getRazorpay } from "@/utils/util";
import { getAuth } from "@clerk/express";

// POST /api/tokens/purchase - Create token purchase order
export const createTokenPurchaseController = async (
  req: Request,
  res: Response,
) => {
  try {
    // Get userId from auth headers
    const { userId } = getAuth(req);

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: "Unauthorized",
        timestamp: new Date().toISOString(),
      });
    }

    const { tokens, amount, currency = "INR", planId } = req.body;

    if (!tokens || !amount) {
      return res.status(400).json({
        success: false,
        error: "Tokens and amount are required",
        timestamp: new Date().toISOString(),
      });
    }

    // Validate amount is a positive number
    if (typeof amount !== "number" || amount <= 0) {
      return res.status(400).json({
        success: false,
        error: "Amount must be a positive number",
        timestamp: new Date().toISOString(),
      });
    }

    // Validate tokens is a positive integer
    if (
      typeof tokens !== "number" ||
      tokens <= 0 ||
      !Number.isInteger(tokens)
    ) {
      return res.status(400).json({
        success: false,
        error: "Tokens must be a positive integer",
        timestamp: new Date().toISOString(),
      });
    }
    const razorpay = getRazorpay();

    // Create order in Razorpay
    const options = {
      amount: Math.round(amount * 100), // Convert to paise/pence
      currency,
      receipt: `token_purchase_${userId}_${Date.now()}`,
      notes: {
        userId,
        tokens,
        planId: planId || "custom",
        type: "token_purchase",
        timestamp: new Date().toISOString(),
      },
    };

    const order = await razorpay.orders.create(options);

    return res.status(200).json({
      success: true,
      data: {
        success: true,
        orderId: order.id,
        amount: order.amount,
        currency: order.currency,
        tokens,
        receipt: order.receipt,
      },

      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error("Error creating token purchase:", error);

    let errorMessage = "Internal server error";
    let statusCode = 500;

    if (error.error?.code === "BAD_REQUEST_ERROR") {
      errorMessage = error.error.description || "Invalid request parameters";
      statusCode = 400;
    }

    return res.status(statusCode).json({
      success: false,
      error: errorMessage,
      timestamp: new Date().toISOString(),
    });
  }
};

// PUT /api/tokens/purchase - Verify and complete token purchase
export const verifyTokenPurchaseController = async (
  req: Request,
  res: Response,
) => {
  try {
    // Get userId from auth headers
    const { userId } = getAuth(req);
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: "Unauthorized",
        timestamp: new Date().toISOString(),
      });
    }

    const {
      razorpay_payment_id,
      razorpay_order_id,
      razorpay_signature,
      tokens,
      amount,
      currency = "INR",
    } = req.body;

    if (
      !razorpay_payment_id ||
      !razorpay_order_id ||
      !razorpay_signature ||
      !tokens
    ) {
      return res.status(400).json({
        success: false,
        error: "Payment verification data missing",
        timestamp: new Date().toISOString(),
      });
    }

    // Verify payment signature
    const generated_signature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET!)
      .update(razorpay_order_id + "|" + razorpay_payment_id)
      .digest("hex");

    if (generated_signature !== razorpay_signature) {
      return res.status(400).json({
        success: false,
        error: "Invalid payment signature",
        timestamp: new Date().toISOString(),
      });
    }
    await connectToDatabase();

    // Add tokens to user's balance
    const result = await addPurchasedTokens(userId, tokens, {
      razorpayOrderId: razorpay_order_id,
      amount: amount || 0,
      currency: currency || "INR",
    });

    return res.status(200).json({
      success: true,
      data: {
        success: true,
        message: "Tokens purchased successfully",
        tokensAdded: tokens,
        newBalance: result.newBalance,
        paymentId: razorpay_payment_id,
        orderId: razorpay_order_id,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error("Error verifying token purchase:", error);

    return res.status(500).json({
      success: false,
      error: "Internal server error",
      timestamp: new Date().toISOString(),
    });
  }
};
