import { ApiRequestFn } from "../useApi";

export const getWhatsAppDashboard = (apiRequest: ApiRequestFn) =>
  apiRequest("/whatsapp/dashboard", { method: "GET" });

export const getWhatsAppPlans = (apiRequest: ApiRequestFn) =>
  apiRequest("/whatsapp/plans", { method: "GET" });

export const getWhatsAppFacebookConfig = (apiRequest: ApiRequestFn) =>
  apiRequest("/whatsapp/facebook/config", { method: "GET" });

export const connectWhatsAppFacebook = (
  apiRequest: ApiRequestFn,
  data: Record<string, any>,
) =>
  apiRequest("/whatsapp/facebook/connect", {
    method: "POST",
    body: JSON.stringify(data),
  });

export const updateWhatsAppWorkspace = (
  apiRequest: ApiRequestFn,
  payload: Record<string, any>,
) =>
  apiRequest("/whatsapp/workspace", {
    method: "PUT",
    body: JSON.stringify(payload),
  });

export const submitWhatsAppGreetingTemplate = (
  apiRequest: ApiRequestFn,
  payload: Record<string, any>,
) =>
  apiRequest("/whatsapp/greeting-template/submit", {
    method: "POST",
    body: JSON.stringify(payload),
  });

export const syncWhatsAppAppointmentFlow = (
  apiRequest: ApiRequestFn,
  payload: Record<string, any> = {},
) =>
  apiRequest("/whatsapp/appointment-flow/sync", {
    method: "POST",
    body: JSON.stringify(payload),
  });

export const publishWhatsAppAppointmentFlow = (apiRequest: ApiRequestFn) =>
  apiRequest("/whatsapp/appointment-flow/publish", {
    method: "POST",
  });

export const deleteWhatsAppWorkspace = (apiRequest: ApiRequestFn) =>
  apiRequest("/whatsapp/workspace", {
    method: "DELETE",
  });

export const sendWhatsAppTextMessage = (
  apiRequest: ApiRequestFn,
  payload: { to: string; body: string },
) =>
  apiRequest("/whatsapp/messages/text", {
    method: "POST",
    body: JSON.stringify(payload),
  });

export const getWhatsAppCollection = (
  apiRequest: ApiRequestFn,
  collection: string,
) => apiRequest(`/whatsapp/${collection}`, { method: "GET" });

export const createWhatsAppCollectionItem = (
  apiRequest: ApiRequestFn,
  collection: string,
  payload: Record<string, any>,
) =>
  apiRequest(`/whatsapp/${collection}`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
