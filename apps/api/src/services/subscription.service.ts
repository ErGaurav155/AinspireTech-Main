import { connectToDatabase } from "@/config/database.config";
import InstaSubscription from "@/models/insta/InstaSubscription.model";
import WebSubscription from "@/models/web/Websubcription.model";
import { getRazorpay } from "@/utils/util";

// Get Instagram subscription info
export const getInstaSubscriptionInfo = async (userId: string) => {
  try {
    await connectToDatabase();

    const subscriptions = await InstaSubscription.find({
      clerkId: userId,
      chatbotType: "Insta-Automation-Pro",
      status: "active",
    });

    if (!subscriptions || subscriptions.length === 0) {
      return [];
    }

    return subscriptions;
  } catch (error: any) {
    console.error("Error retrieving subscription info:", error.message);
    throw new Error("Failed to retrieve subscription info.");
  }
};

// Cancel RazorPay subscription
export async function cancelRazorPaySubscription(
  subscriptionId: string,
  reason: string,
  mode: string,
) {
  try {
    const razorpay = getRazorpay();

    let response;
    if (mode === "Immediate") {
      response = await razorpay.subscriptions.cancel(subscriptionId, false);
    } else {
      response = await razorpay.subscriptions.cancel(subscriptionId, true);
    }

    if (!response) {
      throw new Error("Failed to cancel subscription");
    }

    return {
      success: true,
      message: "Subscription cancelled successfully",
      razorpayResponse: response,
    };
  } catch (error: any) {
    console.error("RazorPay cancellation error:", error);

    if (error.error?.code === "BAD_REQUEST_ERROR") {
      throw new Error(error.error.description || "Invalid subscription ID");
    } else if (error.error?.code === "NOT_FOUND_ERROR") {
      throw new Error("Subscription not found");
    }

    throw new Error(error.message || "An unknown error occurred");
  }
}

// List all Instagram subscriptions for a user
export const listInstaSubscriptions = async (userId: string) => {
  try {
    await connectToDatabase();

    const subscriptions = await InstaSubscription.find({
      clerkId: userId,
      chatbotType: "Insta-Automation-Pro",
      status: "active",
    }).sort({ createdAt: -1 });
    return subscriptions;
  } catch (error: any) {
    console.error("Error listing subscriptions:", error.message);
    throw new Error("Failed to fetch subscriptions");
  }
};

// Update subscription status in database
export const updateSubscriptionStatus = async (
  subscriptionId: string,
  status: string,
  updates: any = {},
) => {
  try {
    await connectToDatabase();

    const updatedSubscription = await InstaSubscription.findOneAndUpdate(
      { subscriptionId },
      {
        status,
        ...updates,
        updatedAt: new Date(),
      },
      { new: true },
    );

    if (!updatedSubscription) {
      throw new Error("Subscription not found in database");
    }

    return updatedSubscription;
  } catch (error: any) {
    console.error("Error updating subscription status:", error.message);
    throw new Error("Failed to update subscription status");
  }
};

// Get subscription by ID
export const getSubscriptionById = async (
  subscriptionId: string,
  subcriptionType: "insta" | "web",
) => {
  try {
    await connectToDatabase();

    if (subcriptionType) {
      const SubscriptionModel =
        subcriptionType === "insta" ? InstaSubscription : WebSubscription;
      const subscription = await SubscriptionModel.findOne({
        subscriptionId,
        status: "active",
      });

      if (!subscription) {
        throw new Error(`Active ${subcriptionType} subscription not found`);
      }

      return subscription;
    }
  } catch (error: any) {
    console.error("Error fetching subscription:", error.message);
    throw new Error("Failed to fetch subscription");
  }
};
