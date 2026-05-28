import { Request, Response } from "express";
import { getAuth } from "@clerk/express";
import { connectToDatabase } from "@/config/database.config";
import CallAssistantWorkspace, {
  ICallAssistantWorkspace,
} from "@/models/call/CallAssistantWorkspace.model";
import CallSubscription from "@/models/call/CallSubscription.model";
import {
  connectExotelCall,
  getExotelConfigStatus,
  mergeExotelPayload,
  normalizeExotelWebhook,
  sendExotelSms,
  verifyExotelWebhookSecret,
} from "@/services/call/exotel.service";
import { sendCallNotifications } from "@/services/call/call-notification.service";
import {
  leaseSharedNumber,
  releaseSharedNumber,
} from "@/services/call/call-number-pool.service";
import { sendEmail } from "@/services/smtp-mailer.service";

const plans = [
  {
    id: "free",
    name: "Free",
    priceInr: 0,
    priceUsd: 0,
    minutes: 10,
    calls: 5,
    overageInr: 0,
    agents: 1,
    numbers: 0,
    features: ["Shared number pool", "10 minutes or 5 calls", "Upgrade reminder"],
  },
  {
    id: "starter",
    name: "Starter",
    priceInr: 2999,
    priceUsd: 49,
    minutes: 1000,
    calls: 1000,
    overageInr: 5,
    agents: 3,
    numbers: 1,
    features: ["AI receptionist", "Lead capture", "WhatsApp alerts"],
  },
  {
    id: "growth",
    name: "Growth",
    priceInr: 7999,
    priceUsd: 199,
    minutes: 3000,
    calls: 3000,
    overageInr: 4,
    agents: 10,
    numbers: 3,
    features: ["Flow editor", "Call recordings", "Calendar handoff"],
  },
  {
    id: "enterprise",
    name: "Enterprise",
    priceInr: 19999,
    priceUsd: 299,
    minutes: 10000,
    calls: 999999,
    overageInr: 3,
    agents: 30,
    numbers: 10,
    features: ["High-volume minutes", "Dedicated support", "CRM integrations"],
  },
] as const;

const daysFromNow = (days: number) =>
  new Date(Date.now() + days * 24 * 60 * 60 * 1000);

const DEFAULT_BEHAVIOR_PROMPT =
  "You are CatchCustomerCall's inbound voice assistant for prospective customers. Speak warmly, clearly, and briefly. Your job is to qualify new leads interested in AI call answering for businesses. Explain only these verified basics: the service helps businesses avoid missed calls by using AI to answer, collect lead details, and support routing/notifications. Pricing: Starter 2999/month for 1000 minutes, Growth 7999/month for 3000 minutes, Enterprise 19999/month for 10000 minutes. Collect: caller name, phone number, business name, and the service or plan they want. Never invent features, pricing, or promises. If unsure, say Gaurav will follow up. End by confirming captured details and saying Gaurav will call back soon.";

const DEFAULT_QUESTIONS = [
  "May I know your name?",
  "What is your phone number?",
  "What is your business name?",
  "Which service or plan are you interested in?",
];

async function getOrCreateWorkspace(
  clerkId: string,
): Promise<ICallAssistantWorkspace> {
  let workspace = await CallAssistantWorkspace.findOne({ clerkId });
  if (workspace) return workspace;

  workspace = await CallAssistantWorkspace.create({
    clerkId,
    isConfigured: false,
    owner: {
      name: "",
      whatsappNumber: "",
      smsNumber: "",
      email: "",
    },
    organization: {
      name: "My Business",
      industry: "Services",
      phone: "",
      email: "",
      address: "",
      timeZone: "Asia/Kolkata",
    },
    subscription: {
      plan: "free",
      status: "trial",
      billingCycle: "monthly",
      minutesLimit: 10,
      minutesUsed: 0,
      overageRate: 0,
      callsLimit: 5,
      callsUsed: 0,
      isFree: true,
      nextBillingDate: daysFromNow(7),
    },
    numbers: [],
    calls: [],
    leads: [],
    flows: [
      {
        name: "Default receptionist",
        language: "en-IN",
        greeting:
          "Hello, thanks for calling. I am the AI receptionist. How can I help you today?",
        behaviorPrompt: DEFAULT_BEHAVIOR_PROMPT,
        questions: DEFAULT_QUESTIONS,
        collectFields: ["name", "phone", "business_name", "service_or_plan"],
        noVoiceTimeoutSec: 120,
        fallbackAction: "take_message",
        isActive: true,
      },
    ],
    notifications: [],
    integrations: [
      { type: "exotel", label: "Exotel", status: "needs_setup", config: {} },
    ],
    appointments: [],
    team: [],
    invoices: [],
  });

  return workspace;
}

