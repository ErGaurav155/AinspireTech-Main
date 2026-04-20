export async function sendInstagramCommentReply(
  accountId: string,
  accessToken: string,
  commentId: string,
  mediaId: string,
  message: string,
): Promise<boolean> {
  try {
    const response = await fetch(
      `https://graph.instagram.com/v23.0/${commentId}/replies`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ message }),
      },
    );

    return response.ok;
  } catch (error) {
    console.error("Failed to send Instagram comment reply:", error);
    return false;
  }
}

export async function sendInstagramDM(
  accountId: string,
  accessToken: string,
  recipientId: string,
  message: any,
  isCommentReply: boolean = false,
  clerkId?: string,
  isWelcomeDM: boolean = false,
): Promise<boolean> {
  try {
    const appendWatermark = (originalMessage: any) => {
      const watermarkText = "ˢᵉⁿᵗ ʷⁱᵗʰ ᴿᵒᶜᵏᵉᵗᴿᵉᵖˡᵃⁱ";
      console.log("Appending watermark to message for free user:", {
        originalMessage,
        watermarkText,
      });
      if (originalMessage?.text) {
        return {
          ...originalMessage,
          text: `${originalMessage.text}\n\n${watermarkText}`,
        };
      }

      const templateText = originalMessage?.attachment?.payload?.text;
      if (
        originalMessage?.attachment?.type === "template" &&
        typeof templateText === "string"
      ) {
        return {
          ...originalMessage,
          attachment: {
            ...originalMessage.attachment,
            payload: {
              ...originalMessage.attachment.payload,
              text: `${templateText}\n\n${watermarkText}`,
            },
          },
        };
      }

      return originalMessage;
    };

    // Add watermark for free plan users ONLY on welcome messages (DMs or comment replies)
    let messageWithWatermark = message;
    if (isWelcomeDM && clerkId) {
      const { getUserTier } = await import("@/services/rate-limit.service.js");
      const userTier = await getUserTier(clerkId);
      if (userTier === "free") {
        messageWithWatermark = appendWatermark(message);
      }
    }

    const recipient = isCommentReply
      ? { comment_id: recipientId }
      : { id: recipientId };
    const response = await fetch(
      `https://graph.instagram.com/v23.0/${accountId}/messages`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ recipient, message: messageWithWatermark }),
      },
    );
    if (!response.ok) {
      const result = await response.json();
      console.error("Instagram DM Error:", {
        status: response.status,
        error: result,
        recipientId,
        isCommentReply,
      });
      return false;
    }
    return true;
  } catch (error) {
    console.error("Failed to send Instagram DM:", error);
    return false;
  }
}

type FollowStatusResponse = {
  is_user_follow_business?: boolean;
  error?: string;
};

export async function checkFollowStatus(
  accountId: string,
  accessToken: string,
  userId: string,
): Promise<FollowStatusResponse> {
  try {
    const response = await fetch(
      `https://graph.instagram.com/v23.0/${userId}?fields=is_user_follow_business&access_token=${accessToken}`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      },
    );

    const data = (await response.json()) as FollowStatusResponse;

    if (!response.ok) {
      return { error: JSON.stringify(data) };
    }

    return data;
  } catch (error) {
    console.error("Failed to check follow relationship:", error);
    return { error: error instanceof Error ? error.message : "Unknown error" };
  }
}
