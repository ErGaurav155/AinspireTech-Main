import {
  cancelRazorPaySubscription,
  getSubscriptionById,
} from "@/services/subscription.service";
import { getAuth } from "@clerk/express";
import { Request, Response } from "express";
import { connectToDatabase } from "@/config/database.config";

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

    if (!clerkId) {
      return res.status(401).json({
        success: false,
        error: "Unauthorized",
        timestamp: new Date().toISOString(),
      });
    }

    await connectToDatabase();

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
        message: "Subscription cancelled successfully",
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error("Subscription cancellation error:", error);
    let statusCode = 500;
    let errorMessage = error.message || "Failed to cancel subscription";
    if (
      error.message.includes("Invalid subscription") ||
      error.message.includes("BAD_REQUEST")
    )
      statusCode = 400;
    else if (error.message.includes("Subscription not found")) statusCode = 404;
    else if (error.message.includes("not authorized")) statusCode = 403;
    return res.status(statusCode).json({
      success: false,
      error: errorMessage,
      timestamp: new Date().toISOString(),
    });
  }
};
