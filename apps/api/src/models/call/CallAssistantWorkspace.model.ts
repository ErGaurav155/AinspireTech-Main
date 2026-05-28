import mongoose, { Document, Model, Schema } from "mongoose";

export type CallPlanId = "free" | "starter" | "growth" | "enterprise";
export type CallStatus = "answered" | "missed" | "transferred" | "voicemail";

export interface ICallAssistantWorkspace extends Document {
  clerkId: string;
  isConfigured: boolean;
  owner: {
    name: string;
    whatsappNumber: string;
    smsNumber: string;
    email: string;
  };
  organization: {
    name: string;
    industry: string;
    phone: string;
    email: string;
    address: string;
    timeZone: string;
  };
  subscription: {
    plan: CallPlanId;
    status: "trial" | "active" | "past_due" | "cancelled";
    billingCycle: "monthly" | "yearly";
    minutesLimit: number;
    minutesUsed: number;
    overageRate: number;
    callsLimit: number;
    callsUsed: number;
    isFree: boolean;
    pausedReason?: string;
    nextBillingDate: Date;
  };
  numbers: Array<{
    phoneNumber: string;
    label: string;
    countryCode: string;
    type: "local" | "tollfree";
    status: "active" | "pending" | "released";
    provider: "exotel" | "manual";
    providerNumberId?: string;
    assignment: "shared_pool" | "dedicated";
    assignedUntil?: Date;
    createdAt: Date;
  }>;
  calls: Array<{
    callSid: string;
    fromNumber: string;
    toNumber: string;
    direction: "inbound" | "outbound";
    status: CallStatus;
    durationSec: number;
    recordingUrl?: string;
    transcriptText?: string;
    summary?: string;
    providerPayload?: Record<string, any>;
    createdAt: Date;
  }>;
  leads: Array<{
    callerName: string;
    callerPhone: string;
    callerEmail?: string;
    interest: string;
    notes: string;
    status: "new" | "contacted" | "won" | "lost";
    callSid?: string;
    createdAt: Date;
  }>;
  flows: Array<{
    name: string;
    language: string;
    greeting: string;
    behaviorPrompt?: string;
    questions: string[];
    collectFields: string[];
    noVoiceTimeoutSec: number;
    fallbackAction: "take_message" | "transfer" | "hangup";
    transferNumber?: string;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
  }>;
  notifications: Array<{
    channel: "email" | "sms" | "whatsapp";
    address: string;
    enabled: boolean;
  }>;
  integrations: Array<{
    type: "exotel" | "whatsapp" | "google_calendar" | "crm" | "webhook";
    label: string;
    status: "connected" | "disconnected" | "needs_setup";
    config: Record<string, any>;
    updatedAt: Date;
  }>;
  appointments: Array<{
    title: string;
    customerName: string;
    customerPhone: string;
    startsAt: Date;
    status: "scheduled" | "completed" | "cancelled";
    notes?: string;
  }>;
  team: Array<{
    name: string;
    email: string;
    role: "owner" | "admin" | "agent" | "viewer";
    status: "active" | "invited";
    createdAt: Date;
  }>;
  invoices: Array<{
    invoiceNumber: string;
    amount: number;
    currency: "INR" | "USD";
    status: "paid" | "due" | "failed";
    periodStart: Date;
    periodEnd: Date;
    invoiceUrl?: string;
    createdAt: Date;
  }>;
  createdAt: Date;
  updatedAt: Date;
}

