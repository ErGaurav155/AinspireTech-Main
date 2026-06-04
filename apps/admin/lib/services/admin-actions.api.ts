/* ==================== ADMIN API ==================== */

import { ApiRequestFn } from "../useApi";

export const getWebSubscriptions = (apiRequest: ApiRequestFn): Promise<any> => {
  return apiRequest("/admin/web-subscriptions", {
    method: "GET",
  });
};

export const getInstaSubscriptions = (
  apiRequest: ApiRequestFn,
): Promise<any> => {
  return apiRequest("/admin/insta-subscriptions", {
    method: "GET",
  });
};

export const getUsers = (apiRequest: ApiRequestFn): Promise<any> => {
  return apiRequest("/admin/users", {
    method: "GET",
  });
};

export const getAppointments = (apiRequest: ApiRequestFn): Promise<any> => {
  return apiRequest("/admin/appointments", {
    method: "GET",
  });
};

export const verifyOwner = (apiRequest: ApiRequestFn): Promise<any> => {
  return apiRequest("/admin/verify-owner", {
    method: "GET",
  });
};
// Get all Instagram accounts
export async function getInstaAccounts(apiRequest: ApiRequestFn) {
  return apiRequest("/admin/insta-accounts", {
    method: "GET",
  });
}
// Get all chatbots (admin only)
export async function getAllChatbots(apiRequest: ApiRequestFn) {
  return apiRequest("/admin/web-chatbots", {
    method: "GET",
  });
}

/* ==================== WINDOW STATS ==================== */

export const getWindowStats = (apiRequest: ApiRequestFn) => {
  return apiRequest(`/admin/window-stats`, {
    method: "GET",
  });
};

/* ==================== APP RATE LIMIT STATS ==================== */

export const getAppRateLimitStats = (apiRequest: ApiRequestFn) => {
  return apiRequest(`/admin/app-limit`, {
    method: "GET",
  });
};

/* ==================== USER RATE LIMIT STATS ==================== */

export const getUserRateLimitStats = (apiRequest: ApiRequestFn) => {
  return apiRequest(`/admin/user-stats`, {
    method: "GET",
  });
};

/* =========================
   PAYOUT METHODS  [NEW]
========================= */

export type PayoutStatus = "processing" | "completed" | "failed";

export interface AdminAffiliateSummary {
  _id?: string;
  userId?: string;
  affiliateCode?: string;
  totalEarnings?: number;
  generatedEarnings?: number;
  pendingEarnings?: number;
  paidEarnings?: number;
  user?: {
    _id?: string;
    clerkId?: string;
    email?: string;
    firstName?: string;
    lastName?: string;
    username?: string;
  };
}

export interface PayoutRecord {
  _id: string;
  amount: number;
  period: string;
  status: PayoutStatus;
  paymentMethod: "bank" | "upi" | "paypal";
  paymentDetails: {
    accountName?: string;
    accountNumber?: string;
    bankName?: string;
    ifscCode?: string;
    upiId?: string;
    paypalEmail?: string;
  };
  notes?: string;
  transactionId?: string;
  completedAt?: string;
  createdAt: string;
  updatedAt: string;
  affiliateId: string | AdminAffiliateSummary;
}

export const getPayouts = (
  apiRequest: ApiRequestFn,
  status: PayoutStatus | "all" = "all",
) => {
  const query = status === "all" ? "" : `?status=${status}`;
  return apiRequest<{ payouts: PayoutRecord[] }>(`/admin/payouts${query}`, {
    method: "GET",
  });
};

export const updatePayoutStatus = (
  apiRequest: ApiRequestFn,
  payoutId: string,
  transactionId?: string,
  notes?: string,
) =>
  apiRequest<{
    message: string;
    payout: PayoutRecord;
    commissionsUpdated: number;
  }>(`/admin/payouts/${payoutId}`, {
    method: "POST",
    body: JSON.stringify({ transactionId, notes }),
  });
