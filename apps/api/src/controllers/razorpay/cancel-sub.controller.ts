import {
  cancelRazorPaySubscription,
  getSubscriptionById,
} from "@/services/subscription.service";
import { getAuth } from "@clerk/express";
import { Request, Response } from "express";

// POST /api/razorpay/subscription/cancel - Cancel Instagram subscription
export const cancelInstaSubscriptionController = async (
  req: Request,
  res: Response,
) => {
  try {
    const { subscriptionId, reason, mode, subcriptionType } = req.body;
    const { userId: clerkId } = getAuth(req);
    if (!subscriptionId || !mode || !subcriptionType) {
      return res.status(400).json({
        success: false,
        error: "Missing required fields: subscriptionId and mode",
        timestamp: new Date().toISOString(),
      });
    }

    // Get user ID from auth

    if (!clerkId) {
      return res.status(401).json({
        success: false,
        error: "Unauthorized - User ID required",
        timestamp: new Date().toISOString(),
      });
    }

    // Verify user owns this subscription
    const subscription = await getSubscriptionById(
      subscriptionId,
      subcriptionType,
    );

    if (!subscription || subscription.clerkId !== clerkId) {
      return res.status(403).json({
        success: false,
        error: "You are not authorized to cancel this subscription",
        timestamp: new Date().toISOString(),
      });
    }

    // Cancel with RazorPay
    await cancelRazorPaySubscription(
      subscriptionId,
      reason || "Not Interested",
      mode,
    );

    return res.status(200).json({
      success: true,
      data: {
        subscriptionId,
        mode,
        cancelledAt: new Date(),
        message: "Instagram subscription cancelled successfully",
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error("Instagram subscription cancellation error:", error);

    // Handle specific error cases
    let statusCode = 500;
    let errorMessage =
      error.message || "Failed to cancel Instagram subscription";

    if (
      error.message.includes("Invalid subscription") ||
      error.message.includes("BAD_REQUEST")
    ) {
      statusCode = 400;
    } else if (error.message.includes("Subscription not found")) {
      statusCode = 404;
    } else if (error.message.includes("not authorized")) {
      statusCode = 403;
    }

    return res.status(statusCode).json({
      success: false,
      error: errorMessage,
      timestamp: new Date().toISOString(),
    });
  }
};
