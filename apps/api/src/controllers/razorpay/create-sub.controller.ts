import { getRazorpay } from "@/utils/util";
import { getAuth } from "@clerk/express";
import { Request, Response } from "express";
import CallAssistantWorkspace from "@/models/call/CallAssistantWorkspace.model";
import WhatsAppWorkspace from "@/models/whatsapp/WhatsAppWorkspace.model";
import {
  getActiveContentCreationSubscription,
  getActiveMetaAdsSubscription,
  getActivePackageSubscription,
  getActiveSeparateServiceSubscriptions,
  getActiveWebsiteMaintenanceSubscription,
  getContentCreationPlan,
  getDashboardPackagePlan,
  getMetaAdsPlan,
  getWebsiteMaintenancePlan,
} from "@/services/packages/package-subscription.service";

const MONTHLY_FIRST_CYCLE_OFFER_IDS = {
  insta: {
    "Insta-Automation-Pro": "offer_T4CHk4QtNE6dp7",
  },
  web: {
    "chatbot-lead-generation": "offer_T4CNQG5KW1UXQt",
    "chatbot-education": "offer_Swg8earHCXfe9f",
  },
  call: {
    "call-business": "offer_T4EV5fWjFIkwkS",
    business: "offer_T4EV5fWjFIkwkS",
  },
  whatsapp: {
    "whatsapp-launch": "offer_T3WZjvSEGwtewO",
    launch: "offer_T3WZjvSEGwtewO",
  },
  package: {
    "package-starter": "offer_T2lwDeumrH9CrM",
    "package-whatsapp": "offer_T2lyhifS6agMei",
    "package-call": "offer_T2m0RJcdsJzTtV",
    "package-complete": "offer_T2m2QLmnJaYiIg",
  },
  websiteMaintenance: {
    "website-maintenance": "offer_T3Arfhh0cRasSf",
  },
  contentCreation: {
    "content-creation": "offer_T4mHmsbdGMQLXP",
  },
};

const splitEnvList = (value = "") =>
  value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

const isCallAssistantPublicEnabled = () =>
  process.env.CALL_ASSISTANT_PUBLIC_ENABLED === "true";

const isCallAssistantAdminUser = (clerkId?: string) => {
  if (!clerkId) return false;
  const adminIds = splitEnvList(
    process.env.CALL_ASSISTANT_ADMIN_CLERK_IDS || process.env.OWNERID || "",
  );
  return adminIds.includes(clerkId);
};

const rejectCallAssistantUnavailable = (res: Response) =>
  res.status(403).json({
    success: false,
    error:
      "AI Call Assistant is temporarily available only for admin while Exotel activation is completed.",
    timestamp: new Date().toISOString(),
  });

const getMonthlyFirstCycleOfferId = (
  subscriptionType: string,
  productId: string,
  billingCycle: string,
) => {
  if (billingCycle !== "monthly") return undefined;

  if (subscriptionType === "insta") {
    return MONTHLY_FIRST_CYCLE_OFFER_IDS.insta[
      productId as keyof typeof MONTHLY_FIRST_CYCLE_OFFER_IDS.insta
    ];
  }

  if (subscriptionType === "web") {
    return MONTHLY_FIRST_CYCLE_OFFER_IDS.web[
      productId as keyof typeof MONTHLY_FIRST_CYCLE_OFFER_IDS.web
    ];
  }

  if (subscriptionType === "call") {
    return MONTHLY_FIRST_CYCLE_OFFER_IDS.call[
      productId as keyof typeof MONTHLY_FIRST_CYCLE_OFFER_IDS.call
    ];
  }

  if (subscriptionType === "whatsapp") {
    return (
      MONTHLY_FIRST_CYCLE_OFFER_IDS.whatsapp[
        productId as keyof typeof MONTHLY_FIRST_CYCLE_OFFER_IDS.whatsapp
      ] || undefined
    );
  }

  if (subscriptionType === "package") {
    return MONTHLY_FIRST_CYCLE_OFFER_IDS.package[
      productId as keyof typeof MONTHLY_FIRST_CYCLE_OFFER_IDS.package
    ];
  }

  if (subscriptionType === "website-maintenance") {
    return MONTHLY_FIRST_CYCLE_OFFER_IDS.websiteMaintenance[
      productId as keyof typeof MONTHLY_FIRST_CYCLE_OFFER_IDS.websiteMaintenance
    ];
  }

  if (subscriptionType === "content-creation") {
    return MONTHLY_FIRST_CYCLE_OFFER_IDS.contentCreation[
      productId as keyof typeof MONTHLY_FIRST_CYCLE_OFFER_IDS.contentCreation
    ];
  }

  return undefined;
};