const authUserId = (req: Request) => getAuth(req).userId;

const unauthorized = (res: Response) =>
  res.status(401).json({
    success: false,
    error: "Unauthorized",
    timestamp: new Date().toISOString(),
  });

const ok = (res: Response, data: any) =>
  res.status(200).json({ success: true, data, timestamp: new Date().toISOString() });

export const getCallPlansController = async (_req: Request, res: Response) =>
  ok(res, { plans });

export const getCallExotelConfigController = async (
  _req: Request,
  res: Response,
) => ok(res, getExotelConfigStatus());

export const getCallDashboardController = async (req: Request, res: Response) => {
  try {
    const userId = authUserId(req);
    if (!userId) return unauthorized(res);

    await connectToDatabase();
    const workspace = await getOrCreateWorkspace(userId);
    const calls = workspace.calls || [];
    const leads = workspace.leads || [];
    const answeredCalls = calls.filter((call) => call.status !== "missed");
    const minutesUsed = Math.ceil(
      calls.reduce((sum, call) => sum + (call.durationSec || 0), 0) / 60,
    );
    const callsUsed = calls.length;

    if (minutesUsed !== workspace.subscription.minutesUsed) {
      workspace.subscription.minutesUsed = minutesUsed;
      await workspace.save();
    }

    const trends = Array.from({ length: 7 }).map((_, index) => {
      const date = new Date();
      date.setDate(date.getDate() - (6 - index));
      const dayCalls = calls.filter((call) => {
        const created = new Date(call.createdAt);
        return created.toDateString() === date.toDateString();
      });
      return {
        label: date.toLocaleDateString("en-IN", { day: "numeric", month: "short" }),
        calls: dayCalls.length,
        leads: leads.filter(
          (lead) => new Date(lead.createdAt).toDateString() === date.toDateString(),
        ).length,
      };
    });

    return ok(res, {
      isConfigured: workspace.isConfigured,
      overview: {
        totalCalls: calls.length,
        answeredCalls: answeredCalls.length,
        missedCalls: calls.length - answeredCalls.length,
        totalLeads: leads.length,
        minutesUsed,
        minutesLimit: workspace.subscription.minutesLimit,
        callsUsed,
        callsLimit: workspace.subscription.callsLimit,
        activeFlows: workspace.flows.filter((flow) => flow.isActive).length,
        activeNumbers: workspace.numbers.filter((num) => num.status === "active").length,
      },
      organization: workspace.organization,
      owner: workspace.owner,
      subscription: workspace.subscription,
      flows: workspace.flows,
      notifications: workspace.notifications,
      numbers: workspace.numbers,
      subscriptions: await CallSubscription.find({
        clerkId: userId,
        status: "active",
      })
        .sort({ createdAt: -1 })
        .lean(),
      recentCalls: calls.slice(-5).reverse(),
      recentLeads: leads.slice(-5).reverse(),
      trends,
    });
  } catch (error) {
    console.error("Call dashboard error:", error);
    return res.status(500).json({ success: false, error: "Internal server error" });
  }
};

export const getCallCollectionController = async (req: Request, res: Response) => {
  try {
    const userId = authUserId(req);
    if (!userId) return unauthorized(res);

    const { collection } = req.params;
    await connectToDatabase();
    const workspace = await getOrCreateWorkspace(userId);
    const allowed = [
      "calls",
      "leads",
      "numbers",
      "flows",
      "notifications",
      "integrations",
      "appointments",
      "team",
      "invoices",
    ];

    if (!allowed.includes(collection)) {
      return res.status(404).json({ success: false, error: "Collection not found" });
    }

    return ok(res, {
      [collection]: ((workspace as any)[collection] || []).slice().reverse(),
      subscriptions: await CallSubscription.find({
        clerkId: userId,
        status: "active",
      })
        .sort({ createdAt: -1 })
        .lean(),
      subscription: workspace.subscription,
      organization: workspace.organization,
      owner: workspace.owner,
      isConfigured: workspace.isConfigured,
    });
  } catch (error) {
    console.error("Call collection error:", error);
    return res.status(500).json({ success: false, error: "Internal server error" });
  }
};

