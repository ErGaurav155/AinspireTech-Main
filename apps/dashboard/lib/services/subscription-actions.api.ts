// api/webhooks.ts

import { apiRequest } from "../utils";

export const getRazerpayPlanInfo = async (productId: string): Promise<any> => {
  return apiRequest(`/razorpay/plan/${productId}`, {
    method: "GET",
  });
};
// Razorpay Subscription
export const createRazorpaySubscription = async (data: {
  amount: number;
  razorpayplanId: string;
  buyerId: string;
  referralCode: string | null;
  metadata: {
    productId: string;
    subscriptionType: "web" | "insta";
    billingCycle: "monthly" | "yearly" | "one-time";
  };
}): Promise<any> => {
  return apiRequest("/razorpay/subscription/create", {
    method: "POST",
    body: JSON.stringify(data),
  });
};

// Razorpay Verification
export const verifyRazorpayPayment = async (data: any): Promise<any> => {
  return apiRequest("/razorpay/subscription/verify", {
    method: "POST",
    body: JSON.stringify(data),
  });
};