const getMissingCallSetupFields = (workspace: any) => {
  if (!workspace) return ["AI call assistant"];

  const missing: string[] = [];
  if (!workspace.isConfigured) missing.push("AI call assistant");
  if (!workspace.organization?.name?.trim()) missing.push("business name");
  if (!workspace.organization?.phone?.trim()) missing.push("business phone");
  if (!workspace.organization?.email?.trim()) missing.push("business email");
  if (!workspace.owner?.whatsappNumber?.trim()) {
    missing.push("WhatsApp alert number");
  }
  return missing;
};

const getMissingWhatsAppSetupFields = (workspace: any) => {
  if (!workspace) return ["WhatsApp Meta setup"];

  const missing: string[] = [];
  if (!workspace.meta?.businessManagerId?.trim()) {
    missing.push("Business Manager ID");
  }
  if (!workspace.meta?.appId?.trim()) missing.push("Meta app ID");
  if (!workspace.meta?.wabaId?.trim()) missing.push("WABA ID");
  if (!workspace.meta?.phoneNumberId?.trim()) missing.push("Phone number ID");
  if (!workspace.meta?.displayPhoneNumber?.trim()) {
    missing.push("WhatsApp business number");
  }
  if (!workspace.meta?.accessToken?.trim()) missing.push("Access token");
  return missing;
};

