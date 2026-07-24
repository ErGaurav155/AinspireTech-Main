import crypto from "crypto";
import { connectToDatabase } from "@/config/database.config";
import WhatsAppWorkspace, {
  IWhatsAppWorkspace,
  WhatsAppPlanId,
} from "@/models/whatsapp/WhatsAppWorkspace.model";
import {
  objectToAppointmentAlert,
  processAppointmentWhatsAppStatuses,
  sendAppointmentNotifications,
} from "@/services/appointment-notification.service";
import {
  ConvMessage,
  generateWhatsAppAiResponse,
  WhatsAppAiDecision,
} from "@/services/ai.service";

const defaultAppointmentChatQuestions = [
  {
    id: "name",
    field: "patientName",
    question: "What is your full name?",
    type: "text",
    required: true,
    options: [],
  },
  {
    id: "email",
    field: "patientEmail",
    question: "What is your email address?",
    type: "email",
    required: false,
    options: [],
  },
  {
    id: "service",
    field: "service",
    question: "Which service do you need?",
    type: "select",
    required: true,
    options: [],
  },
  {
    id: "date",
    field: "preferredDate",
    question: "Choose your preferred date.",
    type: "date",
    required: true,
    options: [],
  },
  {
    id: "time",
    field: "preferredTime",
    question: "Choose your preferred time.",
    type: "time",
    required: true,
    options: [],
  },
  {
    id: "requirement",
    field: "symptoms",
    question: "Please describe your requirement.",
    type: "textarea",
    required: true,
    options: [],
  },
] as const;

const defaultAutomationMenuOptions = [
  {
    id: "book_appointment",
    title: "Book appointment",
    description: "Choose a service, date and time",
    enabled: true,
  },
  {
    id: "talk_to_owner",
    title: "Talk to owner",
    description: "Get the owner's contact details",
    enabled: true,
  },
  {
    id: "need_support",
    title: "Need support",
    description: "Describe an issue for assistance",
    enabled: true,
  },
  {
    id: "service_pricing",
    title: "Service pricing",
    description: "View services and prices",
    enabled: true,
  },
  {
    id: "browse_faqs",
    title: "FAQs",
    description: "Browse common questions",
    enabled: true,
  },
] as const;

const createDefaultAutomationConfig = () => ({
  enabled: true,
  greetingMessage: "Hi, thanks for messaging us. How can we help you today?",
  menuMessage:
    "Choose an option below, or type your question for an AI-assisted reply.",
  supportPrompt:
    "We are listening. Please explain the issue in detail and we will help you.",
  pricingMessage: "Choose a service to view pricing and booking options.",
  negotiationMessage:
    "Need a custom quote? We are open to discussing your requirements.",
  ownerContactMessage:
    "You can contact the business owner using the details below.",
  menuOptions: defaultAutomationMenuOptions.map((item) => ({ ...item })),
  appointmentQuestions: defaultAppointmentChatQuestions.map((item) => ({
    ...item,
    options: [...item.options],
  })),
  followUps: {
    enabled: true,
    firstDelayMinutes: 30,
    secondDelayMinutes: 180,
    firstMessage:
      "Do you need any more information or help booking an appointment?",
    secondMessage:
      "We are still available if you would like to discuss your requirement or book an appointment.",
  },
});

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
      "Guided appointment booking",
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
      "Guided appointment booking",
      "Business info replies from website/file notes",
      "Configurable menus, services and FAQs",
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
      "Guided appointment booking",
      "Business info replies",
      "Configurable menus, services and FAQs",
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

type WhatsAppAccessTokenCandidate = {
  accessToken: string;
  source: "system_user_env" | "workspace_token";
};

const getWhatsAppAccessTokenCandidates = (
  workspace: IWhatsAppWorkspace,
): WhatsAppAccessTokenCandidate[] => {
  const candidates: WhatsAppAccessTokenCandidate[] = [];
  const systemUserToken = process.env.WHATSAPP_SYSTEM_USER_ACCESS_TOKEN?.trim();
  const workspaceToken = workspace.meta?.accessToken?.trim();

  if (systemUserToken) {
    candidates.push({
      accessToken: systemUserToken,
      source: "system_user_env",
    });
  }
  if (workspaceToken && workspaceToken !== systemUserToken) {
    candidates.push({
      accessToken: workspaceToken,
      source: "workspace_token",
    });
  }

  return candidates;
};

const getWhatsAppSendTokenSource = (workspace: IWhatsAppWorkspace) =>
  getWhatsAppAccessTokenCandidates(workspace)[0]?.source || "missing";

export const sanitizeWorkspace = (workspace: IWhatsAppWorkspace) => {
  const data = workspace.toObject ? workspace.toObject() : workspace;
  const {
    appointmentFlow: _appointmentFlow,
    greetingTemplate: _greetingTemplate,
    agents: _agents,
    templates: _templates,
    campaigns: _campaigns,
    ...workspaceData
  } = data as any;
  return {
    ...workspaceData,
    meta: {
      ...workspaceData.meta,
      appSecret: maskSecret(workspaceData.meta?.appSecret),
      accessToken: maskSecret(workspaceData.meta?.accessToken),
    },
  };
};

