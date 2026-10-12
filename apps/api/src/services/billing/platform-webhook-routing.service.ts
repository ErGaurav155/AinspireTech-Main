import PlatformSubscription from "@/models/billing/PlatformSubscription.model";
import PurchasedAddon from "@/models/billing/PurchasedAddon.model";

const PLATFORM_TYPES = new Set(["plan", "addon"]);

export const hasPlatformBillingMarker = (subscriptionEntity: any) => {
  const notes = subscriptionEntity?.notes || {};
  return (
    PLATFORM_TYPES.has(String(notes.platformType || "").toLowerCase()) ||
    Boolean(notes.platformSubscriptionId) ||
    Boolean(notes.purchasedAddonId)
  );
};

/**
 * Razorpay normally preserves subscription notes on lifecycle events. The
 * database lookup is a fallback for retries or provider payloads that omit
 * those notes, so platform subscriptions can never fall into legacy billing.
 */
export const isManagedPlatformSubscription = async (
  subscriptionEntity: any,
) => {
  if (hasPlatformBillingMarker(subscriptionEntity)) return true;

  const subscriptionId = String(subscriptionEntity?.id || "").trim();
  if (!subscriptionId) return false;

  const [subscription, addon] = await Promise.all([
    PlatformSubscription.exists({
      provider: "razorpay",
      providerSubscriptionId: subscriptionId,
    }),
    PurchasedAddon.exists({
      provider: "razorpay",
      providerReference: subscriptionId,
    }),
  ]);

  return Boolean(subscription || addon);
};
