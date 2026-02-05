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
): Promise<boolean> {
  try {
    const response = await fetch(
      `https://graph.instagram.com/v23.0/${accountId}/messages`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          recipient: { id: recipientId },
          message,
        }),
      },
    );

    return response.ok;
  } catch (error) {
    console.error("Failed to send Instagram DM:", error);
    return false;
  }
}

export async function checkFollowStatus(
  accountId: string,
  accessToken: string,
  userId: string,
): Promise<{
  is_user_follow_business?: boolean;
  error?: string;
}> {
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

    if (!response.ok) {
      const error = await response.json();
      return { error: JSON.stringify(error) };
    }

    return await response.json();
  } catch (error) {
    console.error("Failed to check follow relationship:", error);
    return { error: error instanceof Error ? error.message : "Unknown error" };
  }
}
