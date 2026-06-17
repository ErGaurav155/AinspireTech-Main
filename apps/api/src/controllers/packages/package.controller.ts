import { Request, Response } from "express";
import { getAuth } from "@clerk/express";
import PackageSubscription from "@/models/packages/PackageSubscription.model";
import MetaAdsSubscription from "@/models/packages/MetaAdsSubscription.model";
import {
  buildDashboardPackageStatus,
  cancelDashboardPackageLocally,
  cancelMetaAdsSubscriptionLocally,
} from "@/services/packages/package-subscription.service";
import { cancelRazorPaySubscription } from "@/services/subscription.service";

const unauthorized = (res: Response) =>
  res.status(401).json({
    success: false,
    error: "Unauthorized",
    timestamp: new Date().toISOString(),
  });

export const getDashboardPackageStatusController = async (
  req: Request,
  res: Response,
) => {
  try {
    const { userId } = getAuth(req);
    if (!userId) return unauthorized(res);

    const status = await buildDashboardPackageStatus(userId);
    return res.status(200).json({
      success: true,
      data: status,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error("Dashboard package status error:", error);
    return res.status(500).json({
      success: false,
      error: error.message || "Failed to load package status",
      timestamp: new Date().toISOString(),
    });
  }
};

export const cancelDashboardPackageSubscriptionController = async (
  req: Request,
  res: Response,
) => {
  try {
    const { userId } = getAuth(req);
    if (!userId) return unauthorized(res);

    const { subscriptionId, reason, mode } = req.body || {};
    if (!subscriptionId) {
      return res.status(400).json({
        success: false,
        error: "subscriptionId is required",
        timestamp: new Date().toISOString(),
      });
    }

    const packageSubscription = await PackageSubscription.findOne({
      clerkId: userId,
      subscriptionId,
      status: "active",
    });

    if (!packageSubscription) {
      return res.status(404).json({
        success: false,
        error: "Active package subscription not found",
        timestamp: new Date().toISOString(),
      });
    }

    try {
      await cancelRazorPaySubscription(
        subscriptionId,
        reason || "Cancelled dashboard package",
        mode || "Immediate",
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (!/invalid|not found|cancel|status/i.test(message)) {
        throw error;
      }
      console.warn("Package Razorpay subscription was already inactive:", {
        subscriptionId,
        message,
      });
    }

    await cancelDashboardPackageLocally({
      clerkId: userId,
      subscriptionId,
    });

    return res.status(200).json({
      success: true,
      data: {
        subscriptionId,
        cancelledAt: new Date(),
        message: "Package subscription cancelled successfully",
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error("Dashboard package cancellation error:", error);
    return res.status(500).json({
      success: false,
      error: error.message || "Failed to cancel package subscription",
      timestamp: new Date().toISOString(),
    });
  }
};

export const cancelMetaAdsSubscriptionController = async (
  req: Request,
  res: Response,
) => {
  try {
    const { userId } = getAuth(req);
    if (!userId) return unauthorized(res);

    const { subscriptionId, reason, mode } = req.body || {};
    if (!subscriptionId) {
      return res.status(400).json({
        success: false,
        error: "subscriptionId is required",
        timestamp: new Date().toISOString(),
      });
    }

    const metaAdsSubscription = await MetaAdsSubscription.findOne({
      clerkId: userId,
      subscriptionId,
      status: "active",
    });

    if (!metaAdsSubscription) {
      return res.status(404).json({
        success: false,
        error: "Active Meta Ads subscription not found",
        timestamp: new Date().toISOString(),
      });
    }

    try {
      await cancelRazorPaySubscription(
        subscriptionId,
        reason || "Cancelled Meta Ads subscription",
        mode || "Immediate",
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (!/invalid|not found|cancel|status/i.test(message)) {
        throw error;
      }
      console.warn("Meta Ads Razorpay subscription was already inactive:", {
        subscriptionId,
        message,
      });
    }

    await cancelMetaAdsSubscriptionLocally({
      clerkId: userId,
      subscriptionId,
    });

    return res.status(200).json({
      success: true,
      data: {
        subscriptionId,
        cancelledAt: new Date(),
        message: "Meta Ads subscription cancelled successfully",
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error("Meta Ads cancellation error:", error);
    return res.status(500).json({
      success: false,
      error: error.message || "Failed to cancel Meta Ads subscription",
      timestamp: new Date().toISOString(),
    });
  }
};
