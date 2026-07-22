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
  providerStatus?: string;
  providerErrorCode?: string;
  providerError?: string;
  providerStatusUpdatedAt?: Date;
  deliveredAt?: Date;
  readAt?: Date;
  error?: string;
  sentAt?: Date;
};

const DASHBOARD_URL = "https://app.rocketreplai.com";
const DEFAULT_COUNTRY_CODE =
  process.env.APPOINTMENT_ALERT_DEFAULT_COUNTRY_CODE || "91";

const getAppointmentAlertPhoneNumberId = () =>
  process.env.APPOINTMENT_ALERT_WHATSAPP_PHONE_NUMBER_ID ||
  process.env.ROCKETREPLAI_WHATSAPP_PHONE_NUMBER_ID ||
  process.env.WHATSAPP_PROVIDER_PHONE_NUMBER_ID ||
  "";

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

const getTemplateVariables = (text: unknown) =>
  Array.from(
    new Set(
      Array.from(String(text || "").matchAll(/\{\{\s*([^{}]+?)\s*\}\}/g)).map(
        (match) => match[1].trim(),
      ),
    ),
  );

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
  const phoneNumberId = getAppointmentAlertPhoneNumberId();
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

  let approvedTemplates: any[] = [];
  let approvedTemplateLanguages: string[] = [];
  if (wabaId) {
    try {
      const lookupUrl = new URL(
        `https://graph.facebook.com/${graphVersion}/${wabaId}/message_templates`,
      );
      lookupUrl.searchParams.set("name", templateName);
      lookupUrl.searchParams.set(
        "fields",
        "name,status,language,parameter_format,components",
      );
      const lookupResponse = await fetch(lookupUrl, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const lookupData = await lookupResponse.json().catch(() => ({}) as any);
      if (lookupResponse.ok) {
        const matches = Array.isArray(lookupData?.data) ? lookupData.data : [];
        approvedTemplates = matches.filter(
          (template: any) =>
            cleanString(template?.name).toLowerCase() === templateName &&
            cleanString(template?.status).toUpperCase() === "APPROVED",
        );
        approvedTemplateLanguages = approvedTemplates
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
              parameterFormat: cleanString(template?.parameter_format),
              bodyVariables: getTemplateVariables(
                template?.components?.find(
                  (component: any) =>
                    cleanString(component?.type).toUpperCase() === "BODY",
                )?.text,
              ),
              buttons:
                template?.components
                  ?.find(
                    (component: any) =>
                      cleanString(component?.type).toUpperCase() === "BUTTONS",
                  )
                  ?.buttons?.map((button: any) => ({
                    type: cleanString(button?.type),
                    urlVariables: getTemplateVariables(button?.url),
                  })) || [],
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

  const approvedTemplate =
    approvedTemplates.find(
      (template) => cleanString(template?.language) === languageCandidates[0],
    ) || approvedTemplates[0];
  const templateComponents = Array.isArray(approvedTemplate?.components)
    ? approvedTemplate.components
    : [];
  const bodyDefinition = templateComponents.find(
    (component: any) =>
      cleanString(component?.type).toUpperCase() === "BODY",
  );
  const bodyVariables = getTemplateVariables(bodyDefinition?.text);
  const parameterFormat = cleanString(
    approvedTemplate?.parameter_format,
  ).toUpperCase();
  const dateTimeValue =
    [appointment.preferredDate, appointment.preferredTime]
      .filter(Boolean)
      .join(" ") || "Not captured";
  const requirementValue = truncate(
    [
      appointment.service ? `Service: ${appointment.service}` : "",
      appointment.summary,
    ]
      .filter(Boolean)
      .join(" | ") || "No details",
  );
  const allPositionalValues = [
    whatsappTemplateSourceLabel(source),
    appointment.customerName || "Not captured",
    appointment.customerPhone || "Not captured",
    dateTimeValue,
    requirementValue,
  ];
  const expectedBodyParameterCount = approvedTemplate
    ? bodyVariables.length
    : allPositionalValues.length;
  const positionalValues =
    expectedBodyParameterCount === 4
      ? allPositionalValues.slice(1)
      : allPositionalValues.slice(0, expectedBodyParameterCount);
  while (positionalValues.length < expectedBodyParameterCount) {
    positionalValues.push("Not captured");
  }

  const resolveNamedBodyValue = (variable: string, index: number) => {
    const name = variable.toLowerCase();
    if (/source|channel|platform|through/.test(name)) {
      return whatsappTemplateSourceLabel(source);
    }
    if (/customer.*name|patient.*name|^name$/.test(name)) {
      return appointment.customerName || "Not captured";
    }
    if (/phone|mobile|whatsapp/.test(name)) {
      return appointment.customerPhone || "Not captured";
    }
    if (/date|time|slot/.test(name)) return dateTimeValue;
    if (/requirement|detail|summary|service|reason/.test(name)) {
      return requirementValue;
    }
    return positionalValues[index] || "Not captured";
  };

  const bodyParameters = bodyVariables.map((variable, index) => ({
    type: "text",
    text:
      parameterFormat === "NAMED"
        ? resolveNamedBodyValue(variable, index)
        : positionalValues[index] || "Not captured",
    ...(parameterFormat === "NAMED" ? { parameter_name: variable } : {}),
  }));

  const components: any[] = bodyParameters.length
    ? [{ type: "body", parameters: bodyParameters }]
    : [];

  const buttonDefinition = templateComponents.find(
    (component: any) =>
      cleanString(component?.type).toUpperCase() === "BUTTONS",
  );
  const dynamicUrlButtonIndex = Array.isArray(buttonDefinition?.buttons)
    ? buttonDefinition.buttons.findIndex(
        (button: any) =>
          cleanString(button?.type).toUpperCase() === "URL" &&
          getTemplateVariables(button?.url).length > 0,
      )
    : approvedTemplate
      ? -1
      : 0;
  const shouldIncludeDashboardButton =
    includeDashboardButton && dynamicUrlButtonIndex >= 0;

  if (shouldIncludeDashboardButton) {
    const dashboardButtonValue = dashboardUrl.startsWith(DASHBOARD_URL)
      ? dashboardUrl.slice(DASHBOARD_URL.length).replace(/^\/+/, "")
      : dashboardUrl;
    components.push({
      type: "button",
      sub_type: "url",
      index: String(dynamicUrlButtonIndex),
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
      parameterFormat: parameterFormat || "POSITIONAL",
      bodyVariables,
      bodyParameterCount: bodyParameters.length,
      dynamicUrlButtonIndex,
      includesDashboardButton: shouldIncludeDashboardButton,
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
        providerStatus: "accepted",
        providerStatusUpdatedAt: new Date(),
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

type WhatsAppProviderStatus = {
  id?: string;
  status?: string;
  timestamp?: string;
  recipient_id?: string;
  errors?: Array<{
    code?: number | string;
    title?: string;
    message?: string;
    error_data?: { details?: string };
  }>;
};

const waitForNotificationLog = (delayMs: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, delayMs));

const providerStatusDate = (timestamp?: string) => {
  const seconds = Number(timestamp);
  return Number.isFinite(seconds) && seconds > 0
    ? new Date(seconds * 1000)
    : new Date();
};

const providerStatusError = (status: WhatsAppProviderStatus) => {
  const error = status.errors?.[0];
  const message = [error?.title, error?.message, error?.error_data?.details]
    .map(cleanString)
    .filter(Boolean)
    .filter((value, index, values) => values.indexOf(value) === index)
    .join(" | ");

  return {
    code: error?.code ? String(error.code) : "",
    message,
  };
};

export const processAppointmentWhatsAppStatuses = async ({
  phoneNumberId,
  statuses,
}: {
  phoneNumberId: string;
  statuses: WhatsAppProviderStatus[];
}) => {
  if (!statuses.length) return 0;
  if (phoneNumberId !== getAppointmentAlertPhoneNumberId()) return 0;

  await connectToDatabase();
  let matchedStatuses = 0;

  for (const status of statuses) {
    const providerMessageId = cleanString(status.id);
    if (!providerMessageId) continue;

    const providerStatus = cleanString(status.status).toLowerCase() || "unknown";
    const statusDate = providerStatusDate(status.timestamp);
    const statusError = providerStatusError(status);
    const setFields: Record<string, unknown> = {
      "channels.$[channel].providerStatus": providerStatus,
      "channels.$[channel].providerStatusUpdatedAt": statusDate,
    };
    const unsetFields: Record<string, 1> = {};

    if (providerStatus === "delivered") {
      setFields["channels.$[channel].deliveredAt"] = statusDate;
    }
    if (providerStatus === "read") {
      setFields["channels.$[channel].readAt"] = statusDate;
    }
    if (providerStatus === "failed") {
      setFields["channels.$[channel].status"] = "failed";
      setFields["channels.$[channel].error"] =
        statusError.message || "WhatsApp delivery failed";
      setFields["channels.$[channel].providerError"] =
        statusError.message || "WhatsApp delivery failed";
      if (statusError.code) {
        setFields["channels.$[channel].providerErrorCode"] = statusError.code;
      }
    } else {
      unsetFields["channels.$[channel].providerError"] = 1;
      unsetFields["channels.$[channel].providerErrorCode"] = 1;
    }

    let matched = false;
    for (const delayMs of [0, 250, 750, 1500]) {
      if (delayMs) await waitForNotificationLog(delayMs);

      const update: Record<string, unknown> = { $set: setFields };
      if (Object.keys(unsetFields).length) update.$unset = unsetFields;
      const result = await AppointmentNotificationLog.updateOne(
        {
          channels: {
            $elemMatch: {
              channel: "whatsapp",
              providerMessageId,
            },
          },
        },
        update,
        {
          arrayFilters: [
            {
              "channel.channel": "whatsapp",
              "channel.providerMessageId": providerMessageId,
            },
          ],
        },
      );

      if (result.matchedCount > 0) {
        matched = true;
        matchedStatuses += 1;
        break;
      }
    }

    console.info("[appointment-notification:whatsapp] Delivery status", {
      senderPhoneNumberId: phoneNumberId,
      providerMessageId,
      recipient: maskPhone(cleanString(status.recipient_id)),
      status: providerStatus,
      errorCode: statusError.code || undefined,
      error: statusError.message || undefined,
      notificationLogFound: matched,
    });
  }

  return matchedStatuses;
};
