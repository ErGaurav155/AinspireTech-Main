import { apiRequest } from "../utils";

// Misc Actions API Functions
export const getRazerpayPlanInfo = async (productId: string): Promise<any> => {
  return apiRequest(`/misc/razerpay-plan/${productId}`, {
    method: "GET",
  });
};

export const sendSubscriptionEmailToOwner = async (data: {
  email: string;
  userId: string;
  subscriptionId: string;
}): Promise<{ message: string }> => {
  return apiRequest("/misc/send-subscription-email-owner", {
    method: "POST",
    body: JSON.stringify(data),
  });
};

export const sendSubscriptionEmailToUser = async (data: {
  email: string;
  userId: string;
  agentId: string;
  subscriptionId: string;
}): Promise<{ message: string }> => {
  return apiRequest("/misc/send-subscription-email-user", {
    method: "POST",
    body: JSON.stringify(data),
  });
};

export const sendAppointmentEmailToUser = async (data: {
  email: string;
  data: Array<{ answer: string }>;
}): Promise<{ message: string }> => {
  return apiRequest("/misc/send-appointment-email", {
    method: "POST",
    body: JSON.stringify(data),
  });
};

export const sendWhatsAppInfo = async (data: {
  data: Array<{ answer: string }>;
  userId?: string;
}): Promise<{ message: string; sid: string; to: string }> => {
  return apiRequest("/misc/send-whatsapp-info", {
    method: "POST",
    body: JSON.stringify(data),
  });
};

// Helper functions
export const sendNewSubscriptionNotification = async (
  ownerEmail: string,
  userEmail: string,
  userDbId: string,
  agentId: string,
  subscriptionId: string,
  userId: string, // Added userId parameter
): Promise<void> => {
  try {
    // Send to owner
    await sendSubscriptionEmailToOwner({
      email: ownerEmail,
      userId,
      subscriptionId,
    });

    // Send to user
    await sendSubscriptionEmailToUser({
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
  ownerEmail: string,
  appointmentData: Array<{ answer: string }>,
  userId?: string,
): Promise<void> => {
  try {
    // Send email to owner
    await sendAppointmentEmailToUser({
      email: ownerEmail,
      data: appointmentData,
    });

    // Send WhatsApp if userId is provided
    if (userId) {
      await sendWhatsAppInfo({
        data: appointmentData,
        userId,
      });
    }
  } catch (error) {
    console.error("Error sending appointment notifications:", error);
    throw error;
  }
};
