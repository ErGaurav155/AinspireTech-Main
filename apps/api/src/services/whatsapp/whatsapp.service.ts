import crypto from "crypto";
import WhatsAppWorkspace, {
  IWhatsAppWorkspace,
  WhatsAppPlanId,
} from "@/models/whatsapp/WhatsAppWorkspace.model";
import {
  objectToAppointmentAlert,
  sendAppointmentNotifications,
} from "@/services/appointment-notification.service";
import {
  ConvMessage,
  generateWhatsAppAiResponse,
  WhatsAppAiDecision,
} from "@/services/ai.service";

const defaultAppointmentChatQuestions = [
  { field: "patientName", question: "What is your full name?", required: true },
  {
    field: "patientPhone",
    question: "What phone number should we use?",
    required: true,
  },
  {
    field: "service",
    question: "Which service do you want to book?",
    required: true,
  },
  {
    field: "preferredDate",
    question: "Which date do you prefer?",
    required: true,
  },
  {
    field: "preferredTime",
    question: "Which time do you prefer?",
    required: true,
  },
  {
    field: "symptoms",
    question: "Please describe your requirement.",
    required: true,
  },
] as const;

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
      ? `Appointment services: ${workspace.appointmentConfig.services
          .filter((service) => service.isActive)
          .map((service) => service.name)
          .join(", ")}`
      : "",
    workspace.greetingTemplate?.body
      ? `Preferred greeting: ${workspace.greetingTemplate.body.replace(
          /\{\{\s*1\s*\}\}/g,
          workspace.organization?.name || "our business",
        )}`
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

