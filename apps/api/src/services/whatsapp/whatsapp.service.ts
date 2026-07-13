import crypto from "crypto";
import WhatsAppWorkspace, {
  IWhatsAppWorkspace,
  WhatsAppPlanId,
} from "@/models/whatsapp/WhatsAppWorkspace.model";
import {
  objectToAppointmentAlert,
  sendAppointmentNotifications,
} from "@/services/appointment-notification.service";

export const whatsappPlans = [
  {
    id: "free",
    name: "WhatsApp Free",
    priceInr: 0,
    yearlyInr: 0,
    firstMonthInr: 0,
    messageLimit: 10,
    numbersLimit: 1,
    seatsLimit: 1,
    agentsLimit: 1,
    features: [
      "10 free automations",
      "1 connected WhatsApp number",
      "Appointment booking flow",
      "Business info replies",
    ],
  },
  {
    id: "launch",
    name: "WhatsApp Automation",
    priceInr: 2999,
    yearlyInr: 29990,
    firstMonthInr: 1499,
    messageLimit: 10000,
    numbersLimit: 1,
    seatsLimit: 1,
    agentsLimit: 3,
    features: [
      "1 connected WhatsApp number",
      "Appointment booking flow",
      "Business info replies from website/file notes",
      "Greeting template review tracker",
      "Appointment alerts by email and WhatsApp",
    ],
  },
  {
    id: "package",
    name: "Package WhatsApp Automation",
    priceInr: 0,
    yearlyInr: 0,
    firstMonthInr: 0,
    messageLimit: 10000,
    numbersLimit: 1,
    seatsLimit: 1,
    agentsLimit: 3,
    features: [
      "Included in common dashboard package",
      "1 connected WhatsApp number",
      "Appointment booking flow",
      "Business info replies",
      "Greeting template review tracker",
    ],
  },
] as const;

const defaultWhatsAppGraphApiVersion =
  process.env.WHATSAPP_GRAPH_API_VERSION || "v25.0";

export const getPlanById = (planId: WhatsAppPlanId) =>
  whatsappPlans.find((plan) => plan.id === planId) || whatsappPlans[0];

export const maskSecret = (value?: string) => {
  if (!value) return "";
  if (value.length <= 8) return "configured";
  return `${value.slice(0, 4)}...${value.slice(-4)}`;
};

const getWhatsAppSendAccessToken = (workspace: IWhatsAppWorkspace) =>
  process.env.WHATSAPP_SYSTEM_USER_ACCESS_TOKEN ||
  workspace.meta?.accessToken ||
  "";

const getWhatsAppSendTokenSource = (workspace: IWhatsAppWorkspace) =>
  process.env.WHATSAPP_SYSTEM_USER_ACCESS_TOKEN
    ? "system_user_env"
    : workspace.meta?.accessToken
      ? "workspace_token"
      : "missing";

export const sanitizeWorkspace = (workspace: IWhatsAppWorkspace) => {
  const data = workspace.toObject ? workspace.toObject() : workspace;
  return {
    ...data,
    meta: {
      ...data.meta,
      appSecret: maskSecret(data.meta?.appSecret),
      accessToken: maskSecret(data.meta?.accessToken),
    },
  };
};

