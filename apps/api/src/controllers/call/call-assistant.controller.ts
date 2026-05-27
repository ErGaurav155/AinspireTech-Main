import { Request, Response } from "express";
import { getAuth } from "@clerk/express";
import { connectToDatabase } from "@/config/database.config";
import CallAssistantWorkspace, {
  ICallAssistantWorkspace,
} from "@/models/call/CallAssistantWorkspace.model";
import CallSubscription from "@/models/call/CallSubscription.model";

const plans = [
  {
    id: "starter",
    name: "Starter",
    priceInr: 2999,
    priceUsd: 49,
    minutes: 1000,
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
    overageInr: 3,
    agents: 30,
    numbers: 10,
    features: ["High-volume minutes", "Dedicated support", "CRM integrations"],
  },
] as const;

const daysFromNow = (days: number) =>
  new Date(Date.now() + days * 24 * 60 * 60 * 1000);

async function getOrCreateWorkspace(
  clerkId: string,
): Promise<ICallAssistantWorkspace> {
  let workspace = await CallAssistantWorkspace.findOne({ clerkId });
  if (workspace) return workspace;

  workspace = await CallAssistantWorkspace.create({
    clerkId,
    organization: {
      name: "My Business",
      industry: "Services",
      phone: "",
      email: "",
      address: "",
      timeZone: "Asia/Kolkata",
    },
    numbers: [
      {
        phoneNumber: "+91 22 3551 1457",
        label: "Main receptionist",
        countryCode: "IN",
        type: "local",
        status: "pending",
        provider: "manual",
      },
    ],
    calls: [
      {
        callSid: `seed_${Date.now()}_1`,
        fromNumber: "+91 98765 43210",
        toNumber: "+91 22 3551 1457",
        status: "answered",
        durationSec: 184,
        summary: "Caller asked for pricing and requested a callback.",
        transcriptText:
          "The caller wanted to know monthly pricing and shared their phone number for follow-up.",
        createdAt: daysFromNow(-1),
      },
      {
        callSid: `seed_${Date.now()}_2`,
        fromNumber: "+91 91234 56780",
        toNumber: "+91 22 3551 1457",
        status: "missed",
        durationSec: 0,
        summary: "Missed after business hours.",
        createdAt: daysFromNow(-2),
      },
    ],
    leads: [
      {
        callerName: "Amit Sharma",
        callerPhone: "+91 98765 43210",
        callerEmail: "amit@example.com",
        interest: "Growth plan",
        notes: "Wants demo for clinic reception use case.",
        status: "new",
        createdAt: daysFromNow(-1),
      },
    ],
    flows: [
      {
        name: "Default receptionist",
        language: "en-IN",
        greeting:
          "Hello, thanks for calling. I am the AI receptionist. How can I help you today?",
        questions: [
          "May I know your name?",
          "What service are you interested in?",
          "Should the owner call you back?",
        ],
        fallbackAction: "take_message",
        isActive: true,
      },
    ],
    notifications: [
      { channel: "whatsapp", address: "+91 98765 43210", enabled: true },
      { channel: "email", address: "owner@example.com", enabled: true },
    ],
    integrations: [
      { type: "exotel", label: "Exotel", status: "needs_setup", config: {} },
      {
        type: "whatsapp",
        label: "WhatsApp Business",
        status: "needs_setup",
        config: {},
      },
      {
        type: "google_calendar",
        label: "Google Calendar",
        status: "disconnected",
        config: {},
      },
    ],
    appointments: [
      {
        title: "Demo call",
        customerName: "Amit Sharma",
        customerPhone: "+91 98765 43210",
        startsAt: daysFromNow(1),
        status: "scheduled",
      },
    ],
    team: [
      {
        name: "Owner",
        email: "owner@example.com",
        role: "owner",
        status: "active",
      },
    ],
    invoices: [
      {
        invoiceNumber: "CALL-0001",
        amount: 2999,
        currency: "INR",
        status: "due",
        periodStart: new Date(),
        periodEnd: daysFromNow(30),
      },
    ],
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
      overview: {
        totalCalls: calls.length,
        answeredCalls: answeredCalls.length,
        missedCalls: calls.length - answeredCalls.length,
        totalLeads: leads.length,
        minutesUsed,
        minutesLimit: workspace.subscription.minutesLimit,
        activeFlows: workspace.flows.filter((flow) => flow.isActive).length,
        activeNumbers: workspace.numbers.filter((num) => num.status === "active").length,
      },
      organization: workspace.organization,
      subscription: workspace.subscription,
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
    const { organization, subscription } = req.body;

    if (organization) {
      Object.assign(workspace.organization, organization);
    }

    if (subscription?.plan) {
      const plan = plans.find((item) => item.id === subscription.plan);
      if (!plan) {
        return res.status(400).json({ success: false, error: "Invalid plan" });
      }
      workspace.subscription.plan = plan.id;
      workspace.subscription.minutesLimit = plan.minutes;
      workspace.subscription.overageRate = plan.overageInr;
      workspace.subscription.status = "active";
    }

    await workspace.save();
    return ok(res, { workspace });
  } catch (error) {
    console.error("Call update error:", error);
    return res.status(500).json({ success: false, error: "Internal server error" });
  }
};

export const createCallItemController = async (req: Request, res: Response) => {
  try {
    const userId = authUserId(req);
    if (!userId) return unauthorized(res);

    const { collection } = req.params;
    const allowed = ["numbers", "flows", "notifications", "integrations", "appointments", "team", "leads"];
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

export const exotelWebhookController = async (req: Request, res: Response) => {
  try {
    const {
      CallSid,
      FromNumber,
      ToNumber,
      VirtualNumber,
      Direction,
      CallStatus,
      TotalDuration,
      CallRecordings,
      CallState,
      clerkId,
    } = req.body;

    const ownerId = clerkId || req.query.clerkId;
    if (!ownerId) {
      return res.status(400).json({ success: false, error: "Missing clerkId mapping" });
    }

    await connectToDatabase();
    const workspace = await getOrCreateWorkspace(String(ownerId));
    const callSid = CallSid || `exotel_${Date.now()}`;
    const status =
      String(CallStatus || CallState || "").toLowerCase() === "missed"
        ? "missed"
        : "answered";

    const existing = workspace.calls.find((call) => call.callSid === callSid);
    const payload = {
      callSid,
      fromNumber: FromNumber,
      toNumber: VirtualNumber || ToNumber,
      direction: Direction || "inbound",
      status,
      durationSec: Number(TotalDuration || 0),
      recordingUrl: CallRecordings || "",
      summary: status === "missed" ? "Caller missed the receptionist." : "Call event received from Exotel.",
      createdAt: new Date(),
    };

    if (existing) Object.assign(existing, payload);
    else workspace.calls.push(payload as any);

    workspace.subscription.minutesUsed = Math.ceil(
      workspace.calls.reduce((sum, call) => sum + (call.durationSec || 0), 0) / 60,
    );
    await workspace.save();

    return ok(res, { received: true, callSid });
  } catch (error) {
    console.error("Exotel webhook error:", error);
    return res.status(500).json({ success: false, error: "Internal server error" });
  }
};
