import { connectToDatabase } from "@/config/database.config";
import AppointmentNotificationLog from "@/models/AppointmentNotificationLog.model";
import User from "@/models/user.model";
import { sendEmail } from "@/services/smtp-mailer.service";

type AppointmentSource = "web" | "insta" | "call" | "whatsapp" | "misc";

type AppointmentAlert = {
  customerName?: string;
  customerPhone?: string;
  customerEmail?: string;
  service?: string;
  preferredDate?: string;
  preferredTime?: string;
  summary?: string;
  raw?: unknown;
};

type NotificationResult = {
  channel: "email" | "whatsapp";
  address: string;
  status: "sent" | "skipped" | "failed";
  providerMessageId?: string;
  error?: string;
  sentAt?: Date;
};

const DASHBOARD_URL = "https://app.rocketreplai.com";
const DEFAULT_COUNTRY_CODE =
  process.env.APPOINTMENT_ALERT_DEFAULT_COUNTRY_CODE || "91";

const cleanString = (value: unknown) =>
  typeof value === "string" ? value.trim() : "";

const escapeHtml = (value: string | number | undefined | null) =>
  String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");

const truncate = (value: string, max = 180) =>
  value.length > max ? `${value.slice(0, max - 3)}...` : value;

export const normalizeAppointmentPhone = (value?: string) => {
  const raw = cleanString(value);
  if (!raw) return "";
  const digits = raw.replace(/\D/g, "");
  if (!digits) return "";
  if (raw.startsWith("+")) return digits;
  if (digits.length === 10) return `${DEFAULT_COUNTRY_CODE}${digits}`;
  return digits;
};

const getDashboardPath = (source: AppointmentSource) => {
  if (source === "web") return "/web/chatbot-lead-generation/conversations";
  if (source === "insta") return "/insta/lead";
  if (source === "call") return "/call/calls";
  if (source === "whatsapp") return "/whatsapp/appointments";
  return "/dashboard";
};

const sourceLabel = (source: AppointmentSource) =>
  ({
    web: "Web chatbot",
    insta: "Instagram automation",
    call: "AI call assistant",
    whatsapp: "WhatsApp automation",
    misc: "Website form",
  })[source];

const whatsappTemplateSourceLabel = (source: AppointmentSource) =>
  ({
    web: "web chatbot",
    insta: "instagram",
    call: "AI call assistant",
    whatsapp: "WhatsApp automation",
    misc: "website form",
  })[source];

export const formDataToAppointmentAlert = (
  data: Array<{ question?: string; label?: string; answer?: string }> = [],
): AppointmentAlert => {
  const rows = data.map((item) => ({
    label: cleanString(item.question || item.label).toLowerCase(),
    answer: cleanString(item.answer),
  }));
  const findByLabel = (patterns: RegExp[]) =>
    rows.find((row) => patterns.some((pattern) => pattern.test(row.label)))
      ?.answer || "";

  return {
    customerName:
      findByLabel([/name/, /patient/]) || cleanString(data[0]?.answer),
    customerEmail: findByLabel([/email/]) || cleanString(data[1]?.answer),
    customerPhone:
      findByLabel([/phone/, /mobile/, /whatsapp/]) ||
      cleanString(data[2]?.answer),
    preferredDate: findByLabel([/date/, /day/]),
    preferredTime: findByLabel([/time/, /slot/]),
    service: findByLabel([/service/, /doctor/, /department/, /consult/]),
    summary:
      findByLabel([/message/, /requirement/, /symptom/, /detail/, /reason/]) ||
      cleanString(data[3]?.answer) ||
      rows
        .map((row) => `${row.label || "answer"}: ${row.answer}`)
        .filter((line) => line.trim() !== ":")
        .join(" | "),
    raw: data,
  };
};