export async function getOrCreateWhatsAppWorkspace(clerkId: string) {
  let workspace = await WhatsAppWorkspace.findOne({ clerkId });
  if (workspace) {
    const plan = getPlanById(workspace.subscription?.plan || "free");
    workspace.subscription.plan = plan.id;
    workspace.subscription.messageLimit = plan.messageLimit;
    workspace.subscription.numbersLimit = plan.numbersLimit;
    workspace.subscription.seatsLimit = plan.seatsLimit;
    workspace.subscription.agentsLimit = plan.agentsLimit;
    if (
      !workspace.meta?.graphApiVersion ||
      workspace.meta.graphApiVersion === "v23.0"
    ) {
      workspace.meta.graphApiVersion = defaultWhatsAppGraphApiVersion;
    }
    if (!workspace.notificationSettings) {
      workspace.notificationSettings = {
        email: "",
        whatsappNumber: "",
        emailEnabled: true,
        whatsappEnabled: true,
      } as any;
    }
    if (!workspace.businessInfo) {
      workspace.businessInfo = {
        websiteUrl: workspace.organization?.website || "",
        summary: "",
        fileName: "",
        fileType: "",
        fileSize: 0,
        fileText: "",
        websiteKnowledgeUrl: "",
        fileKnowledgeUrl: "",
        knowledgeBaseUrl: "",
        knowledgeBaseFileName: "",
      } as any;
    }
    if (!workspace.greetingTemplate) {
      workspace.greetingTemplate = {
        name: "rocket_whatsapp_greeting",
        language: "en_US",
        category: "utility",
        status: "draft",
        body:
          "Hi, thanks for messaging {{1}}. Please choose an option or share what you need help with.",
        example:
          "Hi, thanks for messaging Ainspiretech. Please choose an option or share what you need help with.",
      } as any;
    }
    if (!workspace.appointmentFlow) {
      workspace.appointmentFlow = {
        enabled: true,
        name: "RocketReplai Appointment Booking",
        flowId: "",
        status: "draft",
        categories: ["APPOINTMENT_BOOKING"],
        jsonVersion: "7.1",
        endpointUri: "",
        publicKey: "",
        endpointStatus: "missing",
        publicKeyStatus: "missing",
        phoneNumberStatus: "missing",
        metaAppStatus: "missing",
        departmentLabel: "Department",
        locationLabel: "Location",
        serviceLabel: "Service",
        customerNameLabel: "Full name",
        phoneLabel: "Phone number",
        requirementLabel: "Requirement",
        dateLabel: "Preferred date",
        timeLabel: "Preferred time",
        submitButtonLabel: "Book appointment",
        successMessage:
          "Thanks. Your appointment request has been sent. The business team will confirm availability soon.",
        departmentOptions: ["General", "Sales", "Support"],
        locationOptions: ["Main branch", "Online consultation"],
        validationErrors: [],
        lastError: "",
      } as any;
    }
    return workspace;
  }

  workspace = await WhatsAppWorkspace.create({
    clerkId,
    isConfigured: false,
    onboarding: {
      status: "not_started",
      mode: "embedded_signup",
    },
    organization: {
      name: "My Business",
      industry: "Services",
      website: "",
      timeZone: "Asia/Kolkata",
    },
    meta: {
      verifyToken: `rr_wa_${crypto.randomBytes(16).toString("hex")}`,
      graphApiVersion: defaultWhatsAppGraphApiVersion,
    },
    subscription: {
      plan: "free",
      status: "trial",
      billingCycle: "monthly",
      messageLimit: 10,
      messagesUsed: 0,
      numbersLimit: 1,
      seatsLimit: 1,
      agentsLimit: 1,
      nextBillingDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
    },
    appointmentConfig: {
      enabled: true,
      clinicName: "My Clinic",
      timezone: "Asia/Kolkata",
      slotDurationMinutes: 30,
      bufferMinutes: 10,
      bookingWindowDays: 14,
      workingHours: [
        { day: "monday", isOpen: true, open: "10:00", close: "18:00" },
        { day: "tuesday", isOpen: true, open: "10:00", close: "18:00" },
        { day: "wednesday", isOpen: true, open: "10:00", close: "18:00" },
        { day: "thursday", isOpen: true, open: "10:00", close: "18:00" },
        { day: "friday", isOpen: true, open: "10:00", close: "18:00" },
        { day: "saturday", isOpen: true, open: "10:00", close: "15:00" },
        { day: "sunday", isOpen: false, open: "10:00", close: "15:00" },
      ],
      services: [
        {
          name: "General consultation",
          durationMinutes: 30,
          priceInr: 500,
          doctor: "",
          isActive: true,
        },
        {
          name: "Dental consultation",
          durationMinutes: 30,
          priceInr: 700,
          doctor: "",
          isActive: true,
        },
      ],
      requiredFields: ["patient_name", "symptoms", "preferred_date", "preferred_time"],
      emergencyKeywords: ["emergency", "bleeding", "chest pain", "severe pain", "accident"],
      confirmationTemplateName: "",
      reminderTemplateName: "",
    },
    appointmentFlow: {
      enabled: true,
      name: "RocketReplai Appointment Booking",
      flowId: "",
      status: "draft",
      categories: ["APPOINTMENT_BOOKING"],
      jsonVersion: "7.1",
      endpointUri: "",
      publicKey: "",
      endpointStatus: "missing",
      publicKeyStatus: "missing",
      phoneNumberStatus: "missing",
      metaAppStatus: "missing",
      departmentLabel: "Department",
      locationLabel: "Location",
      serviceLabel: "Service",
      customerNameLabel: "Full name",
      phoneLabel: "Phone number",
      requirementLabel: "Requirement",
      dateLabel: "Preferred date",
      timeLabel: "Preferred time",
      submitButtonLabel: "Book appointment",
      successMessage:
        "Thanks. Your appointment request has been sent. The business team will confirm availability soon.",
      departmentOptions: ["General", "Sales", "Support"],
      locationOptions: ["Main branch", "Online consultation"],
      validationErrors: [],
      lastError: "",
    },
    notificationSettings: {
      email: "",
      whatsappNumber: "",
      emailEnabled: true,
      whatsappEnabled: true,
    },
    businessInfo: {
      websiteUrl: "",
      summary: "",
      fileName: "",
      fileType: "",
      fileSize: 0,
      fileText: "",
      websiteKnowledgeUrl: "",
      fileKnowledgeUrl: "",
      knowledgeBaseUrl: "",
      knowledgeBaseFileName: "",
    },
    greetingTemplate: {
      name: "rocket_whatsapp_greeting",
      language: "en_US",
      category: "utility",
      status: "draft",
      body:
        "Hi, thanks for messaging {{1}}. Please choose an option or share what you need help with.",
      example:
        "Hi, thanks for messaging Ainspiretech. Please choose an option or share what you need help with.",
    },
    agents: [],
    templates: [],
    contacts: [],
    conversations: [],
    campaigns: [],
    appointments: [],
  });

  return workspace;
}

