import crypto from "crypto";
import WhatsAppWorkspace, {
  IWhatsAppWorkspace,
  WhatsAppPlanId,
} from "@/models/whatsapp/WhatsAppWorkspace.model";

export const whatsappPlans = [
  {
    id: "launch",
    name: "WhatsApp Automation",
    priceInr: 1999,
    yearlyInr: 19990,
    messageLimit: 10000,
    numbersLimit: 1,
    seatsLimit: 1,
    agentsLimit: 3,
    features: [
      "1 connected WhatsApp number",
      "1 team inbox",
      "3 AI agents",
      "Templates and broadcast tracker",
      "Contacts, appointments, and basic analytics",
    ],
  },
] as const;

const defaultAgentPrompt =
  "You are RocketReplai's WhatsApp business assistant. Qualify inbound leads, answer only from approved business knowledge, collect name, phone, requirement, budget, city, and callback time, then hand off when confidence is low, sentiment is negative, payment is discussed, or the customer asks for a human.";

export const getPlanById = (planId: WhatsAppPlanId) =>
  whatsappPlans.find((plan) => plan.id === planId) || whatsappPlans[0];

export const maskSecret = (value?: string) => {
  if (!value) return "";
  if (value.length <= 8) return "configured";
  return `${value.slice(0, 4)}...${value.slice(-4)}`;
};

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
    const plan = whatsappPlans[0];
    workspace.subscription.plan = plan.id;
    workspace.subscription.messageLimit = plan.messageLimit;
    workspace.subscription.numbersLimit = plan.numbersLimit;
    workspace.subscription.seatsLimit = plan.seatsLimit;
    workspace.subscription.agentsLimit = plan.agentsLimit;
    return workspace;
  }

  workspace = await WhatsAppWorkspace.create({
    clerkId,
    isConfigured: false,
    organization: {
      name: "My Business",
      industry: "Services",
      website: "",
      timeZone: "Asia/Kolkata",
    },
    meta: {
      verifyToken: `rr_wa_${crypto.randomBytes(16).toString("hex")}`,
      graphApiVersion: "v23.0",
    },
    subscription: {
      plan: "launch",
      status: "trial",
      billingCycle: "monthly",
      messageLimit: 10000,
      messagesUsed: 0,
      numbersLimit: 1,
      seatsLimit: 1,
      agentsLimit: 3,
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
    agents: [
      {
        name: "Lead Qualification Agent",
        type: "sales",
        status: "live",
        trigger: "New inbound message, ad click, QR scan, or website handoff",
        goal: "Qualify sales intent and capture contact details for follow-up.",
        prompt: defaultAgentPrompt,
        collectFields: ["name", "requirement", "budget", "city", "callback_time"],
        handoffRules: [
          "Customer asks for human",
          "Negative sentiment is detected",
          "Payment or refund query",
          "Intent score above 80",
        ],
        isActive: true,
      },
      {
        name: "Support Resolution Agent",
        type: "support",
        status: "draft",
        trigger: "Support, refund, order, complaint, or warranty keywords",
        goal: "Resolve common questions and escalate complex cases.",
        prompt: "Answer support questions briefly. Collect order ID and issue details before handoff.",
        collectFields: ["name", "phone", "order_id", "issue"],
        handoffRules: ["Complaint", "Refund", "Repeated failed answer"],
        isActive: false,
      },
    ],
    templates: [
      {
        name: "lead_followup_offer",
        language: "en",
        category: "marketing",
        status: "draft",
        body: "Hi {{1}}, thanks for your interest. Would you like a quick demo today?",
        example: "Hi Ananya, thanks for your interest. Would you like a quick demo today?",
      },
      {
        name: "order_update_v2",
        language: "en",
        category: "utility",
        status: "draft",
        body: "Your order {{1}} is now {{2}}. Reply HELP for support.",
        example: "Your order RR123 is now shipped. Reply HELP for support.",
      },
    ],
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
  if (!workspace.meta?.phoneNumberId || !workspace.meta?.accessToken) {
    throw new Error("WhatsApp Meta credentials are not configured");
  }

  const version = workspace.meta.graphApiVersion || "v23.0";
  const response = await fetch(
    `https://graph.facebook.com/${version}/${workspace.meta.phoneNumberId}/messages`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${workspace.meta.accessToken}`,
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
    throw new Error(result?.error?.message || "Failed to send WhatsApp message");
  }
  return result;
}

function buildAgentReply({
  businessName,
  inboundBody,
}: {
  businessName: string;
  inboundBody: string;
}) {
  const text = inboundBody.toLowerCase();

  if (/human|agent|call|complaint|refund|angry|bad/.test(text)) {
    return null;
  }

  if (/price|pricing|cost|plan|demo|buy/.test(text)) {
    return `Thanks for your interest in ${businessName}. I can help with pricing and demo details. May I know your name, business type, city, and preferred callback time?`;
  }

  if (/support|issue|problem|order|warranty/.test(text)) {
    return `I can help with that. Please share your name, order ID if any, and a short description of the issue. Our team will review it quickly.`;
  }

  return `Hi, thanks for messaging ${businessName}. Please share your name and what you need help with, and I will guide you from here.`;
}

const hasAppointmentIntent = (body: string) =>
  /appointment|book|booking|visit|consult|consultation|doctor|clinic|slot|available|tomorrow|today/i.test(
    body,
  );

const resolveUrgency = (body: string, emergencyKeywords: string[] = []) => {
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

const inferPreferredDate = (body: string) => {
  const now = new Date();
  if (/tomorrow/i.test(body)) {
    const tomorrow = new Date(now);
    tomorrow.setDate(now.getDate() + 1);
    return tomorrow.toISOString().slice(0, 10);
  }
  if (/today/i.test(body)) return now.toISOString().slice(0, 10);
  const match = body.match(/\b(\d{4}-\d{2}-\d{2})\b/);
  return match?.[1] || "";
};

const inferPreferredTime = (body: string) => {
  const match = body.match(/\b(\d{1,2})(?::(\d{2}))?\s*(am|pm)?\b/i);
  if (!match) return "";
  const hour = match[1].padStart(2, "0");
  const minute = match[2] || "00";
  return `${hour}:${minute}${match[3] ? ` ${match[3].toUpperCase()}` : ""}`;
};

const buildAppointmentReply = ({
  clinicName,
  service,
  urgency,
}: {
  clinicName: string;
  service: string;
  urgency: "routine" | "urgent" | "emergency";
}) => {
  if (urgency === "emergency") {
    return `I have marked this as emergency for ${clinicName}. Please do not wait for WhatsApp if this is serious. Call the clinic or emergency services now. Also share patient name, age, symptoms, and your current location.`;
  }

  return `I can help request an appointment for ${service}. Please share patient name, main symptom/problem, preferred date, and preferred time. Our clinic team will confirm the slot.`;
};

export async function processWhatsAppWebhook(payload: any) {
  const changes = payload?.entry?.flatMap((entry: any) => entry.changes || []) || [];
  const results: string[] = [];

  for (const change of changes) {
    const value = change.value || {};
    const phoneNumberId = value.metadata?.phone_number_id;
    if (!phoneNumberId) continue;

    const workspace = await WhatsAppWorkspace.findOne({
      "meta.phoneNumberId": phoneNumberId,
    });
    if (!workspace) continue;

    for (const message of value.messages || []) {
      const waId = message.from;
      const profile = value.contacts?.find((contact: any) => contact.wa_id === waId);
      const body =
        message.text?.body ||
        message.button?.text ||
        message.interactive?.button_reply?.title ||
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
          status: body.match(/human|agent|call/i) ? "pending_human" : "open",
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

      const activeAgent = workspace.agents.find(
        (agent) => agent.isActive && agent.status === "live",
      );
      const canAutoReply =
        activeAgent &&
        workspace.isConfigured &&
        workspace.subscription.messagesUsed < workspace.subscription.messageLimit &&
        conversation.status !== "pending_human";

      if (canAutoReply) {
        const appointmentIntent =
          workspace.appointmentConfig?.enabled && hasAppointmentIntent(body);
        const urgency = resolveUrgency(
          body,
          workspace.appointmentConfig?.emergencyKeywords,
        );

        if (appointmentIntent) {
          const service = inferService(body, workspace.appointmentConfig?.services);
          const existingRequest = workspace.appointments.find(
            (appointment) =>
              appointment.patientWaId === waId &&
              ["requested", "confirmed"].includes(appointment.status) &&
              new Date(appointment.createdAt).getTime() >
                Date.now() - 24 * 60 * 60 * 1000,
          );

          if (!existingRequest) {
            workspace.appointments.push({
              patientName: contactName || "Unknown patient",
              patientPhone: waId,
              patientWaId: waId,
              service,
              symptoms: body,
              preferredDate: inferPreferredDate(body),
              preferredTime: inferPreferredTime(body),
              status: "requested",
              source: "whatsapp",
              urgency,
              notes: "Created automatically from WhatsApp appointment intent.",
              conversationWaId: waId,
              createdAt: new Date(),
              updatedAt: new Date(),
            });
          }
        }

        const reply = appointmentIntent
          ? buildAppointmentReply({
              clinicName:
                workspace.appointmentConfig?.clinicName ||
                workspace.organization?.name ||
                "our clinic",
              service: inferService(body, workspace.appointmentConfig?.services),
              urgency,
            })
          : buildAgentReply({
          businessName: workspace.organization?.name || "our business",
          inboundBody: body,
            });

        if (reply) {
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
            console.error("WhatsApp auto-reply failed:", error);
            conversation.status = "pending_human";
          }
        } else {
          conversation.status = "pending_human";
        }
      }
    }

    for (const status of value.statuses || []) {
      const conversation = workspace.conversations.find((item) =>
        item.messages.some((message) => message.providerMessageId === status.id),
      );
      const trackedMessage = conversation?.messages.find(
        (message) => message.providerMessageId === status.id,
      );
      if (trackedMessage) trackedMessage.status = status.status;
    }

    await workspace.save();
  }

  return { processedMessageIds: results };
}