const CallAssistantWorkspaceSchema = new Schema<ICallAssistantWorkspace>(
  {
    clerkId: { type: String, required: true, unique: true, index: true },
    isConfigured: { type: Boolean, default: false },
    owner: {
      name: { type: String, default: "" },
      whatsappNumber: { type: String, default: "" },
      smsNumber: { type: String, default: "" },
      email: { type: String, default: "" },
    },
    organization: {
      name: { type: String, default: "My Business" },
      industry: { type: String, default: "Services" },
      phone: { type: String, default: "" },
      email: { type: String, default: "" },
      address: { type: String, default: "" },
      timeZone: { type: String, default: "Asia/Kolkata" },
    },
    subscription: {
      plan: { type: String, enum: ["free", "starter", "growth", "enterprise"], default: "free" },
      status: { type: String, enum: ["trial", "active", "past_due", "cancelled"], default: "trial" },
      billingCycle: { type: String, enum: ["monthly", "yearly"], default: "monthly" },
      minutesLimit: { type: Number, default: 10 },
      minutesUsed: { type: Number, default: 0 },
      overageRate: { type: Number, default: 0 },
      callsLimit: { type: Number, default: 5 },
      callsUsed: { type: Number, default: 0 },
      isFree: { type: Boolean, default: true },
      pausedReason: String,
      nextBillingDate: { type: Date, default: () => new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) },
    },
    numbers: [
      {
        phoneNumber: String,
        label: String,
        countryCode: { type: String, default: "IN" },
        type: { type: String, enum: ["local", "tollfree"], default: "local" },
        status: { type: String, enum: ["active", "pending", "released"], default: "pending" },
        provider: { type: String, enum: ["exotel", "manual"], default: "manual" },
        providerNumberId: String,
        assignment: { type: String, enum: ["shared_pool", "dedicated"], default: "shared_pool" },
        assignedUntil: Date,
        createdAt: { type: Date, default: Date.now },
      },
    ],
    calls: [
      {
        callSid: { type: String, required: true },
        fromNumber: String,
        toNumber: String,
        direction: { type: String, enum: ["inbound", "outbound"], default: "inbound" },
        status: { type: String, enum: ["answered", "missed", "transferred", "voicemail"], default: "answered" },
        durationSec: { type: Number, default: 0 },
        recordingUrl: String,
        transcriptText: String,
        summary: String,
        providerPayload: { type: Schema.Types.Mixed, default: {} },
        createdAt: { type: Date, default: Date.now },
      },
    ],
    leads: [
      {
        callerName: { type: String, default: "Unknown caller" },
        callerPhone: String,
        callerEmail: String,
        interest: String,
        notes: String,
        status: { type: String, enum: ["new", "contacted", "won", "lost"], default: "new" },
        callSid: String,
        createdAt: { type: Date, default: Date.now },
      },
    ],
    flows: [
      {
        name: String,
        language: { type: String, default: "en-IN" },
        greeting: String,
        behaviorPrompt: String,
        questions: [String],
        collectFields: [String],
        noVoiceTimeoutSec: { type: Number, default: 120 },
        fallbackAction: { type: String, enum: ["take_message", "transfer", "hangup"], default: "take_message" },
        transferNumber: String,
        isActive: { type: Boolean, default: true },
        createdAt: { type: Date, default: Date.now },
        updatedAt: { type: Date, default: Date.now },
      },
    ],
    notifications: [
      {
        channel: { type: String, enum: ["email", "sms", "whatsapp"] },
        address: String,
        enabled: { type: Boolean, default: true },
      },
    ],
    integrations: [
      {
        type: { type: String, enum: ["exotel", "whatsapp", "google_calendar", "crm", "webhook"] },
        label: String,
        status: { type: String, enum: ["connected", "disconnected", "needs_setup"], default: "needs_setup" },
        config: { type: Schema.Types.Mixed, default: {} },
        updatedAt: { type: Date, default: Date.now },
      },
    ],
    appointments: [
      {
        title: String,
        customerName: String,
        customerPhone: String,
        startsAt: Date,
        status: { type: String, enum: ["scheduled", "completed", "cancelled"], default: "scheduled" },
        notes: String,
      },
    ],
    team: [
      {
        name: String,
        email: String,
        role: { type: String, enum: ["owner", "admin", "agent", "viewer"], default: "viewer" },
        status: { type: String, enum: ["active", "invited"], default: "invited" },
        createdAt: { type: Date, default: Date.now },
      },
    ],
    invoices: [
      {
        invoiceNumber: String,
        amount: Number,
        currency: { type: String, enum: ["INR", "USD"], default: "INR" },
        status: { type: String, enum: ["paid", "due", "failed"], default: "due" },
        periodStart: Date,
        periodEnd: Date,
        invoiceUrl: String,
        createdAt: { type: Date, default: Date.now },
      },
    ],
  },
  { timestamps: true },
);

CallAssistantWorkspaceSchema.index({ "calls.callSid": 1 });
CallAssistantWorkspaceSchema.index({ "leads.callerPhone": 1 });

const CallAssistantWorkspace = (mongoose.models?.CallAssistantWorkspace ||
  mongoose.model<ICallAssistantWorkspace>(
    "CallAssistantWorkspace",
    CallAssistantWorkspaceSchema,
  )) as Model<ICallAssistantWorkspace>;

export default CallAssistantWorkspace;
