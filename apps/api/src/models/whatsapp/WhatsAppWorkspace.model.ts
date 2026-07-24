import mongoose, { Document, Model, Schema } from "mongoose";

export type WhatsAppPlanId = "free" | "launch" | "package";
export type WhatsAppTemplateCategory =
  | "marketing"
  | "utility"
  | "authentication";

export interface IWhatsAppWorkspace extends Document {
  clerkId: string;
  isConfigured: boolean;
  onboarding: {
    status:
      | "not_started"
      | "facebook_connected"
      | "number_pending"
      | "connected"
      | "error";
    mode: "embedded_signup";
    facebookUserId?: string;
    facebookName?: string;
    businessId?: string;
    phoneSource?: "official_number" | "meta_free_number";
    requestedPhoneNumber?: string;
    businessDisplayName?: string;
    businessWebsite?: string;
    businessCategory?: string;
    lastError?: string;
    connectedAt?: Date;
  };
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
    subscriptionId?: string;
    razorpayPaymentId?: string;
    offerId?: string;
    activatedAt?: Date;
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
      description?: string;
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
  automationConfig: {
    enabled: boolean;
    greetingMessage: string;
    menuMessage: string;
    supportPrompt: string;
    pricingMessage: string;
    negotiationMessage: string;
    ownerContactMessage: string;
    menuOptions: Array<{
      id:
        | "book_appointment"
        | "talk_to_owner"
        | "need_support"
        | "service_pricing"
        | "browse_faqs";
      title: string;
      description: string;
      enabled: boolean;
    }>;
    appointmentQuestions: Array<{
      id: string;
      field:
        | "patientName"
        | "patientEmail"
        | "service"
        | "preferredDate"
        | "preferredTime"
        | "symptoms"
        | "custom";
      question: string;
      type: "text" | "email" | "select" | "date" | "time" | "textarea";
      required: boolean;
      options: string[];
    }>;
    followUps: {
      enabled: boolean;
      firstDelayMinutes: number;
      secondDelayMinutes: number;
      firstMessage: string;
      secondMessage: string;
    };
    updatedAt?: Date;
  };
  faqs: Array<{
    id: string;
    question: string;
    answer: string;
    isActive: boolean;
    order: number;
    createdAt: Date;
    updatedAt: Date;
  }>;
  appointmentFlow: {
    enabled: boolean;
    name: string;
    flowId?: string;
    status:
      | "draft"
      | "validation_error"
      | "published"
      | "deprecated"
      | "blocked"
      | "error";
    categories: string[];
    jsonVersion: string;
    endpointUri?: string;
    publicKey?: string;
    endpointStatus?: "missing" | "configured" | "healthy" | "error";
    publicKeyStatus?: "missing" | "added" | "signed" | "error";
    phoneNumberStatus?: "missing" | "added";
    metaAppStatus?: "missing" | "connected";
    departmentLabel?: string;
    locationLabel?: string;
    serviceLabel?: string;
    customerNameLabel?: string;
    phoneLabel?: string;
    requirementLabel?: string;
    dateLabel?: string;
    timeLabel?: string;
    submitButtonLabel?: string;
    successMessage?: string;
    departmentOptions?: string[];
    locationOptions?: string[];
    chatQuestions?: Array<{
      field:
        | "patientName"
        | "patientPhone"
        | "service"
        | "preferredDate"
        | "preferredTime"
        | "symptoms";
      question: string;
      required: boolean;
    }>;
    validationErrors: Array<Record<string, any>>;
    lastError?: string;
    lastSyncedAt?: Date;
    publishedAt?: Date;
    updatedAt?: Date;
  };
  notificationSettings: {
    email: string;
    whatsappNumber: string;
    emailEnabled: boolean;
    whatsappEnabled: boolean;
  };
  businessInfo: {
    websiteUrl: string;
    summary: string;
    fileName?: string;
    fileType?: string;
    fileSize?: number;
    fileText?: string;
    websiteKnowledgeUrl?: string;
    fileKnowledgeUrl?: string;
    knowledgeBaseUrl?: string;
    knowledgeBaseFileName?: string;
    knowledgeUpdatedAt?: Date;
    updatedAt?: Date;
  };
  greetingTemplate: {
    name: string;
    language: string;
    category: "utility";
    status: "draft" | "pending" | "approved" | "rejected";
    body: string;
    example: string;
    metaTemplateId?: string;
    submittedAt?: Date;
    approvedAt?: Date;
    lastError?: string;
    updatedAt?: Date;
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
    appointmentDraft?: {
      status: "collecting";
      currentQuestionIndex: number;
      timePage?: number;
      answers: Array<{
        field: string;
        question: string;
        answer: string;
      }>;
      startedAt: Date;
      updatedAt: Date;
    };
    automationMode?: "support";
    automationMenu?: {
      lastShownAt?: Date;
      lastShownInboundCount: number;
    };
    lastCustomerMessageAt?: Date;
    followUp?: {
      stage: number;
      nextAt?: Date;
      lastSentAt?: Date;
      completed: boolean;
      suppressedByAppointment?: boolean;
    };
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
    status:
      | "requested"
      | "active"
      | "confirmed"
      | "resolved"
      | "cancelled"
      | "completed"
      | "no_show";
    source: "whatsapp" | "manual";
    urgency: "routine" | "urgent" | "emergency";
    notes?: string;
    conversationWaId?: string;
    expiresAt: Date;
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
    onboarding: {
      status: {
        type: String,
        enum: [
          "not_started",
          "facebook_connected",
          "number_pending",
          "connected",
          "error",
        ],
        default: "not_started",
      },
      mode: {
        type: String,
        enum: ["embedded_signup"],
        default: "embedded_signup",
      },
      facebookUserId: String,
      facebookName: String,
      businessId: String,
      phoneSource: {
        type: String,
        enum: ["official_number", "meta_free_number"],
      },
      requestedPhoneNumber: String,
      businessDisplayName: String,
      businessWebsite: String,
      businessCategory: String,
      lastError: String,
      connectedAt: Date,
    },
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
      graphApiVersion: { type: String, default: "v25.0" },
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
      plan: { type: String, enum: ["free", "launch", "package"], default: "free" },
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
      messageLimit: { type: Number, default: 10 },
      messagesUsed: { type: Number, default: 0 },
      numbersLimit: { type: Number, default: 1 },
      seatsLimit: { type: Number, default: 1 },
      agentsLimit: { type: Number, default: 3 },
      subscriptionId: String,
      razorpayPaymentId: String,
      offerId: String,
      activatedAt: Date,
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
          open: { type: String, default: "09:00" },
          close: { type: String, default: "17:00" },
        },
      ],
      services: [
        {
          name: String,
          description: String,
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
    automationConfig: {
      enabled: { type: Boolean, default: true },
      greetingMessage: {
        type: String,
        default: "Hi, thanks for messaging us. How can we help you today?",
      },
      menuMessage: {
        type: String,
        default: "Choose an option below, or type your question for an AI-assisted reply.",
      },
      supportPrompt: {
        type: String,
        default: "We are listening. Please explain the issue in detail and we will help you.",
      },
      pricingMessage: {
        type: String,
        default: "Choose a service to view pricing and booking options.",
      },
      negotiationMessage: {
        type: String,
        default: "Need a custom quote? We are open to discussing your requirements.",
      },
      ownerContactMessage: {
        type: String,
        default: "You can contact the business owner using the details below.",
      },
      menuOptions: {
        type: [
          {
            id: {
              type: String,
              enum: [
                "book_appointment",
                "talk_to_owner",
                "need_support",
                "service_pricing",
                "browse_faqs",
              ],
              required: true,
            },
            title: { type: String, required: true },
            description: { type: String, default: "" },
            enabled: { type: Boolean, default: true },
          },
        ],
        default: [
          { id: "book_appointment", title: "Book appointment", description: "Choose a service, date and time", enabled: true },
          { id: "talk_to_owner", title: "Talk to owner", description: "Get the owner's contact details", enabled: true },
          { id: "need_support", title: "Need support", description: "Describe an issue for assistance", enabled: true },
          { id: "service_pricing", title: "Service pricing", description: "View services and prices", enabled: true },
          { id: "browse_faqs", title: "FAQs", description: "Browse common questions", enabled: true },
        ],
      },
      appointmentQuestions: {
        type: [
          {
            id: { type: String, required: true },
            field: {
              type: String,
              enum: [
                "patientName",
                "patientEmail",
                "service",
                "preferredDate",
                "preferredTime",
                "symptoms",
                "custom",
              ],
              required: true,
            },
            question: { type: String, required: true },
            type: {
              type: String,
              enum: ["text", "email", "select", "date", "time", "textarea"],
              default: "text",
            },
            required: { type: Boolean, default: true },
            options: { type: [String], default: [] },
          },
        ],
        default: [
          { id: "name", field: "patientName", question: "What is your full name?", type: "text", required: true, options: [] },
          { id: "email", field: "patientEmail", question: "What is your email address?", type: "email", required: false, options: [] },
          { id: "service", field: "service", question: "Which service do you need?", type: "select", required: true, options: [] },
          { id: "date", field: "preferredDate", question: "Choose your preferred date.", type: "date", required: true, options: [] },
          { id: "time", field: "preferredTime", question: "Choose your preferred time.", type: "time", required: true, options: [] },
          { id: "requirement", field: "symptoms", question: "Please describe your requirement.", type: "textarea", required: true, options: [] },
        ],
      },
      followUps: {
        enabled: { type: Boolean, default: true },
        firstDelayMinutes: { type: Number, default: 30 },
        secondDelayMinutes: { type: Number, default: 180 },
        firstMessage: {
          type: String,
          default: "Do you need any more information or help booking an appointment?",
        },
        secondMessage: {
          type: String,
          default: "We are still available if you would like to discuss your requirement or book an appointment.",
        },
      },
      updatedAt: Date,
    },
    faqs: [
      {
        id: { type: String, required: true },
        question: { type: String, required: true },
        answer: { type: String, required: true },
        isActive: { type: Boolean, default: true },
        order: { type: Number, default: 0 },
        createdAt: { type: Date, default: Date.now },
        updatedAt: { type: Date, default: Date.now },
      },
    ],
    appointmentFlow: {
      enabled: { type: Boolean, default: true },
      name: { type: String, default: "RocketReplai Appointment Booking" },
      flowId: { type: String, default: "" },
      status: {
        type: String,
        enum: [
          "draft",
          "validation_error",
          "published",
          "deprecated",
          "blocked",
          "error",
        ],
        default: "draft",
      },
      categories: { type: [String], default: ["APPOINTMENT_BOOKING"] },
      jsonVersion: { type: String, default: "7.1" },
      endpointUri: { type: String, default: "" },
      publicKey: { type: String, default: "" },
      endpointStatus: {
        type: String,
        enum: ["missing", "configured", "healthy", "error"],
        default: "missing",
      },
      publicKeyStatus: {
        type: String,
        enum: ["missing", "added", "signed", "error"],
        default: "missing",
      },
      phoneNumberStatus: {
        type: String,
        enum: ["missing", "added"],
        default: "missing",
      },
      metaAppStatus: {
        type: String,
        enum: ["missing", "connected"],
        default: "missing",
      },
      departmentLabel: { type: String, default: "Department" },
      locationLabel: { type: String, default: "Location" },
      serviceLabel: { type: String, default: "Service" },
      customerNameLabel: { type: String, default: "Full name" },
      phoneLabel: { type: String, default: "Phone number" },
      requirementLabel: { type: String, default: "Requirement" },
      dateLabel: { type: String, default: "Preferred date" },
      timeLabel: { type: String, default: "Preferred time" },
      submitButtonLabel: { type: String, default: "Book appointment" },
      successMessage: {
        type: String,
        default:
          "Thanks. Your appointment request has been sent. The business team will confirm availability soon.",
      },
      departmentOptions: {
        type: [String],
        default: ["General", "Sales", "Support"],
      },
      locationOptions: {
        type: [String],
        default: ["Main branch", "Online consultation"],
      },
      chatQuestions: {
        type: [
          {
            field: {
              type: String,
              enum: [
                "patientName",
                "patientPhone",
                "service",
                "preferredDate",
                "preferredTime",
                "symptoms",
              ],
              required: true,
            },
            question: { type: String, required: true },
            required: { type: Boolean, default: true },
          },
        ],
        default: [
          { field: "patientName", question: "What is your full name?", required: true },
          { field: "patientPhone", question: "What phone number should we use?", required: true },
          { field: "service", question: "Which service do you want to book?", required: true },
          { field: "preferredDate", question: "Which date do you prefer?", required: true },
          { field: "preferredTime", question: "Which time do you prefer?", required: true },
          { field: "symptoms", question: "Please describe your requirement.", required: true },
        ],
      },
      validationErrors: { type: [Schema.Types.Mixed], default: [] },
      lastError: { type: String, default: "" },
      lastSyncedAt: Date,
      publishedAt: Date,
      updatedAt: Date,
    },
    notificationSettings: {
      email: { type: String, default: "" },
      whatsappNumber: { type: String, default: "" },
      emailEnabled: { type: Boolean, default: true },
      whatsappEnabled: { type: Boolean, default: true },
    },
    businessInfo: {
      websiteUrl: { type: String, default: "" },
      summary: { type: String, default: "" },
      fileName: String,
      fileType: String,
      fileSize: { type: Number, default: 0 },
      fileText: { type: String, default: "" },
      websiteKnowledgeUrl: { type: String, default: "" },
      fileKnowledgeUrl: { type: String, default: "" },
      knowledgeBaseUrl: { type: String, default: "" },
      knowledgeBaseFileName: { type: String, default: "" },
      knowledgeUpdatedAt: Date,
      updatedAt: Date,
    },
    greetingTemplate: {
      name: { type: String, default: "rocket_whatsapp_greeting" },
      language: { type: String, default: "en_US" },
      category: {
        type: String,
        enum: ["utility"],
        default: "utility",
      },
      status: {
        type: String,
        enum: ["draft", "pending", "approved", "rejected"],
        default: "draft",
      },
      body: {
        type: String,
        default:
          "Hi, thanks for messaging {{1}}. Please choose an option or share what you need help with.",
      },
      example: {
        type: String,
        default:
          "Hi, thanks for messaging Ainspiretech. Please choose an option or share what you need help with.",
      },
      metaTemplateId: String,
      submittedAt: Date,
      approvedAt: Date,
      lastError: String,
      updatedAt: Date,
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
        appointmentDraft: {
          status: {
            type: String,
            enum: ["collecting"],
          },
          currentQuestionIndex: { type: Number, default: 0 },
          timePage: { type: Number, default: 0 },
          answers: [
            {
              field: String,
              question: String,
              answer: String,
            },
          ],
          startedAt: Date,
          updatedAt: Date,
        },
        automationMode: {
          type: String,
          enum: ["support"],
        },
        automationMenu: {
          lastShownAt: Date,
          lastShownInboundCount: { type: Number, default: 0 },
        },
        lastCustomerMessageAt: Date,
        followUp: {
          stage: { type: Number, default: 0 },
          nextAt: Date,
          lastSentAt: Date,
          completed: { type: Boolean, default: false },
          suppressedByAppointment: { type: Boolean, default: false },
        },
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
          enum: [
            "requested",
            "active",
            "confirmed",
            "resolved",
            "cancelled",
            "completed",
            "no_show",
          ],
          default: "active",
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
        expiresAt: {
          type: Date,
          default: () => new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
        },
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
