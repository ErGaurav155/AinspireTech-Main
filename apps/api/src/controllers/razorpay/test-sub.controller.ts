import { Request, Response } from "express";
import crypto from "crypto";
import { getAuth } from "@clerk/express";
import { getRazorpay } from "@/utils/util";

const TEST_RAZORPAY_PLAN_ID = "plan_SqlXUaV8XVVnSr";

export const createTestRazorpaySubscriptionController = async (
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

    const razorpay = getRazorpay();
    const subscription = await razorpay.subscriptions.create({
      plan_id: TEST_RAZORPAY_PLAN_ID,
      total_count: 12,
      customer_notify: 1 as 0 | 1,
      notes: {
        buyerId: userId,
        productId: "subscription-test",
        testCheckout: "true",
      },
    });

    return res.status(201).json({
      success: true,
      data: {
        subscriptionId: subscription.id,
        planId: TEST_RAZORPAY_PLAN_ID,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error("Test Razorpay subscription create error:", error);
    return res.status(500).json({
      success: false,
      error: error.message || "Failed to create test subscription",
      timestamp: new Date().toISOString(),
    });
  }
};

export const verifyTestRazorpaySubscriptionController = async (
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
    }: {
      subscription_id?: string;
      razorpay_payment_id?: string;
      razorpay_signature?: string;
    } = req.body;

    if (!subscription_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(200).json({
        success: true,
        data: {
          verified: false,
          message: "Missing payment verification fields",
        },
        timestamp: new Date().toISOString(),
      });
    }

    const secret = process.env.RAZORPAY_KEY_SECRET;

    if (!secret) {
      return res.status(500).json({
        success: false,
        error: "Razorpay secret not configured",
        timestamp: new Date().toISOString(),
      });
    }

    const generatedSignature = crypto
      .createHmac("sha256", secret)
      .update(`${razorpay_payment_id}|${subscription_id}`, "utf8")
      .digest("hex");

    return res.status(200).json({
      success: true,
      data: {
        verified: generatedSignature === razorpay_signature,
        subscriptionId: subscription_id,
        paymentId: razorpay_payment_id,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error("Test Razorpay subscription verify error:", error);
    return res.status(500).json({
      success: false,
      error: error.message || "Failed to verify test subscription",
      timestamp: new Date().toISOString(),
    });
  }
};
