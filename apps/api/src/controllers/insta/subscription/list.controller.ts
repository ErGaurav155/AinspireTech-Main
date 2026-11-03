import { Request, Response } from "express";
import { listInstaSubscriptions } from "@/services/subscription.service";
import { getPendingIndividualSubscriptionChange } from "@/services/billing/individual-subscription-change.service";
import { getAuth } from "@clerk/express";

// GET /api/insta/subscription/list - List Instagram subscriptions
export const listInstaSubscriptionsController = async (
  req: Request,
  res: Response,
) => {
  try {
    // Get clerkId from auth headers or JWT token
    const { userId } = getAuth(req);
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: "Unauthorized - User ID required",
        timestamp: new Date().toISOString(),
      });
    }

    const subscription = await listInstaSubscriptions(userId);
    const pendingChange = subscription?.subscriptionId
      ? await getPendingIndividualSubscriptionChange(
          userId,
          subscription.subscriptionId,
          "insta",
        )
      : null;
    return res.status(200).json({
      success: true,
      data: {
        subscriptions: subscription
          ? [
              {
                ...(typeof (subscription as any).toObject === "function"
                  ? (subscription as any).toObject()
                  : subscription),
                pendingChange: pendingChange
                  ? {
                      id: String(pendingChange._id),
                      targetProductId: pendingChange.targetProductId,
                      targetBillingCycle: pendingChange.targetBillingCycle,
                      scheduleChangeAt: pendingChange.scheduleChangeAt,
                      effectiveAt: pendingChange.effectiveAt,
                      requiresCheckout: Boolean(pendingChange.replacementSubscriptionId),
                    }
                  : null,
              },
            ]
          : [],
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error("Error fetching subscriptions:", error.message);
    return res.status(500).json({
      success: false,
      error: error.message || "Failed to fetch subscriptions",
      timestamp: new Date().toISOString(),
    });
  }
};
