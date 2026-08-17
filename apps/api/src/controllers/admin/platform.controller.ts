import { getAuth } from "@clerk/express";
import { Request, Response } from "express";
import mongoose from "mongoose";
import { z } from "zod";

import { connectToDatabase } from "@/config/database.config";
import AdminAuditLog from "@/models/AdminAuditLog.model";
import AppointmentNotificationLog from "@/models/AppointmentNotificationLog.model";
import MyAppointment from "@/models/MyAppointment.model";
import CallAssistantWorkspace from "@/models/call/CallAssistantWorkspace.model";
import CallSubscription from "@/models/call/CallSubscription.model";
import InstaLeadCollection from "@/models/insta/LeadCollection.model";
import InstaReplyLog from "@/models/insta/ReplyLog.model";
import InstagramAccount from "@/models/insta/InstagramAccount.model";
import InstaSubscription from "@/models/insta/InstaSubscription.model";
import ContentCreationSubscription from "@/models/packages/ContentCreationSubscription.model";
import MetaAdsSubscription from "@/models/packages/MetaAdsSubscription.model";
import PackageSubscription from "@/models/packages/PackageSubscription.model";
import WebsiteMaintenanceSubscription from "@/models/packages/WebsiteMaintenanceSubscription.model";
import AffiPayout from "@/models/affiliate/Payout";
import RateLimitQueue from "@/models/Rate/RateLimitQueue.model";
import User from "@/models/user.model";
import WebChatConversation from "@/models/web/WebChatConversation.model";
import WebChatbot from "@/models/web/WebChatbot.model";
import WebSubscription from "@/models/web/Websubcription.model";
import TokenBalance from "@/models/web/token/TokenBalance.model";
import WhatsAppWorkspace from "@/models/whatsapp/WhatsAppWorkspace.model";
import { redisHelpers } from "@/config/redis.config";
import { getPlanById } from "@/services/whatsapp/whatsapp.service";

type AdminProduct =
  | "web"
  | "instagram"
  | "call"
  | "whatsapp"
  | "package"
  | "meta-ads"
  | "website-maintenance"
  | "content-creation";

type CustomerIdentity = {
  name: string;
  email: string;
  firstName?: string;
  lastName?: string;
  replyLimit?: number;
  accountLimit?: number;
  totalReplies?: number;
};

type UnifiedSubscription = {
  id: string;
  clerkId: string;
  customer: { name: string; email: string };
  product: AdminProduct;
  plan: string;
  status: string;
  billingCycle: string;
  amountInr: number | null;
  usage?: number;
  limit?: number;
  externalId: string;
  createdAt: Date | string | null;
  expiresAt: Date | string | null;
};

const PRODUCT_LABELS: Record<AdminProduct, string> = {
  web: "Website Chatbot",
  instagram: "Instagram Automation",
  call: "AI Call Assistant",
  whatsapp: "WhatsApp Automation",
  package: "Dashboard Package",
  "meta-ads": "Meta Ads",
  "website-maintenance": "Website Maintenance",
  "content-creation": "Content Creation",
};

const PRODUCT_ALIASES: Record<string, AdminProduct> = {
  web: "web",
  instagram: "instagram",
  insta: "instagram",
  call: "call",
  whatsapp: "whatsapp",
  package: "package",
  packages: "package",
  "meta-ads": "meta-ads",
  metaads: "meta-ads",
  "website-maintenance": "website-maintenance",
  maintenance: "website-maintenance",
  "content-creation": "content-creation",
  content: "content-creation",
};

const ALL_PRODUCTS = Object.keys(PRODUCT_LABELS) as AdminProduct[];
const MANAGED_SERVICE_TYPES = [
  "package",
  "meta-ads",
  "website-maintenance",
  "content-creation",
] as const;
type ManagedServiceType = (typeof MANAGED_SERVICE_TYPES)[number];
const MANAGED_SERVICE_PRODUCTS: AdminProduct[] = [...MANAGED_SERVICE_TYPES];
const REGULAR_STATUSES = ["active", "paused", "cancelled", "expired"] as const;
const WHATSAPP_STATUSES = [
  "trial",
  "active",
  "paused",
  "past_due",
  "cancelled",
] as const;
const ALL_STATUSES = [...REGULAR_STATUSES, "trial", "past_due"] as const;

const reasonSchema = z.string().trim().min(3).max(500);
const limitsUpdateSchema = z
  .object({
    replyLimit: z.number().int().min(0).max(10_000_000).optional(),
    accountLimit: z.number().int().min(1).max(100).optional(),
    reason: reasonSchema,
  })
  .strict()
  .refine(
    (value) =>
      value.replyLimit !== undefined || value.accountLimit !== undefined,
    { message: "replyLimit or accountLimit is required" },
  );

const subscriptionUpdateSchema = z
  .object({
    status: z.enum(ALL_STATUSES),
    reason: reasonSchema,
  })
  .strict();

const workspaceActionSchema = z
  .object({
    action: z.enum(["set-status", "toggle-status", "reset-usage"]),
    status: z.enum(["active", "paused"]).optional(),
    enabled: z.boolean().optional(),
    serviceType: z.enum(MANAGED_SERVICE_TYPES).optional(),
    reason: reasonSchema,
  })
  .strict()
  .refine(
    (value) =>
      value.action !== "set-status" || value.status !== undefined,
    { message: "status is required for set-status" },
  )
  .refine(
    (value) => value.action === "set-status" || value.status === undefined,
    { message: "status is only valid for set-status" },
  )
  .refine(
    (value) => value.action === "toggle-status" || value.enabled === undefined,
    { message: "enabled is only valid for toggle-status" },
  );

const ok = (res: Response, data: unknown) =>
  res.status(200).json({
    success: true,
    data,
    timestamp: new Date().toISOString(),
  });

const fail = (
  res: Response,
  status: number,
  error: string,
  details?: unknown,
) =>
  res.status(status).json({
    success: false,
    error,
    ...(details ? { details } : {}),
    timestamp: new Date().toISOString(),
  });

const parseBody = <T>(
  schema: z.ZodSchema<T>,
  body: unknown,
  res: Response,
): T | null => {
  const result = schema.safeParse(body);
  if (!result.success) {
    fail(res, 400, "Invalid request body", result.error.flatten());
    return null;
  }
  return result.data;
};

const normalizeProduct = (value: unknown): AdminProduct | null => {
  if (typeof value !== "string") return null;
  return PRODUCT_ALIASES[value.trim().toLowerCase()] || null;
};

const paginationFrom = (req: Request) => {
  const page = Math.max(1, Number.parseInt(String(req.query.page || "1"), 10) || 1);
  const requestedLimit =
    Number.parseInt(String(req.query.limit || "25"), 10) || 25;
  const limit = Math.min(100, Math.max(1, requestedLimit));
  return { page, limit, skip: (page - 1) * limit };
};

const paginationData = (page: number, limit: number, total: number) => {
  const totalPages = Math.ceil(total / limit);
  return {
    page,
    limit,
    total,
    totalPages,
    pages: totalPages,
    hasNextPage: page * limit < total,
    hasPreviousPage: page > 1,
    hasPrevPage: page > 1,
  };
};

const escapeRegex = (value: string) =>
  value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const parseBoolean = (value: unknown): boolean | undefined => {
  if (value === "true" || value === true) return true;
  if (value === "false" || value === false) return false;
  return undefined;
};

const mapValue = (value: unknown, key: string): number => {
  if (value instanceof Map) return Number(value.get(key) || 0);
  if (value && typeof value === "object") {
    return Number((value as Record<string, unknown>)[key] || 0);
  }
  return 0;
};

const customerName = (user: any) => {
  const fullName = [user?.firstName, user?.lastName].filter(Boolean).join(" ");
  return fullName || user?.username || user?.email || "Unknown customer";
};

async function getCustomerMap(clerkIds: string[]) {
  const uniqueIds = [...new Set(clerkIds.filter(Boolean))];
  if (uniqueIds.length === 0) return new Map<string, CustomerIdentity>();

  const users = await User.find({ clerkId: { $in: uniqueIds } })
    .select(
      "clerkId email firstName lastName username replyLimit accountLimit totalReplies",
    )
    .lean();

  return new Map<string, CustomerIdentity>(
    users.map((user: any) => [
      String(user.clerkId),
      {
        name: customerName(user),
        email: user.email || "",
        firstName: user.firstName,
        lastName: user.lastName,
        replyLimit: Number(user.replyLimit || 0),
        accountLimit: Number(user.accountLimit || 0),
        totalReplies: Number(user.totalReplies || 0),
      },
    ]),
  );
}

const monthlyAmount = ({
  product,
  billingCycle,
  storedAmount,
  plan,
}: {
  product: AdminProduct;
  billingCycle?: string;
  storedAmount?: number | null;
  plan?: string;
}) => {
  if (storedAmount !== undefined && storedAmount !== null) {
    return Number(storedAmount);
  }

  if (product === "web") {
    return billingCycle === "yearly" ? 10_788 / 12 : 999;
  }
  if (product === "instagram") {
    return billingCycle === "yearly" ? 4_788 / 12 : 499;
  }
  if (product === "call") return 5_000;
  if (product === "whatsapp") {
    const whatsappPlan = getPlanById(
      plan === "launch" ? "launch" : plan === "package" ? "package" : "free",
    );
    return billingCycle === "yearly"
      ? Number(whatsappPlan.yearlyInr || 0) / 12
      : Number(whatsappPlan.priceInr || 0);
  }
  return null;
};

const isCurrentlyActive = (item: UnifiedSubscription, now = new Date()) => {
  if (item.status !== "active") return false;
  if (!item.expiresAt) return true;
  return new Date(item.expiresAt).getTime() > now.getTime();
};

