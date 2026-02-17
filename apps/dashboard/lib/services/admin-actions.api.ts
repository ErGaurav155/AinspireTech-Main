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