export const listCallSubscriptionsController = async (
  req: Request,
  res: Response,
) => {
  try {
    const userId = authUserId(req);
    if (!userId) return unauthorized(res);

    await connectToDatabase();
    const subscriptions = await CallSubscription.find({ clerkId: userId })
      .sort({ createdAt: -1 })
      .lean();

    return ok(res, { subscriptions });
  } catch (error) {
    console.error("Call subscriptions error:", error);
    return res.status(500).json({ success: false, error: "Internal server error" });
  }
};

export const updateCallWorkspaceController = async (req: Request, res: Response) => {
  try {
    const userId = authUserId(req);
    if (!userId) return unauthorized(res);

    await connectToDatabase();
    const workspace = await getOrCreateWorkspace(userId);
    const { organization, owner, subscription, flow, notifications } = req.body;

    if (organization) {
      Object.assign(workspace.organization, organization);
    }

    if (owner) {
      Object.assign(workspace.owner, owner);
    }

    if (Array.isArray(notifications)) {
      workspace.notifications = notifications;
    }

    if (flow) {
      const activeFlow = workspace.flows.find((item) => item.isActive) || workspace.flows[0];
      if (activeFlow) {
        Object.assign(activeFlow, {
          ...flow,
          updatedAt: new Date(),
        });
      } else {
        workspace.flows.push({
          name: "Default receptionist",
          language: "en-IN",
          greeting: "Hello, thanks for calling. How can I help you today?",
          behaviorPrompt: DEFAULT_BEHAVIOR_PROMPT,
          questions: DEFAULT_QUESTIONS,
          collectFields: ["name", "phone", "business_name", "service_or_plan"],
          noVoiceTimeoutSec: 120,
          fallbackAction: "take_message",
          isActive: true,
          ...flow,
        } as any);
      }
    }

    if (subscription?.plan) {
      const plan = plans.find((item) => item.id === subscription.plan);
      if (!plan) {
        return res.status(400).json({ success: false, error: "Invalid plan" });
      }
      workspace.subscription.plan = plan.id;
      workspace.subscription.minutesLimit = plan.minutes;
      workspace.subscription.callsLimit = plan.calls;
      workspace.subscription.overageRate = plan.overageInr;
      workspace.subscription.isFree = plan.id === "free";
      workspace.subscription.status = "active";
    }

    await workspace.save();
    return ok(res, { workspace });
  } catch (error) {
    console.error("Call update error:", error);
    return res.status(500).json({ success: false, error: "Internal server error" });
  }
};

