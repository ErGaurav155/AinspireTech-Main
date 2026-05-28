import { ApiRequestFn } from "../useApi";

export const getCallDashboard = (apiRequest: ApiRequestFn) =>
  apiRequest("/call/dashboard", { method: "GET" });

export const getCallPlans = (apiRequest: ApiRequestFn) =>
  apiRequest("/call/plans", { method: "GET" });

export const getCallSubscriptions = (apiRequest: ApiRequestFn) =>
  apiRequest("/call/subscription/list", { method: "GET" });

export const createCallAssistant = (
  apiRequest: ApiRequestFn,
  payload: Record<string, any>,
) =>
  apiRequest("/call/assistant", {
    method: "POST",
    body: JSON.stringify(payload),
  });

export const getCallExotelConfig = (apiRequest: ApiRequestFn) =>
  apiRequest("/call/exotel/config", { method: "GET" });

export const sendCallSms = (
  apiRequest: ApiRequestFn,
  payload: { to: string; body: string },
) =>
  apiRequest("/call/exotel/sms", {
    method: "POST",
    body: JSON.stringify(payload),
  });

export const connectCall = (
  apiRequest: ApiRequestFn,
  payload: { from: string; to: string; callerId?: string; url?: string },
) =>
  apiRequest("/call/exotel/connect-call", {
    method: "POST",
    body: JSON.stringify(payload),
  });

export const getCallCollection = (
  apiRequest: ApiRequestFn,
  collection: string,
) => apiRequest(`/call/${collection}`, { method: "GET" });

export const createCallItem = (
  apiRequest: ApiRequestFn,
  collection: string,
  payload: Record<string, any>,
) =>
  apiRequest(`/call/${collection}`, {
    method: "POST",
    body: JSON.stringify(payload),
  });

export const updateCallWorkspace = (
  apiRequest: ApiRequestFn,
  payload: Record<string, any>,
) =>
  apiRequest("/call/workspace", {
    method: "PUT",
    body: JSON.stringify(payload),
  });
