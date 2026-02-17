import { ApiRequestFn } from "../useApi";

/* ==================== AFFILIATE DASHBOARD ==================== */

export const getAffiliateDashInfo = (
  apiRequest: ApiRequestFn,
): Promise<any> => {
  return apiRequest("/affiliates/dashboard", {
    method: "GET",
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
