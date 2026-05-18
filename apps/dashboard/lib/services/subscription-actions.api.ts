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
      subscriptionType: "web" | "insta";
      billingCycle: "monthly" | "yearly" | "one-time";
      previousSubscriptionId?: string;
      previousSubscriptionType?: "web" | "insta";
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

export const createTestRazorpaySubscription = (
  apiRequest: ApiRequestFn,
): Promise<{ subscriptionId: string; planId: string }> => {
  return apiRequest("/razorpay/test-subscription/create", {
    method: "POST",
  });
};

export const verifyTestRazorpaySubscription = (
  apiRequest: ApiRequestFn,
  data: {
    subscription_id: string;
    razorpay_payment_id?: string;
    razorpay_signature?: string;
  },
): Promise<{
  verified: boolean;
  subscriptionId?: string;
  paymentId?: string;
  message?: string;
}> => {
  return apiRequest("/razorpay/test-subscription/verify", {
    method: "POST",
    body: JSON.stringify(data),
  });
};
