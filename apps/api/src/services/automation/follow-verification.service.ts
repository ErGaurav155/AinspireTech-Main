import { connectToDatabase } from "@/config/database.config";
import InstagramAccount from "@/models/insta/InstagramAccount.model";
import InstaReplyLog from "@/models/insta/ReplyLog.model";

/**
 * Check follow status - Fire and Forget
 * This is an automation helper function, NOT an incoming webhook
 * No rate limiting needed - just check and return result
 */
export async function checkMainFollowStatus(
  accountId: string,
  recipientId: string,
  templateId?: string,
): Promise<{
  success: boolean;
  follows: boolean;
  message: string;
  error?: string;
}> {
  try {
    await connectToDatabase();

    const account = await InstagramAccount.findOne({ instagramId: accountId });
    if (!account) {
      return {
        success: false,
        follows: false,
        message: "Account not found",
        error: "Account not found",
      };
    }

    // NO rate limit check - fire and forget
    // This is part of automation flow, not an incoming webhook

    // Make API call to check follow status
    const response = await fetch(
      `https://graph.instagram.com/v23.0/${recipientId}?fields=is_user_follow_business&access_token=${account.accessToken}`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      },
    );

    if (!response.ok) {
      const error = await response.json();

      // Log the error but don't fail hard
      console.error("Follow check API error:", error);

      return {
        success: false,
        follows: false,
        message: `API error: ${JSON.stringify(error)}`,
        error: JSON.stringify(error),
      };
    }

    const data = await response.json();
    const follows = data.is_user_follow_business === true;

    // Update account statistics
    account.accountFollowCheck = (account.accountFollowCheck || 0) + 1;
    account.lastActivity = new Date();
    await account.save();

    // Update log if templateId provided
    if (templateId) {
      await InstaReplyLog.updateOne(
        { templateId, commenterUserId: recipientId },
        {
          $set: {
            followChecked: true,
            userFollows: follows,
          },
        },
      );
    }

    return {
      success: true,
      follows,
      message: follows
        ? "User follows the account"
        : "User does not follow the account",
    };
  } catch (error) {
    console.error("Error checking follow status:", error);

    return {
      success: false,
      follows: false,
      message:
        error instanceof Error
          ? error.message
          : "Failed to check follow status",
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
