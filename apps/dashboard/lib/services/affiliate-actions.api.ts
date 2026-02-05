import { apiRequest } from "../utils";

export const getAffiliateDashInfo = async (): Promise<any> => {
  return apiRequest("/affiliates/dashboard", {
    method: "GET",
  });
};

export const createAffiliateLink = async (data: any): Promise<any> => {
  return apiRequest("/affiliates/create", {
    method: "POST",
    body: JSON.stringify(data),
  });
};
