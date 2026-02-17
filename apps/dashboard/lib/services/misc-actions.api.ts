import { ApiRequestFn } from "../useApi";

/* =========================
   MISC ACTIONS
========================= */

export const getRazerpayPlanInfo = (
  apiRequest: ApiRequestFn,
  productId: string,
) =>
  apiRequest(`/misc/razerpay-plan/${productId}`, {
    method: "GET",
  });

export const sendSubscriptionEmailToOwner = (
  apiRequest: ApiRequestFn,
  data: {
    email: string;
    userId: string;
    subscriptionId: string;
  },
): Promise<{ message: string }> =>
  apiRequest("/misc/send-subscription-email-owner", {
    method: "POST",
    body: JSON.stringify(data),
  });

export const sendSubscriptionEmailToUser = (
  apiRequest: ApiRequestFn,
  data: {
    email: string;
    userId: string;
    agentId: string;
    subscriptionId: string;
  },
): Promise<{ message: string }> =>
  apiRequest("/misc/send-subscription-email-user", {
    method: "POST",
    body: JSON.stringify(data),
  });

export const sendAppointmentEmailToUser = (
  apiRequest: ApiRequestFn,
  data: {
    email: string;
    data: Array<{ answer: string }>;
  },
): Promise<{ message: string }> =>
  apiRequest("/misc/send-appointment-email", {
    method: "POST",
    body: JSON.stringify(data),
  });

export const sendWhatsAppInfo = (
  apiRequest: ApiRequestFn,
  data: {
    data: Array<{ answer: string }>;
    userId?: string;
  },
): Promise<{ message: string; sid: string; to: string }> =>
  apiRequest("/misc/send-whatsapp-info", {
    method: "POST",
    body: JSON.stringify(data),
  });

/* =========================
   HELPER FUNCTIONS
========================= */

export const sendNewSubscriptionNotification = async (
  apiRequest: ApiRequestFn,
  ownerEmail: string,
  userEmail: string,
  userDbId: string,
  agentId: string,
  subscriptionId: string,
  userId: string,
): Promise<void> => {
  try {
    await sendSubscriptionEmailToOwner(apiRequest, {
      email: ownerEmail,
      userId,
      subscriptionId,
    });

    await sendSubscriptionEmailToUser(apiRequest, {
      email: userEmail,
      userId,
      agentId,
      subscriptionId,
    });
  } catch (error) {
    console.error("Error sending subscription notifications:", error);
    throw error;
  }
};

export const sendAppointmentNotification = async (
  apiRequest: ApiRequestFn,
  ownerEmail: string,
  appointmentData: Array<{ answer: string }>,
  userId?: string,
): Promise<void> => {
  try {
    await sendAppointmentEmailToUser(apiRequest, {
      email: ownerEmail,
      data: appointmentData,
    });

    if (userId) {
      await sendWhatsAppInfo(apiRequest, {
        data: appointmentData,
        userId,
      });
    }
  } catch (error) {
    console.error("Error sending appointment notifications:", error);
    throw error;
  }
};
