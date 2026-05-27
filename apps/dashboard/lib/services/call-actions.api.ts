import { ApiRequestFn } from "../useApi";

export const getCallDashboard = (apiRequest: ApiRequestFn) =>
  apiRequest("/call/dashboard", { method: "GET" });

export const getCallPlans = (apiRequest: ApiRequestFn) =>
  apiRequest("/call/plans", { method: "GET" });

export const getCallSubscriptions = (apiRequest: ApiRequestFn) =>
  apiRequest("/call/subscription/list", { method: "GET" });

export const getCallCollection = (apiRequest: ApiRequestFn, collection: string) =>
  apiRequest(`/call/${collection}`, { method: "GET" });

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
