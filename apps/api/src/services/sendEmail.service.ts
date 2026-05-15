import { connectToDatabase } from "@/config/database.config";
import User from "@/models/user.model";
import { Twilio } from "twilio";
import { sendEmail } from "@/services/smtp-mailer.service";
import EmailNotificationLog from "@/models/EmailNotificationLog.model";

const DASHBOARD_URL = process.env.APP_URL || "https://app.rocketreplai.com";
const EMAIL_DEDUPE_DAYS = 28;

const escapeHtml = (value: string | number | undefined | null) =>
  String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");

async function shouldSendNotification({
  key,
  type,
  userId,
  dedupeDays = EMAIL_DEDUPE_DAYS,
}: {
  key: string;
  type: string;
  userId: string;
  dedupeDays?: number;
}) {
  await connectToDatabase();

  try {
    await EmailNotificationLog.create({
      key,
      type,
      userId,
      sentAt: new Date(),
      expiresAt: new Date(Date.now() + dedupeDays * 24 * 60 * 60 * 1000),
    });
    return true;
  } catch (error: any) {
    if (error?.code === 11000) return false;
    throw error;
  }
}

async function getUserEmail(clerkId: string) {
  await connectToDatabase();
  const user = await User.findOne({ clerkId }).select("email firstName username");
  return user?.email || "";
}

const baseEmail = ({
  title,
  body,
  actionText,
  actionUrl,
}: {
  title: string;
  body: string;
  actionText: string;
  actionUrl: string;
}) => `
  <div style="font-family: Arial, sans-serif; padding: 20px; color: #111827;">
    <h2 style="color:#EC4899; margin-bottom: 12px;">${title}</h2>
    <div style="font-size: 14px; line-height: 1.6; color:#374151;">${body}</div>
    <p style="margin-top: 22px;">
      <a href="${actionUrl}" style="display:inline-block; background:#EC4899; color:#ffffff; padding:12px 16px; border-radius:10px; text-decoration:none; font-weight:600;">
        ${actionText}
      </a>
    </p>
    <p style="font-size:12px; color:#6B7280; margin-top:18px;">
      If the button does not work, open this link: <br />
      <a href="${actionUrl}" style="color:#2563EB;">${actionUrl}</a>
    </p>
  </div>
`;

// ================= OWNER EMAIL =================
export const sendSubscriptionEmailToOwner = async ({
  email,
  userDbId,
  subscriptionId,
}: {
  email: string;
  userDbId: string;
  subscriptionId: string;
}) => {
  await sendEmail({
    to: email,
    subject: "New Subscription Alert",
    html: `
      <div style="font-family: Arial, sans-serif; padding: 20px;">
        <h2 style="color:#3B82F6;">🎉 New Subscription</h2>
        <p><strong>User ID:</strong> ${userDbId}</p>
        <p><strong>Subscription ID:</strong> ${subscriptionId}</p>
        <p><strong>Time:</strong> ${new Date().toLocaleString()}</p>
      </div>
    `,
  });
};

// ================= USER EMAIL =================
export const sendSubscriptionEmailToUser = async ({
  email,
  userDbId,
  agentId,
  subscriptionId,
}: {
  email: string;
  userDbId: string;
  agentId: string;
  subscriptionId: string;
}) => {
  await sendEmail({
    to: email,
    subject: "Subscription Confirmed",
    html: `
      <div style="font-family: Arial, sans-serif; padding: 20px;">
        <h2 style="color:#10B981;">✅ Subscription Confirmed</h2>
        <p><strong>Agent ID:</strong> ${agentId}</p>
        <p><strong>User ID:</strong> ${userDbId}</p>
        <p><strong>Subscription ID:</strong> ${subscriptionId}</p>
        <p>Please add the widget code from your dashboard to your website.</p>
      </div>
    `,
  });
};

// ================= APPOINTMENT EMAIL =================
interface QuestionAns {
  answer: string;
}

export const sendAppointmentEmailToUser = async ({
  email,
  data,
}: {
  email: string;
  data: QuestionAns[];
}) => {
  const name = data?.[0]?.answer || "Not provided";
  const userEmail = data?.[1]?.answer || "Not provided";
  const details = data?.[3]?.answer || "No details";

  await sendEmail({
    to: email,
    subject: "New Appointment Booked",
    html: `
      <div style="font-family: Arial, sans-serif; padding: 20px;">
        <h2 style="color:#8B5CF6;">📅 New Appointment</h2>
        <p><strong>Name:</strong> ${name}</p>
        <p><strong>Email:</strong> ${userEmail}</p>
        <p><strong>Details:</strong> ${details}</p>
        <p><strong>Time:</strong> ${new Date().toLocaleString()}</p>
      </div>
    `,
  });
};

export const sendInstaDMLimitEmailToUser = async ({
  userId,
  accountUsername,
  limit,
}: {
  userId: string;
  accountUsername?: string;
  limit: number;
}) => {
  const email = await getUserEmail(userId);
  if (!email) return;

  const key = `insta:dm-limit:${userId}:${accountUsername || "account"}`;
  if (!(await shouldSendNotification({ key, type: "insta_dm_limit", userId }))) {
    return;
  }

  await sendEmail({
    to: email,
    subject: "Instagram DM limit reached",
    html: baseEmail({
      title: "Instagram DM limit reached",
      body: `
        <p>Your free Instagram DM limit has been reached${accountUsername ? ` for <strong>@${escapeHtml(accountUsername)}</strong>` : ""}.</p>
        <p>Free plans include ${limit.toLocaleString()} automated DMs per cycle. To avoid missed customer replies, upgrade your Instagram plan and restart automation from the dashboard.</p>
      `,
      actionText: "Upgrade Instagram Plan",
      actionUrl: `${DASHBOARD_URL}/insta/pricing`,
    }),
  });
};

