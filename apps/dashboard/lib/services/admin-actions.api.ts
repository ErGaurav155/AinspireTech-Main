import { apiRequest } from "../utils";

// Admin API Functions
export const getWebSubscriptions = async (): Promise<any> => {
  return await apiRequest("/admin/web-subscriptions", {
    method: "GET",
  });
};

export const getInstaSubscriptions = async (): Promise<any> => {
  return await apiRequest("/admin/insta-subscriptions", {
    method: "GET",
  });
};

export const getUsers = async (): Promise<any> => {
  return await apiRequest("/admin/users", {
    method: "GET",
  });
};

export const getAppointments = async (): Promise<any> => {
  return await apiRequest("/admin/appointments", {
    method: "GET",
  });
};
export const verifyOwner = async (): Promise<any> => {
  return await apiRequest("/admin/verify-owner", {
    method: "GET",
  });
};
