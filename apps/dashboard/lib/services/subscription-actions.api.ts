// api/webhooks.ts

import { ApiRequestFn } from "../useApi";

export const getRazerpayPlanInfo = (
  apiRequest: ApiRequestFn,
  productId: string,
): Promise<any> => {
  return apiRequest(`/razorpay/plan/${productId}`, {
    method: "GET",
  });
};
// Razorpay Subscription

export const createRazorpaySubscription = (
  apiRequest: ApiRequestFn,
  data: {
    amount: number;
    razorpayplanId: string;
    buyerId: string;
    metadata: {
      productId: string;
      subscriptionType:
        | "web"
        | "insta"
        | "whatsapp"
        | "call"
        | "package"
        | "meta-ads"
        | "website-maintenance"
        | "content-creation";
      billingCycle: "monthly" | "yearly" | "one-time";
      email?: string;
      packageId?: string;
      packageName?: string;
      includedServices?: string;
      offerId?: string;
      planLimit?: number;
      accountLimit?: number;
      minutesLimit?: number;
      numberLimit?: number;
      concurrentCallLimit?: number;
      agentLimit?: number;
      overageRate?: number;
      chatbotId?: string | null;
      chatbotName?: string;
      websiteUrl?: string;
    };
  },
): Promise<any> => {
  return apiRequest("/razorpay/subscription/create", {
    method: "POST",
    body: JSON.stringify(data),
  });
};

// Razorpay Verification

export const verifyRazorpayPayment = (
  apiRequest: ApiRequestFn,
  data: any,
): Promise<any> => {
  return apiRequest("/razorpay/subscription/verify", {
    method: "POST",
    body: JSON.stringify(data),
  });
};

export const changeRazorpaySubscription = (
  apiRequest: ApiRequestFn,
  data: {
    subscriptionId: string;
    subscriptionKind:
      | "web"
      | "insta"
      | "whatsapp"
      | "call"
      | "package"
      | "meta-ads"
      | "website-maintenance"
      | "content-creation";
    targetProductId: string;
    targetBillingCycle: "monthly" | "yearly";
    scheduleChangeAt: "now" | "cycle_end";
    metadata?: Record<string, unknown>;
  },
): Promise<{
  subscriptionId: string;
  status: "pending_provider_confirmation";
  scheduleChangeAt: "now" | "cycle_end";
  effectiveAt: string;
}> =>
  apiRequest("/razorpay/subscription/change", {
    method: "POST",
    body: JSON.stringify(data),
  });