export const objectToAppointmentAlert = (
  value: Record<string, any> = {},
): AppointmentAlert => ({
  customerName: cleanString(
    value.customerName ||
      value.patientName ||
      value.name ||
      value.callerName ||
      value.contactName,
  ),
  customerPhone: cleanString(
    value.customerPhone ||
      value.patientPhone ||
      value.phone ||
      value.callerPhone ||
      value.patientWaId,
  ),
  customerEmail: cleanString(
    value.customerEmail ||
      value.patientEmail ||
      value.email ||
      value.callerEmail,
  ),
  service: cleanString(
    value.service || value.subject || value.interest || value.title,
  ),
  preferredDate: cleanString(value.preferredDate || value.date),
  preferredTime: cleanString(value.preferredTime || value.time),
  summary: cleanString(
    value.summary ||
      value.symptoms ||
      value.message ||
      value.notes ||
      value.description ||
      value.interest,
  ),
  raw: value,
});

const getUserEmail = async (userId: string) => {
  if (!userId) return "";
  await connectToDatabase();
  const user = await User.findOne({ clerkId: userId }).select("email").lean();
  return user?.email || "";
};

const sendProviderWhatsAppTemplate = async ({
  to,
  source,
  appointment,
  dashboardUrl,
}: {
  to: string;
  source: AppointmentSource;
  appointment: Required<AppointmentAlert>;
  dashboardUrl: string;
}) => {
  const phoneNumberId =
    process.env.APPOINTMENT_ALERT_WHATSAPP_PHONE_NUMBER_ID ||
    process.env.ROCKETREPLAI_WHATSAPP_PHONE_NUMBER_ID ||
    process.env.WHATSAPP_PROVIDER_PHONE_NUMBER_ID ||
    "";
  const accessToken =
    process.env.APPOINTMENT_ALERT_WHATSAPP_ACCESS_TOKEN ||
    process.env.ROCKETREPLAI_WHATSAPP_ACCESS_TOKEN ||
    process.env.WHATSAPP_PROVIDER_ACCESS_TOKEN ||
    "";
  const graphVersion =
    process.env.APPOINTMENT_ALERT_WHATSAPP_GRAPH_VERSION ||
    process.env.WHATSAPP_GRAPH_API_VERSION ||
    "v25.0";
  const templateName =
    process.env.APPOINTMENT_ALERT_WHATSAPP_TEMPLATE_NAME ||
    "appointment_booked";
  const languageCode =
    process.env.APPOINTMENT_ALERT_WHATSAPP_TEMPLATE_LANGUAGE || "en_US";
  const includeDashboardButton =
    process.env.APPOINTMENT_ALERT_WHATSAPP_INCLUDE_DASHBOARD_BUTTON !== "false";

  if (!phoneNumberId || !accessToken) {
    throw new Error("RocketReplai WhatsApp alert sender is not configured");
  }

  const components: any[] = [
    {
      type: "body",
      parameters: [
        { type: "text", text: whatsappTemplateSourceLabel(source) },
        { type: "text", text: appointment.customerName || "Not captured" },
        { type: "text", text: appointment.customerPhone || "Not captured" },
        {
          type: "text",
          text:
            [appointment.preferredDate, appointment.preferredTime]
              .filter(Boolean)
              .join(" ") || "Not captured",
        },
        {
          type: "text",
          text: truncate(
            appointment.summary || appointment.service || "No details",
          ),
        },
      ],
    },
  ];

  if (includeDashboardButton) {
    components.push({
      type: "button",
      sub_type: "url",
      index: "0",
      parameters: [{ type: "text", text: dashboardUrl }],
    });
  }

  const response = await fetch(
    `https://graph.facebook.com/${graphVersion}/${phoneNumberId}/messages`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to,
        type: "template",
        template: {
          name: templateName,
          language: { code: languageCode },
          components,
        },
      }),
    },
  );
  const data = await response.json().catch(() => ({}) as any);
  if (!response.ok) {
    throw new Error(data?.error?.message || "WhatsApp template send failed");
  }
  return data?.messages?.[0]?.id as string | undefined;
};