async function writeAuditLog({
  req,
  action,
  targetType,
  targetId,
  reason,
  before,
  after,
  metadata,
}: {
  req: Request;
  action: string;
  targetType: string;
  targetId: string;
  reason: string;
  before?: Record<string, unknown>;
  after?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
}) {
  const actorClerkId = getAuth(req).userId;
  if (!actorClerkId) throw new Error("Authenticated admin identity missing");

  await AdminAuditLog.create({
    actorClerkId,
    action,
    targetType,
    targetId,
    reason,
    before,
    after,
    metadata,
  });
}

async function loadUnifiedSubscriptions(options: {
  product?: AdminProduct;
  status?: string;
  clerkIds?: string[];
  search?: string;
} = {}): Promise<UnifiedSubscription[]> {
  const { product, status, clerkIds, search } = options;
  if (clerkIds && clerkIds.length === 0) return [];

  const products = product ? [product] : ALL_PRODUCTS;
  const clerkFilter = clerkIds
    ? { clerkId: { $in: [...new Set(clerkIds)] } }
    : {};
  const regularStatusFilter =
    status && REGULAR_STATUSES.includes(status as (typeof REGULAR_STATUSES)[number])
      ? { status }
      : status
        ? { status: "__no_matching_status__" }
        : {};
  const whatsappStatusFilter = status
    ? { "subscription.status": status }
    : {};

  const [web, instagram, call, whatsapp, packages, metaAds, maintenance, content] =
    await Promise.all([
      products.includes("web")
        ? WebSubscription.find({
            ...clerkFilter,
            ...regularStatusFilter,
            subscriptionId: { $not: /^pkg:/ },
          })
            .select(
              "clerkId subscriptionId plan chatbotType billingCycle status createdAt expiresAt",
            )
            .lean()
        : [],
      products.includes("instagram")
        ? InstaSubscription.find({
            ...clerkFilter,
            ...regularStatusFilter,
            subscriptionId: { $not: /^pkg:/ },
          })
            .select(
              "clerkId subscriptionId plan chatbotType billingCycle status createdAt expiresAt",
            )
            .lean()
        : [],
      products.includes("call")
        ? CallSubscription.find({
            ...clerkFilter,
            ...regularStatusFilter,
            subscriptionId: { $not: /^pkg:/ },
          })
            .select(
              "clerkId subscriptionId plan planType billingCycle status minutesLimit createdAt expiresAt",
            )
            .lean()
        : [],
      products.includes("whatsapp")
        ? WhatsAppWorkspace.find({
            ...clerkFilter,
            ...whatsappStatusFilter,
            "subscription.subscriptionId": { $exists: true, $nin: [null, ""] },
            "subscription.plan": { $ne: "package" },
          })
            .select(
              "clerkId subscription.plan subscription.status subscription.billingCycle subscription.messagesUsed subscription.messageLimit subscription.subscriptionId subscription.nextBillingDate subscription.activatedAt createdAt",
            )
            .lean()
        : [],
      products.includes("package")
        ? PackageSubscription.find({ ...clerkFilter, ...regularStatusFilter })
            .select(
              "clerkId subscriptionId packageId packageName plan billingCycle amountInr status createdAt expiresAt",
            )
            .lean()
        : [],
      products.includes("meta-ads")
        ? MetaAdsSubscription.find({ ...clerkFilter, ...regularStatusFilter })
            .select(
              "clerkId subscriptionId planId planName billingCycle monthlyBudgetInr status createdAt expiresAt",
            )
            .lean()
        : [],
      products.includes("website-maintenance")
        ? WebsiteMaintenanceSubscription.find({
            ...clerkFilter,
            ...regularStatusFilter,
          })
            .select(
              "clerkId subscriptionId planId planName billingCycle amountInr status createdAt expiresAt",
            )
            .lean()
        : [],
      products.includes("content-creation")
        ? ContentCreationSubscription.find({
            ...clerkFilter,
            ...regularStatusFilter,
          })
            .select(
              "clerkId subscriptionId planId planName billingCycle amountInr status createdAt expiresAt",
            )
            .lean()
        : [],
    ]);

  const allClerkIds = [
    ...web,
    ...instagram,
    ...call,
    ...whatsapp,
    ...packages,
    ...metaAds,
    ...maintenance,
    ...content,
  ].map((item: any) => String(item.clerkId || ""));
  const customerMap = await getCustomerMap(allClerkIds);

  const usageClerkIds = [...new Set(allClerkIds.filter(Boolean))];
  const [tokenBalances, callWorkspaces] = await Promise.all([
    usageClerkIds.length
      ? TokenBalance.find({ userId: { $in: usageClerkIds } })
          .select(
            "userId subscriptionTokens usedSubscriptionTokens totalTokensUsed",
          )
          .lean()
      : [],
    usageClerkIds.length
      ? CallAssistantWorkspace.find({ clerkId: { $in: usageClerkIds } })
          .select(
            "clerkId subscription.minutesUsed subscription.minutesLimit",
          )
          .lean()
      : [],
  ]);
  const tokenByUser = new Map(
    tokenBalances.map((item: any) => [String(item.userId), item]),
  );
  const callByUser = new Map(
    callWorkspaces.map((item: any) => [String(item.clerkId), item]),
  );

  const identityFor = (clerkId: string) => {
    const identity = customerMap.get(clerkId);
    return {
      name: identity?.name || "Unknown customer",
      email: identity?.email || "",
    };
  };

  const items: UnifiedSubscription[] = [];

  for (const item of web as any[]) {
    const clerkId = String(item.clerkId);
    const token = tokenByUser.get(clerkId) as any;
    items.push({
      id: String(item._id),
      clerkId,
      customer: identityFor(clerkId),
      product: "web",
      plan: item.plan || item.chatbotType || "chatbot-lead-generation",
      status: item.status,
      billingCycle: item.billingCycle,
      amountInr: monthlyAmount({
        product: "web",
        billingCycle: item.billingCycle,
      }),
      usage: mapValue(
        token?.usedSubscriptionTokens,
        "chatbot-lead-generation",
      ),
      limit: mapValue(token?.subscriptionTokens, "chatbot-lead-generation"),
      externalId: item.subscriptionId,
      createdAt: item.createdAt || null,
      expiresAt: item.expiresAt || null,
    });
  }

  for (const item of instagram as any[]) {
    const clerkId = String(item.clerkId);
    const identity = customerMap.get(clerkId);
    items.push({
      id: String(item._id),
      clerkId,
      customer: identityFor(clerkId),
      product: "instagram",
      plan: item.plan || item.chatbotType || "Insta-Automation-Pro",
      status: item.status,
      billingCycle: item.billingCycle,
      amountInr: monthlyAmount({
        product: "instagram",
        billingCycle: item.billingCycle,
      }),
      usage: Number(identity?.totalReplies || 0),
      limit: Number(identity?.replyLimit || 0),
      externalId: item.subscriptionId,
      createdAt: item.createdAt || null,
      expiresAt: item.expiresAt || null,
    });
  }

  for (const item of call as any[]) {
    const clerkId = String(item.clerkId);
    const workspace = callByUser.get(clerkId) as any;
    items.push({
      id: String(item._id),
      clerkId,
      customer: identityFor(clerkId),
      product: "call",
      plan: item.plan || item.planType || "call-business",
      status: item.status,
      billingCycle: item.billingCycle,
      amountInr: monthlyAmount({
        product: "call",
        billingCycle: item.billingCycle,
      }),
      usage: Number(workspace?.subscription?.minutesUsed || 0),
      limit: Number(
        workspace?.subscription?.minutesLimit || item.minutesLimit || 0,
      ),
      externalId: item.subscriptionId,
      createdAt: item.createdAt || null,
      expiresAt: item.expiresAt || null,
    });
  }

  for (const item of whatsapp as any[]) {
    const clerkId = String(item.clerkId);
    items.push({
      id: String(item._id),
      clerkId,
      customer: identityFor(clerkId),
      product: "whatsapp",
      plan: item.subscription?.plan || "launch",
      status: item.subscription?.status || "trial",
      billingCycle: item.subscription?.billingCycle || "monthly",
      amountInr: monthlyAmount({
        product: "whatsapp",
        billingCycle: item.subscription?.billingCycle,
        plan: item.subscription?.plan,
      }),
      usage: Number(item.subscription?.messagesUsed || 0),
      limit: Number(item.subscription?.messageLimit || 0),
      externalId: item.subscription?.subscriptionId || "",
      createdAt: item.subscription?.activatedAt || item.createdAt || null,
      expiresAt: item.subscription?.nextBillingDate || null,
    });
  }

  const pushStoredSubscription = (
    item: any,
    itemProduct: AdminProduct,
    storedAmount: number | null,
  ) => {
    const clerkId = String(item.clerkId);
    items.push({
      id: String(item._id),
      clerkId,
      customer: identityFor(clerkId),
      product: itemProduct,
      plan:
        item.packageName || item.planName || item.plan || item.planId || "Plan",
      status: item.status,
      billingCycle: item.billingCycle || "monthly",
      amountInr: monthlyAmount({
        product: itemProduct,
        billingCycle: item.billingCycle,
        storedAmount,
      }),
      externalId: item.subscriptionId,
      createdAt: item.createdAt || null,
      expiresAt: item.expiresAt || null,
    });
  };

  (packages as any[]).forEach((item) =>
    pushStoredSubscription(item, "package", Number(item.amountInr)),
  );
  (metaAds as any[]).forEach((item) =>
    // monthlyBudgetInr is customer ad spend, not RocketReplai revenue.
    pushStoredSubscription(item, "meta-ads", null),
  );
  (maintenance as any[]).forEach((item) =>
    pushStoredSubscription(
      item,
      "website-maintenance",
      Number(item.amountInr),
    ),
  );
  (content as any[]).forEach((item) =>
    pushStoredSubscription(item, "content-creation", Number(item.amountInr)),
  );

  const normalizedSearch = search?.trim().toLowerCase();
  const filtered = normalizedSearch
    ? items.filter((item) =>
        [
          item.clerkId,
          item.customer.name,
          item.customer.email,
          item.plan,
          item.externalId,
          item.product,
        ].some((value) => String(value || "").toLowerCase().includes(normalizedSearch)),
      )
    : items;

  return filtered.sort(
    (a, b) =>
      new Date(b.createdAt || 0).getTime() -
      new Date(a.createdAt || 0).getTime(),
  );
}

