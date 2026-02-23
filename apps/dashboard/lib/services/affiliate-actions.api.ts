import { ApiRequestFn } from "../useApi";

/* ==================== AFFILIATE DASHBOARD ==================== */

export const getAffiliateDashInfo = (
  apiRequest: ApiRequestFn,
): Promise<any> => {
  return apiRequest("/affiliates/dashboard", {
    method: "GET",
  });
};

export const saveAffiPaymentDetails = (
  apiRequest: ApiRequestFn,
  data: any,
): Promise<any> => {
  return apiRequest("/affiliates/payment-details", {
    method: "PUT",
    body: JSON.stringify(data),
  });
};

export const getAffiPaymentDetails = (
  apiRequest: ApiRequestFn,
): Promise<any> => {
  return apiRequest("/affiliates/payment-details", {
    method: "GET",
  });
};

export const requestPayout = (
  apiRequest: ApiRequestFn,
  payoutAmount: number,
): Promise<any> => {
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
