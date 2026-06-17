import { Request, Response } from "express";
import { getAuth } from "@clerk/express";
import { connectToDatabase } from "@/config/database.config";
import {
  getOrCreateWhatsAppWorkspace,
  getPlanById,
  resolveWorkspaceConfigured,
  sanitizeWorkspace,
  sendWhatsAppTextMessage,
  whatsappPlans,
} from "@/services/whatsapp/whatsapp.service";
import { getActivePackageSubscription } from "@/services/packages/package-subscription.service";

const authUserId = (req: Request) => getAuth(req).userId;

const unauthorized = (res: Response) =>
  res.status(401).json({
    success: false,
    error: "Unauthorized",
    timestamp: new Date().toISOString(),
  });

const ok = (res: Response, data: any) =>
  res.status(200).json({
    success: true,
    data,
    timestamp: new Date().toISOString(),
  });

const allowedCollections = [
  "agents",
  "templates",
  "contacts",
  "conversations",
  "campaigns",
  "appointments",
] as const;

type CollectionName = (typeof allowedCollections)[number];

const toCollectionName = (value: string): CollectionName | null =>
  allowedCollections.includes(value as CollectionName)
    ? (value as CollectionName)
    : null;

export const getWhatsAppPlansController = async (_req: Request, res: Response) =>
  ok(res, { plans: whatsappPlans });

export const getWhatsAppDashboardController = async (
  req: Request,
  res: Response,
) => {
  try {
    const userId = authUserId(req);
    if (!userId) return unauthorized(res);

    await connectToDatabase();
    const workspace = await getOrCreateWhatsAppWorkspace(userId);
    workspace.isConfigured = resolveWorkspaceConfigured(workspace);
    workspace.meta.status = workspace.isConfigured ? "connected" : "needs_setup";
    await workspace.save();

    const conversations = workspace.conversations || [];
    const contacts = workspace.contacts || [];
    const campaigns = workspace.campaigns || [];
    const outboundMessages = conversations.flatMap((conversation) =>
      conversation.messages.filter((message) => message.direction === "outbound"),
    );
    const readMessages = outboundMessages.filter(
      (message) => message.status === "read",
    );
    const deliveredMessages = outboundMessages.filter((message) =>
      ["delivered", "read"].includes(message.status),
    );

    return ok(res, {
      workspace: sanitizeWorkspace(workspace),
      overview: {
        totalContacts: contacts.length,
        optedInContacts: contacts.filter((contact) => contact.consentStatus === "opted_in").length,
        openConversations: conversations.filter((item) => item.status !== "resolved").length,
        pendingHuman: conversations.filter((item) => item.status === "pending_human").length,
        activeAgents: workspace.agents.filter((agent) => agent.isActive).length,
        totalCampaigns: campaigns.length,
        messagesUsed: workspace.subscription.messagesUsed,
        messageLimit: workspace.subscription.messageLimit,
        deliveredRate:
          outboundMessages.length > 0
            ? Math.round((deliveredMessages.length / outboundMessages.length) * 100)
            : 0,
        readRate:
          outboundMessages.length > 0
            ? Math.round((readMessages.length / outboundMessages.length) * 100)
            : 0,
      },
      recentConversations: conversations
        .slice()
        .sort(
          (a, b) =>
            new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
        )
        .slice(0, 10),
      agents: workspace.agents,
      templates: workspace.templates,
      campaigns: workspace.campaigns,
      appointments: workspace.appointments
        .slice()
        .sort(
          (a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
        )
        .slice(0, 25),
      appointmentConfig: workspace.appointmentConfig,
      contacts: workspace.contacts.slice(-25),
    });
  } catch (error: any) {
    console.error("WhatsApp dashboard error:", error);
    return res.status(500).json({
      success: false,
      error: error.message || "Failed to load WhatsApp dashboard",
      timestamp: new Date().toISOString(),
    });
  }
};

export const updateWhatsAppWorkspaceController = async (
  req: Request,
  res: Response,
) => {
  try {
    const userId = authUserId(req);
    if (!userId) return unauthorized(res);

    await connectToDatabase();
    const workspace = await getOrCreateWhatsAppWorkspace(userId);
    const { organization, meta, subscription, appointmentConfig } = req.body || {};

    if (subscription?.plan && subscription.plan !== "free") {
      const activePackage = await getActivePackageSubscription(userId);
      if (activePackage && subscription.plan !== "package") {
        return res.status(409).json({
          success: false,
          error:
            "Cancel the active common package before buying a standalone WhatsApp plan.",
          timestamp: new Date().toISOString(),
        });
      }
    }

    if (organization) {
      workspace.organization = {
        ...workspace.organization,
        ...organization,
      };
    }

    if (meta) {
      workspace.meta = {
        ...workspace.meta,
        ...Object.fromEntries(
          Object.entries(meta).filter(([, value]) => value !== undefined),
        ),
      } as any;
    }

    if (subscription?.plan) {
      const plan = getPlanById(subscription.plan);
      workspace.subscription.plan = plan.id;
      workspace.subscription.messageLimit = plan.messageLimit;
      workspace.subscription.numbersLimit = plan.numbersLimit;
      workspace.subscription.seatsLimit = plan.seatsLimit;
      workspace.subscription.agentsLimit = plan.agentsLimit;
      workspace.subscription.status = "active";
      if (subscription.billingCycle) {
        workspace.subscription.billingCycle = subscription.billingCycle;
      }
    }

    if (appointmentConfig) {
      workspace.appointmentConfig = {
        ...workspace.appointmentConfig,
        ...appointmentConfig,
      } as any;
    }

    workspace.isConfigured = resolveWorkspaceConfigured(workspace);
    workspace.meta.status = workspace.isConfigured ? "connected" : "needs_setup";
    if (workspace.isConfigured) workspace.meta.lastVerifiedAt = new Date();
    await workspace.save();

    return ok(res, { workspace: sanitizeWorkspace(workspace) });
  } catch (error: any) {
    console.error("WhatsApp workspace update error:", error);
    return res.status(500).json({
      success: false,
      error: error.message || "Failed to update WhatsApp workspace",
      timestamp: new Date().toISOString(),
    });
  }
};

export const getWhatsAppCollectionController = async (
  req: Request,
  res: Response,
) => {
  try {
    const userId = authUserId(req);
    if (!userId) return unauthorized(res);

    const collection = toCollectionName(req.params.collection);
    if (!collection) {
      return res.status(400).json({
        success: false,
        error: "Invalid collection",
        timestamp: new Date().toISOString(),
      });
    }

    await connectToDatabase();
    const workspace = await getOrCreateWhatsAppWorkspace(userId);
    return ok(res, { [collection]: workspace[collection] || [] });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      error: error.message || "Failed to load WhatsApp collection",
      timestamp: new Date().toISOString(),
    });
  }
};

