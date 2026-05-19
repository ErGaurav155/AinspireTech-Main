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

    console.log("Test Razorpay subscription created:", {
      userId,
      subscriptionId: subscription.id,
      planId: TEST_RAZORPAY_PLAN_ID,
      status: subscription.status,
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

    console.log("Test Razorpay subscription verify request:", {
      userId,
      subscription_id,
      razorpay_payment_id,
      hasSignature: !!razorpay_signature,
    });

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
    const verified = generatedSignature === razorpay_signature;

    console.log("Test Razorpay subscription verify result:", {
      userId,
      subscription_id,
      razorpay_payment_id,
      verified,
    });

    return res.status(200).json({
      success: true,
      data: {
        verified,
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

export const getTestRazorpaySubscriptionStatusController = async (
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

    const { subscriptionId } = req.params;

    if (!subscriptionId) {
      return res.status(400).json({
        success: false,
        error: "Missing subscription id",
        timestamp: new Date().toISOString(),
      });
    }

    const razorpay = getRazorpay();
    const subscription = await razorpay.subscriptions.fetch(subscriptionId);
    const payments = await razorpay.payments.all({
      subscription_id: subscriptionId,
      count: 10,
    } as any);

    const status = {
      subscription: {
        id: subscription.id,
        status: subscription.status,
        plan_id: subscription.plan_id,
        current_start: subscription.current_start,
        current_end: subscription.current_end,
        charge_at: subscription.charge_at,
        paid_count: subscription.paid_count,
        remaining_count: subscription.remaining_count,
        notes: subscription.notes,
      },
      payments: payments.items?.map((payment: any) => ({
        id: payment.id,
        order_id: payment.order_id,
        status: payment.status,
        method: payment.method,
        amount: payment.amount,
        currency: payment.currency,
        error_code: payment.error_code,
        error_description: payment.error_description,
        error_source: payment.error_source,
        error_step: payment.error_step,
        error_reason: payment.error_reason,
        created_at: payment.created_at,
        captured: payment.captured,
        notes: payment.notes,
      })),
    };

    console.log("Test Razorpay subscription status:", {
      userId,
      subscriptionId,
      status,
    });

    return res.status(200).json({
      success: true,
      data: status,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error("Test Razorpay subscription status error:", error);
    return res.status(500).json({
      success: false,
      error: error.message || "Failed to fetch test subscription status",
      timestamp: new Date().toISOString(),
    });
  }
};
