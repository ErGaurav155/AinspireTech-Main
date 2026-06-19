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
    referralCode: string | null;
    metadata: {
      productId: string;
      subscriptionType:
        | "web"
        | "insta"
        | "whatsapp"
        | "call"
        | "package"
        | "meta-ads"
        | "website-maintenance";
      billingCycle: "monthly" | "yearly" | "one-time";
      previousSubscriptionId?: string;
      previousSubscriptionType?: "web" | "insta" | "whatsapp" | "call" | "package";
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
      referralCode?: string;
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