export const getAdminSubscriptionsController = async (
  req: Request,
  res: Response,
) => {
  try {
    await connectToDatabase();
    const { page, limit, skip } = paginationFrom(req);
    const productValue = String(req.query.product || "all").toLowerCase();
    const groupedPackages = productValue === "packages";
    const product = productValue === "all" ? undefined : normalizeProduct(productValue);
    if (productValue !== "all" && !product) {
      return fail(res, 400, "Unsupported product filter");
    }

    const statusValue = String(req.query.status || "all").toLowerCase();
    if (
      statusValue !== "all" &&
      !ALL_STATUSES.includes(statusValue as (typeof ALL_STATUSES)[number])
    ) {
      return fail(res, 400, "Unsupported status filter");
    }

    let allItems = await loadUnifiedSubscriptions({
      product: groupedPackages ? undefined : product || undefined,
      status: statusValue === "all" ? undefined : statusValue,
      search: String(req.query.search || ""),
    });
    if (groupedPackages) {
      allItems = allItems.filter((item) =>
        MANAGED_SERVICE_PRODUCTS.includes(item.product),
      );
    }
    const now = new Date();
    const activeItems = allItems.filter((item) => isCurrentlyActive(item, now));
    const expiringSoon = activeItems.filter((item) => {
      if (!item.expiresAt) return false;
      const expiry = new Date(item.expiresAt).getTime();
      return expiry > now.getTime() && expiry <= now.getTime() + 7 * 24 * 60 * 60 * 1000;
    }).length;
    const monthlyValueInr = activeItems.reduce(
      (sum, item) => sum + Number(item.amountInr || 0),
      0,
    );

    return ok(res, {
      items: allItems.slice(skip, skip + limit),
      summary: {
        total: allItems.length,
        active: activeItems.length,
        paused: allItems.filter((item) => item.status === "paused").length,
        trial: allItems.filter((item) => item.status === "trial").length,
        pastDue: allItems.filter((item) => item.status === "past_due").length,
        expiringSoon,
        monthlyValueInr: Math.round(monthlyValueInr),
      },
      pagination: paginationData(page, limit, allItems.length),
      filters: {
        product: groupedPackages ? "packages" : product || "all",
        status: statusValue,
        search: String(req.query.search || ""),
      },
    });
  } catch (error) {
    console.error("Admin subscriptions error:", error);
    return fail(res, 500, "Failed to load subscriptions");
  }
};

async function getEngagementMetrics() {
  const [webRows, whatsappRows, callRows, tokenRows] = await Promise.all([
    WebChatConversation.aggregate([
      {
        $project: {
          messages: { $size: { $ifNull: ["$messages", []] } },
          hasLead: {
            $or: [
              { $ne: [{ $ifNull: ["$customerEmail", ""] }, ""] },
              { $ne: [{ $ifNull: ["$customerName", ""] }, ""] },
              { $gt: [{ $size: { $ifNull: ["$formData", []] } }, 0] },
            ],
          },
          hasAppointment: {
            $or: [
              { $eq: ["$hasAppointment", true] },
              { $gt: [{ $size: { $ifNull: ["$formData", []] } }, 0] },
            ],
          },
        },
      },
      {
        $group: {
          _id: null,
          conversations: { $sum: 1 },
          messages: { $sum: "$messages" },
          leads: { $sum: { $cond: ["$hasLead", 1, 0] } },
          appointments: { $sum: { $cond: ["$hasAppointment", 1, 0] } },
        },
      },
    ]),
    WhatsAppWorkspace.aggregate([
      {
        $project: {
          conversations: { $size: { $ifNull: ["$conversations", []] } },
          messages: {
            $sum: {
              $map: {
                input: { $ifNull: ["$conversations", []] },
                as: "conversation",
                in: { $size: { $ifNull: ["$$conversation.messages", []] } },
              },
            },
          },
          leads: {
            $size: {
              $filter: {
                input: { $ifNull: ["$contacts", []] },
                as: "contact",
                cond: { $eq: ["$$contact.lifecycleStage", "lead"] },
              },
            },
          },
          appointments: { $size: { $ifNull: ["$appointments", []] } },
          messagesUsed: { $ifNull: ["$subscription.messagesUsed", 0] },
          messageLimit: { $ifNull: ["$subscription.messageLimit", 0] },
        },
      },
      {
        $group: {
          _id: null,
          conversations: { $sum: "$conversations" },
          messages: { $sum: "$messages" },
          leads: { $sum: "$leads" },
          appointments: { $sum: "$appointments" },
          messagesUsed: { $sum: "$messagesUsed" },
          messageLimit: { $sum: "$messageLimit" },
        },
      },
    ]),
    CallAssistantWorkspace.aggregate([
      {
        $project: {
          calls: { $size: { $ifNull: ["$calls", []] } },
          leads: { $size: { $ifNull: ["$leads", []] } },
          appointments: { $size: { $ifNull: ["$appointments", []] } },
          minutesUsed: { $ifNull: ["$subscription.minutesUsed", 0] },
          minutesLimit: { $ifNull: ["$subscription.minutesLimit", 0] },
        },
      },
      {
        $group: {
          _id: null,
          calls: { $sum: "$calls" },
          leads: { $sum: "$leads" },
          appointments: { $sum: "$appointments" },
          minutesUsed: { $sum: "$minutesUsed" },
          minutesLimit: { $sum: "$minutesLimit" },
        },
      },
    ]),
    TokenBalance.aggregate([
      {
        $group: {
          _id: null,
          used: { $sum: "$totalTokensUsed" },
          freeLimit: { $sum: "$freeTokens" },
        },
      },
    ]),
  ]);

  const [instagramLeads, instagramReplies, appointmentRows] = await Promise.all([
    InstaLeadCollection.countDocuments(),
    InstaReplyLog.countDocuments({ success: true }),
    MyAppointment.countDocuments(),
  ]);

  const web = webRows[0] || {};
  const whatsapp = whatsappRows[0] || {};
  const call = callRows[0] || {};
  const tokens = tokenRows[0] || {};
  const webAppointments = Number(web.appointments || 0);

  return {
    engagement: {
      conversations:
        Number(web.conversations || 0) + Number(whatsapp.conversations || 0),
      messages:
        Number(web.messages || 0) +
        Number(whatsapp.messages || 0) +
        Number(instagramReplies || 0),
      leads:
        Number(web.leads || 0) +
        Number(whatsapp.leads || 0) +
        Number(call.leads || 0) +
        Number(instagramLeads || 0),
      appointments:
        Math.max(Number(appointmentRows || 0), webAppointments) +
        Number(whatsapp.appointments || 0) +
        Number(call.appointments || 0),
      calls: Number(call.calls || 0),
    },
    productUsage: {
      web: {
        used: Number(tokens.used || 0),
        limit: Number(tokens.freeLimit || 0),
        unit: "tokens",
      },
      instagram: {
        used: Number(instagramReplies || 0),
        limit: null,
        unit: "successful replies",
      },
      whatsapp: {
        used: Number(whatsapp.messagesUsed || 0),
        limit: Number(whatsapp.messageLimit || 0),
        unit: "messages",
      },
      call: {
        used: Number(call.minutesUsed || 0),
        limit: Number(call.minutesLimit || 0),
        unit: "minutes",
      },
    },
  };
}

async function getRecentActivity(subscriptions: UnifiedSubscription[]) {
  const [audits, users] = await Promise.all([
    AdminAuditLog.find({}).sort({ createdAt: -1 }).limit(8).lean(),
    User.find({})
      .sort({ createdAt: -1 })
      .limit(8)
      .select("clerkId email firstName lastName username createdAt")
      .lean(),
  ]);

  const auditActivity = audits.map((audit: any) => ({
    id: String(audit._id),
    type: "admin_action",
    title: audit.action.replace(/_/g, " "),
    description: `${audit.targetType} ${audit.targetId}: ${audit.reason}`,
    product: normalizeProduct(audit.metadata?.product) || null,
    createdAt: audit.createdAt,
    status: "completed",
  }));
  const customerActivity = users.map((user: any) => ({
    id: String(user._id),
    type: "customer_joined",
    title: "New customer",
    description: `${customerName(user)} joined`,
    product: null,
    createdAt: user.createdAt,
    status: "completed",
  }));
  const subscriptionActivity = subscriptions.slice(0, 12).map((item) => ({
    id: `${item.product}:${item.id}`,
    type: "subscription",
    title: `${PRODUCT_LABELS[item.product]} subscription`,
    description: `${item.customer.name} · ${item.plan}`,
    product: item.product,
    createdAt: item.createdAt,
    status: item.status,
  }));

  return [...auditActivity, ...customerActivity, ...subscriptionActivity]
    .sort(
      (a, b) =>
        new Date(b.createdAt || 0).getTime() -
        new Date(a.createdAt || 0).getTime(),
    )
    .slice(0, 16);
}

