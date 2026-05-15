import InstagramAccount from "@/models/insta/InstagramAccount.model";
import { getUserTier } from "@/services/rate-limit.service";
import {
  sendInstaDMLimitEmailToUser,
  sendInstaFollowCheckLimitEmailToUser,
} from "@/services/sendEmail.service";

export const FREE_INSTA_DM_LIMIT = 1000;
export const FREE_INSTA_FOLLOW_CHECK_LIMIT = 50;

export async function getInstaQuotaStatus(clerkId: string, account: any) {
  const tier = await getUserTier(clerkId);
  const isFree = tier === "free";
  const dmSent = account.accountDMSent || 0;
  const followChecks = account.accountFollowCheck || 0;

  return {
    tier,
    isFree,
    dmSent,
    dmLimit: isFree ? FREE_INSTA_DM_LIMIT : null,
    dmRemaining: isFree ? Math.max(0, FREE_INSTA_DM_LIMIT - dmSent) : null,
    dmLimitReached: isFree && dmSent >= FREE_INSTA_DM_LIMIT,
    followChecks,
    followCheckLimit: isFree ? FREE_INSTA_FOLLOW_CHECK_LIMIT : null,
    followCheckRemaining: isFree
      ? Math.max(0, FREE_INSTA_FOLLOW_CHECK_LIMIT - followChecks)
      : null,
    followCheckLimitReached:
      isFree && followChecks >= FREE_INSTA_FOLLOW_CHECK_LIMIT,
  };
}

export async function canSendInstaDM(clerkId: string, account: any) {
  const quota = await getInstaQuotaStatus(clerkId, account);
  return !quota.dmLimitReached;
}

export async function recordInstaDMSent(account: any) {
  account.accountDMSent = (account.accountDMSent || 0) + 1;
  account.lastActivity = new Date();
  await account.save();
}

export async function recordInstaFollowCheck(account: any) {
  account.accountFollowCheck = (account.accountFollowCheck || 0) + 1;
  account.lastActivity = new Date();
  await account.save();

  try {
    const quota = await getInstaQuotaStatus(account.userId, account);
    if (quota.followCheckLimitReached) {
      await sendInstaFollowCheckLimitEmailToUser({
        userId: account.userId,
        accountUsername: account.username,
        limit: FREE_INSTA_FOLLOW_CHECK_LIMIT,
      });
    }
  } catch (error) {
    console.error("Failed to send follow-check limit email:", error);
  }
}

export async function stopInstaAutomationForDMLimit(account: any) {
  account.autoDMEnabled = false;
  account.lastActivity = new Date();
  await account.save();

  await InstagramAccount.updateOne(
    { _id: account._id },
    { $set: { autoDMEnabled: false, lastActivity: new Date() } },
  );

  try {
    await sendInstaDMLimitEmailToUser({
      userId: account.userId,
      accountUsername: account.username,
      limit: FREE_INSTA_DM_LIMIT,
    });
  } catch (error) {
    console.error("Failed to send Instagram DM limit email:", error);
  }
}

export function dmLimitMessage() {
  return "Free DM send limit reached. Global automation stopped. Upgrade to Pro to continue.";
}

export function followCheckLimitMessage() {
  return "Free follow-check limit reached. Skipping follow check and continuing to the next step.";
}