export const createCallAssistantController = async (req: Request, res: Response) => {
  try {
    const userId = authUserId(req);
    if (!userId) return unauthorized(res);

    await connectToDatabase();
    const workspace = await getOrCreateWorkspace(userId);
    const {
      ownerName,
      businessName,
      businessPhone,
      ownerEmail,
      whatsappNumber,
      smsNumber,
      assistantBehavior,
      greeting,
      questions,
      collectFields,
      noVoiceTimeoutSec,
    } = req.body;

    workspace.isConfigured = true;
    workspace.owner = {
      name: ownerName || workspace.owner?.name || "Owner",
      email: ownerEmail || workspace.owner?.email || "",
      whatsappNumber: whatsappNumber || workspace.owner?.whatsappNumber || "",
      smsNumber: smsNumber || workspace.owner?.smsNumber || "",
    };
    workspace.organization.name = businessName || workspace.organization.name;
    workspace.organization.phone = businessPhone || workspace.organization.phone;
    workspace.organization.email = ownerEmail || workspace.organization.email;
    workspace.notifications = [
      ...(whatsappNumber
        ? [{ channel: "whatsapp", address: whatsappNumber, enabled: true }]
        : []),
      ...(smsNumber ? [{ channel: "sms", address: smsNumber, enabled: true }] : []),
      ...(ownerEmail ? [{ channel: "email", address: ownerEmail, enabled: true }] : []),
    ] as any;

    const leased = await leaseSharedNumber({ clerkId: userId, minutes: 60 });
    if (leased && !workspace.numbers.some((num) => num.phoneNumber === leased.phoneNumber)) {
      workspace.numbers.push({
        phoneNumber: leased.phoneNumber,
        label: "Free shared receptionist number",
        countryCode: leased.countryCode,
        type: leased.type,
        status: "active",
        provider: "exotel",
        assignment: "shared_pool",
        assignedUntil: leased.leaseExpiresAt,
        createdAt: new Date(),
      } as any);
    }

    workspace.flows = [
      {
        name: "CatchCustomerCall Voice Lead Capture",
        language: "en-IN",
        greeting:
          greeting ||
          "Hello, thanks for calling CatchCustomerCall. How can I help you today?",
        behaviorPrompt: assistantBehavior || DEFAULT_BEHAVIOR_PROMPT,
        questions: Array.isArray(questions) && questions.length ? questions : DEFAULT_QUESTIONS,
        collectFields:
          Array.isArray(collectFields) && collectFields.length
            ? collectFields
            : ["name", "phone", "business_name", "service_or_plan"],
        noVoiceTimeoutSec: Math.min(Number(noVoiceTimeoutSec || 120), 120),
        fallbackAction: "take_message",
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as any,
    ];

    await workspace.save();
    return ok(res, { workspace });
  } catch (error) {
    console.error("Create call assistant error:", error);
    return res.status(500).json({ success: false, error: "Internal server error" });
  }
};

export const createCallItemController = async (req: Request, res: Response) => {
  try {
    const userId = authUserId(req);
    if (!userId) return unauthorized(res);

    const { collection } = req.params;
    const allowed = [
      "numbers",
      "flows",
      "notifications",
      "appointments",
      "leads",
      "team",
    ];
    if (!allowed.includes(collection)) {
      return res.status(400).json({ success: false, error: "Cannot create item in this collection" });
    }

    await connectToDatabase();
    const workspace = await getOrCreateWorkspace(userId);
    (workspace as any)[collection].push(req.body);
    await workspace.save();

    return res.status(201).json({
      success: true,
      data: { [collection]: (workspace as any)[collection] },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Call create item error:", error);
    return res.status(500).json({ success: false, error: "Internal server error" });
  }
};

export const sendCallSmsController = async (req: Request, res: Response) => {
  try {
    const userId = authUserId(req);
    if (!userId) return unauthorized(res);

    const { to, body } = req.body;
    if (!to || !body) {
      return res
        .status(400)
        .json({ success: false, error: "to and body are required" });
    }

    const result = await sendExotelSms({ to, body });
    return ok(res, { sent: true, result });
  } catch (error: any) {
    console.error("Call SMS error:", error);
    return res.status(500).json({
      success: false,
      error: error.message || "Failed to send SMS",
    });
  }
};

export const connectCallController = async (req: Request, res: Response) => {
  try {
    const userId = authUserId(req);
    if (!userId) return unauthorized(res);

    const { from, to, callerId, url } = req.body;
    if (!from || !to) {
      return res
        .status(400)
        .json({ success: false, error: "from and to are required" });
    }

    const result = await connectExotelCall({ from, to, callerId, url });
    return ok(res, { initiated: true, result });
  } catch (error: any) {
    console.error("Call connect error:", error);
    return res.status(500).json({
      success: false,
      error: error.message || "Failed to connect call",
    });
  }
};

export const exotelWebhookController = async (req: Request, res: Response) => {
  try {
    const payload = mergeExotelPayload(req.query, req.body);
    payload["x-exotel-webhook-secret"] =
      req.headers["x-exotel-webhook-secret"] || "";

    if (!verifyExotelWebhookSecret(payload)) {
      return res.status(401).json({ success: false, error: "Invalid webhook secret" });
    }

    const normalized = normalizeExotelWebhook(payload);
    const ownerId = payload.clerkId || payload.userId || payload.ownerId;

    await connectToDatabase();
    let workspace: ICallAssistantWorkspace | null = null;

    if (ownerId) {
      workspace = await getOrCreateWorkspace(String(ownerId));
    } else if (normalized.virtualNumber) {
      workspace = await CallAssistantWorkspace.findOne({
        "numbers.phoneNumber": normalized.virtualNumber,
      });
    }

    if (!workspace) {
      return res.status(404).json({
        success: false,
        error:
          "No call workspace found. Pass clerkId/userId in the webhook URL or add the Exotel virtual number in Number Management.",
      });
    }

    if (!workspace.isConfigured) {
      return res.status(409).json({
        success: false,
        error: "Call assistant is not configured yet",
      });
    }

    const projectedMinutes =
      Math.ceil(
        workspace.calls.reduce((sum, call) => sum + (call.durationSec || 0), 0) /
          60,
      ) + Math.ceil(normalized.durationSec / 60);
    const projectedCalls = workspace.calls.some(
      (call) => call.callSid === normalized.callSid,
    )
      ? workspace.calls.length
      : workspace.calls.length + 1;

    if (
      workspace.subscription.isFree &&
      (projectedMinutes > workspace.subscription.minutesLimit ||
        projectedCalls > workspace.subscription.callsLimit)
    ) {
      workspace.subscription.status = "cancelled";
      workspace.subscription.pausedReason =
        "Free call assistant allowance exceeded. Upgrade required.";
      await workspace.save();

      if (workspace.owner?.email) {
        sendEmail({
          to: workspace.owner.email,
          subject: "Upgrade required for your AI Call Assistant",
          html: `
            <div style="font-family: Arial, sans-serif; padding: 20px;">
              <h2>Your free AI Call Assistant limit is complete</h2>
              <p>Your free plan includes ${workspace.subscription.minutesLimit} minutes or ${workspace.subscription.callsLimit} calls.</p>
              <p>Please upgrade to continue answering calls automatically.</p>
            </div>
          `,
        }).catch((error) => console.error("Upgrade email error:", error));
      }

      return res.status(402).json({
        success: false,
        error: "Free call assistant allowance exceeded. Upgrade required.",
      });
    }

    if (workspace.subscription.isFree && normalized.virtualNumber) {
      const leased = await leaseSharedNumber({
        clerkId: workspace.clerkId,
        callSid: normalized.callSid,
        minutes: 15,
      });
      if (
        leased &&
        !workspace.numbers.some((num) => num.phoneNumber === leased.phoneNumber)
      ) {
        workspace.numbers.push({
          phoneNumber: leased.phoneNumber,
          label: "Free shared receptionist number",
          countryCode: leased.countryCode,
          type: leased.type,
          status: "active",
          provider: "exotel",
          assignment: "shared_pool",
          assignedUntil: leased.leaseExpiresAt,
          createdAt: new Date(),
        } as any);
      }
    }

    const existing = workspace.calls.find(
      (call) => call.callSid === normalized.callSid,
    );
    const callPayload = {
      callSid: normalized.callSid,
      fromNumber: normalized.fromNumber,
      toNumber: normalized.virtualNumber || normalized.toNumber,
      direction: normalized.direction,
      status: normalized.status,
      durationSec: normalized.durationSec,
      recordingUrl: normalized.recordingUrl,
      transcriptText: normalized.transcriptText,
      summary: normalized.summary,
      providerPayload: normalized.rawPayload,
      createdAt: new Date(),
    };

    if (existing) Object.assign(existing, callPayload);
    else workspace.calls.push(callPayload as any);

    const shouldCreateLead =
      normalized.fromNumber &&
      (normalized.callerName ||
        normalized.callerEmail ||
        normalized.interest ||
        normalized.notes ||
        normalized.status === "missed");

    if (
      shouldCreateLead &&
      !workspace.leads.some((lead) => lead.callSid === normalized.callSid)
    ) {
      workspace.leads.push({
        callerName: normalized.callerName || "Unknown caller",
        callerPhone: normalized.fromNumber,
        callerEmail: normalized.callerEmail,
        interest:
          normalized.interest ||
          (normalized.status === "missed" ? "Missed call" : "Call inquiry"),
        notes: normalized.notes || normalized.summary,
        status: "new",
        callSid: normalized.callSid,
        createdAt: new Date(),
      } as any);
    }

    workspace.subscription.minutesUsed = Math.ceil(
      workspace.calls.reduce((sum, call) => sum + (call.durationSec || 0), 0) / 60,
    );
    workspace.subscription.callsUsed = workspace.calls.length;
    await workspace.save();

    const state = String(normalized.callState || "").toLowerCase();
    if (["completed", "terminal", "finished"].includes(state)) {
      releaseSharedNumber(normalized.callSid).catch((error) => {
        console.error("Shared number release error:", error);
      });
    }

    sendCallNotifications({
      channels: workspace.notifications,
      alert: {
        businessName: workspace.organization.name,
        callerPhone: normalized.fromNumber,
        callerName: normalized.callerName,
        status: normalized.status,
        summary: normalized.summary,
        recordingUrl: normalized.recordingUrl,
      },
    }).catch((error) => {
      console.error("Call notification error:", error);
    });

    return ok(res, { received: true, callSid: normalized.callSid });
  } catch (error) {
    console.error("Exotel webhook error:", error);
    return res.status(500).json({ success: false, error: "Internal server error" });
  }
};