export const createWhatsAppCollectionItemController = async (
  req: Request,
  res: Response,
) => {
  try {
    const userId = authUserId(req);
    if (!userId) return unauthorized(res);

    const collection = toCollectionName(req.params.collection);
    if (!collection) {
      return res.status(400).json({
        success: false,
        error: "Invalid collection",
        timestamp: new Date().toISOString(),
      });
    }

    await connectToDatabase();
    const workspace = await getOrCreateWhatsAppWorkspace(userId);
    if (
      collection === "agents" &&
      workspace.agents.length >= workspace.subscription.agentsLimit
    ) {
      return res.status(403).json({
        success: false,
        error: `Your WhatsApp plan includes ${workspace.subscription.agentsLimit} AI agents.`,
        timestamp: new Date().toISOString(),
      });
    }

    (workspace[collection] as any[]).push({
      ...req.body,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    await workspace.save();

    return ok(res, {
      [collection]: workspace[collection],
      item: (workspace[collection] as any[])[
        (workspace[collection] as any[]).length - 1
      ],
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      error: error.message || "Failed to create WhatsApp item",
      timestamp: new Date().toISOString(),
    });
  }
};

export const sendWhatsAppTextController = async (
  req: Request,
  res: Response,
) => {
  try {
    const userId = authUserId(req);
    if (!userId) return unauthorized(res);

    const { to, body } = req.body || {};
    if (!to || !body) {
      return res.status(400).json({
        success: false,
        error: "to and body are required",
        timestamp: new Date().toISOString(),
      });
    }

    await connectToDatabase();
    const workspace = await getOrCreateWhatsAppWorkspace(userId);
    const result = await sendWhatsAppTextMessage({ workspace, to, body });

    const now = new Date();
    let conversation = workspace.conversations.find(
      (item) => item.waId === to && item.status !== "resolved",
    );
    if (!conversation) {
      workspace.conversations.push({
        waId: to,
        contactName: to,
        phone: to,
        lastMessage: body,
        owner: "human",
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
    conversation.owner = "human";
    conversation.updatedAt = now;
    conversation.messages.push({
      providerMessageId: result?.messages?.[0]?.id,
      direction: "outbound",
      type: "text",
      body,
      status: "sent",
      createdAt: now,
    });
    workspace.subscription.messagesUsed += 1;
    await workspace.save();

    return ok(res, { result, conversation });
  } catch (error: any) {
    console.error("WhatsApp send message error:", error);
    return res.status(500).json({
      success: false,
      error: error.message || "Failed to send WhatsApp message",
      timestamp: new Date().toISOString(),
    });
  }
};
