import { Request, Response } from "express";
import { getAuth } from "@clerk/express";
import { connectToDatabase } from "@/config/database.config";
import WhatsAppWorkspace from "@/models/whatsapp/WhatsAppWorkspace.model";
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

const getMissingWhatsAppSetupFields = (workspace: any) => {
  const missing: string[] = [];
  if (!workspace.meta?.businessManagerId?.trim()) {
    missing.push("Business Manager ID");
  }
  if (!workspace.meta?.appId?.trim()) missing.push("Meta app ID");
  if (!workspace.meta?.appSecret?.trim()) missing.push("Meta app secret");
  if (!workspace.meta?.wabaId?.trim()) missing.push("WABA ID");
  if (!workspace.meta?.phoneNumberId?.trim()) missing.push("Phone number ID");
  if (!workspace.meta?.displayPhoneNumber?.trim()) {
    missing.push("WhatsApp business number");
  }
  if (!workspace.meta?.accessToken?.trim()) missing.push("Access token");
  return missing;
};

const metaAppId =
  process.env.WHATSAPP_META_APP_ID ||
  process.env.META_APP_ID ||
  process.env.FACEBOOK_APP_ID ||
  "";
const metaAppSecret =
  process.env.WHATSAPP_META_APP_SECRET ||
  process.env.WHATSAPP_APP_SECRET ||
  process.env.META_APP_SECRET ||
  process.env.FACEBOOK_APP_SECRET ||
  "";
const metaGraphApiVersion =
  process.env.WHATSAPP_GRAPH_API_VERSION || "v23.0";
const embeddedSignupConfigId =
  process.env.WHATSAPP_EMBEDDED_SIGNUP_CONFIG_ID || "1621203692298909";
const whatsappOAuthRedirectUri =
  process.env.WHATSAPP_OAUTH_REDIRECT_URI ||
  "https://app.rocketreplai.com/whatsapp/settings";

const cleanString = (value: unknown) =>
  typeof value === "string" ? value.trim() : "";

const graphFetch = async (path: string, accessToken: string) => {
  const url = new URL(`https://graph.facebook.com/${metaGraphApiVersion}${path}`);
  url.searchParams.set("access_token", accessToken);
  const response = await fetch(url);
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data?.error?.message || "Meta Graph API request failed");
  }
  return data;
};

const exchangeFacebookLoginCode = async (code: string) => {
  if (!metaAppSecret) {
    throw new Error("Meta app secret is required to exchange Facebook login code");
  }

  const url = new URL(
    `https://graph.facebook.com/${metaGraphApiVersion}/oauth/access_token`,
  );
  url.searchParams.set("client_id", metaAppId);
  url.searchParams.set("client_secret", metaAppSecret);
  url.searchParams.set("code", code);
  url.searchParams.set("redirect_uri", whatsappOAuthRedirectUri);

  const response = await fetch(url);
  const data = await response.json();
  if (!response.ok || !data?.access_token) {
    throw new Error(data?.error?.message || "Could not exchange Facebook login code");
  }

  return data.access_token as string;
};

export const getWhatsAppPlansController = async (_req: Request, res: Response) =>
  ok(res, { plans: whatsappPlans });

export const getWhatsAppFacebookConfigController = async (
  _req: Request,
  res: Response,
) => {
  const hostedSignupUrl = new URL(
    "https://business.facebook.com/messaging/whatsapp/onboard/",
  );
  hostedSignupUrl.searchParams.set("app_id", metaAppId);
  hostedSignupUrl.searchParams.set("config_id", embeddedSignupConfigId);
  hostedSignupUrl.searchParams.set(
    "extras",
    JSON.stringify({
      version: "v4",
      sessionInfoVersion: "3",
      featureType: "whatsapp_business_app_onboarding",
    }),
  );
  hostedSignupUrl.searchParams.set("redirect_uri", whatsappOAuthRedirectUri);

  return ok(res, {
    appId: metaAppId,
    graphApiVersion: metaGraphApiVersion,
    embeddedSignupConfigId,
    metaHostedSignupUrl: hostedSignupUrl.toString(),
    oauthRedirectUri: whatsappOAuthRedirectUri,
    integrationType: "tech_provider",
    webhookCallbackUrl: `${process.env.PUBLIC_API_URL || process.env.NEXT_PUBLIC_API_URL || ""}/api/webhooks/whatsapp`,
  });
};

