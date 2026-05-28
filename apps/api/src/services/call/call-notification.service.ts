import { sendEmail } from "@/services/smtp-mailer.service";
import { sendExotelSms } from "@/services/call/exotel.service";

type NotificationChannel = {
  channel: "email" | "sms" | "whatsapp";
  address: string;
  enabled: boolean;
};

type CallAlert = {
  businessName: string;
  callerPhone: string;
  callerName?: string;
  status: string;
  summary: string;
  recordingUrl?: string;
};

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");

const buildTextMessage = (alert: CallAlert) =>
  [
    `New ${alert.status} call for ${alert.businessName}`,
    `Caller: ${alert.callerName || "Unknown"} (${alert.callerPhone || "N/A"})`,
    `Summary: ${alert.summary || "Call received"}`,
    alert.recordingUrl ? `Recording: ${alert.recordingUrl}` : "",
  ]
    .filter(Boolean)
    .join("\n");

export const sendCallNotifications = async ({
  channels,
  alert,
}: {
  channels: NotificationChannel[];
  alert: CallAlert;
}) => {
  const enabledChannels = channels.filter(
    (channel) => channel.enabled && channel.address,
  );

  const results = await Promise.allSettled(
    enabledChannels.map(async (channel) => {
      if (channel.channel === "email") {
        await sendEmail({
          to: channel.address,
          subject: `New ${alert.status} call from ${alert.callerPhone || "caller"}`,
          html: `
            <div style="font-family: Arial, sans-serif; padding: 20px;">
              <h2>New ${escapeHtml(alert.status)} call</h2>
              <p><strong>Business:</strong> ${escapeHtml(alert.businessName)}</p>
              <p><strong>Caller:</strong> ${escapeHtml(alert.callerName || "Unknown")} (${escapeHtml(alert.callerPhone || "N/A")})</p>
              <p><strong>Summary:</strong> ${escapeHtml(alert.summary || "Call received")}</p>
              ${
                alert.recordingUrl
                  ? `<p><a href="${escapeHtml(alert.recordingUrl)}">Open recording</a></p>`
                  : ""
              }
            </div>
          `,
        });
        return { channel: channel.channel, sent: true };
      }

      if (channel.channel === "sms") {
        await sendExotelSms({
          to: channel.address,
          body: buildTextMessage(alert),
        });
        return { channel: channel.channel, sent: true };
      }

      return {
        channel: channel.channel,
        sent: false,
        reason:
          "WhatsApp notifications require a WhatsApp provider template setup. SMS/email were attempted where enabled.",
      };
    }),
  );

  return results.map((result, index) => ({
    channel: enabledChannels[index]?.channel,
    status: result.status,
    value:
      result.status === "fulfilled"
        ? result.value
        : { sent: false, error: result.reason?.message || "Failed" },
  }));
};