export const pruneExpiredWhatsAppAppointments = (
  workspace: IWhatsAppWorkspace,
) => {
  const now = Date.now();
  let changed = false;
  const originalCount = workspace.appointments?.length || 0;
  const retained = (workspace.appointments || []).filter((appointment: any) => {
    const createdAt = appointment.createdAt
      ? new Date(appointment.createdAt).getTime()
      : now;
    const expiresAt = appointment.expiresAt
      ? new Date(appointment.expiresAt).getTime()
      : createdAt + 14 * 24 * 60 * 60 * 1000;
    if (!appointment.expiresAt) {
      appointment.expiresAt = new Date(expiresAt);
      changed = true;
    }
    if (appointment.status === "requested") {
      appointment.status = "active";
      changed = true;
    }
    if (expiresAt <= now) {
      changed = true;
      return false;
    }
    return true;
  });

  if (changed) {
    workspace.appointments = retained as any;
    workspace.markModified("appointments");
  }
  return originalCount - retained.length;
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
    if (!workspace.automationConfig) {
      workspace.automationConfig = createDefaultAutomationConfig() as any;
    }
    if (!Array.isArray(workspace.faqs)) {
      workspace.faqs = [] as any;
    }
    pruneExpiredWhatsAppAppointments(workspace);
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
        chatQuestions: defaultAppointmentChatQuestions.map((item) => ({
          ...item,
        })),
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
        { day: "monday", isOpen: true, open: "09:00", close: "17:00" },
        { day: "tuesday", isOpen: true, open: "09:00", close: "17:00" },
        { day: "wednesday", isOpen: true, open: "09:00", close: "17:00" },
        { day: "thursday", isOpen: true, open: "09:00", close: "17:00" },
        { day: "friday", isOpen: true, open: "09:00", close: "17:00" },
        { day: "saturday", isOpen: true, open: "09:00", close: "14:00" },
        { day: "sunday", isOpen: false, open: "09:00", close: "14:00" },
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
    automationConfig: createDefaultAutomationConfig(),
    faqs: [],
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
      chatQuestions: defaultAppointmentChatQuestions.map((item) => ({
        ...item,
      })),
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

const isRetryableWhatsAppTokenError = (result: any) => {
  const code = Number(result?.error?.code);
  return code === 190 || code === 200;
};

const whatsappGraphMessagesRequest = async ({
  workspace,
  payload,
  fallbackError,
}: {
  workspace: IWhatsAppWorkspace;
  payload: Record<string, unknown>;
  fallbackError: string;
}) => {
  if (!workspace.meta?.phoneNumberId) {
    throw new Error("WhatsApp phone number ID is not configured");
  }

  const tokenCandidates = getWhatsAppAccessTokenCandidates(workspace);
  if (!tokenCandidates.length) {
    throw new Error("WhatsApp access token is not configured");
  }

  const version = workspace.meta.graphApiVersion || defaultWhatsAppGraphApiVersion;
  let lastResult: any;
  let lastSource = tokenCandidates[0].source;

  for (let index = 0; index < tokenCandidates.length; index += 1) {
    const candidate = tokenCandidates[index];
    lastSource = candidate.source;
    const response = await fetch(
      `https://graph.facebook.com/${version}/${workspace.meta.phoneNumberId}/messages`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${candidate.accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      },
    );
    const result = await response.json();
    if (response.ok) {
      if (index > 0) {
        console.warn("[whatsapp:send] Primary token rejected; fallback succeeded", {
          workspaceId: String(workspace._id),
          phoneNumberId: workspace.meta.phoneNumberId,
          tokenSource: candidate.source,
        });
      }
      return result;
    }

    lastResult = result;
    const hasFallback = index < tokenCandidates.length - 1;
    if (!hasFallback || !isRetryableWhatsAppTokenError(result)) break;

    console.warn("[whatsapp:send] Token rejected; trying workspace fallback", {
      workspaceId: String(workspace._id),
      phoneNumberId: workspace.meta.phoneNumberId,
      tokenSource: candidate.source,
      code: result?.error?.code,
      subcode: result?.error?.error_subcode,
    });
  }

  throw new Error(
    `${buildWhatsAppSendError(lastResult, fallbackError)} | token_source=${lastSource}`,
  );
};

export async function markWhatsAppMessageRead({
  workspace,
  messageId,
  showTyping = false,
}: {
  workspace: IWhatsAppWorkspace;
  messageId: string;
  showTyping?: boolean;
}) {
  return whatsappGraphMessagesRequest({
    workspace,
    fallbackError: "Failed to update WhatsApp message activity",
    payload: {
      messaging_product: "whatsapp",
      status: "read",
      message_id: messageId,
      ...(showTyping
        ? {
            typing_indicator: {
              type: "text",
            },
          }
        : {}),
    },
  });
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
  return whatsappGraphMessagesRequest({
    workspace,
    fallbackError: "Failed to send WhatsApp message",
    payload: {
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to,
      type: "text",
      text: { preview_url: false, body },
    },
  });
}

export async function sendWhatsAppFlowMessage({
  workspace,
  to,
  body,
}: {
  workspace: IWhatsAppWorkspace;
  to: string;
  body?: string;
}) {
  const flowId = workspace.appointmentFlow?.flowId;
  if (!flowId || workspace.appointmentFlow?.status !== "published") {
    throw new Error("Appointment WhatsApp Flow is not published");
  }

  const businessName = workspace.organization?.name || "our business";
  return whatsappGraphMessagesRequest({
    workspace,
    fallbackError: "Failed to send WhatsApp Flow",
    payload: {
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
    },
  });
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
  return whatsappGraphMessagesRequest({
    workspace,
    fallbackError: "Failed to send WhatsApp buttons",
    payload: {
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to,
      type: "interactive",
      interactive: {
        type: "button",
        body: { text: body.slice(0, 1024) },
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
    },
  });
}

export async function sendWhatsAppListMessage({
  workspace,
  to,
  body,
  buttonText,
  rows,
}: {
  workspace: IWhatsAppWorkspace;
  to: string;
  body: string;
  buttonText: string;
  rows: Array<{ id: string; title: string; description?: string }>;
}) {
  return whatsappGraphMessagesRequest({
    workspace,
    fallbackError: "Failed to send WhatsApp list",
    payload: {
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to,
      type: "interactive",
      interactive: {
        type: "list",
        body: { text: body.slice(0, 1024) },
        action: {
          button: buttonText.slice(0, 20),
          sections: [
            {
              title: "Options",
              rows: rows.slice(0, 10).map((row) => {
                const description = String(row.description || "")
                  .trim()
                  .slice(0, 72);
                return {
                  id: row.id.slice(0, 200),
                  title: row.title.slice(0, 24),
                  ...(description ? { description } : {}),
                };
              }),
            },
          ],
        },
      },
    },
  });
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
    return parts.join("\n").slice(0, 10000);
  } catch {
    return rawKnowledge.slice(0, 10000);
  }
};

async function buildBusinessKnowledgeContext(
  workspace: IWhatsAppWorkspace,
) {
  const businessInfo = workspace.businessInfo;
  const cloudinaryKnowledge = await downloadBusinessKnowledge(
    businessInfo?.knowledgeBaseUrl ||
      businessInfo?.websiteKnowledgeUrl ||
      businessInfo?.fileKnowledgeUrl,
  );
  return [
    `Business name: ${workspace.organization?.name || "Business"}`,
    workspace.organization?.industry
      ? `Industry: ${workspace.organization.industry}`
      : "",
    workspace.appointmentConfig?.services?.length
      ? `Services and pricing:\n${workspace.appointmentConfig.services
          .filter((service) => service.isActive)
          .map((service) =>
            [
              `- ${service.name}`,
              service.priceInr
                ? `INR ${Number(service.priceInr).toLocaleString("en-IN")}`
                : "",
              service.description || "",
            ]
              .filter(Boolean)
              .join(" | "),
          )
          .join("\n")}`
      : "",
    workspace.faqs?.some((faq) => faq.isActive)
      ? `Frequently asked questions:\n${workspace.faqs
          .filter((faq) => faq.isActive)
          .slice(0, 20)
          .map((faq) => `Q: ${faq.question}\nA: ${faq.answer}`)
          .join("\n\n")}`
      : "",
    workspace.notificationSettings?.email
      ? `Owner support email: ${workspace.notificationSettings.email}`
      : "",
    workspace.notificationSettings?.whatsappNumber
      ? `Owner contact number: ${workspace.notificationSettings.whatsappNumber}`
      : "",
    businessInfo?.summary,
    formatBusinessKnowledge(cloudinaryKnowledge),
    businessInfo?.fileText,
    businessInfo?.websiteUrl ? `Website: ${businessInfo.websiteUrl}` : "",
  ]
    .filter(Boolean)
    .join("\n")
    .slice(0, 12000);
}

const isStaleAutomationHistory = (message: any) => {
  if (message?.direction !== "outbound") return false;
  const text = String(message?.body || "").toLowerCase();
  return (
    (text.includes("thanks for messaging") &&
      (text.includes("choose an option") || text.includes("share more detail"))) ||
    text.includes("[pricing/services]") ||
    text.includes("[book appointment]") ||
    text.includes("[talk to owner]")
  );
};

const toAiConversationHistory = (conversation: any): ConvMessage[] =>
  (conversation?.messages || [])
    .slice(0, -1)
    .filter(
      (message: any) => message?.body && !isStaleAutomationHistory(message),
    )
    .slice(-8)
    .map((message: any) => ({
      role: message.direction === "outbound" ? "assistant" : "user",
      content: String(message.body).slice(0, 1200),
    }));

const buildKnowledgeFallbackReply = (
  workspace: IWhatsAppWorkspace,
  knowledge: string,
) => {
  const businessName = workspace.organization?.name || "the business";
  const summary = String(workspace.businessInfo?.summary || "").trim();
  const knowledgeExcerpt = knowledge.trim().slice(0, 1800);
  const services = (workspace.appointmentConfig?.services || [])
    .filter((service) => service.isActive)
    .map((service) => {
      const price = Number(service.priceInr || 0);
      return price > 0
        ? `${service.name} - INR ${price.toLocaleString("en-IN")}`
        : service.name;
    })
    .filter(Boolean);
  const website = String(
    workspace.businessInfo?.websiteUrl || workspace.organization?.website || "",
  ).trim();

  return [
    summary ||
      knowledgeExcerpt ||
      `${businessName}'s business information is temporarily unavailable.`,
    services.length ? `Available services: ${services.join(", ")}.` : "",
    website ? `More information: ${website}` : "",
  ]
    .filter(Boolean)
    .join("\n\n")
    .slice(0, 3500);
};

const generateWorkspaceAiDecision = async ({
  workspace,
  conversation,
  body,
  firstMessage = false,
}: {
  workspace: IWhatsAppWorkspace;
  conversation: any;
  body: string;
  firstMessage?: boolean;
}): Promise<WhatsAppAiDecision> => {
  const businessName = workspace.organization?.name || "our business";
  let knowledge = "";
  try {
    knowledge = await buildBusinessKnowledgeContext(workspace);
    const conversationHistory = toAiConversationHistory(conversation);
    console.info("[whatsapp:ai] Generating response", {
      workspaceId: String(workspace._id),
      firstMessage,
      input: body.slice(0, 500),
      inputCharacters: body.length,
      historyMessages: conversationHistory.length,
      knowledgeCharacters: knowledge.length,
      hasKnowledgeUrl: Boolean(
        workspace.businessInfo?.knowledgeBaseUrl ||
          workspace.businessInfo?.websiteKnowledgeUrl ||
          workspace.businessInfo?.fileKnowledgeUrl,
      ),
      deepSeekConfigured: Boolean(process.env.DEEPSEEK_API_KEY),
    });
    const decision = await generateWhatsAppAiResponse({
      userInput: body,
      businessName,
      knowledge,
      conversationHistory,
      firstMessage,
    });
    console.info("[whatsapp:ai] Response generated", {
      workspaceId: String(workspace._id),
      intent: decision.intent,
      sentiment: decision.sentiment,
      replyCharacters: decision.reply.length,
      reply: decision.reply,
    });
    return decision;
  } catch (error) {
    console.error("[whatsapp:ai] Response generation failed", {
      workspaceId: String(workspace._id),
      deepSeekConfigured: Boolean(process.env.DEEPSEEK_API_KEY),
      knowledgeCharacters: knowledge.length,
      error: error instanceof Error ? error.message : String(error),
    });
    return {
      intent: "other",
      sentiment: "neutral",
      reply: buildKnowledgeFallbackReply(workspace, knowledge),
    };
  }
};

const buildGreetingText = (workspace: IWhatsAppWorkspace) => {
  const businessName = workspace.organization?.name || "our business";
  return String(
    workspace.automationConfig?.greetingMessage ||
      `Hi, thanks for messaging ${businessName}. How can we help you today?`,
  ).replace(/\{\{\s*(business|1)\s*\}\}/gi, businessName);
};

const getAutomationMenuRows = (workspace: IWhatsAppWorkspace) =>
  (workspace.automationConfig?.menuOptions || defaultAutomationMenuOptions)
    .filter((option: any) => option.enabled !== false)
    .slice(0, 10)
    .map((option: any) => ({
      id: String(option.id),
      title: String(option.title || option.id),
      description: String(option.description || ""),
    }));

const getInboundMessageCount = (conversation: any) =>
  (conversation?.messages || []).filter(
    (message: any) => message.direction === "inbound",
  ).length;

const canShowAutomationMenu = ({
  conversation,
  force = false,
}: {
  conversation: any;
  force?: boolean;
}) => {
  if (force) return true;
  const inboundMessageCount = getInboundMessageCount(conversation);
  const lastShownInboundCount = Number(
    conversation.automationMenu?.lastShownInboundCount || 0,
  );
  return (
    lastShownInboundCount === 0 ||
    inboundMessageCount - lastShownInboundCount >= 5
  );
};

const markAutomationMenuShown = (conversation: any) => {
  conversation.automationMenu = {
    lastShownAt: new Date(),
    lastShownInboundCount: getInboundMessageCount(conversation),
  };
};

const ownerContactReply = (workspace: IWhatsAppWorkspace) => {
  const settings = workspace.notificationSettings;
  const details = [
    settings?.whatsappNumber
      ? `WhatsApp/phone: ${settings.whatsappNumber}`
      : "",
    settings?.email ? `Email: ${settings.email}` : "",
    workspace.organization?.website
      ? `Website: ${workspace.organization.website}`
      : "",
  ].filter(Boolean);
  return [
    workspace.automationConfig?.ownerContactMessage ||
      "You can contact the business owner using the details below.",
    details.length
      ? details.join("\n")
      : "The owner has not added contact details yet. Please share your requirement here and the team will follow up.",
  ].join("\n\n");
};

const isMetaMessagingPermissionError = (error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  return /#200|code=190|Authentication Error|necessary permission|send messages on behalf/i.test(
    message,
  );
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
  const authenticationFailed = /code=190|Authentication Error/i.test(message);
  workspace.onboarding = {
    ...workspace.onboarding,
    lastError: authenticationFailed
      ? "Meta rejected the WhatsApp access token. Replace WHATSAPP_SYSTEM_USER_ACCESS_TOKEN or reconnect this WhatsApp Business account."
      : "Meta blocked outbound WhatsApp replies. Reconnect this WhatsApp Business account with whatsapp_business_messaging permission.",
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

const getAppointmentChatQuestions = (workspace: IWhatsAppWorkspace) => {
  const configured = workspace.automationConfig?.appointmentQuestions || [];
  const questions = configured
    .filter((item: any) => item?.id && item?.field && item?.question)
    .slice(0, 10)
    .map((item: any) => ({
      id: String(item.id),
      field: String(item.field),
      question: String(item.question).trim().slice(0, 240),
      type: String(item.type || "text"),
      required: item.required !== false,
      options: Array.isArray(item.options)
        ? item.options.map(String).filter(Boolean).slice(0, 10)
        : [],
    }));
  return questions.length
    ? questions
    : defaultAppointmentChatQuestions.map((item) => ({
        ...item,
        options: [...item.options],
      }));
};

const createAppointmentFromChatDraft = ({
  workspace,
  conversation,
  contactName,
  waId,
}: {
  workspace: IWhatsAppWorkspace;
  conversation: any;
  contactName: string;
  waId: string;
}) => {
  const answers = conversation.appointmentDraft?.answers || [];
  const answerMap = Object.fromEntries(
    answers.map((item: any) => [
      item.field,
      normalizeFlowText(item.answer),
    ]),
  );
  const customAnswers = answers
    .filter((item: any) => String(item.field).startsWith("custom:"))
    .map(
      (item: any) =>
        `${normalizeFlowText(item.question)}: ${normalizeFlowText(item.answer)}`,
    )
    .filter(Boolean);
  const responseText = JSON.stringify(answerMap);
  return {
    patientName: answerMap.patientName || contactName || "Unknown patient",
    patientPhone: waId,
    patientWaId: waId,
    patientEmail: answerMap.patientEmail || "",
    service:
      answerMap.service ||
      inferService(responseText, workspace.appointmentConfig?.services),
    symptoms: answerMap.symptoms || "Submitted through WhatsApp chat booking",
    preferredDate: answerMap.preferredDate || "",
    preferredTime: answerMap.preferredTime || "",
    status: "active" as const,
    source: "whatsapp" as const,
    urgency: resolveUrgency(
      responseText,
      workspace.appointmentConfig?.emergencyKeywords,
    ),
    notes: [
      "Created from guided WhatsApp chat booking.",
      ...customAnswers,
    ].join(" "),
    conversationWaId: waId,
    expiresAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
    createdAt: new Date(),
    updatedAt: new Date(),
  };
};

const zonedDateParts = (date: Date, timeZone: string) => {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const value = (type: string) =>
    Number(parts.find((part) => part.type === type)?.value || 0);
  return {
    year: value("year"),
    month: value("month"),
    day: value("day"),
    hour: value("hour"),
    minute: value("minute"),
  };
};

const dateKeyFromUtcDate = (date: Date) =>
  `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}-${String(date.getUTCDate()).padStart(2, "0")}`;

const getWorkingHoursForDate = (
  workspace: IWhatsAppWorkspace,
  dateKey: string,
) => {
  const [year, month, day] = dateKey.split("-").map(Number);
  const dayName = new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    timeZone: "UTC",
  })
    .format(new Date(Date.UTC(year, month - 1, day)))
    .toLowerCase();
  return workspace.appointmentConfig?.workingHours?.find(
    (hours) => hours.day.toLowerCase() === dayName,
  );
};