export const connectWhatsAppFacebookController = async (
  req: Request,
  res: Response,
) => {
  try {
    const userId = authUserId(req);
    if (!userId) return unauthorized(res);

    const { authResponse, setup } = req.body || {};
    let accessToken = cleanString(authResponse?.accessToken);
    const loginCode = cleanString(authResponse?.code);
    const facebookUserId = cleanString(authResponse?.userID);

    if (!metaAppId) {
      return res.status(500).json({
        success: false,
        error: "Meta app id is not configured on the server",
        timestamp: new Date().toISOString(),
      });
    }

    if (!accessToken && loginCode) {
      accessToken = await exchangeFacebookLoginCode(loginCode);
    }

    if (!accessToken) {
      return res.status(400).json({
        success: false,
        error: "Facebook access token or login code is required",
        timestamp: new Date().toISOString(),
      });
    }

    let facebookProfile: any = null;
    if (metaAppSecret) {
      const debugUrl = new URL(
        `https://graph.facebook.com/${metaGraphApiVersion}/debug_token`,
      );
      debugUrl.searchParams.set("input_token", accessToken);
      debugUrl.searchParams.set("access_token", `${metaAppId}|${metaAppSecret}`);
      const debugResponse = await fetch(debugUrl);
      const debugData = await debugResponse.json();
      if (!debugResponse.ok || !debugData?.data?.is_valid) {
        return res.status(401).json({
          success: false,
          error:
            debugData?.error?.message ||
            "Facebook login token could not be verified",
          timestamp: new Date().toISOString(),
        });
      }
      if (debugData.data.app_id && debugData.data.app_id !== metaAppId) {
        return res.status(401).json({
          success: false,
          error: "Facebook token belongs to a different Meta app",
          timestamp: new Date().toISOString(),
        });
      }
    }

    try {
      facebookProfile = await graphFetch(
        "/me?fields=id,name,picture",
        accessToken,
      );
    } catch (error) {
      console.warn("Unable to fetch Facebook profile during WhatsApp connect", {
        error: error instanceof Error ? error.message : String(error),
      });
    }

    await connectToDatabase();
    const workspace = await getOrCreateWhatsAppWorkspace(userId);
    const businessId =
      cleanString(setup?.businessId) || cleanString(setup?.businessManagerId);
    const wabaId = cleanString(setup?.wabaId);
    const phoneNumberId = cleanString(setup?.phoneNumberId);
    const displayPhoneNumber = cleanString(setup?.displayPhoneNumber);
    const requestedPhoneNumber = cleanString(setup?.requestedPhoneNumber);
    const connected = Boolean(wabaId && phoneNumberId && accessToken);

    workspace.organization = {
      ...workspace.organization,
      name:
        cleanString(setup?.businessDisplayName) ||
        cleanString(setup?.organizationName) ||
        workspace.organization?.name ||
        "My Business",
      industry:
        cleanString(setup?.businessCategory) ||
        workspace.organization?.industry ||
        "Services",
      website:
        cleanString(setup?.businessWebsite) ||
        workspace.organization?.website ||
        "",
      timeZone: workspace.organization?.timeZone || "Asia/Kolkata",
    };

    workspace.onboarding = {
      ...workspace.onboarding,
      status: connected ? "connected" : "facebook_connected",
      mode: "embedded_signup",
      facebookUserId: facebookProfile?.id || facebookUserId,
      facebookName: facebookProfile?.name || "",
      businessId,
      phoneSource:
        setup?.phoneSource === "meta_free_number"
          ? "meta_free_number"
          : "official_number",
      requestedPhoneNumber,
      businessDisplayName:
        cleanString(setup?.businessDisplayName) || workspace.organization.name,
      businessWebsite:
        cleanString(setup?.businessWebsite) || workspace.organization.website,
      businessCategory:
        cleanString(setup?.businessCategory) || workspace.organization.industry,
      lastError: "",
      connectedAt: connected ? new Date() : workspace.onboarding?.connectedAt,
    } as any;

    workspace.meta = {
      ...workspace.meta,
      businessManagerId: businessId || workspace.meta?.businessManagerId || "",
      wabaId: wabaId || workspace.meta?.wabaId || "",
      phoneNumberId: phoneNumberId || workspace.meta?.phoneNumberId || "",
      displayPhoneNumber:
        displayPhoneNumber ||
        requestedPhoneNumber ||
        workspace.meta?.displayPhoneNumber ||
        "",
      appId: metaAppId,
      graphApiVersion: metaGraphApiVersion,
      accessToken,
    } as any;

    workspace.isConfigured = resolveWorkspaceConfigured(workspace);
    workspace.meta.status = workspace.isConfigured ? "connected" : "needs_setup";
    if (workspace.isConfigured) workspace.meta.lastVerifiedAt = new Date();
    await workspace.save();

    return ok(res, {
      workspace: sanitizeWorkspace(workspace),
      onboarding: workspace.onboarding,
    });
  } catch (error: any) {
    console.error("WhatsApp Facebook connect error:", error);
    return res.status(500).json({
      success: false,
      error: error.message || "Failed to connect Facebook Business",
      timestamp: new Date().toISOString(),
    });
  }
};

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

    if (meta && Object.keys(meta).length > 0) {
      return res.status(403).json({
        success: false,
        error:
          "Manual Meta credential editing is disabled. Use Facebook Business connect.",
        timestamp: new Date().toISOString(),
      });
    }

    if (subscription?.plan) {
      const plan = getPlanById(subscription.plan);
      if (plan.id !== "free" && plan.id !== "package") {
        const missingSetupFields = getMissingWhatsAppSetupFields(workspace);
        if (missingSetupFields.length > 0) {
          return res.status(409).json({
            success: false,
            error:
              "Complete WhatsApp Meta setup before activating a paid WhatsApp plan.",
            data: {
              missingFields: missingSetupFields,
              setupUrl: "/whatsapp/settings",
            },
            timestamp: new Date().toISOString(),
          });
        }
      }

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

export const deleteWhatsAppWorkspaceController = async (
  req: Request,
  res: Response,
) => {
  try {
    const userId = authUserId(req);
    if (!userId) return unauthorized(res);

    await connectToDatabase();
    const deletedWorkspace = await WhatsAppWorkspace.findOneAndDelete({
      clerkId: userId,
    });

    return ok(res, {
      deleted: Boolean(deletedWorkspace),
      message:
        "WhatsApp dashboard data, Meta connection data, contacts, conversations, and appointments were deleted.",
    });
  } catch (error: any) {
    console.error("WhatsApp workspace delete error:", error);
    return res.status(500).json({
      success: false,
      error: error.message || "Failed to delete WhatsApp workspace data",
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
