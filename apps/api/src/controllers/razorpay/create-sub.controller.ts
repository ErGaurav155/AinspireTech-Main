import { getRazorpay } from "@/utils/util";
import { Request, Response } from "express";

// POST /api/razorpay/subscription/create - Create Razorpay subscription
export const createRazorpaySubscriptionController = async (
  req: Request,
  res: Response,
) => {
  try {
    const { razorpayplanId, buyerId, amount, referralCode, metadata } =
      req.body;

    // Validate required fields
    if (!buyerId || !razorpayplanId || !amount || !metadata) {
      return res.status(400).json({
        success: false,
        error:
          "Missing required fields: buyerId, productId, razorpayplanId,subscriptionType and amount are required",
        timestamp: new Date().toISOString(),
      });
    }
    const { subscriptionType, productId, billingCycle } = metadata;
    if (!subscriptionType || !productId || !billingCycle) {
      return res.status(400).json({
        success: false,
        error: "Invalid subscription type in metadata",
        timestamp: new Date().toISOString(),
      });
    }
    // Validate amount
    if (typeof amount !== "number" || amount <= 0) {
      return res.status(400).json({
        success: false,
        error: "Amount must be a positive number",
        timestamp: new Date().toISOString(),
      });
    }
    const razorpay = getRazorpay();

    // Create Razorpay subscription
    let subscription;
    try {
      subscription = await razorpay.subscriptions.create({
        plan_id: razorpayplanId,
        total_count: 12, // 12 months subscription
        customer_notify: 1 as 0 | 1,
        notes: {
          subscriptionType: subscriptionType,
          buyerId: buyerId,
          productId: productId,
          amount: amount.toString(),
          referralCode: referralCode || "",
          billingCycle,
        },
      });
    } catch (razorpayError: any) {
      console.error("Razorpay API error:", razorpayError);
      return res.status(400).json({
        success: false,
        error: `Razorpay error: ${razorpayError.error?.description || razorpayError.message}`,
        timestamp: new Date().toISOString(),
      });
    }

    if (!subscription) {
      return res.status(500).json({
        success: false,
        error: "Subscription creation failed - no response from Razorpay",
        timestamp: new Date().toISOString(),
      });
    }

    const subscriptionId = subscription.id;

    return res.status(201).json({
      success: true,
      data: {
        subscriptionId: subscriptionId,
        message: "Subscription created successfully",
        razorpayResponse: {
          id: subscription.id,
          status: subscription.status,
          current_start: subscription.current_start,
          current_end: subscription.current_end,
          created_at: subscription.created_at,
        },
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error("Error creating Razorpay subscription:", error);
    return res.status(500).json({
      success: false,
      error: error.message || "Failed to create subscription",
      timestamp: new Date().toISOString(),
    });
  }
};