export const getAdminOverviewController = async (
  _req: Request,
  res: Response,
) => {
  try {
    await connectToDatabase();
    const generatedAt = new Date();
    const sevenDaysAgo = new Date(generatedAt.getTime() - 7 * 24 * 60 * 60 * 1000);
    const sevenDaysAhead = new Date(generatedAt.getTime() + 7 * 24 * 60 * 60 * 1000);

    const [
      subscriptions,
      customerCount,
      whatsappWorkspaceCount,
      callWorkspaceCount,
      packageWorkspaceCount,
      pendingPayoutRows,
      queueRows,
      failedInstagramAutomations,
      whatsappSetupAttention,
      callSetupAttention,
      instagramTokenAttention,
      notificationFailures,
      engagementData,
      webWorkspaceCount,
      instagramWorkspaceCount,
      webConfigured,
      instagramConfigured,
      whatsappConfigured,
      callConfigured,
    ] = await Promise.all([
      loadUnifiedSubscriptions(),
      User.countDocuments(),
      WhatsAppWorkspace.countDocuments(),
      CallAssistantWorkspace.countDocuments(),
      PackageSubscription.countDocuments(),
      AffiPayout.aggregate([
        { $match: { status: "processing" } },
        { $group: { _id: null, count: { $sum: 1 }, amount: { $sum: "$amount" } } },
      ]),
      RateLimitQueue.aggregate([
        { $match: { status: { $in: ["pending", "failed"] } } },
        { $group: { _id: "$status", count: { $sum: 1 } } },
      ]),
      InstaReplyLog.countDocuments({ success: false, createdAt: { $gte: sevenDaysAgo } }),
      WhatsAppWorkspace.countDocuments({
        "subscription.status": "active",
        isConfigured: false,
      }),
      CallAssistantWorkspace.countDocuments({
        "subscription.status": "active",
        isConfigured: false,
      }),
      InstagramAccount.countDocuments({
        $or: [
          { isActive: false },
          { tokenExpiresAt: { $lte: generatedAt } },
          { isMetaRateLimited: true },
        ],
      }),
      AppointmentNotificationLog.countDocuments({
        createdAt: { $gte: sevenDaysAgo },
        channels: { $elemMatch: { status: "failed" } },
      }),
      getEngagementMetrics(),
      WebChatbot.countDocuments(),
      InstagramAccount.countDocuments(),
      WebChatbot.countDocuments({ isActive: true }),
      InstagramAccount.countDocuments({ isActive: true }),
      WhatsAppWorkspace.countDocuments({ isConfigured: true }),
      CallAssistantWorkspace.countDocuments({ isConfigured: true }),
    ]);

    const activeSubscriptions = subscriptions.filter((item) =>
      isCurrentlyActive(item, generatedAt),
    );
    const monthlyValueInr = activeSubscriptions.reduce(
      (sum, item) => sum + Number(item.amountInr || 0),
      0,
    );
    const pendingPayouts = pendingPayoutRows[0] || { count: 0, amount: 0 };
    const queueByStatus = new Map(
      queueRows.map((row: any) => [String(row._id), Number(row.count || 0)]),
    );
    const expiringSubscriptions = activeSubscriptions.filter((item) => {
      if (!item.expiresAt) return false;
      const expiry = new Date(item.expiresAt);
      return expiry > generatedAt && expiry <= sevenDaysAhead;
    }).length;

    const attention = [
      Number(pendingPayouts.count || 0) > 0
        ? {
            id: "pending-payouts",
            severity: "warning",
            title: "Payout approvals pending",
            description: "Affiliate payout requests are waiting for review.",
            count: Number(pendingPayouts.count || 0),
            href: "/admin/payouts",
          }
        : null,
      Number(queueByStatus.get("failed") || 0) > 0
        ? {
            id: "failed-rate-limit-jobs",
            severity: "critical",
            title: "Automation queue failures",
            description: "Rate-limit queue jobs have failed and need investigation.",
            count: Number(queueByStatus.get("failed") || 0),
            href: "/admin/rate-limits",
          }
        : null,
      Number(queueByStatus.get("pending") || 0) > 0
        ? {
            id: "pending-rate-limit-jobs",
            severity: "warning",
            title: "Automation jobs queued",
            description: "Automations are waiting in the rate-limit queue.",
            count: Number(queueByStatus.get("pending") || 0),
            href: "/admin/rate-limits",
          }
        : null,
      failedInstagramAutomations > 0
        ? {
            id: "instagram-failures",
            severity: "warning",
            title: "Instagram automation failures",
            description: "Failed Instagram replies were recorded in the last seven days.",
            count: failedInstagramAutomations,
            href: "/admin/insta",
          }
        : null,
      instagramTokenAttention > 0
        ? {
            id: "instagram-token-health",
            severity: "critical",
            title: "Instagram connections need attention",
            description: "Accounts are inactive, expired, or Meta rate limited.",
            count: instagramTokenAttention,
            href: "/admin/insta",
          }
        : null,
      whatsappSetupAttention > 0
        ? {
            id: "whatsapp-setup",
            severity: "warning",
            title: "Paid WhatsApp workspaces are not configured",
            description: "Active workspaces still have incomplete Meta setup.",
            count: whatsappSetupAttention,
            href: "/admin/whatsapp",
          }
        : null,
      callSetupAttention > 0
        ? {
            id: "call-setup",
            severity: "warning",
            title: "Paid call workspaces are not configured",
            description: "Active call assistants still need setup.",
            count: callSetupAttention,
            href: "/admin/call",
          }
        : null,
      notificationFailures > 0
        ? {
            id: "appointment-notifications",
            severity: "warning",
            title: "Appointment notification failures",
            description: "Appointment alerts failed in the last seven days.",
            count: notificationFailures,
            href: "/admin/appointments",
          }
        : null,
      expiringSubscriptions > 0
        ? {
            id: "subscriptions-expiring",
            severity: "info",
            title: "Subscriptions expire soon",
            description: "Active subscriptions reach their stored expiry within seven days.",
            count: expiringSubscriptions,
            href: "/admin/subscriptions",
          }
        : null,
    ].filter(Boolean);

    const usageByProduct: Partial<
      Record<AdminProduct, { used: number; limit: number | null; unit: string }>
    > = {
      web: engagementData.productUsage.web,
      instagram: engagementData.productUsage.instagram,
      whatsapp: engagementData.productUsage.whatsapp,
      call: engagementData.productUsage.call,
    };
    const configuredByProduct: Partial<Record<AdminProduct, number>> = {
      web: webConfigured,
      instagram: instagramConfigured,
      whatsapp: whatsappConfigured,
      call: callConfigured,
      package: activeSubscriptions.filter((item) => item.product === "package").length,
    };
    const attentionByProduct: Partial<Record<AdminProduct, number>> = {
      instagram: failedInstagramAutomations + instagramTokenAttention,
      whatsapp: whatsappSetupAttention,
      call: callSetupAttention,
    };

    const cardDefinitions = [
      { product: "web", label: "Website Chatbot", sources: ["web"] as AdminProduct[] },
      {
        product: "instagram",
        label: "Instagram Automation",
        sources: ["instagram"] as AdminProduct[],
      },
      {
        product: "whatsapp",
        label: "WhatsApp Automation",
        sources: ["whatsapp"] as AdminProduct[],
      },
      { product: "call", label: "AI Call Assistant", sources: ["call"] as AdminProduct[] },
      {
        product: "packages",
        label: "Packages & Managed Services",
        sources: [
          "package",
          "meta-ads",
          "website-maintenance",
          "content-creation",
        ] as AdminProduct[],
      },
    ] as const;

    const products = cardDefinitions.map((definition) => {
      const productItems = subscriptions.filter((item) =>
        definition.sources.includes(item.product),
      );
      const active = productItems.filter((item) =>
        isCurrentlyActive(item, generatedAt),
      ).length;
      const primarySource = definition.sources[0];
      const productAttention = definition.sources.reduce(
        (sum, source) => sum + Number(attentionByProduct[source] || 0),
        0,
      );
      const usageDetail =
        usageByProduct[primarySource] || {
          used: active,
          limit: null,
          unit: "active services",
        };
      return {
        product: definition.product,
        label: definition.label,
        total: productItems.length,
        active,
        usage: Number(usageDetail.used || 0),
        usageDetail,
        health:
          productAttention > 0
            ? primarySource === "instagram" && instagramTokenAttention > 0
              ? "critical"
              : "warning"
            : "healthy",
        configured: definition.sources.reduce(
          (sum, source) => sum + Number(configuredByProduct[source] || 0),
          0,
        ),
        attention: productAttention,
      };
    });

    const recentActivity = await getRecentActivity(subscriptions);

    return ok(res, {
      generatedAt: generatedAt.toISOString(),
      summary: {
        customers: customerCount,
        activeSubscriptions: activeSubscriptions.length,
        workspaces:
          webWorkspaceCount +
          instagramWorkspaceCount +
          whatsappWorkspaceCount +
          callWorkspaceCount +
          packageWorkspaceCount,
        monthlyValueInr: Math.round(monthlyValueInr),
        pendingPayouts: Number(pendingPayouts.count || 0),
        pendingPayoutAmountInr: Number(pendingPayouts.amount || 0),
        appointments: engagementData.engagement.appointments,
        leads: engagementData.engagement.leads,
      },
      products,
      engagement: engagementData.engagement,
      attention,
      recentActivity,
    });
  } catch (error) {
    console.error("Admin overview error:", error);
    return fail(res, 500, "Failed to load admin overview");
  }
};

