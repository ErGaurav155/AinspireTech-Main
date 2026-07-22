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

const maskPhone = (value: string) =>
  value.length > 4 ? `${"*".repeat(Math.min(value.length - 4, 8))}${value.slice(-4)}` : value;

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
      [value.symptoms, value.notes].filter(Boolean).join(" | ") ||
      value.message ||
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
    process.env.WHATSAPP_SYSTEM_USER_ACCESS_TOKEN ||
    "";
  const graphVersion =
    process.env.APPOINTMENT_ALERT_WHATSAPP_GRAPH_VERSION ||
    process.env.WHATSAPP_GRAPH_API_VERSION ||
    "v25.0";
  const wabaId = cleanString(
    process.env.APPOINTMENT_ALERT_WHATSAPP_WABA_ID ||
      process.env.ROCKETREPLAI_WHATSAPP_WABA_ID ||
      process.env.WHATSAPP_PROVIDER_WABA_ID,
  );
  const configuredTemplateName = cleanString(
    process.env.APPOINTMENT_ALERT_WHATSAPP_TEMPLATE_NAME ||
      process.env.WHATSAPP_APPOINTMENT_TEMPLATE_NAME ||
      process.env.WHATSAPP_APPOINTMENT_CONFIRMATION_TEMPLATE_NAME ||
      "appointment_confirmation_v1",
  ).toLowerCase();
  const templateName =
    configuredTemplateName === "appointment_booked"
      ? "appointment_confirmation_v1"
      : configuredTemplateName;
  const languageCode = cleanString(
    process.env.APPOINTMENT_ALERT_WHATSAPP_TEMPLATE_LANGUAGE ||
      process.env.WHATSAPP_APPOINTMENT_TEMPLATE_LANGUAGE ||
      "en_US",
  );
  const configuredLanguageFallbacks = cleanString(
    process.env.APPOINTMENT_ALERT_WHATSAPP_TEMPLATE_LANGUAGE_FALLBACKS,
  )
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
  const includeDashboardButton =
    process.env.APPOINTMENT_ALERT_WHATSAPP_INCLUDE_DASHBOARD_BUTTON !== "false";

  if (!phoneNumberId || !accessToken) {
    throw new Error("RocketReplai WhatsApp alert sender is not configured");
  }

  let approvedTemplateLanguages: string[] = [];
  if (wabaId) {
    try {
      const lookupUrl = new URL(
        `https://graph.facebook.com/${graphVersion}/${wabaId}/message_templates`,
      );
      lookupUrl.searchParams.set("name", templateName);
      lookupUrl.searchParams.set("fields", "name,status,language,components");
      const lookupResponse = await fetch(lookupUrl, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const lookupData = await lookupResponse.json().catch(() => ({}) as any);
      if (lookupResponse.ok) {
        const matches = Array.isArray(lookupData?.data) ? lookupData.data : [];
        approvedTemplateLanguages = matches
          .filter(
            (template: any) =>
              cleanString(template?.name).toLowerCase() === templateName &&
              cleanString(template?.status).toUpperCase() === "APPROVED",
          )
          .map((template: any) => cleanString(template?.language))
          .filter(Boolean);
        console.info(
          "[appointment-notification:whatsapp] Template lookup completed",
          {
            wabaId,
            senderPhoneNumberId: phoneNumberId,
            templateName,
            matches: matches.map((template: any) => ({
              name: cleanString(template?.name),
              status: cleanString(template?.status),
              language: cleanString(template?.language),
            })),
          },
        );
      } else {
        console.warn(
          "[appointment-notification:whatsapp] Template lookup failed",
          {
            wabaId,
            senderPhoneNumberId: phoneNumberId,
            templateName,
            code: lookupData?.error?.code,
            error: lookupData?.error?.message || `HTTP ${lookupResponse.status}`,
          },
        );
      }
    } catch (error) {
      console.warn(
        "[appointment-notification:whatsapp] Template lookup failed",
        {
          wabaId,
          senderPhoneNumberId: phoneNumberId,
          templateName,
          error: error instanceof Error ? error.message : String(error),
        },
      );
    }
  }

  const languageCandidates = Array.from(
    new Set([
      ...approvedTemplateLanguages,
      languageCode,
      ...configuredLanguageFallbacks,
      "en",
      "en_US",
      "en_GB",
    ]),
  );

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
            [
              appointment.service ? `Service: ${appointment.service}` : "",
              appointment.summary,
            ]
              .filter(Boolean)
              .join(" | ") || "No details",
          ),
        },
      ],
    },
  ];

  if (includeDashboardButton) {
    const dashboardButtonValue = dashboardUrl.startsWith(DASHBOARD_URL)
      ? dashboardUrl.slice(DASHBOARD_URL.length).replace(/^\/+/, "")
      : dashboardUrl;
    components.push({
      type: "button",
      sub_type: "url",
      index: "0",
      parameters: [{ type: "text", text: dashboardButtonValue }],
    });
  }

  let lastData: any = {};
  let lastLanguageCode = languageCandidates[0] || languageCode;

  for (let index = 0; index < languageCandidates.length; index += 1) {
    const candidateLanguageCode = languageCandidates[index];
    lastLanguageCode = candidateLanguageCode;
    console.info("[appointment-notification:whatsapp] Sending template", {
      senderPhoneNumberId: phoneNumberId,
      wabaId: wabaId || null,
      recipient: maskPhone(to),
      templateName,
      languageCode: candidateLanguageCode,
      attempt: index + 1,
      languageCandidates,
      bodyParameterCount: components[0]?.parameters?.length || 0,
      includesDashboardButton: includeDashboardButton,
    });

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
          recipient_type: "individual",
          to,
          type: "template",
          template: {
            name: templateName,
            language: { code: candidateLanguageCode },
            components,
          },
        }),
      },
    );
    const data = await response.json().catch(() => ({}) as any);
    lastData = data;
    if (response.ok) {
      const providerMessageId = data?.messages?.[0]?.id as string | undefined;
      console.info("[appointment-notification:whatsapp] Template accepted", {
        senderPhoneNumberId: phoneNumberId,
        wabaId: wabaId || null,
        recipient: maskPhone(to),
        templateName,
        languageCode: candidateLanguageCode,
        providerMessageId: providerMessageId || null,
      });
      return providerMessageId;
    }

    const metaErrorCode = Number(data?.error?.code);
    if (
      metaErrorCode !== 132001 ||
      index === languageCandidates.length - 1
    ) {
      break;
    }
    console.warn(
      "[appointment-notification:whatsapp] Template translation unavailable; retrying locale",
      {
        senderPhoneNumberId: phoneNumberId,
        wabaId: wabaId || null,
        templateName,
        failedLanguageCode: candidateLanguageCode,
        nextLanguageCode: languageCandidates[index + 1],
      },
    );
  }

  const metaError = lastData?.error || {};
  const templateTranslationHint =
    Number(metaError.code) === 132001
      ? `Template ${templateName} was unavailable for languages ${languageCandidates.join(", ")} on the WABA that owns sender Phone Number ID ${phoneNumberId}${wabaId ? `; configured WABA ID ${wabaId}` : "; configure APPOINTMENT_ALERT_WHATSAPP_WABA_ID to verify the owning WABA and approved locale"}`
      : "";
  throw new Error(
    [
      metaError.message || "WhatsApp template send failed",
      templateTranslationHint,
      metaError.error_user_title,
      metaError.error_user_msg,
      metaError.code ? `code=${metaError.code}` : "",
      metaError.error_subcode ? `subcode=${metaError.error_subcode}` : "",
      `language=${lastLanguageCode}`,
      metaError.fbtrace_id ? `fbtrace_id=${metaError.fbtrace_id}` : "",
    ]
      .filter(Boolean)
      .join(" | "),
  );
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
