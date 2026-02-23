import { ApiRequestFn } from "../useApi";

/* ==================== ADMIN API ==================== */

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
