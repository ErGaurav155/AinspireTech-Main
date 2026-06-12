import mongoose, { Document, Model, Schema } from "mongoose";

export type WhatsAppPlanId = "launch";
export type WhatsAppTemplateCategory =
  | "marketing"
  | "utility"
  | "authentication";

export interface IWhatsAppWorkspace extends Document {
  clerkId: string;
  isConfigured: boolean;
  organization: {
    name: string;
    industry: string;
    website: string;
    timeZone: string;
  };
  meta: {
    businessManagerId: string;
    wabaId: string;
    phoneNumberId: string;
    displayPhoneNumber: string;
    appId: string;
    appSecret: string;
    accessToken: string;
    verifyToken: string;
    graphApiVersion: string;
    qualityRating: "unknown" | "low" | "medium" | "high";
    status: "needs_setup" | "connected" | "error";
    lastVerifiedAt?: Date;
  };
  subscription: {
    plan: WhatsAppPlanId;
    status: "trial" | "active" | "past_due" | "cancelled";
    billingCycle: "monthly" | "yearly";
    messageLimit: number;
    messagesUsed: number;
    numbersLimit: number;
    seatsLimit: number;
    agentsLimit: number;
    nextBillingDate: Date;
  };
  appointmentConfig: {
    enabled: boolean;
    clinicName: string;
    timezone: string;
    slotDurationMinutes: number;
    bufferMinutes: number;
    bookingWindowDays: number;
    workingHours: Array<{
      day: string;
      isOpen: boolean;
      open: string;
      close: string;
    }>;
    services: Array<{
      name: string;
      durationMinutes: number;
      priceInr: number;
      doctor?: string;
      isActive: boolean;
    }>;
    requiredFields: string[];
    emergencyKeywords: string[];
    confirmationTemplateName?: string;
    reminderTemplateName?: string;
  };
  agents: Array<{
    name: string;
    type: "sales" | "support" | "retention" | "custom";
    status: "live" | "draft" | "paused";
    trigger: string;
    goal: string;
    prompt: string;
    collectFields: string[];
    handoffRules: string[];
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
  }>;
  templates: Array<{
    name: string;
    language: string;
    category: WhatsAppTemplateCategory;
    status: "draft" | "pending" | "approved" | "rejected";
    body: string;
    example: string;
    metaTemplateId?: string;
    createdAt: Date;
    updatedAt: Date;
  }>;
  contacts: Array<{
    waId: string;
    name: string;
    phone: string;
    email?: string;
    consentStatus: "opted_in" | "opted_out" | "unknown";
    lifecycleStage: "lead" | "customer" | "at_risk" | "lost";
    intentScore: number;
    tags: string[];
    lastMessageAt?: Date;
    createdAt: Date;
  }>;
  conversations: Array<{
    waId: string;
    contactName: string;
    phone: string;
    lastMessage: string;
    owner: "ai" | "human";
    status: "open" | "pending_human" | "resolved";
    intent: "sales" | "support" | "billing" | "general";
    sentiment: "positive" | "neutral" | "negative";
    messages: Array<{
      providerMessageId?: string;
      direction: "inbound" | "outbound";
      type: "text" | "template" | "image" | "interactive";
      body: string;
      status: "received" | "sent" | "delivered" | "read" | "failed";
      createdAt: Date;
    }>;
    createdAt: Date;
    updatedAt: Date;
  }>;
  campaigns: Array<{
    name: string;
    templateName: string;
    segment: string;
    status: "draft" | "scheduled" | "running" | "paused" | "completed";
    scheduledAt?: Date;
    recipients: number;
    delivered: number;
    read: number;
    replies: number;
    createdAt: Date;
    updatedAt: Date;
  }>;
  appointments: Array<{
    patientName: string;
    patientPhone: string;
    patientWaId: string;
    patientEmail?: string;
    service: string;
    doctor?: string;
    symptoms: string;
    preferredDate?: string;
    preferredTime?: string;
    scheduledAt?: Date;
    status: "requested" | "confirmed" | "cancelled" | "completed" | "no_show";
    source: "whatsapp" | "manual";
    urgency: "routine" | "urgent" | "emergency";
    notes?: string;
    conversationWaId?: string;
    createdAt: Date;
    updatedAt: Date;
  }>;
  createdAt: Date;
  updatedAt: Date;
}

