import { ApiRequestFn } from "../useApi";

export type AffiliatePaymentMethod = "bank" | "upi" | "paypal";

export interface AffiliatePaymentDetails {
  method: AffiliatePaymentMethod;
  accountName?: string;
  accountNumber?: string;
  bankName?: string;
  ifscCode?: string;
  upiId?: string;
  paypalEmail?: string;
}

export interface AffiliateRecord {
  _id: string;
  userId: string;
  affiliateCode: string;
  status: "active" | "suspended";
  paymentDetails?: AffiliatePaymentDetails | null;
  commissionRate: number;
  monthlyMonths: number;
  yearlyYears: number;
  totalEarnings: number;
  pendingEarnings: number;
  paidEarnings: number;
  totalReferrals: number;
  activeReferrals: number;
  lastPayoutDate?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AffiliateReferralRecord {
  _id: string;
  affiliateId: string;
  referredUserId:
    | string
    | {
        _id?: string;
        email?: string;
        firstName?: string;
        lastName?: string;
        name?: string;
      };
  productType: "web-chatbot" | "insta-automation";
  subscriptionId: string;
  subscriptionModel: "WebSubscription" | "InstaSubscription";
  subscriptionType: "monthly" | "yearly";
  chatbotType?: string;
  instaPlan?: string;
  subscriptionPrice: number;
  commissionRate: number;
  monthlyCommission?: number;
  yearlyCommission?: number;
  totalCommissionEarned: number;
  monthsRemaining: number;
  yearsRemaining: number;
  status: "active" | "paused" | "completed" | "cancelled";
  lastCommissionDate?: string;
  nextCommissionDate?: string;
  completionDate?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AffiliatePayoutHistoryRecord {
  _id: string;
  affiliateId: string;
  amount: number;
  period: string;
  status: "processing" | "completed" | "failed";
  paymentMethod: AffiliatePaymentMethod;
  paymentDetails?: Record<string, unknown>;
  transactionId?: string;
  notes?: string;
  completedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AffiliateDashboardStats {
  totalReferrals: number;
  activeReferrals: number;
  totalEarnings: number;
  pendingEarnings: number;
  paidEarnings: number;
  monthlyEarnings: number;
  webChatbotReferrals: number;
  instaReferrals: number;
}

export interface AffiliateDashboardData {
  isAffiliate: boolean;
  affiliate?: AffiliateRecord;
  stats?: AffiliateDashboardStats;
  referrals?: AffiliateReferralRecord[];
  monthlyCommissions?: Array<Record<string, unknown>>;
  payoutHistory?: AffiliatePayoutHistoryRecord[];
  affiliateLink?: string;
}

/* ==================== AFFILIATE DASHBOARD ==================== */

export const getAffiliateDashInfo = (
  apiRequest: ApiRequestFn,
): Promise<AffiliateDashboardData> => {
  return apiRequest("/affiliates/dashboard", {
    method: "GET",
  });
};

export const saveAffiPaymentDetails = (
  apiRequest: ApiRequestFn,
  data: {
    paymentMethod: AffiliatePaymentMethod;
    accountName?: string;
    accountNumber?: string;
    bankName?: string;
    ifscCode?: string;
    upiId?: string;
    paypalEmail?: string;
  },
): Promise<{ message: string; paymentDetails: AffiliatePaymentDetails }> => {
  return apiRequest("/affiliates/payment-details", {
    method: "PUT",
    body: JSON.stringify(data),
  });
};

export const getAffiPaymentDetails = (
  apiRequest: ApiRequestFn,
): Promise<{ paymentDetails: AffiliatePaymentDetails }> => {
  return apiRequest("/affiliates/payment-details", {
    method: "GET",
  });
};

export const requestPayout = (
  apiRequest: ApiRequestFn,
  payoutAmount: number,
): Promise<{
  message: string;
  payout: {
    id: string;
    amount: number;
    status: "processing";
    period: string;
  };
}> => {
  return apiRequest("/affiliates/request-payout", {
    method: "POST",
    body: JSON.stringify({
      amount: payoutAmount,
    }),
  });
};
/* ==================== CREATE AFFILIATE LINK ==================== */

export const createAffiliateLink = (
  apiRequest: ApiRequestFn,
  data: any,
): Promise<any> => {
  return apiRequest("/affiliates/create", {
    method: "POST",
    body: JSON.stringify(data),
  });
};