export function resolveWorkspaceConfigured(workspace: IWhatsAppWorkspace) {
  return Boolean(
    workspace.meta?.wabaId &&
      workspace.meta?.phoneNumberId &&
      workspace.meta?.accessToken,
  );
}

export function verifyWhatsAppSignature(
  rawBody: Buffer | string | undefined,
  signature: string | undefined,
  appSecret: string | undefined,
) {
  if (!rawBody || !signature || !appSecret) return false;
  const expected = crypto
    .createHmac("sha256", appSecret)
    .update(rawBody)
    .digest("hex");
  const received = signature.startsWith("sha256=")
    ? signature.slice(7)
    : signature;

  try {
    return crypto.timingSafeEqual(
      Buffer.from(received, "hex"),
      Buffer.from(expected, "hex"),
    );
  } catch {
    return false;
  }
}

export async function sendWhatsAppTextMessage({
  workspace,
  to,
  body,
}: {
  workspace: IWhatsAppWorkspace;
  to: string;
  body: string;
}) {
  const accessToken = getWhatsAppSendAccessToken(workspace);
  if (!workspace.meta?.phoneNumberId || !accessToken) {
    throw new Error("WhatsApp Meta credentials are not configured");
  }

  const version = workspace.meta.graphApiVersion || defaultWhatsAppGraphApiVersion;
  const response = await fetch(
    `https://graph.facebook.com/${version}/${workspace.meta.phoneNumberId}/messages`,
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
        type: "text",
        text: { preview_url: false, body },
      }),
    },
  );

  const result = await response.json();
  if (!response.ok) {
    throw new Error(
      buildWhatsAppSendError(result, "Failed to send WhatsApp message"),
    );
  }
  return result;
}

const buildWhatsAppSendError = (result: any, fallback: string) => {
  const error = result?.error || {};
  return [
    error.message || fallback,
    error.error_user_title,
    error.error_user_msg,
    error.type ? `type=${error.type}` : "",
    error.code ? `code=${error.code}` : "",
    error.error_subcode ? `subcode=${error.error_subcode}` : "",
    error.fbtrace_id ? `fbtrace_id=${error.fbtrace_id}` : "",
  ]
    .filter(Boolean)
    .join(" | ");
};

export async function sendWhatsAppFlowMessage({
  workspace,
  to,
  body,
}: {
  workspace: IWhatsAppWorkspace;
  to: string;
  body?: string;
}) {
  const accessToken = getWhatsAppSendAccessToken(workspace);
  if (!workspace.meta?.phoneNumberId || !accessToken) {
    throw new Error("WhatsApp Meta credentials are not configured");
  }

  const flowId = workspace.appointmentFlow?.flowId;
  if (!flowId || workspace.appointmentFlow?.status !== "published") {
    throw new Error("Appointment WhatsApp Flow is not published");
  }

  const businessName = workspace.organization?.name || "our business";
  const version = workspace.meta.graphApiVersion || defaultWhatsAppGraphApiVersion;
  const response = await fetch(
    `https://graph.facebook.com/${version}/${workspace.meta.phoneNumberId}/messages`,
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
        type: "interactive",
        interactive: {
          type: "flow",
          header: {
            type: "text",
            text: "Book appointment",
          },
          body: {
            text:
              body ||
              `Please fill the appointment form for ${businessName}. Our team will confirm the slot.`,
          },
          footer: {
            text: "Powered by RocketReplai",
          },
          action: {
            name: "flow",
            parameters: {
              flow_message_version: "3",
              flow_id: flowId,
              flow_cta: "Book appointment",
              flow_action: "navigate",
              flow_token: String(workspace._id),
              flow_action_payload: {
                screen: "APPOINTMENT_FORM",
                data: {
                  workspace_id: String(workspace._id),
                  waba_id: workspace.meta?.wabaId || "",
                  phone_number_id: workspace.meta?.phoneNumberId || "",
                },
              },
            },
          },
        },
      }),
    },
  );

  const result = await response.json();
  if (!response.ok) {
    throw new Error(buildWhatsAppSendError(result, "Failed to send WhatsApp Flow"));
  }
  return result;
}