const WhatsAppWorkspaceSchema = new Schema<IWhatsAppWorkspace>(
  {
    clerkId: { type: String, required: true, unique: true, index: true },
    isConfigured: { type: Boolean, default: false },
    organization: {
      name: { type: String, default: "My Business" },
      industry: { type: String, default: "Services" },
      website: { type: String, default: "" },
      timeZone: { type: String, default: "Asia/Kolkata" },
    },
    meta: {
      businessManagerId: { type: String, default: "" },
      wabaId: { type: String, default: "" },
      phoneNumberId: { type: String, default: "" },
      displayPhoneNumber: { type: String, default: "" },
      appId: { type: String, default: "" },
      appSecret: { type: String, default: "" },
      accessToken: { type: String, default: "" },
      verifyToken: { type: String, default: "" },
      graphApiVersion: { type: String, default: "v23.0" },
      qualityRating: {
        type: String,
        enum: ["unknown", "low", "medium", "high"],
        default: "unknown",
      },
      status: {
        type: String,
        enum: ["needs_setup", "connected", "error"],
        default: "needs_setup",
      },
      lastVerifiedAt: Date,
    },
    subscription: {
      plan: { type: String, enum: ["launch"], default: "launch" },
      status: {
        type: String,
        enum: ["trial", "active", "past_due", "cancelled"],
        default: "trial",
      },
      billingCycle: {
        type: String,
        enum: ["monthly", "yearly"],
        default: "monthly",
      },
      messageLimit: { type: Number, default: 10000 },
      messagesUsed: { type: Number, default: 0 },
      numbersLimit: { type: Number, default: 1 },
      seatsLimit: { type: Number, default: 1 },
      agentsLimit: { type: Number, default: 3 },
      nextBillingDate: {
        type: Date,
        default: () => new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
      },
    },
    appointmentConfig: {
      enabled: { type: Boolean, default: true },
      clinicName: { type: String, default: "My Clinic" },
      timezone: { type: String, default: "Asia/Kolkata" },
      slotDurationMinutes: { type: Number, default: 30 },
      bufferMinutes: { type: Number, default: 10 },
      bookingWindowDays: { type: Number, default: 14 },
      workingHours: [
        {
          day: String,
          isOpen: { type: Boolean, default: true },
          open: { type: String, default: "10:00" },
          close: { type: String, default: "18:00" },
        },
      ],
      services: [
        {
          name: String,
          durationMinutes: { type: Number, default: 30 },
          priceInr: { type: Number, default: 0 },
          doctor: String,
          isActive: { type: Boolean, default: true },
        },
      ],
      requiredFields: [String],
      emergencyKeywords: [String],
      confirmationTemplateName: String,
      reminderTemplateName: String,
    },
    agents: [
      {
        name: String,
        type: {
          type: String,
          enum: ["sales", "support", "retention", "custom"],
          default: "sales",
        },
        status: {
          type: String,
          enum: ["live", "draft", "paused"],
          default: "draft",
        },
        trigger: String,
        goal: String,
        prompt: String,
        collectFields: [String],
        handoffRules: [String],
        isActive: { type: Boolean, default: false },
        createdAt: { type: Date, default: Date.now },
        updatedAt: { type: Date, default: Date.now },
      },
    ],
    templates: [
      {
        name: String,
        language: { type: String, default: "en" },
        category: {
          type: String,
          enum: ["marketing", "utility", "authentication"],
          default: "utility",
        },
        status: {
          type: String,
          enum: ["draft", "pending", "approved", "rejected"],
          default: "draft",
        },
        body: String,
        example: String,
        metaTemplateId: String,
        createdAt: { type: Date, default: Date.now },
        updatedAt: { type: Date, default: Date.now },
      },
    ],
    contacts: [
      {
        waId: { type: String, index: true },
        name: String,
        phone: String,
        email: String,
        consentStatus: {
          type: String,
          enum: ["opted_in", "opted_out", "unknown"],
          default: "unknown",
        },
        lifecycleStage: {
          type: String,
          enum: ["lead", "customer", "at_risk", "lost"],
          default: "lead",
        },
        intentScore: { type: Number, default: 0 },
        tags: [String],
        lastMessageAt: Date,
        createdAt: { type: Date, default: Date.now },
      },
    ],
    conversations: [
      {
        waId: { type: String, index: true },
        contactName: String,
        phone: String,
        lastMessage: String,
        owner: { type: String, enum: ["ai", "human"], default: "ai" },
        status: {
          type: String,
          enum: ["open", "pending_human", "resolved"],
          default: "open",
        },
        intent: {
          type: String,
          enum: ["sales", "support", "billing", "general"],
          default: "general",
        },
        sentiment: {
          type: String,
          enum: ["positive", "neutral", "negative"],
          default: "neutral",
        },
        messages: [
          {
            providerMessageId: String,
            direction: {
              type: String,
              enum: ["inbound", "outbound"],
              default: "inbound",
            },
            type: {
              type: String,
              enum: ["text", "template", "image", "interactive"],
              default: "text",
            },
            body: String,
            status: {
              type: String,
              enum: ["received", "sent", "delivered", "read", "failed"],
              default: "received",
            },
            createdAt: { type: Date, default: Date.now },
          },
        ],
        createdAt: { type: Date, default: Date.now },
        updatedAt: { type: Date, default: Date.now },
      },
    ],
    campaigns: [
      {
        name: String,
        templateName: String,
        segment: String,
        status: {
          type: String,
          enum: ["draft", "scheduled", "running", "paused", "completed"],
          default: "draft",
        },
        scheduledAt: Date,
        recipients: { type: Number, default: 0 },
        delivered: { type: Number, default: 0 },
        read: { type: Number, default: 0 },
        replies: { type: Number, default: 0 },
        createdAt: { type: Date, default: Date.now },
        updatedAt: { type: Date, default: Date.now },
      },
    ],
    appointments: [
      {
        patientName: { type: String, default: "Unknown patient" },
        patientPhone: String,
        patientWaId: String,
        patientEmail: String,
        service: { type: String, default: "Consultation" },
        doctor: String,
        symptoms: String,
        preferredDate: String,
        preferredTime: String,
        scheduledAt: Date,
        status: {
          type: String,
          enum: ["requested", "confirmed", "cancelled", "completed", "no_show"],
          default: "requested",
        },
        source: {
          type: String,
          enum: ["whatsapp", "manual"],
          default: "whatsapp",
        },
        urgency: {
          type: String,
          enum: ["routine", "urgent", "emergency"],
          default: "routine",
        },
        notes: String,
        conversationWaId: String,
        createdAt: { type: Date, default: Date.now },
        updatedAt: { type: Date, default: Date.now },
      },
    ],
  },
  { timestamps: true },
);

WhatsAppWorkspaceSchema.index({ "meta.phoneNumberId": 1 });
WhatsAppWorkspaceSchema.index({ "contacts.phone": 1 });
WhatsAppWorkspaceSchema.index({ "conversations.updatedAt": -1 });
WhatsAppWorkspaceSchema.index({ "appointments.scheduledAt": 1 });

const WhatsAppWorkspace =
  (mongoose.models?.WhatsAppWorkspace ||
    mongoose.model<IWhatsAppWorkspace>(
      "WhatsAppWorkspace",
      WhatsAppWorkspaceSchema,
    )) as Model<IWhatsAppWorkspace>;

export default WhatsAppWorkspace;