const getAvailableTimeRows = (
  workspace: IWhatsAppWorkspace,
  dateKey: string,
  requestedPage = 0,
) => {
  const workingHours = getWorkingHoursForDate(workspace, dateKey);
  if (!workingHours?.isOpen) return [];
  const parseMinutes = (value: string) => {
    const [hour, minute] = String(value || "").split(":").map(Number);
    return hour * 60 + minute;
  };
  const openMinutes = parseMinutes(workingHours.open || "09:00");
  const closeMinutes = parseMinutes(workingHours.close || "17:00");
  const interval = Math.max(
    15,
    Number(workspace.appointmentConfig?.slotDurationMinutes || 30),
  );
  const timezone =
    workspace.appointmentConfig?.timezone ||
    workspace.organization?.timeZone ||
    "Asia/Kolkata";
  const nowParts = zonedDateParts(new Date(), timezone);
  const todayKey = `${nowParts.year}-${String(nowParts.month).padStart(2, "0")}-${String(nowParts.day).padStart(2, "0")}`;
  const minimumMinutes =
    dateKey === todayKey
      ? nowParts.hour * 60 +
        nowParts.minute +
        Number(workspace.appointmentConfig?.bufferMinutes || 0)
      : openMinutes;
  const allRows: Array<{ id: string; title: string; description: string }> = [];
  for (let minutes = openMinutes; minutes < closeMinutes; minutes += interval) {
    if (minutes < minimumMinutes) continue;
    const hour = Math.floor(minutes / 60);
    const minute = minutes % 60;
    const value = `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
    const title = new Intl.DateTimeFormat("en-IN", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
      timeZone: "UTC",
    }).format(new Date(Date.UTC(2020, 0, 1, hour, minute)));
    allRows.push({
      id: `appointment_answer:preferredTime:${encodeURIComponent(value)}`,
      title,
      description: `${interval}-minute slot`,
    });
  }
  const pageSize = 8;
  const totalPages = Math.max(1, Math.ceil(allRows.length / pageSize));
  const numericPage = Number(requestedPage || 0);
  const page = Math.min(
    totalPages - 1,
    Math.max(0, Number.isFinite(numericPage) ? numericPage : 0),
  );
  const rows = allRows.slice(page * pageSize, (page + 1) * pageSize);
  if (page > 0) {
    rows.unshift({
      id: `appointment_time_page:${page - 1}`,
      title: "Earlier times",
      description: `Page ${page} of ${totalPages}`,
    });
  }
  if (page < totalPages - 1) {
    rows.push({
      id: `appointment_time_page:${page + 1}`,
      title: "Later times",
      description: `Page ${page + 2} of ${totalPages}`,
    });
  }
  return rows;
};

const getAvailableDateRows = (workspace: IWhatsAppWorkspace) => {
  const timezone =
    workspace.appointmentConfig?.timezone ||
    workspace.organization?.timeZone ||
    "Asia/Kolkata";
  const nowParts = zonedDateParts(new Date(), timezone);
  const start = new Date(
    Date.UTC(nowParts.year, nowParts.month - 1, nowParts.day),
  );
  const bookingWindow = Math.min(
    60,
    Math.max(1, Number(workspace.appointmentConfig?.bookingWindowDays || 14)),
  );
  const rows: Array<{ id: string; title: string; description: string }> = [];
  for (let offset = 0; offset < bookingWindow && rows.length < 10; offset += 1) {
    const date = new Date(start.getTime() + offset * 24 * 60 * 60 * 1000);
    const dateKey = dateKeyFromUtcDate(date);
    if (!getAvailableTimeRows(workspace, dateKey).length) continue;
    rows.push({
      id: `appointment_answer:preferredDate:${encodeURIComponent(dateKey)}`,
      title: new Intl.DateTimeFormat("en-IN", {
        weekday: "short",
        day: "2-digit",
        month: "short",
        timeZone: "UTC",
      }).format(date),
      description: dateKey,
    });
  }
  return rows;
};

const getAppointmentQuestionRows = ({
  workspace,
  conversation,
  question,
}: {
  workspace: IWhatsAppWorkspace;
  conversation: any;
  question: any;
}) => {
  if (question.type === "date") return getAvailableDateRows(workspace);
  if (question.type === "time") {
    const dateAnswer = conversation.appointmentDraft?.answers?.find(
      (answer: any) => answer.field === "preferredDate",
    )?.answer;
    return dateAnswer
      ? getAvailableTimeRows(
          workspace,
          dateAnswer,
          conversation.appointmentDraft?.timePage || 0,
        )
      : [];
  }
  if (question.type !== "select") return [];

  const options =
    question.field === "service" && !question.options?.length
      ? (workspace.appointmentConfig?.services || [])
          .filter((service) => service.isActive)
          .map((service) => service.name)
      : question.options || [];
  return options.slice(0, 10).map((option: string) => ({
    id: `appointment_answer:${question.field}:${encodeURIComponent(option)}`,
    title: option,
    description: "Select this option",
  }));
};

const resolveAppointmentAnswer = (replyId: string, fallbackBody: string) => {
  if (!replyId.startsWith("appointment_answer:")) return fallbackBody.trim();
  const value = replyId.split(":").slice(2).join(":");
  try {
    return decodeURIComponent(value).trim();
  } catch {
    return value.trim();
  }
};

const sendAppointmentQuestion = async ({
  workspace,
  conversation,
  to,
  question,
}: {
  workspace: IWhatsAppWorkspace;
  conversation: any;
  to: string;
  question: any;
}) => {
  const rows = getAppointmentQuestionRows({ workspace, conversation, question });
  if (rows.length) {
    return sendTrackedList({
      workspace,
      conversation,
      to,
      body: question.question,
      buttonText:
        question.type === "date"
          ? "Choose date"
          : question.type === "time"
            ? "Choose time"
            : "Choose option",
      rows,
    });
  }
  return sendTrackedText({
    workspace,
    conversation,
    to,
    body: question.question,
  });
};

const trackOutboundMessage = ({
  conversation,
  providerMessageId,
  type,
  body,
}: {
  conversation: any;
  providerMessageId?: string;
  type: "text" | "interactive";
  body: string;
}) => {
  conversation.lastMessage = body;
  conversation.owner = "ai";
  conversation.updatedAt = new Date();
  conversation.messages.push({
    providerMessageId,
    direction: "outbound",
    type,
    body,
    status: "sent",
    createdAt: new Date(),
  });
};

const sendTrackedText = async ({
  workspace,
  conversation,
  to,
  body,
}: {
  workspace: IWhatsAppWorkspace;
  conversation: any;
  to: string;
  body: string;
}) => {
  const result = await sendWhatsAppTextMessage({ workspace, to, body });
  trackOutboundMessage({
    conversation,
    providerMessageId: result?.messages?.[0]?.id,
    type: "text",
    body,
  });
  workspace.subscription.messagesUsed += 1;
  return result;
};

const sendTrackedButtons = async ({
  workspace,
  conversation,
  to,
  body,
  buttons,
}: {
  workspace: IWhatsAppWorkspace;
  conversation: any;
  to: string;
  body: string;
  buttons: Array<{ id: string; title: string }>;
}) => {
  const result = await sendWhatsAppButtonMessage({
    workspace,
    to,
    body,
    buttons,
  });
  trackOutboundMessage({
    conversation,
    providerMessageId: result?.messages?.[0]?.id,
    type: "interactive",
    body: `${body}\n\n${buttons.map((button) => `[${button.title}]`).join(" ")}`,
  });
  workspace.subscription.messagesUsed += 1;
  return result;
};

const sendTrackedList = async ({
  workspace,
  conversation,
  to,
  body,
  buttonText,
  rows,
}: {
  workspace: IWhatsAppWorkspace;
  conversation: any;
  to: string;
  body: string;
  buttonText: string;
  rows: Array<{ id: string; title: string; description?: string }>;
}) => {
  const result = await sendWhatsAppListMessage({
    workspace,
    to,
    body,
    buttonText,
    rows,
  });
  trackOutboundMessage({
    conversation,
    providerMessageId: result?.messages?.[0]?.id,
    type: "interactive",
    body: `${body}\n\n${rows.map((row) => `[${row.title}]`).join(" ")}`,
  });
  workspace.subscription.messagesUsed += 1;
  return result;
};

const sendTrackedFlow = async ({
  workspace,
  conversation,
  to,
  body,
}: {
  workspace: IWhatsAppWorkspace;
  conversation: any;
  to: string;
  body: string;
}) => {
  const result = await sendWhatsAppFlowMessage({ workspace, to, body });
  trackOutboundMessage({
    conversation,
    providerMessageId: result?.messages?.[0]?.id,
    type: "interactive",
    body: `${body}\n\n[Native WhatsApp appointment Flow]`,
  });
  workspace.subscription.messagesUsed += 1;
  return result;
};

const sendMainAutomationMenu = async ({
  workspace,
  conversation,
  to,
  includeGreeting = false,
}: {
  workspace: IWhatsAppWorkspace;
  conversation: any;
  to: string;
  includeGreeting?: boolean;
}) => {
  const rows = getAutomationMenuRows(workspace);
  const body = [
    includeGreeting ? buildGreetingText(workspace) : "",
    workspace.automationConfig?.menuMessage ||
      "Choose an option below, or type your question.",
  ]
    .filter(Boolean)
    .join("\n\n");
  if (!rows.length) {
    console.info("[whatsapp:menu] No enabled menu options", {
      workspaceId: String(workspace._id),
      waId: to,
    });
    return sendTrackedText({ workspace, conversation, to, body });
  }
  const priorityIds = ["book_appointment", "service_pricing"];
  const orderedRows = [
    ...priorityIds
      .map((id) => rows.find((row) => row.id === id))
      .filter(Boolean),
    ...rows.filter((row) => !priorityIds.includes(row.id)),
  ] as typeof rows;
  const quickRows = orderedRows.slice(0, rows.length > 3 ? 2 : 3);
  const buttons = quickRows.map((row) => ({
    id: row.id,
    title: row.title,
  }));
  if (rows.length > 3) {
    buttons.push({ id: "show_more_options", title: "More options" });
  }

  console.info("[whatsapp:menu] Sending quick actions", {
    workspaceId: String(workspace._id),
    waId: to,
    inboundMessageCount: getInboundMessageCount(conversation),
    optionIds: buttons.map((button) => button.id),
  });
  const result = await sendTrackedButtons({
    workspace,
    conversation,
    to,
    body,
    buttons,
  });
  markAutomationMenuShown(conversation);
  return result;
};

const sendFullAutomationMenu = async ({
  workspace,
  conversation,
  to,
}: {
  workspace: IWhatsAppWorkspace;
  conversation: any;
  to: string;
}) => {
  const rows = getAutomationMenuRows(workspace);
  if (rows.length <= 3) {
    return sendMainAutomationMenu({ workspace, conversation, to });
  }
  console.info("[whatsapp:menu] Sending full option list", {
    workspaceId: String(workspace._id),
    waId: to,
    optionIds: rows.map((row) => row.id),
  });
  const result = await sendTrackedList({
    workspace,
    conversation,
    to,
    body:
      workspace.automationConfig?.menuMessage ||
      "Choose an option below, or type your question.",
    buttonText: "View all options",
    rows,
  });
  markAutomationMenuShown(conversation);
  return result;
};

const sendPricingMenu = async ({
  workspace,
  conversation,
  to,
}: {
  workspace: IWhatsAppWorkspace;
  conversation: any;
  to: string;
}) => {
  const services = (workspace.appointmentConfig?.services || []).filter(
    (service) => service.isActive,
  );
  if (!services.length) {
    return sendTrackedButtons({
      workspace,
      conversation,
      to,
      body: "Service pricing has not been added yet. You can book an appointment or contact the owner for a quote.",
      buttons: [
        { id: "book_appointment", title: "Book appointment" },
        { id: "talk_to_owner", title: "Talk to owner" },
      ],
    });
  }
  return sendTrackedList({
    workspace,
    conversation,
    to,
    body:
      workspace.automationConfig?.pricingMessage ||
      "Choose a service to view pricing.",
    buttonText: "View services",
    rows: services.slice(0, 10).map((service, index) => ({
      id: `pricing_service:${index}`,
      title: service.name,
      description: service.priceInr
        ? `INR ${Number(service.priceInr).toLocaleString("en-IN")}`
        : "Contact for pricing",
    })),
  });
};

const sendFaqMenu = async ({
  workspace,
  conversation,
  to,
}: {
  workspace: IWhatsAppWorkspace;
  conversation: any;
  to: string;
}) => {
  const faqs = (workspace.faqs || [])
    .filter((faq) => faq.isActive)
    .sort((a, b) => a.order - b.order)
    .slice(0, 10);
  if (!faqs.length) {
    return sendTrackedText({
      workspace,
      conversation,
      to,
      body: "No FAQs are available yet. Type your question and we will answer using the business information.",
    });
  }
  return sendTrackedList({
    workspace,
    conversation,
    to,
    body: "Choose a frequently asked question.",
    buttonText: "View FAQs",
    rows: faqs.map((faq) => ({
      id: `faq:${faq.id}`,
      title: faq.question,
      description: faq.answer.slice(0, 72),
    })),
  });
};

const startChatAppointment = async ({
  workspace,
  conversation,
  to,
}: {
  workspace: IWhatsAppWorkspace;
  conversation: any;
  to: string;
}) => {
  const questions = getAppointmentChatQuestions(workspace);
  conversation.appointmentDraft = {
    status: "collecting",
    currentQuestionIndex: 0,
    timePage: 0,
    answers: [],
    startedAt: new Date(),
    updatedAt: new Date(),
  } as any;
  conversation.automationMode = undefined;
  conversation.status = "open";
  await sendAppointmentQuestion({
    workspace,
    conversation,
    to,
    question: questions[0],
  });
};

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

    const appointmentStatusUpdates = statuses.length
      ? await processAppointmentWhatsAppStatuses({
          phoneNumberId,
          statuses,
        })
      : 0;

    const workspace = await WhatsAppWorkspace.findOne({
      "meta.phoneNumberId": phoneNumberId,
    });
    if (!workspace) {
      if (statuses.length && appointmentStatusUpdates > 0) {
        console.info(
          "[whatsapp:process] Provider notification status processed without workspace",
          {
            phoneNumberId,
            statuses: statuses.length,
            appointmentStatusUpdates,
          },
        );
      } else {
        console.warn("[whatsapp:process] No workspace found for phone number ID", {
          phoneNumberId,
          messages: messages.length,
          statuses: statuses.length,
          appointmentStatusUpdates,
        });
      }
      continue;
    }

    pruneExpiredWhatsAppAppointments(workspace);

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
      const buttonReplyId =
        message.interactive?.button_reply?.id ||
        message.interactive?.list_reply?.id ||
        message.button?.payload ||
        "";
      const body =
        message.text?.body ||
        message.button?.text ||
        message.interactive?.button_reply?.title ||
        message.interactive?.list_reply?.title ||
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
          intentScore: 45,
          tags: [],
          lastMessageAt: now,
          createdAt: now,
        });
      }

      let conversation = workspace.conversations.find(
        (item) => item.waId === waId && item.status !== "resolved",
      );
      const hasBookedAppointment = workspace.appointments.some(
        (appointment) =>
          appointment.patientWaId === waId ||
          appointment.conversationWaId === waId,
      );
      const isFirstMessage = !conversation;
      if (!conversation) {
        workspace.conversations.push({
          waId,
          contactName,
          phone: waId,
          lastMessage: body,
          owner: "ai",
          status: "open",
          intent: "general",
          sentiment: "neutral",
          messages: [],
          lastCustomerMessageAt: now,
          followUp: hasBookedAppointment
            ? {
                stage: 2,
                completed: true,
                suppressedByAppointment: true,
              }
            : {
                stage: 0,
                nextAt: new Date(
                  now.getTime() +
                    Number(
                      workspace.automationConfig?.followUps
                        ?.firstDelayMinutes || 30,
                    ) *
                      60 *
                      1000,
                ),
                completed: false,
              },
          createdAt: now,
          updatedAt: now,
        });
        conversation = workspace.conversations[workspace.conversations.length - 1];
      }

      conversation.lastMessage = body;
      conversation.updatedAt = now;
      conversation.lastCustomerMessageAt = now;
      const followUpSuppressed =
        hasBookedAppointment ||
        conversation.followUp?.suppressedByAppointment === true;
      if (followUpSuppressed) {
        conversation.followUp = {
          stage: Math.max(2, Number(conversation.followUp?.stage || 0)),
          completed: true,
          suppressedByAppointment: true,
        } as any;
      } else if (workspace.automationConfig?.followUps?.enabled !== false) {
        conversation.followUp = {
          stage: 0,
          nextAt: new Date(
            now.getTime() +
              Number(
                workspace.automationConfig?.followUps?.firstDelayMinutes || 30,
              ) *
                60 *
                1000,
          ),
          completed: false,
        } as any;
      }
      conversation.messages.push({
        providerMessageId: message.id,
        direction: "inbound",
        type: ["text", "template", "image", "interactive"].includes(message.type)
          ? message.type
          : "text",
        body,
        status: "received",
        createdAt: now,
      });
      const trackedInboundMessage =
        conversation.messages[conversation.messages.length - 1];
      results.push(message.id);

      const canAutoReply =
        workspace.isConfigured &&
        workspace.subscription.messagesUsed < workspace.subscription.messageLimit;

      try {
        await markWhatsAppMessageRead({
          workspace,
          messageId: message.id,
          showTyping: canAutoReply,
        });
        trackedInboundMessage.status = "read";
        console.info("[whatsapp:activity] Inbound message marked read", {
          workspaceId: String(workspace._id),
          messageId: message.id,
          typing: canAutoReply,
        });
      } catch (error) {
        console.warn("[whatsapp:activity] Read/typing update failed", {
          workspaceId: String(workspace._id),
          messageId: message.id,
          tokenSource: getWhatsAppSendTokenSource(workspace),
          error: error instanceof Error ? error.message : String(error),
        });
      }

      if (!canAutoReply) {
        console.info("[whatsapp:process] Auto-reply skipped", {
          waId,
          isConfigured: workspace.isConfigured,
          messagesUsed: workspace.subscription.messagesUsed,
          messageLimit: workspace.subscription.messageLimit,
          conversationStatus: conversation.status,
        });
        continue;
      }

      try {
        if (conversation.appointmentDraft?.status === "collecting") {
          const questions = getAppointmentChatQuestions(workspace);
          const currentIndex = Math.max(
            0,
            Number(conversation.appointmentDraft.currentQuestionIndex || 0),
          );
          const currentQuestion = questions[currentIndex];
          if (currentQuestion) {
            if (
              currentQuestion.type === "time" &&
              buttonReplyId.startsWith("appointment_time_page:")
            ) {
              const requestedTimePage = Number(
                buttonReplyId.split(":")[1] || 0,
              );
              conversation.appointmentDraft.timePage = Math.max(
                0,
                Number.isFinite(requestedTimePage) ? requestedTimePage : 0,
              );
              conversation.appointmentDraft.updatedAt = new Date();
              await sendAppointmentQuestion({
                workspace,
                conversation,
                to: waId,
                question: currentQuestion,
              });
              continue;
            }
            const answer = resolveAppointmentAnswer(buttonReplyId, body);
            const optionRows = getAppointmentQuestionRows({
              workspace,
              conversation,
              question: currentQuestion,
            });
            const allowedAnswers = optionRows.map((row: { id: string; title: string }) =>
              resolveAppointmentAnswer(row.id, row.title),
            );
            if (allowedAnswers.length && !allowedAnswers.includes(answer)) {
              await sendAppointmentQuestion({
                workspace,
                conversation,
                to: waId,
                question: {
                  ...currentQuestion,
                  question: `Please choose one of the available options.\n\n${currentQuestion.question}`,
                },
              });
              continue;
            }
            if (
              currentQuestion.type === "email" &&
              answer &&
              !(currentQuestion.required === false && /^skip$/i.test(answer)) &&
              !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(answer)
            ) {
              await sendTrackedText({
                workspace,
                conversation,
                to: waId,
                body: "Please enter a valid email address, or type skip if this field is optional.",
              });
              continue;
            }
            const answerField =
              currentQuestion.field === "custom"
                ? `custom:${currentQuestion.id}`
                : currentQuestion.field;
            conversation.appointmentDraft.answers = (
              conversation.appointmentDraft.answers || []
            ).filter((answer: any) => answer.field !== answerField);
            conversation.appointmentDraft.answers.push({
              field: answerField,
              question: currentQuestion.question,
              answer:
                !currentQuestion.required && /^skip$/i.test(answer) ? "" : answer,
            });
            if (currentQuestion.field === "preferredDate") {
              conversation.appointmentDraft.timePage = 0;
            }
          }
          const nextIndex = currentIndex + 1;
          conversation.appointmentDraft.currentQuestionIndex = nextIndex;
          conversation.appointmentDraft.updatedAt = new Date();

          if (nextIndex < questions.length) {
            await sendAppointmentQuestion({
              workspace,
              conversation,
              to: waId,
              question: questions[nextIndex],
            });
          } else {
            const appointmentPayload = createAppointmentFromChatDraft({
              workspace,
              conversation,
              contactName,
              waId,
            });
            if (!hasRecentDuplicateAppointment(workspace, appointmentPayload)) {
              workspace.appointments.push(appointmentPayload);
              createdAppointmentAlerts.push(appointmentPayload);
            }
            conversation.appointmentDraft = undefined as any;
            conversation.followUp = {
              stage: 2,
              completed: true,
              suppressedByAppointment: true,
            } as any;
            const confirmation = await generateWorkspaceAiDecision({
              workspace,
              conversation,
              body: `Confirm that ${appointmentPayload.patientName}'s appointment request for ${appointmentPayload.service} was received. Mention the preferred date and time only if provided, and say the team will confirm availability.`,
            });
            await sendTrackedText({
              workspace,
              conversation,
              to: waId,
              body:
                confirmation.reply ||
                "Your appointment request was received. The team will confirm availability soon.",
            });
          }
          conversation.status = "open";
          continue;
        }

        if (
          buttonReplyId === "appointment_chat" ||
          buttonReplyId === "book_appointment"
        ) {
          await startChatAppointment({ workspace, conversation, to: waId });
          continue;
        }

        if (buttonReplyId === "talk_to_owner") {
          await sendTrackedText({
            workspace,
            conversation,
            to: waId,
            body: ownerContactReply(workspace),
          });
          conversation.status = "pending_human";
          conversation.owner = "human";
          continue;
        }

        if (buttonReplyId === "need_support") {
          conversation.automationMode = "support";
          conversation.status = "open";
          await sendTrackedText({
            workspace,
            conversation,
            to: waId,
            body:
              workspace.automationConfig?.supportPrompt ||
              "We are listening. Please explain the issue in detail.",
          });
          continue;
        }

        if (buttonReplyId === "service_pricing") {
          await sendPricingMenu({ workspace, conversation, to: waId });
          continue;
        }

        if (buttonReplyId.startsWith("pricing_service:")) {
          const index = Number(buttonReplyId.split(":")[1]);
          const services = (workspace.appointmentConfig?.services || []).filter(
            (service) => service.isActive,
          );
          const service = services[index];
          if (service) {
            const price = Number(service.priceInr || 0);
            await sendTrackedButtons({
              workspace,
              conversation,
              to: waId,
              body: [
                `*${service.name}*`,
                service.description || "",
                price > 0
                  ? `Price: INR ${price.toLocaleString("en-IN")}`
                  : "Contact us for pricing.",
                workspace.automationConfig?.negotiationMessage || "",
              ]
                .filter(Boolean)
                .join("\n\n"),
              buttons: [
                { id: "book_appointment", title: "Book appointment" },
                { id: "talk_to_owner", title: "Talk to owner" },
              ],
            });
          } else {
            await sendPricingMenu({ workspace, conversation, to: waId });
          }
          continue;
        }

        if (buttonReplyId === "browse_faqs") {
          await sendFaqMenu({ workspace, conversation, to: waId });
          continue;
        }

        if (buttonReplyId.startsWith("faq:")) {
          const faqId = buttonReplyId.slice(4);
          const faq = (workspace.faqs || []).find(
            (item) => item.id === faqId && item.isActive,
          );
          if (faq) {
            await sendTrackedButtons({
              workspace,
              conversation,
              to: waId,
              body: `*${faq.question}*\n\n${faq.answer}`,
              buttons: [
                { id: "browse_faqs", title: "More FAQs" },
                { id: "book_appointment", title: "Book appointment" },
              ],
            });
          } else {
            await sendFaqMenu({ workspace, conversation, to: waId });
          }
          continue;
        }

        if (buttonReplyId === "show_menu") {
          await sendMainAutomationMenu({ workspace, conversation, to: waId });
          continue;
        }

        if (buttonReplyId === "show_more_options") {
          await sendFullAutomationMenu({ workspace, conversation, to: waId });
          continue;
        }

        const decision = await generateWorkspaceAiDecision({
          workspace,
          conversation,
          body,
          firstMessage: isFirstMessage,
        });
        conversation.sentiment = decision.sentiment;
        conversation.intent =
          decision.intent === "appointment"
            ? "sales"
            : decision.intent === "support" ||
                decision.intent === "human_handoff"
              ? "support"
              : "general";

        if (
          workspace.appointmentConfig?.enabled &&
          decision.intent === "appointment"
        ) {
          await startChatAppointment({ workspace, conversation, to: waId });
          continue;
        }

        const humanHandoff = decision.intent === "human_handoff";
        await sendTrackedText({
          workspace,
          conversation,
          to: waId,
          body: humanHandoff
            ? `${decision.reply}\n\n${ownerContactReply(workspace)}`
            : decision.intent === "greeting"
              ? buildGreetingText(workspace)
              : decision.reply,
        });
        conversation.status = humanHandoff ? "pending_human" : "open";
        conversation.owner = humanHandoff ? "human" : "ai";
        if (!humanHandoff) conversation.automationMode = undefined;
        const shouldAppendMenu =
          workspace.automationConfig?.enabled !== false &&
          !humanHandoff &&
          workspace.subscription.messagesUsed <
            workspace.subscription.messageLimit &&
          (isFirstMessage || decision.intent === "greeting") &&
          canShowAutomationMenu({ conversation });
        console.info("[whatsapp:menu] Menu policy evaluated", {
          workspaceId: String(workspace._id),
          waId,
          isFirstMessage,
          intent: decision.intent,
          inboundMessageCount: getInboundMessageCount(conversation),
          lastShownInboundCount:
            conversation.automationMenu?.lastShownInboundCount || 0,
          shouldAppendMenu,
        });
        if (shouldAppendMenu) {
          try {
            await sendMainAutomationMenu({
              workspace,
              conversation,
              to: waId,
            });
          } catch (menuError) {
            console.error("[whatsapp:menu] Quick-action send failed", {
              workspaceId: String(workspace._id),
              waId,
              error:
                menuError instanceof Error
                  ? menuError.message
                  : String(menuError),
            });
          }
        }
      } catch (error) {
        console.error("WhatsApp AI automation send failed:", error);
        recordWhatsAppSendFailure({
          workspace,
          error,
          context: "ai_automation",
          waId,
        });
        conversation.status = "pending_human";
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
      try {
        const notificationChannels = await sendAppointmentNotifications({
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
        });
        console.info("[whatsapp:appointment-notification] Completed", {
          workspaceId: String(workspace._id),
          patientWaId: appointment.patientWaId,
          channels: notificationChannels.map((channel) => ({
            channel: channel.channel,
            status: channel.status,
            error: channel.error || undefined,
          })),
        });
      } catch (error) {
        console.error("WhatsApp appointment notification error:", error);
      }
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

export async function processWhatsAppFollowUps(): Promise<{
  processed: number;
  sent: number;
  expiredAppointments: number;
  errors: string[];
}> {
  await connectToDatabase();
  const now = new Date();
  const expiryCutoff = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);
  const cleanup = await WhatsAppWorkspace.updateMany(
    {},
    {
      $pull: {
        appointments: {
          $or: [
            { expiresAt: { $lte: now } },
            { expiresAt: { $exists: false }, createdAt: { $lte: expiryCutoff } },
          ],
        },
      },
    },
  );
  const result = {
    processed: 0,
    sent: 0,
    expiredAppointments: cleanup.modifiedCount || 0,
    errors: [] as string[],
  };
  const workspaces = await WhatsAppWorkspace.find({
    "automationConfig.followUps.enabled": true,
    conversations: {
      $elemMatch: {
        "followUp.completed": false,
        "followUp.nextAt": { $lte: now },
      },
    },
  });

  for (const workspace of workspaces) {
    let changed = false;
    for (const conversation of workspace.conversations || []) {
      const followUp = conversation.followUp;
      if (followUp?.suppressedByAppointment) {
        followUp.stage = Math.max(2, Number(followUp.stage || 0));
        followUp.completed = true;
        followUp.nextAt = undefined;
        changed = true;
        continue;
      }
      if (
        !followUp ||
        followUp.completed ||
        !followUp.nextAt ||
        new Date(followUp.nextAt).getTime() > now.getTime()
      ) {
        continue;
      }
      result.processed += 1;
      const hasBookedAppointment = workspace.appointments.some(
        (appointment) =>
          appointment.patientWaId === conversation.waId ||
          appointment.conversationWaId === conversation.waId,
      );
      if (hasBookedAppointment) {
        followUp.stage = Math.max(2, Number(followUp.stage || 0));
        followUp.completed = true;
        followUp.suppressedByAppointment = true;
        followUp.nextAt = undefined;
        changed = true;
        console.info("[whatsapp:follow-up] Suppressed after appointment", {
          workspaceId: String(workspace._id),
          waId: conversation.waId,
        });
        continue;
      }
      const lastCustomerMessageAt = conversation.lastCustomerMessageAt
        ? new Date(conversation.lastCustomerMessageAt)
        : new Date(conversation.updatedAt);
      if (
        now.getTime() - lastCustomerMessageAt.getTime() >=
        23 * 60 * 60 * 1000
      ) {
        followUp.completed = true;
        changed = true;
        continue;
      }
      if (
        !workspace.isConfigured ||
        workspace.subscription.messagesUsed >= workspace.subscription.messageLimit
      ) {
        followUp.nextAt = new Date(now.getTime() + 15 * 60 * 1000);
        changed = true;
        continue;
      }

      const stage = Math.max(0, Number(followUp.stage || 0));
      const configuredMessage =
        stage === 0
          ? workspace.automationConfig?.followUps?.firstMessage
          : workspace.automationConfig?.followUps?.secondMessage;
      try {
        const decision = await generateWorkspaceAiDecision({
          workspace,
          conversation,
          body: `Write one short, natural follow-up based on the customer's latest conversation. Do not claim an appointment is booked. Invite them to continue or book. Use this owner-approved message as guidance: ${configuredMessage}`,
        });
        await sendTrackedButtons({
          workspace,
          conversation,
          to: conversation.waId,
          body:
            decision.reply ||
            configuredMessage ||
            "Would you like more information or help booking an appointment?",
          buttons: [
            { id: "book_appointment", title: "Book appointment" },
            { id: "show_menu", title: "View options" },
          ],
        });
        followUp.stage = stage + 1;
        followUp.lastSentAt = now;
        if (stage >= 1) {
          followUp.completed = true;
          followUp.nextAt = undefined;
        } else {
          followUp.nextAt = new Date(
            now.getTime() +
              Math.max(
                1,
                Number(
                  workspace.automationConfig?.followUps?.secondDelayMinutes ||
                    180,
                ),
              ) *
                60 *
                1000,
          );
        }
        result.sent += 1;
        changed = true;
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        result.errors.push(`${workspace._id}:${conversation.waId}: ${message}`);
        followUp.nextAt = new Date(now.getTime() + 15 * 60 * 1000);
        changed = true;
      }
    }
    if (changed) await workspace.save();
  }

  console.info("[whatsapp:follow-up] Completed", result);
  return result;
}