export async function sendWhatsAppButtonMessage({
  workspace,
  to,
  body,
  buttons,
}: {
  workspace: IWhatsAppWorkspace;
  to: string;
  body: string;
  buttons: Array<{ id: string; title: string }>;
}) {
  const accessToken = getWhatsAppSendAccessToken(workspace);
  if (!workspace.meta?.phoneNumberId || !accessToken) {
    throw new Error("WhatsApp Meta credentials are not configured");
  }

  const version = workspace.meta.graphApiVersion || defaultWhatsAppGraphApiVersion;
  const response = await fetch(
    `https://graph.facebook.com/${version}/${workspace.meta.phoneNumberId}/messages`,
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
        type: "interactive",
        interactive: {
          type: "button",
          body: { text: body },
          action: {
            buttons: buttons.slice(0, 3).map((button) => ({
              type: "reply",
              reply: {
                id: button.id,
                title: button.title.slice(0, 20),
              },
            })),
          },
        },
      }),
    },
  );

  const result = await response.json();
  if (!response.ok) {
    throw new Error(
      buildWhatsAppSendError(result, "Failed to send WhatsApp buttons"),
    );
  }
  return result;
}

const businessKnowledgeCache = new Map<
  string,
  { content: string; expiresAt: number }
>();

const downloadBusinessKnowledge = async (url?: string) => {
  if (!url) return "";
  const cached = businessKnowledgeCache.get(url);
  if (cached && cached.expiresAt > Date.now()) return cached.content;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);
  try {
    const response = await fetch(url, { signal: controller.signal });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const text = await response.text();
    businessKnowledgeCache.set(url, {
      content: text,
      expiresAt: Date.now() + 5 * 60 * 1000,
    });
    return text;
  } catch (error) {
    console.warn("[whatsapp:business-info] Could not load Cloudinary knowledge", {
      url,
      error: error instanceof Error ? error.message : String(error),
    });
    return "";
  } finally {
    clearTimeout(timeout);
  }
};

const formatBusinessKnowledge = (rawKnowledge: string) => {
  if (!rawKnowledge) return "";
  try {
    const data = JSON.parse(rawKnowledge);
    const websitePages = Array.isArray(data.website?.pages)
      ? data.website.pages
      : Array.isArray(data.pages)
        ? data.pages
        : [];
    const websiteContent = websitePages
      .map((page: any) =>
        [`Page: ${page?.url || "Website"}`, page?.content || page?.fullText || ""]
          .filter(Boolean)
          .join("\n"),
      )
      .join("\n\n");
    const parts = [
      data.summary ? `Summary: ${data.summary}` : "",
      websiteContent ? `Website content:\n${websiteContent}` : "",
      data.website?.title ? `Website title: ${data.website.title}` : "",
      data.website?.description
        ? `Website description: ${data.website.description}`
        : "",
      data.website?.content ? `Website content: ${data.website.content}` : "",
      data.file?.name ? `Document: ${data.file.name}` : "",
      data.file?.content ? `Document content: ${data.file.content}` : "",
    ].filter(Boolean);
    return parts.join("\n").slice(0, 1500);
  } catch {
    return rawKnowledge.slice(0, 1500);
  }
};

async function buildBusinessInfoReply({
  businessName,
  inboundBody,
  businessInfo,
}: {
  businessName: string;
  inboundBody: string;
  businessInfo?: IWhatsAppWorkspace["businessInfo"];
}) {
  const text = inboundBody.toLowerCase();

  if (/human|agent|owner|support|call|complaint|refund|angry|bad/.test(text)) {
    return null;
  }

  const cloudinaryKnowledge = await downloadBusinessKnowledge(
    businessInfo?.knowledgeBaseUrl ||
      businessInfo?.websiteKnowledgeUrl ||
      businessInfo?.fileKnowledgeUrl,
  );
  const knowledgeText = [
    businessInfo?.summary,
    formatBusinessKnowledge(cloudinaryKnowledge),
    businessInfo?.fileText,
    businessInfo?.websiteUrl ? `Website: ${businessInfo.websiteUrl}` : "",
  ]
    .filter(Boolean)
    .join("\n")
    .slice(0, 900);

  if (!knowledgeText) {
    return `Hi, thanks for messaging ${businessName}. Please share what you need help with, or tap Book appointment to request a booking.`;
  }

  if (/price|pricing|cost|plan|demo|buy|service|about|timing|hours|location|address|website|offer/i.test(text)) {
    return `Here is the business information for ${businessName}:\n\n${knowledgeText}\n\nReply with Book appointment if you want to request a booking.`;
  }

  return `Thanks for messaging ${businessName}. Based on the saved business information:\n\n${knowledgeText}\n\nPlease share your requirement, or reply Book appointment to request a booking.`;
}