const productCustomerIds = async (
  product: AdminProduct,
  status?: string,
) => {
  const items = await loadUnifiedSubscriptions({ product, status });
  return [...new Set(items.map((item) => item.clerkId))];
};

export const getAdminCustomersController = async (
  req: Request,
  res: Response,
) => {
  try {
    await connectToDatabase();
    const { page, limit, skip } = paginationFrom(req);
    const search = String(req.query.search || "").trim();
    const productValue = String(req.query.product || "all").toLowerCase();
    const groupedPackages = productValue === "packages";
    const product = productValue === "all" ? undefined : normalizeProduct(productValue);
    if (productValue !== "all" && !product) {
      return fail(res, 400, "Unsupported product filter");
    }

    const statusValue = String(req.query.status || "all").toLowerCase();
    if (
      statusValue !== "all" &&
      !ALL_STATUSES.includes(statusValue as (typeof ALL_STATUSES)[number])
    ) {
      return fail(res, 400, "Unsupported status filter");
    }

    const query: Record<string, unknown> = {};
    if (search) {
      const regex = new RegExp(escapeRegex(search), "i");
      query.$or = [
        { email: regex },
        { clerkId: regex },
        { firstName: regex },
        { lastName: regex },
        { username: regex },
      ];
    }

    if (product) {
      const eligibleClerkIds = groupedPackages
        ? [
            ...new Set(
              (
                await loadUnifiedSubscriptions({
                  status: statusValue === "all" ? undefined : statusValue,
                })
              )
                .filter((item) => MANAGED_SERVICE_PRODUCTS.includes(item.product))
                .map((item) => item.clerkId),
            ),
          ]
        : await productCustomerIds(
            product,
            statusValue === "all" ? undefined : statusValue,
          );
      if (eligibleClerkIds.length === 0) {
        return ok(res, {
          items: [],
          summary: { total: 0 },
          pagination: paginationData(page, limit, 0),
        });
      }
      query.clerkId = { $in: eligibleClerkIds };
    }

    const [total, users, directoryUsers] = await Promise.all([
      User.countDocuments(query),
      User.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .select(
          "clerkId email firstName lastName username photo totalReplies replyLimit accountLimit hasUsedReferral createdAt updatedAt",
        )
        .lean(),
      User.find(query).select("clerkId").lean(),
    ]);

    const clerkIds = users.map((user: any) => String(user.clerkId));
    const directoryClerkIds = directoryUsers.map((user: any) =>
      String(user.clerkId),
    );
    const [
      directorySubscriptions,
      directoryReplies,
      directoryTokens,
      directoryMessages,
      directoryCalls,
    ] = await Promise.all([
      loadUnifiedSubscriptions({ clerkIds: directoryClerkIds }),
      InstagramAccount.aggregate([
        { $match: { userId: { $in: directoryClerkIds } } },
        { $group: { _id: null, total: { $sum: { $ifNull: ["$accountReply", 0] } } } },
      ]),
      TokenBalance.aggregate([
        { $match: { userId: { $in: directoryClerkIds } } },
        { $group: { _id: null, total: { $sum: "$totalTokensUsed" } } },
      ]),
      WhatsAppWorkspace.aggregate([
        { $match: { clerkId: { $in: directoryClerkIds } } },
        {
          $group: {
            _id: null,
            total: { $sum: { $ifNull: ["$subscription.messagesUsed", 0] } },
          },
        },
      ]),
      CallAssistantWorkspace.aggregate([
        { $match: { clerkId: { $in: directoryClerkIds } } },
        {
          $project: { calls: { $size: { $ifNull: ["$calls", []] } } },
        },
        { $group: { _id: null, total: { $sum: "$calls" } } },
      ]),
    ]);
    const [
      subscriptions,
      instagramUsage,
      webUsage,
      tokenBalances,
      whatsappUsage,
      callUsage,
      packageCounts,
    ] = await Promise.all([
      loadUnifiedSubscriptions({ clerkIds }),
      InstagramAccount.aggregate([
        { $match: { userId: { $in: clerkIds } } },
        {
          $group: {
            _id: "$userId",
            accounts: { $sum: 1 },
            activeAccounts: { $sum: { $cond: ["$isActive", 1, 0] } },
            replies: { $sum: { $ifNull: ["$accountReply", 0] } },
            dms: { $sum: { $ifNull: ["$accountDMSent", 0] } },
          },
        },
      ]),
      WebChatConversation.aggregate([
        { $match: { clerkId: { $in: clerkIds } } },
        {
          $group: {
            _id: "$clerkId",
            conversations: { $sum: 1 },
            messages: { $sum: { $size: { $ifNull: ["$messages", []] } } },
            appointments: {
              $sum: {
                $cond: [
                  {
                    $or: [
                      { $eq: ["$hasAppointment", true] },
                      { $gt: [{ $size: { $ifNull: ["$formData", []] } }, 0] },
                    ],
                  },
                  1,
                  0,
                ],
              },
            },
          },
        },
      ]),
      TokenBalance.find({ userId: { $in: clerkIds } })
        .select(
          "userId freeTokens usedFreeTokens subscriptionTokens usedSubscriptionTokens totalTokensUsed",
        )
        .lean(),
      WhatsAppWorkspace.aggregate([
        { $match: { clerkId: { $in: clerkIds } } },
        {
          $project: {
            clerkId: 1,
            configured: "$isConfigured",
            contacts: { $size: { $ifNull: ["$contacts", []] } },
            conversations: { $size: { $ifNull: ["$conversations", []] } },
            appointments: { $size: { $ifNull: ["$appointments", []] } },
            messagesUsed: { $ifNull: ["$subscription.messagesUsed", 0] },
            messageLimit: { $ifNull: ["$subscription.messageLimit", 0] },
          },
        },
      ]),
      CallAssistantWorkspace.aggregate([
        { $match: { clerkId: { $in: clerkIds } } },
        {
          $project: {
            clerkId: 1,
            configured: "$isConfigured",
            calls: { $size: { $ifNull: ["$calls", []] } },
            leads: { $size: { $ifNull: ["$leads", []] } },
            minutesUsed: { $ifNull: ["$subscription.minutesUsed", 0] },
            minutesLimit: { $ifNull: ["$subscription.minutesLimit", 0] },
          },
        },
      ]),
      PackageSubscription.aggregate([
        { $match: { clerkId: { $in: clerkIds } } },
        {
          $group: {
            _id: "$clerkId",
            packages: { $sum: 1 },
            activePackages: {
              $sum: { $cond: [{ $eq: ["$status", "active"] }, 1, 0] },
            },
          },
        },
      ]),
    ]);

    const toMap = (rows: any[], key = "_id") =>
      new Map(rows.map((row) => [String(row[key]), row]));
    const instagramByUser = toMap(instagramUsage);
    const webByUser = toMap(webUsage);
    const tokenByUser = toMap(tokenBalances as any[], "userId");
    const whatsappByUser = toMap(whatsappUsage, "clerkId");
    const callByUser = toMap(callUsage, "clerkId");
    const packagesByUser = toMap(packageCounts);

    const subscriptionsByUser = new Map<string, UnifiedSubscription[]>();
    subscriptions.forEach((subscription) => {
      const list = subscriptionsByUser.get(subscription.clerkId) || [];
      list.push(subscription);
      subscriptionsByUser.set(subscription.clerkId, list);
    });

    const items = users.map((user: any) => {
      const clerkId = String(user.clerkId);
      const instagram = instagramByUser.get(clerkId) || {};
      const web = webByUser.get(clerkId) || {};
      const token = tokenByUser.get(clerkId) || {};
      const whatsapp = whatsappByUser.get(clerkId) || {};
      const call = callByUser.get(clerkId) || {};
      const packages = packagesByUser.get(clerkId) || {};
      const userSubscriptions = subscriptionsByUser.get(clerkId) || [];
      const productCounts = {
        web: userSubscriptions.filter((item) => item.product === "web").length,
        instagram: userSubscriptions.filter(
          (item) => item.product === "instagram",
        ).length,
        whatsapp: userSubscriptions.filter(
          (item) => item.product === "whatsapp",
        ).length,
        call: userSubscriptions.filter((item) => item.product === "call").length,
        packages: userSubscriptions.filter((item) =>
          MANAGED_SERVICE_PRODUCTS.includes(item.product),
        ).length,
      };
      const usage = {
        replies: Number(instagram.replies || user.totalReplies || 0),
        tokens: Number(token.totalTokensUsed || 0),
        messages: Number(whatsapp.messagesUsed || 0),
        calls: Number(call.calls || 0),
      };

      return {
        id: String(user._id),
        clerkId,
        customer: {
          name: customerName(user),
          email: user.email || "",
        },
        name: customerName(user),
        email: user.email || "",
        photo: user.photo || "",
        replyLimit: Number(user.replyLimit || 0),
        accountLimit: Number(user.accountLimit || 0),
        limits: {
          replyLimit: Number(user.replyLimit || 0),
          accountLimit: Number(user.accountLimit || 0),
          replies: Number(user.replyLimit || 0),
          accounts: Number(user.accountLimit || 0),
        },
        products: productCounts,
        subscriptions: userSubscriptions.map((subscription) => ({
          product: subscription.product,
          plan: subscription.plan,
          status: subscription.status,
          expiresAt: subscription.expiresAt,
        })),
        usage: {
          ...usage,
          instagramReplies: usage.replies,
          instagramDms: Number(instagram.dms || 0),
          webTokens: usage.tokens,
          whatsappMessages: usage.messages,
          callMinutes: Number(call.minutesUsed || 0),
        },
        counts: {
          subscriptions: userSubscriptions.length,
          activeSubscriptions: userSubscriptions.filter((subscription) =>
            isCurrentlyActive(subscription),
          ).length,
          instagramAccounts: Number(instagram.accounts || 0),
          activeInstagramAccounts: Number(instagram.activeAccounts || 0),
          webConversations: Number(web.conversations || 0),
          webMessages: Number(web.messages || 0),
          webAppointments: Number(web.appointments || 0),
          whatsappContacts: Number(whatsapp.contacts || 0),
          whatsappConversations: Number(whatsapp.conversations || 0),
          whatsappAppointments: Number(whatsapp.appointments || 0),
          calls: Number(call.calls || 0),
          callLeads: Number(call.leads || 0),
          packages: Number(packages.packages || 0),
          activePackages: Number(packages.activePackages || 0),
        },
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      };
    });

    return ok(res, {
      items,
      summary: {
        total,
        activeProducts: directorySubscriptions.filter((subscription) =>
          isCurrentlyActive(subscription),
        ).length,
        products: directorySubscriptions.length,
        replies: Number(directoryReplies[0]?.total || 0),
        messages: Number(directoryMessages[0]?.total || 0),
        tokens: Number(directoryTokens[0]?.total || 0),
        calls: Number(directoryCalls[0]?.total || 0),
      },
      pagination: paginationData(page, limit, total),
    });
  } catch (error) {
    console.error("Admin customers error:", error);
    return fail(res, 500, "Failed to load customers");
  }
};