// POST /api/razorpay/subscription/create - Create Razorpay subscription
export const createRazorpaySubscriptionController = async (
  req: Request,
  res: Response,
) => {
  try {
    const { razorpayplanId, buyerId, amount, referralCode, metadata } =
      req.body;

    // Validate required fields
    if (!buyerId || !razorpayplanId || !amount || !metadata) {
      return res.status(400).json({
        success: false,
        error:
          "Missing required fields: buyerId, productId, razorpayplanId,subscriptionType and amount are required",
        timestamp: new Date().toISOString(),
      });
    }
    const {
      subscriptionType,
      productId,
      billingCycle,
      previousSubscriptionId,
      previousSubscriptionType,
      offerId: requestedOfferId,
    } = metadata;
    const extraNotes = Object.fromEntries(
      Object.entries(metadata).filter(
        ([, value]) => value !== undefined && value !== null,
      ),
    );
    if (!subscriptionType || !productId || !billingCycle) {
      return res.status(400).json({
        success: false,
        error: "Invalid subscription type in metadata",
        timestamp: new Date().toISOString(),
      });
    }
    // Validate amount
    if (typeof amount !== "number" || amount <= 0) {
      return res.status(400).json({
        success: false,
        error: "Amount must be a positive number",
        timestamp: new Date().toISOString(),
      });
    }

    if (subscriptionType === "package") {
      const { userId } = getAuth(req);
      if (userId && userId !== buyerId) {
        return res.status(403).json({
          success: false,
          error: "Package subscription buyer does not match authenticated user",
          timestamp: new Date().toISOString(),
        });
      }

      const [activePackage, activeSeparateServices] = await Promise.all([
        getActivePackageSubscription(buyerId),
        getActiveSeparateServiceSubscriptions(buyerId),
      ]);
      const packagePlan = getDashboardPackagePlan(productId);

      if (!packagePlan) {
        return res.status(400).json({
          success: false,
          error: "Invalid dashboard package",
          timestamp: new Date().toISOString(),
        });
      }

      if (
        packagePlan.includedServices.includes("call") &&
        !isCallAssistantPublicEnabled() &&
        !isCallAssistantAdminUser(buyerId)
      ) {
        return rejectCallAssistantUnavailable(res);
      }

      if (activePackage) {
        return res.status(409).json({
          success: false,
          error:
            "Cancel the active package before subscribing to another package.",
          timestamp: new Date().toISOString(),
        });
      }

      if (activeSeparateServices.length > 0) {
        return res.status(409).json({
          success: false,
          error:
            "Cancel active individual service subscriptions before buying a package.",
          data: { activeSeparateServices },
          timestamp: new Date().toISOString(),
        });
      }

      const [callWorkspace, whatsappWorkspace] = await Promise.all([
        packagePlan.setupServices.includes("call")
          ? CallAssistantWorkspace.findOne({ clerkId: buyerId }).lean()
          : Promise.resolve(null),
        packagePlan.setupServices.includes("whatsapp")
          ? WhatsAppWorkspace.findOne({ clerkId: buyerId }).lean()
          : Promise.resolve(null),
      ]);
      const missingPackageSetupFields = [
        ...(packagePlan.setupServices.includes("call")
          ? getMissingCallSetupFields(callWorkspace).map(
              (field) => `AI Call: ${field}`,
            )
          : []),
        ...(packagePlan.setupServices.includes("whatsapp")
          ? getMissingWhatsAppSetupFields(whatsappWorkspace).map(
              (field) => `WhatsApp: ${field}`,
            )
          : []),
      ];

      if (missingPackageSetupFields.length > 0) {
        return res.status(409).json({
          success: false,
          error:
            "Complete included service setup before starting package payment checkout.",
          data: { missingFields: missingPackageSetupFields },
          timestamp: new Date().toISOString(),
        });
      }
    } else if (subscriptionType === "meta-ads") {
      const { userId } = getAuth(req);
      if (userId && userId !== buyerId) {
        return res.status(403).json({
          success: false,
          error:
            "Meta Ads subscription buyer does not match authenticated user",
          timestamp: new Date().toISOString(),
        });
      }

      if (!getMetaAdsPlan(productId)) {
        return res.status(400).json({
          success: false,
          error: "Invalid Meta Ads plan",
          timestamp: new Date().toISOString(),
        });
      }

      const activeMetaAdsSubscription =
        await getActiveMetaAdsSubscription(buyerId);
      if (activeMetaAdsSubscription) {
        return res.status(409).json({
          success: false,
          error:
            "Cancel the active Meta Ads subscription before choosing another Meta Ads budget.",
          data: { activeMetaAdsSubscription },
          timestamp: new Date().toISOString(),
        });
      }
    } else if (subscriptionType === "website-maintenance") {
      const { userId } = getAuth(req);
      if (userId && userId !== buyerId) {
        return res.status(403).json({
          success: false,
          error:
            "Website maintenance subscription buyer does not match authenticated user",
          timestamp: new Date().toISOString(),
        });
      }

      if (!getWebsiteMaintenancePlan(productId)) {
        return res.status(400).json({
          success: false,
          error: "Invalid website maintenance plan",
          timestamp: new Date().toISOString(),
        });
      }

      const activeWebsiteMaintenanceSubscription =
        await getActiveWebsiteMaintenanceSubscription(buyerId);
      if (activeWebsiteMaintenanceSubscription) {
        return res.status(409).json({
          success: false,
          error:
            "Cancel the active website maintenance subscription before choosing another one.",
          data: { activeWebsiteMaintenanceSubscription },
          timestamp: new Date().toISOString(),
        });
      }
    } else if (subscriptionType === "content-creation") {
      const { userId } = getAuth(req);
      if (userId && userId !== buyerId) {
        return res.status(403).json({
          success: false,
          error:
            "Content creation subscription buyer does not match authenticated user",
          timestamp: new Date().toISOString(),
        });
      }

      if (!getContentCreationPlan(productId)) {
        return res.status(400).json({
          success: false,
          error: "Invalid content creation plan",
          timestamp: new Date().toISOString(),
        });
      }

      const activeContentCreationSubscription =
        await getActiveContentCreationSubscription(buyerId);
      if (activeContentCreationSubscription) {
        return res.status(409).json({
          success: false,
          error:
            "Cancel the active content creation subscription before choosing another one.",
          data: { activeContentCreationSubscription },
          timestamp: new Date().toISOString(),
        });
      }
    } else if (subscriptionType === "whatsapp") {
      const { userId } = getAuth(req);
      if (userId && userId !== buyerId) {
        return res.status(403).json({
          success: false,
          error:
            "WhatsApp subscription buyer does not match authenticated user",
          timestamp: new Date().toISOString(),
        });
      }

      if (!["whatsapp-launch", "launch"].includes(productId)) {
        return res.status(400).json({
          success: false,
          error: "Invalid WhatsApp automation plan",
          timestamp: new Date().toISOString(),
        });
      }

      const activePackage = await getActivePackageSubscription(buyerId);
      if (activePackage) {
        return res.status(409).json({
          success: false,
          error:
            "Cancel the active common package before buying a standalone WhatsApp plan.",
          data: { activePackage },
          timestamp: new Date().toISOString(),
        });
      }

      const activeWhatsAppWorkspace = await WhatsAppWorkspace.findOne({
        clerkId: buyerId,
        "subscription.plan": "launch",
        "subscription.status": "active",
      }).lean();
      if (activeWhatsAppWorkspace) {
        return res.status(409).json({
          success: false,
          error:
            "Cancel the active WhatsApp subscription before choosing another WhatsApp plan.",
          timestamp: new Date().toISOString(),
        });
      }
    } else if (subscriptionType === "call") {
      const { userId } = getAuth(req);
      if (userId && userId !== buyerId) {
        return res.status(403).json({
          success: false,
          error: "Call subscription buyer does not match authenticated user",
          timestamp: new Date().toISOString(),
        });
      }

      if (
        !isCallAssistantPublicEnabled() &&
        !isCallAssistantAdminUser(buyerId)
      ) {
        return rejectCallAssistantUnavailable(res);
      }

      if (billingCycle !== "monthly") {
        return res.status(400).json({
          success: false,
          error: "AI Call assistant supports monthly billing only.",
          timestamp: new Date().toISOString(),
        });
      }

      if (!["call-business", "business"].includes(productId)) {
        return res.status(400).json({
          success: false,
          error: "Invalid AI Call assistant plan",
          timestamp: new Date().toISOString(),
        });
      }

      const activePackage = await getActivePackageSubscription(buyerId);
      if (activePackage) {
        return res.status(409).json({
          success: false,
          error:
            "Cancel the active common package before buying a standalone service subscription.",
          data: { activePackage },
          timestamp: new Date().toISOString(),
        });
      }

      const workspace = await CallAssistantWorkspace.findOne({
        clerkId: buyerId,
      }).lean();
      const missingCallSetupFields = getMissingCallSetupFields(workspace);
      if (missingCallSetupFields.length > 0) {
        return res.status(409).json({
          success: false,
          error:
            "Complete AI Call assistant setup before starting payment checkout.",
          data: {
            missingFields: missingCallSetupFields,
            setupUrl: workspace?.isConfigured ? "/call/settings" : "/call",
          },
          timestamp: new Date().toISOString(),
        });
      }
    } else {
      const activePackage = await getActivePackageSubscription(buyerId);
      if (activePackage) {
        return res.status(409).json({
          success: false,
          error:
            "Cancel the active common package before buying a standalone service subscription.",
          data: { activePackage },
          timestamp: new Date().toISOString(),
        });
      }
    }

    const razorpay = getRazorpay();
    const offerId =
      subscriptionType === "meta-ads" || billingCycle !== "monthly"
        ? undefined
        : requestedOfferId ||
          getMonthlyFirstCycleOfferId(
            subscriptionType,
            productId,
            billingCycle,
          );

    // Create Razorpay subscription
    let subscription;
    try {
      subscription = await razorpay.subscriptions.create({
        plan_id: razorpayplanId,
        total_count: 12, // 12 months subscription
        customer_notify: 1 as 0 | 1,
        notes: {
          ...extraNotes,
          subscriptionType: subscriptionType,
          buyerId: buyerId,
          productId: productId,
          amount: amount.toString(),
          referralCode: referralCode || "",
          billingCycle,
          previousSubscriptionId: previousSubscriptionId || "",
          previousSubscriptionType: previousSubscriptionType || "",
          offerId: offerId || "",
        },
        ...(offerId ? { offer_id: offerId } : {}),
      });
    } catch (razorpayError: any) {
      console.error("Razorpay API error:", razorpayError);
      return res.status(400).json({
        success: false,
        error: `Razorpay error: ${razorpayError.error?.description || razorpayError.message}`,
        timestamp: new Date().toISOString(),
      });
    }

    if (!subscription) {
      return res.status(500).json({
        success: false,
        error: "Subscription creation failed - no response from Razorpay",
        timestamp: new Date().toISOString(),
      });
    }

    const subscriptionId = subscription.id;

    return res.status(201).json({
      success: true,
      data: {
        subscriptionId: subscriptionId,
        message: "Subscription created successfully",
        razorpayResponse: {
          id: subscription.id,
          status: subscription.status,
          current_start: subscription.current_start,
          current_end: subscription.current_end,
          created_at: subscription.created_at,
        },
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error("Error creating Razorpay subscription:", error);
    return res.status(500).json({
      success: false,
      error: error.message || "Failed to create subscription",
      timestamp: new Date().toISOString(),
    });
  }
};