const hasAppointmentIntent = (body: string) =>
  /appointment|book|booking|visit|consult|consultation|doctor|clinic|slot|available|tomorrow|today/i.test(
    body,
  );

const isAppointmentStart = (body: string) =>
  /^(book appointment|start booking|appointment booking|book now)$/i.test(
    body.trim(),
  );

const isGreetingIntent = (body: string) =>
  /^(hi+|hii+|hello+|hey+|hy|namaste|menu|start|help)(\s|!|\.|,|$)/i.test(
    body.trim(),
  );

const buildGreetingText = (workspace: IWhatsAppWorkspace) => {
  const businessName = workspace.organization?.name || "our business";
  const template = workspace.greetingTemplate;
  if (template?.status === "approved" && template.body) {
    return template.body.replace(/\{\{\s*1\s*\}\}/g, businessName);
  }
  return `Hi, thanks for messaging ${businessName}. How can we help you today?`;
};

const isMetaMessagingPermissionError = (error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  return /#200|necessary permission|send messages on behalf/i.test(message);
};

const recordWhatsAppSendFailure = ({
  workspace,
  error,
  context,
  waId,
}: {
  workspace: IWhatsAppWorkspace;
  error: unknown;
  context: string;
  waId: string;
}) => {
  if (!isMetaMessagingPermissionError(error)) return;

  const message = error instanceof Error ? error.message : String(error);
  workspace.onboarding = {
    ...workspace.onboarding,
    lastError:
      "Meta blocked outbound WhatsApp replies. Reconnect this WhatsApp Business account with whatsapp_business_messaging permission.",
  } as any;
  console.error("[whatsapp:send:permission-blocked]", {
    context,
    waId,
    workspaceId: String(workspace._id),
    wabaId: workspace.meta?.wabaId || null,
    phoneNumberId: workspace.meta?.phoneNumberId || null,
    hasAccessToken: Boolean(workspace.meta?.accessToken),
    tokenSource: getWhatsAppSendTokenSource(workspace),
    error: message,
  });
};

const resolveUrgency = (
  body: string,
  emergencyKeywords: string[] = [],
): "routine" | "urgent" | "emergency" => {
  const text = body.toLowerCase();
  if (emergencyKeywords.some((keyword) => text.includes(keyword.toLowerCase()))) {
    return "emergency";
  }
  if (/urgent|asap|today|pain|fever|swelling/i.test(body)) return "urgent";
  return "routine";
};

const inferService = (body: string, services: any[] = []) => {
  const matchedService = services.find((service) =>
    body.toLowerCase().includes(String(service.name || "").toLowerCase()),
  );
  if (matchedService) return matchedService.name;
  if (/dental|tooth|teeth|gum/i.test(body)) return "Dental consultation";
  return services.find((service) => service.isActive)?.name || "General consultation";
};