const toAiConversationHistory = (conversation: any): ConvMessage[] =>
  (conversation?.messages || [])
    .slice(0, -1)
    .filter((message: any) => message?.body)
    .slice(-12)
    .map((message: any) => ({
      role: message.direction === "outbound" ? "assistant" : "user",
      content: String(message.body).slice(0, 1200),
    }));

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
  try {
    const knowledge = await buildBusinessKnowledgeContext(workspace);
    return await generateWhatsAppAiResponse({
      userInput: body,
      businessName,
      knowledge,
      conversationHistory: toAiConversationHistory(conversation),
      firstMessage,
    });
  } catch (error) {
    console.error("[whatsapp:ai] Response generation failed", {
      workspaceId: String(workspace._id),
      error: error instanceof Error ? error.message : String(error),
    });
    return {
      intent: firstMessage ? "greeting" : "other",
      sentiment: "neutral",
      reply: firstMessage
        ? buildGreetingText(workspace)
        : `Thanks for messaging ${businessName}. Please choose an option below or share more detail.`,
    };
  }
};

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
  const configured = workspace.appointmentFlow?.chatQuestions || [];
  const questions = configured
    .filter((item: any) => item?.field && item?.question)
    .slice(0, 10)
    .map((item: any) => ({
      field: String(item.field),
      question: String(item.question).trim().slice(0, 240),
      required: item.required !== false,
    }));
  return questions.length
    ? questions
    : defaultAppointmentChatQuestions.map((item) => ({ ...item }));
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
  const answerMap = Object.fromEntries(
    (conversation.appointmentDraft?.answers || []).map((item: any) => [
      item.field,
      normalizeFlowText(item.answer),
    ]),
  );
  const responseText = JSON.stringify(answerMap);
  return {
    patientName: answerMap.patientName || contactName || "Unknown patient",
    patientPhone: answerMap.patientPhone || waId,
    patientWaId: waId,
    service:
      answerMap.service ||
      inferService(responseText, workspace.appointmentConfig?.services),
    symptoms: answerMap.symptoms || "Submitted through WhatsApp chat booking",
    preferredDate: answerMap.preferredDate || "",
    preferredTime: answerMap.preferredTime || "",
    status: "requested" as const,
    source: "whatsapp" as const,
    urgency: resolveUrgency(
      responseText,
      workspace.appointmentConfig?.emergencyKeywords,
    ),
    notes: "Created from guided WhatsApp chat booking.",
    conversationWaId: waId,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
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
      const buttonReplyId =
        message.interactive?.button_reply?.id || message.button?.payload || "";
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
          intentScore: 45,
          tags: [],
          lastMessageAt: now,
          createdAt: now,
        });
      }

      let conversation = workspace.conversations.find(
        (item) => item.waId === waId && item.status !== "resolved",
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
        if (flowResponse && workspace.appointmentConfig?.enabled) {
          const appointmentPayload = createAppointmentFromFlowResponse({
            workspace,
            flowResponse,
            contactName,
            waId,
          });
          if (!hasRecentDuplicateAppointment(workspace, appointmentPayload)) {
            workspace.appointments.push(appointmentPayload);
            createdAppointmentAlerts.push(appointmentPayload);
          }
          const confirmation = await generateWorkspaceAiDecision({
            workspace,
            conversation,
            body: `Confirm that ${appointmentPayload.patientName}'s appointment request for ${appointmentPayload.service} was received and the team will confirm availability.`,
          });
          await sendTrackedText({
            workspace,
            conversation,
            to: waId,
            body:
              confirmation.reply ||
              workspace.appointmentFlow?.successMessage ||
              "Your appointment request was received. The team will confirm availability soon.",
          });
          conversation.status = "open";
          continue;
        }

        if (conversation.appointmentDraft?.status === "collecting") {
          const questions = getAppointmentChatQuestions(workspace);
          const currentIndex = Math.max(
            0,
            Number(conversation.appointmentDraft.currentQuestionIndex || 0),
          );
          const currentQuestion = questions[currentIndex];
          if (currentQuestion) {
            conversation.appointmentDraft.answers = (
              conversation.appointmentDraft.answers || []
            ).filter((answer: any) => answer.field !== currentQuestion.field);
            conversation.appointmentDraft.answers.push({
              field: currentQuestion.field,
              question: currentQuestion.question,
              answer: body.trim(),
            });
          }
          const nextIndex = currentIndex + 1;
          conversation.appointmentDraft.currentQuestionIndex = nextIndex;
          conversation.appointmentDraft.updatedAt = new Date();

          if (nextIndex < questions.length) {
            await sendTrackedText({
              workspace,
              conversation,
              to: waId,
              body: questions[nextIndex].question,
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
                workspace.appointmentFlow?.successMessage ||
                "Your appointment request was received. The team will confirm availability soon.",
            });
          }
          conversation.status = "open";
          continue;
        }

        if (buttonReplyId === "appointment_chat") {
          const questions = getAppointmentChatQuestions(workspace);
          conversation.appointmentDraft = {
            status: "collecting",
            currentQuestionIndex: 0,
            answers: [],
            startedAt: new Date(),
            updatedAt: new Date(),
          } as any;
          conversation.status = "open";
          await sendTrackedText({
            workspace,
            conversation,
            to: waId,
            body: questions[0].question,
          });
          continue;
        }

        if (buttonReplyId === "appointment_flow") {
          if (hasPublishedAppointmentFlow(workspace)) {
            await sendTrackedFlow({
              workspace,
              conversation,
              to: waId,
              body: `Please complete the appointment form for ${workspace.organization?.name || "this business"}.`,
            });
          } else {
            const questions = getAppointmentChatQuestions(workspace);
            conversation.appointmentDraft = {
              status: "collecting",
              currentQuestionIndex: 0,
              answers: [],
              startedAt: new Date(),
              updatedAt: new Date(),
            } as any;
            await sendTrackedText({
              workspace,
              conversation,
              to: waId,
              body: `${buildFlowNotReadyReply(workspace)}\n\n${questions[0].question}`,
            });
          }
          continue;
        }

        const decision = await generateWorkspaceAiDecision({
          workspace,
          conversation,
          body:
            buttonReplyId === "talk_to_owner"
              ? "I want to speak with a person. Share only verified contact details."
              : body,
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

        if (isFirstMessage && decision.intent === "greeting") {
          conversation.status = "open";
          await sendTrackedText({
            workspace,
            conversation,
            to: waId,
            body: decision.reply,
          });
          continue;
        }

        if (
          workspace.appointmentConfig?.enabled &&
          (buttonReplyId === "book_appointment" ||
            decision.intent === "appointment")
        ) {
          const buttons = hasPublishedAppointmentFlow(workspace)
            ? [
                { id: "appointment_flow", title: "Book with Flow" },
                { id: "appointment_chat", title: "Book in chat" },
                { id: "talk_to_owner", title: "Talk to owner" },
              ]
            : [
                { id: "appointment_chat", title: "Book in chat" },
                { id: "talk_to_owner", title: "Talk to owner" },
              ];
          conversation.status = "open";
          await sendTrackedButtons({
            workspace,
            conversation,
            to: waId,
            body: decision.reply,
            buttons,
          });
          continue;
        }

        const humanHandoff =
          buttonReplyId === "talk_to_owner" ||
          decision.intent === "human_handoff";
        await sendTrackedText({
          workspace,
          conversation,
          to: waId,
          body: decision.reply,
        });
        conversation.status = humanHandoff ? "pending_human" : "open";
        conversation.owner = humanHandoff ? "human" : "ai";
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