export const updateAdminCustomerLimitsController = async (
  req: Request,
  res: Response,
) => {
  try {
    const input = parseBody(limitsUpdateSchema, req.body, res);
    if (!input) return;
    const clerkId = String(req.params.clerkId || "").trim();
    if (!clerkId || clerkId.length > 200) {
      return fail(res, 400, "Invalid customer ID");
    }

    await connectToDatabase();
    const user = await User.findOne({ clerkId });
    if (!user) return fail(res, 404, "Customer not found");

    const before = {
      replyLimit: Number(user.replyLimit || 0),
      accountLimit: Number(user.accountLimit || 0),
    };
    if (input.replyLimit !== undefined) user.replyLimit = input.replyLimit;
    if (input.accountLimit !== undefined) user.accountLimit = input.accountLimit;
    await user.save();

    try {
      await Promise.all([
        redisHelpers.del(`user:limits:${clerkId}`),
        redisHelpers.del(`user:accounts:${clerkId}`),
      ]);
    } catch (error) {
      console.warn("Admin limit cache invalidation failed:", error);
    }

    const after = {
      replyLimit: Number(user.replyLimit || 0),
      accountLimit: Number(user.accountLimit || 0),
    };
    await writeAuditLog({
      req,
      action: "customer_limits_updated",
      targetType: "customer",
      targetId: clerkId,
      reason: input.reason,
      before,
      after,
    });

    return ok(res, {
      customer: {
        id: String(user._id),
        clerkId: user.clerkId,
        name: customerName(user),
        email: user.email,
        limits: {
          replies: user.replyLimit,
          accounts: user.accountLimit,
        },
        updatedAt: user.updatedAt,
      },
    });
  } catch (error) {
    console.error("Admin customer limit update error:", error);
    return fail(res, 500, "Failed to update customer limits");
  }
};

const regularSubscriptionSnapshot = (item: any, product: AdminProduct) => ({
  id: String(item._id),
  clerkId: String(item.clerkId || ""),
  product,
  plan:
    item.packageName ||
    item.planName ||
    item.plan ||
    item.planId ||
    item.chatbotType ||
    item.planType ||
    "Plan",
  status: item.status,
  billingCycle: item.billingCycle || "monthly",
  externalId: item.subscriptionId || "",
  createdAt: item.createdAt || null,
  expiresAt: item.expiresAt || null,
});

const whatsappSubscriptionSnapshot = (item: any) => ({
  id: String(item._id),
  clerkId: String(item.clerkId || ""),
  product: "whatsapp" as const,
  plan: item.subscription?.plan || "free",
  status: item.subscription?.status || "trial",
  billingCycle: item.subscription?.billingCycle || "monthly",
  externalId: item.subscription?.subscriptionId || "",
  createdAt: item.subscription?.activatedAt || item.createdAt || null,
  expiresAt: item.subscription?.nextBillingDate || null,
});

async function applyPackageStatus(item: any, status: string) {
  const now = new Date();
  item.status = status;
  if (["cancelled", "expired"].includes(status)) item.cancelledAt = now;
  if (["active", "paused"].includes(status)) item.cancelledAt = undefined;
  await item.save();

  const grantStatus = status;
  const grantId = (service: string) => `pkg:${item.subscriptionId}:${service}`;
  const isEnabledState = ["active", "paused"].includes(status);
  const grantUpdate = isEnabledState
    ? {
        $set: { status: grantStatus, updatedAt: now },
        $unset: { cancelledAt: "" },
      }
    : {
        $set: { status: grantStatus, cancelledAt: now, updatedAt: now },
      };
  const includedServices = new Set(
    (item.includedServices || []).map((service: unknown) => String(service)),
  );
  const updates: Promise<unknown>[] = [
    WebSubscription.updateMany(
      { clerkId: item.clerkId, subscriptionId: grantId("web") },
      grantUpdate,
    ),
    InstaSubscription.updateMany(
      { clerkId: item.clerkId, subscriptionId: grantId("insta") },
      grantUpdate,
    ),
    CallSubscription.updateMany(
      { clerkId: item.clerkId, subscriptionId: grantId("call") },
      grantUpdate,
    ),
    WhatsAppWorkspace.updateMany(
      {
        clerkId: item.clerkId,
        "subscription.subscriptionId": grantId("whatsapp"),
      },
      {
        $set: {
          "subscription.status":
            status === "expired" ? "cancelled" : grantStatus,
          updatedAt: now,
        },
      },
    ),
  ];
  if (includedServices.has("call")) {
    updates.push(
      CallAssistantWorkspace.updateMany(
      { clerkId: item.clerkId },
      {
        $set: {
          "subscription.status":
            status === "expired" ? "cancelled" : grantStatus,
          updatedAt: now,
        },
      },
      ),
    );
  }
  await Promise.all(updates);
}

export const updateAdminSubscriptionController = async (
  req: Request,
  res: Response,
) => {
  try {
    const input = parseBody(subscriptionUpdateSchema, req.body, res);
    if (!input) return;
    const product = normalizeProduct(req.params.product);
    if (!product) return fail(res, 400, "Unsupported subscription product");
    const id = String(req.params.id || "");
    if (!mongoose.isValidObjectId(id)) {
      return fail(res, 400, "Invalid subscription ID");
    }

    await connectToDatabase();
    if (product === "whatsapp") {
      if (
        !WHATSAPP_STATUSES.includes(
          input.status as (typeof WHATSAPP_STATUSES)[number],
        )
      ) {
        return fail(res, 400, "Invalid WhatsApp subscription status");
      }
      const workspace = await WhatsAppWorkspace.findById(id);
      if (!workspace || !workspace.subscription?.subscriptionId) {
        return fail(res, 404, "WhatsApp subscription not found");
      }
      if (workspace.subscription.plan === "package") {
        return fail(
          res,
          409,
          "Update the parent package subscription instead of its WhatsApp grant",
        );
      }
      const before = whatsappSubscriptionSnapshot(workspace);
      workspace.subscription.status = input.status as any;
      await workspace.save();
      const after = whatsappSubscriptionSnapshot(workspace);
      await writeAuditLog({
        req,
        action: "subscription_status_overridden",
        targetType: "subscription:whatsapp",
        targetId: id,
        reason: input.reason,
        before,
        after,
        metadata: { product, externalBillingChanged: false },
      });
      return ok(res, { subscription: after, externalBillingChanged: false });
    }

    if (
      !REGULAR_STATUSES.includes(
        input.status as (typeof REGULAR_STATUSES)[number],
      )
    ) {
      return fail(res, 400, "Invalid subscription status for this product");
    }

    let item: any = null;
    if (product === "web") item = await WebSubscription.findById(id);
    if (product === "instagram") item = await InstaSubscription.findById(id);
    if (product === "call") item = await CallSubscription.findById(id);
    if (product === "package") item = await PackageSubscription.findById(id);
    if (product === "meta-ads") item = await MetaAdsSubscription.findById(id);
    if (product === "website-maintenance") {
      item = await WebsiteMaintenanceSubscription.findById(id);
    }
    if (product === "content-creation") {
      item = await ContentCreationSubscription.findById(id);
    }
    if (!item) return fail(res, 404, "Subscription not found");

    if (
      ["web", "instagram", "call"].includes(product) &&
      String(item.subscriptionId || "").startsWith("pkg:")
    ) {
      return fail(
        res,
        409,
        "Update the parent package subscription instead of a package service grant",
      );
    }

    const before = regularSubscriptionSnapshot(item, product);
    if (product === "package") {
      await applyPackageStatus(item, input.status);
    } else {
      item.status = input.status;
      if (["cancelled", "expired"].includes(input.status)) {
        item.cancelledAt = new Date();
      } else {
        item.cancelledAt = undefined;
      }
      await item.save();

      if (product === "call") {
        await CallAssistantWorkspace.updateOne(
          { clerkId: item.clerkId },
          {
            $set: {
              "subscription.status":
                input.status === "expired" ? "cancelled" : input.status,
              updatedAt: new Date(),
            },
          },
        );
      }
    }
    const after = regularSubscriptionSnapshot(item, product);
    await writeAuditLog({
      req,
      action: "subscription_status_overridden",
      targetType: `subscription:${product}`,
      targetId: id,
      reason: input.reason,
      before,
      after,
      metadata: { product, externalBillingChanged: false },
    });

    return ok(res, { subscription: after, externalBillingChanged: false });
  } catch (error) {
    console.error("Admin subscription update error:", error);
    return fail(res, 500, "Failed to update subscription status");
  }
};