export const sendInstaFollowCheckLimitEmailToUser = async ({
  userId,
  accountUsername,
  limit,
}: {
  userId: string;
  accountUsername?: string;
  limit: number;
}) => {
  const email = await getUserEmail(userId);
  if (!email) return;

  const key = `insta:follow-limit:${userId}:${accountUsername || "account"}`;
  if (
    !(await shouldSendNotification({
      key,
      type: "insta_follow_check_limit",
      userId,
    }))
  ) {
    return;
  }

  await sendEmail({
    to: email,
    subject: "Instagram follow-check limit reached",
    html: baseEmail({
      title: "Instagram follow-check limit reached",
      body: `
        <p>Your free follow-check limit has been reached${accountUsername ? ` for <strong>@${escapeHtml(accountUsername)}</strong>` : ""}.</p>
        <p>Free plans include ${limit.toLocaleString()} follow checks per cycle. Follow-gated automations may skip verification until the limit resets. Upgrade to keep those flows running smoothly.</p>
      `,
      actionText: "Upgrade Instagram Plan",
      actionUrl: `${DASHBOARD_URL}/insta/pricing`,
    }),
  });
};

export const sendInstaTokenExpiredEmailToUser = async ({
  userId,
  accountUsername,
}: {
  userId: string;
  accountUsername?: string;
}) => {
  const email = await getUserEmail(userId);
  if (!email) return;

  const key = `insta:token-expired:${userId}:${accountUsername || "account"}`;
  if (
    !(await shouldSendNotification({
      key,
      type: "insta_token_expired",
      userId,
      dedupeDays: 7,
    }))
  ) {
    return;
  }

  await sendEmail({
    to: email,
    subject: "Refresh your Instagram connection",
    html: baseEmail({
      title: "Your Instagram token needs attention",
      body: `
        <p>Your Instagram connection${accountUsername ? ` for <strong>@${escapeHtml(accountUsername)}</strong>` : ""} has expired or needs to be refreshed.</p>
        <p>Please reconnect or refresh the token from the dashboard. If you do not, automations for that account may stop sending replies and DMs.</p>
      `,
      actionText: "Refresh Instagram Token",
      actionUrl: `${DASHBOARD_URL}/insta/settings?reconnect=1`,
    }),
  });
};

export const sendWebTokenExhaustedEmailToUser = async ({
  userId,
  chatbotType,
  nextResetAt,
}: {
  userId: string;
  chatbotType?: string;
  nextResetAt?: Date;
}) => {
  const email = await getUserEmail(userId);
  if (!email) return;

  const key = `web:tokens-exhausted:${userId}:${chatbotType || "free"}`;
  if (
    !(await shouldSendNotification({
      key,
      type: "web_tokens_exhausted",
      userId,
    }))
  ) {
    return;
  }

  const resetText = nextResetAt
    ? ` Your free tokens reset on ${nextResetAt.toLocaleDateString()}.`
    : "";

  await sendEmail({
    to: email,
    subject: "Your free chatbot tokens are finished",
    html: baseEmail({
      title: "Your chatbot tokens are finished",
      body: `
        <p>Your free 10,000 monthly chatbot tokens have been used${chatbotType ? ` for <strong>${escapeHtml(chatbotType)}</strong>` : ""}.</p>
        <p>Your chatbot may stop responding until tokens reset.${resetText} Upgrade to a subscription plan to get 1,000,000 included tokens per chatbot each cycle.</p>
      `,
      actionText: "Upgrade Web Plan",
      actionUrl: `${DASHBOARD_URL}/web/pricing`,
    }),
  });
};
const client = new Twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN,
);
interface QuestionAnswer {
  answer: string;
}
export async function sendWhatsAppInfo({
  data,
  userId,
  number,
}: {
  userId: string;
  data: QuestionAnswer[];
  number: string;
}) {
  try {
    await connectToDatabase();

    let PhoneNumber;
    if (!userId) {
      PhoneNumber = process.env.WHATSAPP_NUMBER;
    }
    const user = await User.findOne({ clerkId: userId }).exec();

    if (!user) {
      throw new Error("User not found");
    }

    if (!number) {
      throw new Error("User phone number not available");
    }
    PhoneNumber = Number(number);
    const result = await client.messages.create({
      from: `whatsapp:${process.env.NEXT_PUBLIC_TWILIO_NUMBER}`,
      to: `whatsapp:${PhoneNumber}`,
      contentSid: process.env.YOUR_MESSAGE_CONTENT_SID_HERE, // Replace with your template's Content SID
      contentVariables: JSON.stringify({
        "1": data[0].answer,
        "2": data[1].answer,
        "3": data[2].answer || "Not provided",
        "4": data[3].answer || "No message",
      }),
    });

    return { success: true };
  } catch (error) {
    console.error("WhatsApp send error:", error);
    return {
      success: false,
    };
  }
}