const parseWhatsAppFlowResponse = (message: any) => {
  const rawResponse =
    message.interactive?.nfm_reply?.response_json ||
    message.interactive?.nfm_reply?.responseJson ||
    message.interactive?.nfm_reply?.body;
  if (!rawResponse) return null;

  if (typeof rawResponse === "object") return rawResponse;
  try {
    const parsed = JSON.parse(String(rawResponse));
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch {
    return null;
  }
};

const hasPublishedAppointmentFlow = (workspace: IWhatsAppWorkspace) =>
  Boolean(
    workspace.appointmentConfig?.enabled &&
      workspace.appointmentFlow?.enabled !== false &&
      workspace.appointmentFlow?.flowId &&
      workspace.appointmentFlow?.status === "published",
  );

const normalizeFlowText = (value: unknown) =>
  typeof value === "string" ? value.trim() : "";

const createAppointmentFromFlowResponse = ({
  workspace,
  flowResponse,
  contactName,
  waId,
}: {
  workspace: IWhatsAppWorkspace;
  flowResponse: Record<string, any>;
  contactName: string;
  waId: string;
}) => {
  const responseText = JSON.stringify(flowResponse);
  const patientName =
    normalizeFlowText(flowResponse.patient_name) ||
    normalizeFlowText(flowResponse.name) ||
    contactName ||
    "Unknown patient";
  const patientPhone =
    normalizeFlowText(flowResponse.phone) ||
    normalizeFlowText(flowResponse.mobile) ||
    waId;
  const service =
    normalizeFlowText(flowResponse.service) ||
    inferService(responseText, workspace.appointmentConfig?.services);
  const department = normalizeFlowText(flowResponse.department);
  const location = normalizeFlowText(flowResponse.location);
  const symptoms =
    normalizeFlowText(flowResponse.symptoms) ||
    normalizeFlowText(flowResponse.requirement) ||
    normalizeFlowText(flowResponse.reason) ||
    "Submitted via WhatsApp Flow";
  const preferredDate =
    normalizeFlowText(flowResponse.preferred_date) ||
    normalizeFlowText(flowResponse.date);
  const preferredTime =
    normalizeFlowText(flowResponse.preferred_time) ||
    normalizeFlowText(flowResponse.time);

  return {
    patientName,
    patientPhone,
    patientWaId: waId,
    service,
    symptoms,
    preferredDate,
    preferredTime,
    status: "requested" as const,
    source: "whatsapp" as const,
    urgency: resolveUrgency(
      responseText,
      workspace.appointmentConfig?.emergencyKeywords,
    ),
    notes: [
      "Created from native WhatsApp Flow submission.",
      department ? `Department: ${department}` : "",
      location ? `Location: ${location}` : "",
    ]
      .filter(Boolean)
      .join(" "),
    conversationWaId: waId,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
};

const hasRecentDuplicateAppointment = (
  workspace: IWhatsAppWorkspace,
  appointment: Record<string, any>,
) => {
  const createdAfter = Date.now() - 15 * 60 * 1000;
  return workspace.appointments.some((item: any) => {
    const createdAt = item.createdAt ? new Date(item.createdAt).getTime() : 0;
    return (
      createdAt >= createdAfter &&
      normalizeFlowText(item.patientPhone) ===
        normalizeFlowText(appointment.patientPhone) &&
      normalizeFlowText(item.preferredDate) ===
        normalizeFlowText(appointment.preferredDate) &&
      normalizeFlowText(item.preferredTime) ===
        normalizeFlowText(appointment.preferredTime) &&
      normalizeFlowText(item.service) === normalizeFlowText(appointment.service)
    );
  });
};

const buildFlowNotReadyReply = (workspace: IWhatsAppWorkspace) =>
  `Appointment booking is being prepared for ${
    workspace.organization?.name || "this business"
  }. Please message your requirement and the team will follow up.`;

export async function processWhatsAppWebhook(payload: any) {
  const changes = payload?.entry?.flatMap((entry: any) => entry.changes || []) || [];
  const results: string[] = [];
  console.info("[whatsapp:process] Processing webhook payload", {
    entries: payload?.entry?.length || 0,
    changes: changes.length,
  });

  for (const change of changes) {
    const value = change.value || {};
    const phoneNumberId = value.metadata?.phone_number_id;
    const messages = value.messages || [];
    const statuses = value.statuses || [];
    if (!phoneNumberId) {
      if (!messages.length && !statuses.length) {
        console.info(
          "[whatsapp:process] Ignoring non-message change without phone number ID",
          {
            field: change.field || "unknown",
            valueKeys: Object.keys(value),
          },
        );
        continue;
      }

      console.warn("[whatsapp:process] Skipping processable change without phone number ID", {
        field: change.field || "unknown",
        messages: messages.length,
        statuses: statuses.length,
      });
      continue;
    }

    const workspace = await WhatsAppWorkspace.findOne({
      "meta.phoneNumberId": phoneNumberId,
    });
    if (!workspace) {
      console.warn("[whatsapp:process] No workspace found for phone number ID", {
        phoneNumberId,
      });
      continue;
    }

    console.info("[whatsapp:process] Workspace matched", {
      phoneNumberId,
      workspaceId: String(workspace._id),
      inboundMessages: messages.length,
      statuses: statuses.length,
      isConfigured: workspace.isConfigured,
    });
    const createdAppointmentAlerts: Array<Record<string, any>> = [];

    for (const message of messages) {
      const waId = message.from;
      const profile = value.contacts?.find((contact: any) => contact.wa_id === waId);
      const flowResponse = parseWhatsAppFlowResponse(message);
      const body =
        message.text?.body ||
        message.button?.text ||
        message.interactive?.button_reply?.title ||
        message.interactive?.nfm_reply?.body ||
        (flowResponse ? "WhatsApp Flow submission" : "") ||
        message.type ||
        "";
      const now = new Date();
      const contactName = profile?.profile?.name || waId;

      const existingContact = workspace.contacts.find(
        (contact) => contact.waId === waId,
      );
      if (existingContact) {
        existingContact.name = contactName;
        existingContact.lastMessageAt = now;
      } else {
        workspace.contacts.push({
          waId,
          name: contactName,
          phone: waId,
          consentStatus: "unknown",
          lifecycleStage: "lead",
          intentScore: body.match(/price|demo|buy|plan|cost/i) ? 85 : 45,
          tags: [],
          lastMessageAt: now,
          createdAt: now,
        });
      }

      let conversation = workspace.conversations.find(
        (item) => item.waId === waId && item.status !== "resolved",
      );
      if (!conversation) {
        workspace.conversations.push({
          waId,
          contactName,
          phone: waId,
          lastMessage: body,
          owner: "ai",
          status: body.match(/human|agent|owner|support|call/i)
            ? "pending_human"
            : "open",
          intent: body.match(/refund|support|issue|problem/i)
            ? "support"
            : body.match(/price|demo|buy|plan|cost/i)
              ? "sales"
              : "general",
          sentiment: body.match(/angry|bad|refund|complaint/i)
            ? "negative"
            : "neutral",
          messages: [],
          createdAt: now,
          updatedAt: now,
        });
        conversation = workspace.conversations[workspace.conversations.length - 1];
      }

      conversation.lastMessage = body;
      conversation.updatedAt = now;
      conversation.messages.push({
        providerMessageId: message.id,
        direction: "inbound",
        type: message.type || "text",
        body,
        status: "received",
        createdAt: now,
      });
      results.push(message.id);

      const wantsHumanFollowup = /human|agent|owner|support|call/i.test(body);
      const explicitAutomationIntent =
        Boolean(flowResponse) ||
        isGreetingIntent(body) ||
        isAppointmentStart(body) ||
        hasAppointmentIntent(body) ||
        /pricing_services|pricing|services|price|cost|menu|start/i.test(body);

      if (wantsHumanFollowup) {
        conversation.status = "pending_human";
      } else if (conversation.status === "pending_human") {
        conversation.status = "open";
        conversation.owner = "ai";
      }

      const canAutoReply =
        workspace.isConfigured &&
        workspace.subscription.messagesUsed < workspace.subscription.messageLimit &&
        conversation.status !== "pending_human" &&
        !wantsHumanFollowup;

      if (flowResponse && workspace.appointmentConfig?.enabled) {
        const appointmentPayload = createAppointmentFromFlowResponse({
          workspace,
          flowResponse,
          contactName,
          waId,
        });
        const duplicateAppointment = hasRecentDuplicateAppointment(
          workspace,
          appointmentPayload,
        );
        if (!duplicateAppointment) {
          workspace.appointments.push(appointmentPayload);
          createdAppointmentAlerts.push(appointmentPayload);
        }

        if (canAutoReply) {
          const reply =
            workspace.appointmentFlow?.successMessage ||
            `Appointment request received for ${appointmentPayload.patientName}. ${
              workspace.appointmentConfig?.clinicName ||
              workspace.organization?.name ||
              "Our team"
            } will confirm the slot soon.`;
          try {
            const sendResult = await sendWhatsAppTextMessage({
              workspace,
              to: waId,
              body: reply,
            });
            conversation.lastMessage = reply;
            conversation.owner = "ai";
            conversation.messages.push({
              providerMessageId: sendResult?.messages?.[0]?.id,
              direction: "outbound",
              type: "text",
              body: reply,
              status: "sent",
              createdAt: new Date(),
            });
            workspace.subscription.messagesUsed += 1;
          } catch (error) {
            console.error("WhatsApp Flow confirmation failed:", error);
            recordWhatsAppSendFailure({
              workspace,
              error,
              context: "flow_confirmation",
              waId,
            });
            conversation.status = "pending_human";
          }
        }
        continue;
      }

      if (canAutoReply) {
        if (isGreetingIntent(body)) {
          const reply = buildGreetingText(workspace);
          try {
            const sendResult = await sendWhatsAppButtonMessage({
              workspace,
              to: waId,
              body: reply,
              buttons: [
                { id: "book_appointment", title: "Book appointment" },
                { id: "pricing_services", title: "Pricing/services" },
                { id: "talk_to_owner", title: "Talk to owner" },
              ],
            });
            conversation.lastMessage = reply;
            conversation.owner = "ai";
            conversation.messages.push({
              providerMessageId: sendResult?.messages?.[0]?.id,
              direction: "outbound",
              type: "interactive",
              body: `${reply}\n\n[Book appointment] [Pricing/services] [Talk to owner]`,
              status: "sent",
              createdAt: new Date(),
            });
            workspace.subscription.messagesUsed += 1;
          } catch (error) {
            console.error("WhatsApp greeting menu send failed:", error);
            recordWhatsAppSendFailure({
              workspace,
              error,
              context: "greeting_menu",
              waId,
            });
            conversation.status = "pending_human";
          }
          continue;
        }

        const shouldOfferAppointmentFlow =
          workspace.appointmentConfig?.enabled &&
          (isAppointmentStart(body) ||
            hasAppointmentIntent(body));

        if (shouldOfferAppointmentFlow) {
          const reply = hasPublishedAppointmentFlow(workspace)
            ? `Please fill the appointment form for ${workspace.organization?.name || "this business"}.`
            : buildFlowNotReadyReply(workspace);
          try {
            const sendResult = hasPublishedAppointmentFlow(workspace)
              ? await sendWhatsAppFlowMessage({
                  workspace,
                  to: waId,
                  body: reply,
                })
              : await sendWhatsAppTextMessage({
                  workspace,
                  to: waId,
                  body: reply,
                });
            conversation.lastMessage = reply;
            conversation.owner = "ai";
            conversation.messages.push({
              providerMessageId: sendResult?.messages?.[0]?.id,
              direction: "outbound",
              type: hasPublishedAppointmentFlow(workspace) ? "interactive" : "text",
              body: hasPublishedAppointmentFlow(workspace)
                ? `${reply}\n\n[Native WhatsApp appointment Flow]`
                : reply,
              status: "sent",
              createdAt: new Date(),
            });
            workspace.subscription.messagesUsed += 1;
          } catch (error) {
            console.error("WhatsApp appointment Flow send failed:", error);
            recordWhatsAppSendFailure({
              workspace,
              error,
              context: "appointment_flow",
              waId,
            });
            conversation.status = "pending_human";
          }
          continue;
        }

        const reply = await buildBusinessInfoReply({
          businessName: workspace.organization?.name || "our business",
          inboundBody: body,
          businessInfo: workspace.businessInfo,
        });

        if (reply) {
          try {
            const sendResult = await sendWhatsAppTextMessage({
              workspace,
              to: waId,
              body: body.trim().length <= 3 ? buildGreetingText(workspace) : reply,
            });
            conversation.lastMessage = reply;
            conversation.owner = "ai";
            conversation.messages.push({
              providerMessageId: sendResult?.messages?.[0]?.id,
              direction: "outbound",
              type: "text",
              body: reply,
              status: "sent",
              createdAt: new Date(),
            });
            workspace.subscription.messagesUsed += 1;
          } catch (error) {
            console.error("WhatsApp auto-reply failed:", error);
            recordWhatsAppSendFailure({
              workspace,
              error,
              context: "business_info_reply",
              waId,
            });
            conversation.status = "pending_human";
          }
        } else {
          conversation.status = "pending_human";
        }
      } else {
        console.info("[whatsapp:process] Auto-reply skipped", {
          waId,
          isConfigured: workspace.isConfigured,
          messagesUsed: workspace.subscription.messagesUsed,
          messageLimit: workspace.subscription.messageLimit,
          conversationStatus: conversation.status,
          wantsHumanFollowup,
          explicitAutomationIntent,
        });
      }
    }

    for (const status of statuses) {
      const conversation = workspace.conversations.find((item) =>
        item.messages.some((message) => message.providerMessageId === status.id),
      );
      const trackedMessage = conversation?.messages.find(
        (message) => message.providerMessageId === status.id,
      );
      if (trackedMessage) trackedMessage.status = status.status;
    }

    await workspace.save();
    for (const appointment of createdAppointmentAlerts) {
      sendAppointmentNotifications({
        userId: workspace.clerkId,
        source: "whatsapp",
        sourceRef: `${phoneNumberId}:${appointment.patientWaId}:${new Date(
          appointment.createdAt,
        ).getTime()}`,
        appointment: objectToAppointmentAlert(appointment),
        ownerEmail: workspace.notificationSettings?.email,
        ownerWhatsAppNumber: workspace.notificationSettings?.whatsappNumber,
        emailEnabled: workspace.notificationSettings?.emailEnabled !== false,
        whatsappEnabled:
          workspace.notificationSettings?.whatsappEnabled !== false,
        dashboardPath: "/whatsapp/appointments",
      }).catch((error) => {
        console.error("WhatsApp appointment notification error:", error);
      });
    }
    console.info("[whatsapp:process] Workspace saved", {
      workspaceId: String(workspace._id),
      contacts: workspace.contacts.length,
      conversations: workspace.conversations.length,
      appointments: workspace.appointments.length,
      messagesUsed: workspace.subscription.messagesUsed,
    });
  }

  return { processedMessageIds: results };
}