type WorkspaceProduct = "whatsapp" | "call" | "packages";

const normalizeWorkspaceProduct = (value: unknown): WorkspaceProduct | null => {
  const normalized = String(value || "").trim().toLowerCase();
  if (normalized === "whatsapp" || normalized === "call" || normalized === "packages") {
    return normalized;
  }
  if (normalized === "package") return "packages";
  return null;
};

async function matchingCustomerIds(search: string) {
  if (!search) return [];
  const regex = new RegExp(escapeRegex(search), "i");
  const users = await User.find({
    $or: [
      { email: regex },
      { clerkId: regex },
      { firstName: regex },
      { lastName: regex },
      { username: regex },
    ],
  })
    .select("clerkId")
    .lean();
  return users.map((user: any) => String(user.clerkId));
}

const withWorkspaceCustomers = async (rows: any[], product: WorkspaceProduct) => {
  const customerMap = await getCustomerMap(
    rows.map((row) => String(row.clerkId || "")),
  );
  return rows.map((row) => ({
    ...row,
    id: String(row.id || row._id),
    _id: undefined,
    customer: {
      name: customerMap.get(String(row.clerkId))?.name || "Unknown customer",
      email: customerMap.get(String(row.clerkId))?.email || "",
    },
    product,
  }));
};

export const getAdminWorkspacesController = async (
  req: Request,
  res: Response,
) => {
  try {
    const product = normalizeWorkspaceProduct(req.params.product);
    if (!product) return fail(res, 400, "Unsupported workspace product");
    const { page, limit, skip } = paginationFrom(req);
    const search = String(req.query.search || "").trim();
    const status = String(req.query.status || "all").trim().toLowerCase();
    const configured = parseBoolean(req.query.configured);
    const regex = search ? new RegExp(escapeRegex(search), "i") : null;

    await connectToDatabase();
    const customerIds = await matchingCustomerIds(search);

    if (product === "whatsapp") {
      if (
        status !== "all" &&
        !WHATSAPP_STATUSES.includes(status as (typeof WHATSAPP_STATUSES)[number])
      ) {
        return fail(res, 400, "Unsupported WhatsApp workspace status");
      }
      const match: Record<string, unknown> = {};
      if (status !== "all") match["subscription.status"] = status;
      if (configured !== undefined) match.isConfigured = configured;
      if (regex) {
        match.$or = [
          { clerkId: { $in: customerIds } },
          { "organization.name": regex },
          { "meta.displayPhoneNumber": regex },
        ];
      }

      const [rows, total, active, paused, configuredCount] = await Promise.all([
        WhatsAppWorkspace.aggregate([
          { $match: match },
          { $sort: { updatedAt: -1 } },
          { $skip: skip },
          { $limit: limit },
          {
            $project: {
              id: { $toString: "$_id" },
              clerkId: 1,
              name: { $ifNull: ["$organization.name", "WhatsApp workspace"] },
              status: { $ifNull: ["$subscription.status", "trial"] },
              plan: { $ifNull: ["$subscription.plan", "free"] },
              configured: "$isConfigured",
              usage: {
                messages: { $ifNull: ["$subscription.messagesUsed", 0] },
                conversations: { $size: { $ifNull: ["$conversations", []] } },
                contacts: { $size: { $ifNull: ["$contacts", []] } },
                appointments: { $size: { $ifNull: ["$appointments", []] } },
              },
              limits: {
                messages: { $ifNull: ["$subscription.messageLimit", 0] },
                numbers: { $ifNull: ["$subscription.numbersLimit", 0] },
                seats: { $ifNull: ["$subscription.seatsLimit", 0] },
                agents: { $ifNull: ["$subscription.agentsLimit", 0] },
              },
              health: {
                connection: { $ifNull: ["$meta.status", "needs_setup"] },
                onboarding: { $ifNull: ["$onboarding.status", "not_started"] },
                quality: { $ifNull: ["$meta.qualityRating", "unknown"] },
                automationEnabled: {
                  $ifNull: ["$automationConfig.enabled", true],
                },
              },
              createdAt: 1,
              updatedAt: 1,
            },
          },
        ]),
        WhatsAppWorkspace.countDocuments(match),
        WhatsAppWorkspace.countDocuments({ ...match, "subscription.status": "active" }),
        WhatsAppWorkspace.countDocuments({ ...match, "subscription.status": "paused" }),
        WhatsAppWorkspace.countDocuments({ ...match, isConfigured: true }),
      ]);
      const items = await withWorkspaceCustomers(rows, product);
      return ok(res, {
        items,
        summary: {
          total,
          active,
          paused,
          configured: configuredCount,
          attention: Math.max(0, total - configuredCount),
        },
        pagination: paginationData(page, limit, total),
      });
    }

    if (product === "call") {
      if (
        status !== "all" &&
        !WHATSAPP_STATUSES.includes(status as (typeof WHATSAPP_STATUSES)[number])
      ) {
        return fail(res, 400, "Unsupported call workspace status");
      }
      const match: Record<string, unknown> = {};
      if (status !== "all") match["subscription.status"] = status;
      if (configured !== undefined) match.isConfigured = configured;
      if (regex) {
        match.$or = [
          { clerkId: { $in: customerIds } },
          { "organization.name": regex },
          { "organization.phone": regex },
        ];
      }

      const [rows, total, active, paused, configuredCount] = await Promise.all([
        CallAssistantWorkspace.aggregate([
          { $match: match },
          { $sort: { updatedAt: -1 } },
          { $skip: skip },
          { $limit: limit },
          {
            $project: {
              id: { $toString: "$_id" },
              clerkId: 1,
              name: { $ifNull: ["$organization.name", "Call workspace"] },
              status: { $ifNull: ["$subscription.status", "trial"] },
              plan: { $ifNull: ["$subscription.plan", "free"] },
              configured: "$isConfigured",
              usage: {
                minutes: { $ifNull: ["$subscription.minutesUsed", 0] },
                calls: { $size: { $ifNull: ["$calls", []] } },
                leads: { $size: { $ifNull: ["$leads", []] } },
              },
              limits: {
                minutes: { $ifNull: ["$subscription.minutesLimit", 0] },
                calls: { $ifNull: ["$subscription.callsLimit", 0] },
                concurrentCalls: {
                  $ifNull: ["$subscription.concurrentCallLimit", 1],
                },
              },
              health: {
                activeFlows: {
                  $size: {
                    $filter: {
                      input: { $ifNull: ["$flows", []] },
                      as: "flow",
                      cond: { $eq: ["$$flow.isActive", true] },
                    },
                  },
                },
                activeNumbers: {
                  $size: {
                    $filter: {
                      input: { $ifNull: ["$numbers", []] },
                      as: "number",
                      cond: { $eq: ["$$number.status", "active"] },
                    },
                  },
                },
              },
              createdAt: 1,
              updatedAt: 1,
            },
          },
        ]),
        CallAssistantWorkspace.countDocuments(match),
        CallAssistantWorkspace.countDocuments({ ...match, "subscription.status": "active" }),
        CallAssistantWorkspace.countDocuments({ ...match, "subscription.status": "paused" }),
        CallAssistantWorkspace.countDocuments({ ...match, isConfigured: true }),
      ]);
      const items = await withWorkspaceCustomers(rows, product);
      return ok(res, {
        items,
        summary: {
          total,
          active,
          paused,
          configured: configuredCount,
          attention: Math.max(0, total - configuredCount),
        },
        pagination: paginationData(page, limit, total),
      });
    }

    if (
      status !== "all" &&
      !REGULAR_STATUSES.includes(status as (typeof REGULAR_STATUSES)[number])
    ) {
      return fail(res, 400, "Unsupported package workspace status");
    }
    let selectedStatuses =
      status === "all" ? [...REGULAR_STATUSES] : [status];
    if (configured !== undefined) {
      const configuredStatuses = configured
        ? ["active", "paused"]
        : ["cancelled", "expired"];
      selectedStatuses = selectedStatuses.filter((value) =>
        configuredStatuses.includes(value),
      );
    }

    const managedSpecs: Array<{
      product: AdminProduct;
      model: any;
      searchFields: string[];
      select: string;
    }> = [
      {
        product: "package",
        model: PackageSubscription,
        searchFields: ["packageName", "packageId", "plan", "subscriptionId"],
        select:
          "clerkId packageName packageId plan subscriptionId billingCycle status amountInr includedServices expiresAt createdAt updatedAt",
      },
      {
        product: "meta-ads",
        model: MetaAdsSubscription,
        searchFields: ["planName", "planId", "subscriptionId"],
        select:
          "clerkId planName planId subscriptionId billingCycle status monthlyBudgetInr expiresAt createdAt updatedAt",
      },
      {
        product: "website-maintenance",
        model: WebsiteMaintenanceSubscription,
        searchFields: ["planName", "planId", "subscriptionId"],
        select:
          "clerkId planName planId subscriptionId billingCycle status amountInr expiresAt createdAt updatedAt",
      },
      {
        product: "content-creation",
        model: ContentCreationSubscription,
        searchFields: ["planName", "planId", "subscriptionId"],
        select:
          "clerkId planName planId subscriptionId billingCycle status amountInr expiresAt createdAt updatedAt",
      },
    ];
    const buildManagedMatch = (
      searchFields: string[],
      includeStatus: boolean,
    ) => {
      const match: Record<string, unknown> = {};
      if (includeStatus) {
        match.status =
          selectedStatuses.length === 1
            ? selectedStatuses[0]
            : { $in: selectedStatuses };
      }
      if (regex) {
        match.$or = [
          { clerkId: { $in: customerIds } },
          ...searchFields.map((field) => ({ [field]: regex })),
        ];
      }
      return match;
    };

    const managedResults = await Promise.all(
      managedSpecs.map(async (spec) => {
        const baseMatch = buildManagedMatch(spec.searchFields, false);
        const match = buildManagedMatch(spec.searchFields, true);
        const [rows, total, allTotal, active, paused] = await Promise.all([
          spec.model
            .find(match)
            .sort({ updatedAt: -1 })
            .limit(skip + limit)
            .select(spec.select)
            .lean(),
          spec.model.countDocuments(match),
          spec.model.countDocuments(baseMatch),
          spec.model.countDocuments({ ...baseMatch, status: "active" }),
          spec.model.countDocuments({ ...baseMatch, status: "paused" }),
        ]);
        return { ...spec, rows, total, allTotal, active, paused };
      }),
    );
    const total = managedResults.reduce((sum, result) => sum + result.total, 0);
    const active = managedResults.reduce((sum, result) => sum + result.active, 0);
    const paused = managedResults.reduce((sum, result) => sum + result.paused, 0);
    const allTotal = managedResults.reduce(
      (sum, result) => sum + result.allTotal,
      0,
    );
    const pagedRows = managedResults
      .flatMap((result) =>
        result.rows.map((row: any) => ({ ...row, serviceProduct: result.product })),
      )
      .sort(
        (a: any, b: any) =>
          new Date(b.updatedAt || b.createdAt || 0).getTime() -
          new Date(a.updatedAt || a.createdAt || 0).getTime(),
      )
      .slice(skip, skip + limit);
    const customerMap = await getCustomerMap(
      pagedRows.map((row: any) => String(row.clerkId || "")),
    );
    const items = pagedRows.map((row: any) => {
      const serviceProduct = row.serviceProduct as AdminProduct;
      const includedServices = row.includedServices || [];
      const identity = customerMap.get(String(row.clerkId));
      return {
        id: String(row._id),
        clerkId: String(row.clerkId || ""),
        customer: {
          name: identity?.name || "Unknown customer",
          email: identity?.email || "",
        },
        product: serviceProduct,
        groupProduct: "packages",
        serviceType: serviceProduct,
        name: row.packageName || row.planName || PRODUCT_LABELS[serviceProduct],
        packageName: row.packageName,
        planName: row.planName,
        packageId: row.packageId || row.planId,
        plan: row.packageId || row.planId || row.plan || "Plan",
        status: row.status,
        configured: ["active", "paused"].includes(row.status),
        subscriptionId: row.subscriptionId,
        externalId: row.subscriptionId,
        billingCycle: row.billingCycle || "monthly",
        amountInr:
          serviceProduct === "meta-ads" || row.amountInr == null
            ? null
            : Number(row.amountInr),
        monthlyBudgetInr:
          serviceProduct === "meta-ads"
            ? Number(row.monthlyBudgetInr || 0)
            : undefined,
        includedServices,
        usage: {},
        limits: {},
        health: {
          service: serviceProduct,
          includedServices,
          expiresAt: row.expiresAt || null,
        },
        expiresAt: row.expiresAt || null,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
      };
    });
    const configuredCount = active + paused;
    return ok(res, {
      items,
      summary: {
        total,
        active,
        paused,
        configured: configuredCount,
        attention: Math.max(0, allTotal - configuredCount),
        needsAttention: Math.max(0, allTotal - configuredCount),
      },
      pagination: paginationData(page, limit, total),
    });
  } catch (error) {
    console.error("Admin workspaces error:", error);
    return fail(res, 500, "Failed to load workspaces");
  }
};

