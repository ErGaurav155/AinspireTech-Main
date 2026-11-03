import { Request, Response } from "express";
import { connectToDatabase } from "@/config/database.config";
import WebSubscription from "@/models/web/Websubcription.model";
import { getPendingIndividualSubscriptionChange } from "@/services/billing/individual-subscription-change.service";
import { getAuth } from "@clerk/express";

// GET /api/web/subscription/list - Get active subscriptions for user
export const listSubscriptionsController = async (
  req: Request,
  res: Response,
) => {
  try {
    const { userId } = getAuth(req);

    if (!userId) {
      return res.status(400).json({
        success: false,
        error: "User ID is required",
        timestamp: new Date().toISOString(),
      });
    }

    await connectToDatabase();

    const subscriptions = await WebSubscription.find({
      clerkId: userId,
      chatbotType: "chatbot-lead-generation",
      status: "active",
    }).sort({ createdAt: -1 });

    if (!subscriptions || subscriptions.length === 0) {
      return res.status(200).json({
        success: true,
        data: [],
        timestamp: new Date().toISOString(),
      });
    }

    const decoratedSubscriptions = await Promise.all(
      subscriptions.map(async (subscription) => {
        const pendingChange = subscription.subscriptionId
          ? await getPendingIndividualSubscriptionChange(
              userId,
              subscription.subscriptionId,
              "web",
            )
          : null;
        return {
          ...subscription.toObject(),
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
        };
      }),
    );
    return res.status(200).json({
      success: true,
      data: decoratedSubscriptions,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error("Error fetching subscriptions:", error.message);
    return res.status(500).json({
      success: false,
      error: "Failed to fetch subscription information",
      timestamp: new Date().toISOString(),
    });
  }
};