export const sendAppointmentNotifications = async ({
  userId,
  source,
  sourceRef,
  appointment,
  ownerEmail,
  ownerWhatsAppNumber,
  emailEnabled = true,
  whatsappEnabled = true,
  dashboardPath,
}: {
  userId: string;
  source: AppointmentSource;
  sourceRef?: string;
  appointment: AppointmentAlert;
  ownerEmail?: string;
  ownerWhatsAppNumber?: string;
  emailEnabled?: boolean;
  whatsappEnabled?: boolean;
  dashboardPath?: string;
}) => {
  const normalizedAppointment: Required<AppointmentAlert> = {
    customerName: cleanString(appointment.customerName) || "Unknown customer",
    customerPhone: cleanString(appointment.customerPhone),
    customerEmail: cleanString(appointment.customerEmail),
    service: cleanString(appointment.service) || "Appointment request",
    preferredDate: cleanString(appointment.preferredDate),
    preferredTime: cleanString(appointment.preferredTime),
    summary: cleanString(appointment.summary) || "No details captured",
    raw: appointment.raw,
  };
  const dashboardUrl = `${DASHBOARD_URL}${dashboardPath || getDashboardPath(source)}`;
  const resolvedEmail = cleanString(ownerEmail) || (await getUserEmail(userId));
  const whatsappTo = normalizeAppointmentPhone(ownerWhatsAppNumber);
  const channels: NotificationResult[] = [];

  if (emailEnabled && resolvedEmail) {
    try {
      await sendEmail({
        to: resolvedEmail,
        subject: `New appointment from ${sourceLabel(source)}`,
        html: `
          <div style="font-family: Arial, sans-serif; padding: 20px; color: #111827;">
            <h2 style="margin:0 0 14px; color:#059669;">New appointment request</h2>
            <p><strong>Source:</strong> ${escapeHtml(sourceLabel(source))}</p>
            <p><strong>Customer:</strong> ${escapeHtml(normalizedAppointment.customerName)}</p>
            <p><strong>Phone:</strong> ${escapeHtml(normalizedAppointment.customerPhone || "Not captured")}</p>
            <p><strong>Email:</strong> ${escapeHtml(normalizedAppointment.customerEmail || "Not captured")}</p>
            <p><strong>Service:</strong> ${escapeHtml(normalizedAppointment.service)}</p>
            <p><strong>Date/Time:</strong> ${escapeHtml(
              [
                normalizedAppointment.preferredDate,
                normalizedAppointment.preferredTime,
              ]
                .filter(Boolean)
                .join(" ") || "Not captured",
            )}</p>
            <p><strong>Details:</strong> ${escapeHtml(normalizedAppointment.summary)}</p>
            <p style="margin-top:18px;"><a href="${escapeHtml(dashboardUrl)}">Open dashboard</a></p>
          </div>
        `,
      });
      channels.push({
        channel: "email",
        address: resolvedEmail,
        status: "sent",
        sentAt: new Date(),
      });
    } catch (error) {
      channels.push({
        channel: "email",
        address: resolvedEmail,
        status: "failed",
        error: error instanceof Error ? error.message : String(error),
      });
    }
  } else {
    channels.push({
      channel: "email",
      address: resolvedEmail,
      status: "skipped",
      error: resolvedEmail ? "Email alerts disabled" : "No owner email",
    });
  }

  if (whatsappEnabled && whatsappTo) {
    try {
      const providerMessageId = await sendProviderWhatsAppTemplate({
        to: whatsappTo,
        source,
        appointment: normalizedAppointment,
        dashboardUrl,
      });
      channels.push({
        channel: "whatsapp",
        address: whatsappTo,
        status: "sent",
        providerMessageId,
        sentAt: new Date(),
      });
    } catch (error) {
      channels.push({
        channel: "whatsapp",
        address: whatsappTo,
        status: "failed",
        error: error instanceof Error ? error.message : String(error),
      });
    }
  } else {
    channels.push({
      channel: "whatsapp",
      address: whatsappTo,
      status: "skipped",
      error: whatsappTo
        ? "WhatsApp alerts disabled"
        : "No WhatsApp alert number",
    });
  }

  await connectToDatabase();
  await AppointmentNotificationLog.create({
    userId,
    source,
    sourceRef,
    appointment: {
      customerName: normalizedAppointment.customerName,
      customerPhone: normalizedAppointment.customerPhone,
      customerEmail: normalizedAppointment.customerEmail,
      service: normalizedAppointment.service,
      preferredDate: normalizedAppointment.preferredDate,
      preferredTime: normalizedAppointment.preferredTime,
      summary: normalizedAppointment.summary,
      dashboardUrl,
    },
    channels,
  });

  return channels;
};