const whatsappWorkspaceSnapshot = (workspace: any) => ({
  id: String(workspace._id),
  clerkId: String(workspace.clerkId),
  product: "whatsapp",
  status: workspace.subscription?.status || "trial",
  plan: workspace.subscription?.plan || "free",
  configured: Boolean(workspace.isConfigured),
  automationEnabled: workspace.automationConfig?.enabled !== false,
  usage: { messages: Number(workspace.subscription?.messagesUsed || 0) },
  limits: { messages: Number(workspace.subscription?.messageLimit || 0) },
});

const callWorkspaceSnapshot = (workspace: any) => ({
  id: String(workspace._id),
  clerkId: String(workspace.clerkId),
  product: "call",
  status: workspace.subscription?.status || "trial",
  plan: workspace.subscription?.plan || "free",
  configured: Boolean(workspace.isConfigured),
  usage: {
    minutes: Number(workspace.subscription?.minutesUsed || 0),
    calls: Number(workspace.subscription?.callsUsed || 0),
  },
  limits: {
    minutes: Number(workspace.subscription?.minutesLimit || 0),
    calls: Number(workspace.subscription?.callsLimit || 0),
  },
});

export const updateAdminWorkspaceController = async (
  req: Request,
  res: Response,
) => {
  try {
    const product = normalizeWorkspaceProduct(req.params.product);
    if (!product) return fail(res, 400, "Unsupported workspace product");
    const id = String(req.params.id || "");
    if (!mongoose.isValidObjectId(id)) return fail(res, 400, "Invalid workspace ID");
    const input = parseBody(workspaceActionSchema, req.body, res);
    if (!input) return;
    if (product === "packages" && !input.serviceType) {
      return fail(res, 400, "serviceType is required for package operations");
    }
    if (product !== "packages" && input.serviceType) {
      return fail(res, 400, "serviceType is only valid for package operations");
    }
    await connectToDatabase();

    if (product === "whatsapp") {
      const workspace = await WhatsAppWorkspace.findById(id);
      if (!workspace) return fail(res, 404, "WhatsApp workspace not found");
      const before = whatsappWorkspaceSnapshot(workspace);
      let targetStatus: "active" | "paused" | undefined;
      if (input.action === "set-status") targetStatus = input.status;
      if (input.action === "toggle-status") {
        targetStatus =
          input.enabled !== undefined
            ? input.enabled
              ? "active"
              : "paused"
            : workspace.subscription.status === "active"
              ? "paused"
              : "active";
      }
      if (targetStatus) {
        workspace.subscription.status = targetStatus;
        workspace.automationConfig.enabled = targetStatus === "active";
      } else {
        workspace.subscription.messagesUsed = 0;
      }
      await workspace.save();
      const after = whatsappWorkspaceSnapshot(workspace);
      await writeAuditLog({
        req,
        action: `workspace_${input.action.replace(/-/g, "_")}`,
        targetType: "workspace:whatsapp",
        targetId: id,
        reason: input.reason,
        before,
        after,
        metadata: { product },
      });
      return ok(res, { workspace: after });
    }

    if (product === "call") {
      const workspace = await CallAssistantWorkspace.findById(id);
      if (!workspace) return fail(res, 404, "Call workspace not found");
      const before = callWorkspaceSnapshot(workspace);
      let targetStatus: "active" | "paused" | undefined;
      if (input.action === "set-status") targetStatus = input.status;
      if (input.action === "toggle-status") {
        targetStatus =
          input.enabled !== undefined
            ? input.enabled
              ? "active"
              : "paused"
            : workspace.subscription.status === "active"
              ? "paused"
              : "active";
      }
      if (targetStatus) {
        workspace.subscription.status = targetStatus;
        workspace.subscription.pausedReason =
          targetStatus === "paused" ? input.reason : undefined;
      } else {
        workspace.subscription.minutesUsed = 0;
        workspace.subscription.callsUsed = 0;
      }
      await workspace.save();
      const after = callWorkspaceSnapshot(workspace);
      await writeAuditLog({
        req,
        action: `workspace_${input.action.replace(/-/g, "_")}`,
        targetType: "workspace:call",
        targetId: id,
        reason: input.reason,
        before,
        after,
        metadata: { product },
      });
      return ok(res, { workspace: after });
    }

    if (input.action === "reset-usage") {
      return fail(res, 400, "Package workspaces are not metered");
    }
    const serviceProduct = input.serviceType as ManagedServiceType;
    const managedModels: Record<ManagedServiceType, any> = {
      package: PackageSubscription,
      "meta-ads": MetaAdsSubscription,
      "website-maintenance": WebsiteMaintenanceSubscription,
      "content-creation": ContentCreationSubscription,
    };
    const subscription: any = await managedModels[serviceProduct].findById(id);
    if (!subscription) {
      return fail(res, 404, `${PRODUCT_LABELS[serviceProduct]} workspace not found`);
    }
    const before = regularSubscriptionSnapshot(subscription, serviceProduct);
    const targetStatus =
      input.action === "set-status"
        ? input.status!
        : input.enabled !== undefined
          ? input.enabled
            ? "active"
            : "paused"
          : subscription.status === "active"
            ? "paused"
            : "active";
    if (serviceProduct === "package") {
      await applyPackageStatus(subscription, targetStatus);
    } else {
      subscription.status = targetStatus;
      subscription.cancelledAt = undefined;
      await subscription.save();
    }
    const after = regularSubscriptionSnapshot(subscription, serviceProduct);
    await writeAuditLog({
      req,
      action: `workspace_${input.action.replace(/-/g, "_")}`,
      targetType: `workspace:packages:${serviceProduct}`,
      targetId: id,
      reason: input.reason,
      before,
      after,
      metadata: {
        product,
        serviceProduct,
        externalBillingChanged: false,
      },
    });
    return ok(res, { workspace: after, externalBillingChanged: false });
  } catch (error) {
    console.error("Admin workspace update error:", error);
    return fail(res, 500, "Failed to update workspace");
  }
};
