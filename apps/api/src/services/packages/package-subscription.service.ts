import { connectToDatabase } from "@/config/database.config";
import CallAssistantWorkspace from "@/models/call/CallAssistantWorkspace.model";
import CallSubscription from "@/models/call/CallSubscription.model";
import InstagramAccount from "@/models/insta/InstagramAccount.model";
import InstaSubscription from "@/models/insta/InstaSubscription.model";
import MetaAdsSubscription, {
  MetaAdsPlanId,
} from "@/models/packages/MetaAdsSubscription.model";
import PackageSubscription, {
  DashboardPackageId,
  DashboardPackageServiceKey,
} from "@/models/packages/PackageSubscription.model";
import WebsiteMaintenanceSubscription, {
  WebsiteMaintenancePlanId,
} from "@/models/packages/WebsiteMaintenanceSubscription.model";
import WebChatbot from "@/models/web/WebChatbot.model";
import WebSubscription from "@/models/web/Websubcription.model";
import WhatsAppWorkspace from "@/models/whatsapp/WhatsAppWorkspace.model";
import { initializeSubscriptionTokens } from "@/services/token.service";
import { getPlanById } from "@/services/whatsapp/whatsapp.service";

export interface DashboardPackagePlan {
  id: DashboardPackageId;
  name: string;
  description: string;
  amountInr: number;
  billingCycle: "monthly";
  includedServices: DashboardPackageServiceKey[];
  features: string[];
  setupServices: DashboardPackageServiceKey[];
}

export interface ActiveSeparateServiceSubscription {
  service: DashboardPackageServiceKey;
  label: string;
  plan: string;
  subscriptionId?: string;
  manageUrl: string;
}

export interface MetaAdsPlan {
  id: MetaAdsPlanId;
  name: string;
  description: string;
  amountInr: number;
  monthlyBudgetInr: number;
  features: string[];
}

export interface WebsiteMaintenancePlan {
  id: WebsiteMaintenancePlanId;
  name: string;
  description: string;
  amountInr: number;
  firstMonthInr: number;
  features: string[];
}

export const dashboardPackagePlans: DashboardPackagePlan[] = [
  {
    id: "package-starter",
    name: "Starter Automation",
    description: "Core web and Instagram automation for lead capture.",
    amountInr: 7000,
    billingCycle: "monthly",
    includedServices: ["insta", "web"],
    setupServices: ["insta", "web"],
    features: [
      "Instagram chatbot automation",
      "Website lead chatbot",
      "Website creation guidance",
      "Google Map and social profile setup guidance",
      "Content creation support",
    ],
  },
  {
    id: "package-whatsapp",
    name: "Social + WhatsApp",
    description: "Starter services with WhatsApp business automation.",
    amountInr: 10000,
    billingCycle: "monthly",
    includedServices: ["insta", "web", "whatsapp"],
    setupServices: ["insta", "web", "whatsapp"],
    features: [
      "Everything in Starter Automation",
      "WhatsApp automation",
      "Team inbox and campaign workflow",
      "Website creation guidance",
      "Content creation support",
    ],
  },
  {
    id: "package-call",
    name: "Social + AI Call",
    description: "Starter services with AI call assistance.",
    amountInr: 12000,
    billingCycle: "monthly",
    includedServices: ["insta", "web", "call"],
    setupServices: ["insta", "web", "call"],
    features: [
      "Everything in Starter Automation",
      "AI call assistant",
      "Lead capture from inbound calls",
      "Website creation guidance",
      "Content creation support",
    ],
  },
  {
    id: "package-complete",
    name: "Complete Growth",
    description: "All automation services in one common subscription.",
    amountInr: 15000,
    billingCycle: "monthly",
    includedServices: ["insta", "web", "whatsapp", "call"],
    setupServices: ["insta", "web", "whatsapp", "call"],
    features: [
      "Instagram chatbot automation",
      "Website lead chatbot",
      "WhatsApp automation",
      "AI call assistant",
      "Website, map, social profile, and content support",
    ],
  },
];

export const metaAdsPlans: MetaAdsPlan[] = [
  {
    id: "meta-ads-5000",
    name: "Meta Ads Starter",
    description: "Monthly Meta Ads budget plan for early campaigns.",
    amountInr: 5000,
    monthlyBudgetInr: 5000,
    features: [
      "Meta ads budget: INR 5,000/month",
      "Campaign setup support",
      "Audience and creative guidance",
      "Monthly performance review",
    ],
  },
  {
    id: "meta-ads-10000",
    name: "Meta Ads Growth",
    description: "Monthly Meta Ads budget plan for growing lead volume.",
    amountInr: 10000,
    monthlyBudgetInr: 10000,
    features: [
      "Meta ads budget: INR 10,000/month",
      "Campaign setup support",
      "Audience and creative guidance",
      "Monthly performance review",
    ],
  },
  {
    id: "meta-ads-15000",
    name: "Meta Ads Scale",
    description: "Monthly Meta Ads budget plan for scaling campaigns.",
    amountInr: 15000,
    monthlyBudgetInr: 15000,
    features: [
      "Meta ads budget: INR 15,000/month",
      "Campaign setup support",
      "Audience and creative guidance",
      "Monthly performance review",
    ],
  },
  {
    id: "meta-ads-20000",
    name: "Meta Ads Pro",
    description: "Monthly Meta Ads budget plan for higher acquisition goals.",
    amountInr: 20000,
    monthlyBudgetInr: 20000,
    features: [
      "Meta ads budget: INR 20,000/month",
      "Campaign setup support",
      "Audience and creative guidance",
      "Monthly performance review",
    ],
  },
];

export const websiteMaintenancePlans: WebsiteMaintenancePlan[] = [
  {
    id: "website-maintenance",
    name: "Website Monthly Maintenance",
    description:
      "For clients who only need website upkeep, small content changes, and monthly maintenance.",
    amountInr: 500,
    firstMonthInr: 250,
    features: [
      "Monthly website maintenance",
      "Small content and image updates",
      "Basic uptime and form checks",
      "Minor bug-fix support",
      "No automation setup checks required",
    ],
  },
];

const packageGrantId = (
  subscriptionId: string,
  service: DashboardPackageServiceKey,
) => `pkg:${subscriptionId}:${service}`;

const nextBillingDate = (expiresAt?: Date) =>
  expiresAt || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

export const getDashboardPackagePlan = (packageId: string) =>
  dashboardPackagePlans.find((plan) => plan.id === packageId);

export const getMetaAdsPlan = (planId: string) =>
  metaAdsPlans.find((plan) => plan.id === planId);

export const getWebsiteMaintenancePlan = (planId: string) =>
  websiteMaintenancePlans.find((plan) => plan.id === planId);

export async function getActiveMetaAdsSubscription(clerkId: string) {
  await connectToDatabase();
  return MetaAdsSubscription.findOne({
    clerkId,
    status: "active",
    expiresAt: { $gt: new Date() },
  })
    .sort({ createdAt: -1 })
    .lean();
}

export async function getActiveWebsiteMaintenanceSubscription(clerkId: string) {
  await connectToDatabase();
  return WebsiteMaintenanceSubscription.findOne({
    clerkId,
    status: "active",
    expiresAt: { $gt: new Date() },
  })
    .sort({ createdAt: -1 })
    .lean();
}

export async function getActivePackageSubscription(clerkId: string) {
  await connectToDatabase();
  return PackageSubscription.findOne({
    clerkId,
    status: "active",
    expiresAt: { $gt: new Date() },
  })
    .sort({ createdAt: -1 })
    .lean();
}

export async function getActiveSeparateServiceSubscriptions(
  clerkId: string,
): Promise<ActiveSeparateServiceSubscription[]> {
  await connectToDatabase();

  const [instaSub, webSubs, callSub, whatsappWorkspace] = await Promise.all([
    InstaSubscription.findOne({
      clerkId,
      status: "active",
      expiresAt: { $gt: new Date() },
      subscriptionId: { $not: /^pkg:/ },
    })
      .sort({ createdAt: -1 })
      .lean(),
    WebSubscription.find({
      clerkId,
      status: "active",
      expiresAt: { $gt: new Date() },
      subscriptionId: { $not: /^pkg:/ },
    })
      .sort({ createdAt: -1 })
      .lean(),
    CallSubscription.findOne({
      clerkId,
      status: "active",
      expiresAt: { $gt: new Date() },
      subscriptionId: { $not: /^pkg:/ },
    })
      .sort({ createdAt: -1 })
      .lean(),
    WhatsAppWorkspace.findOne({ clerkId }).lean(),
  ]);

  const activeServices: ActiveSeparateServiceSubscription[] = [];

  if (instaSub) {
    activeServices.push({
      service: "insta",
      label: "Instagram Automation",
      plan: instaSub.plan || instaSub.chatbotType,
      subscriptionId: instaSub.subscriptionId,
      manageUrl: "/insta/pricing",
    });
  }

  for (const subscription of webSubs) {
    activeServices.push({
      service: "web",
      label:
        subscription.chatbotType === "chatbot-education"
          ? "Web Education Chatbot"
          : "Website Lead Chatbot",
      plan: subscription.plan || subscription.chatbotType,
      subscriptionId: subscription.subscriptionId,
      manageUrl: "/web/pricing",
    });
  }

  if (callSub) {
    activeServices.push({
      service: "call",
      label: "AI Call Assistant",
      plan: callSub.plan || callSub.planType,
      subscriptionId: callSub.subscriptionId,
      manageUrl: "/call/pricing",
    });
  }

  if (
    whatsappWorkspace?.subscription?.plan === "launch" &&
    whatsappWorkspace.subscription.status === "active"
  ) {
    activeServices.push({
      service: "whatsapp",
      label: "WhatsApp Automation",
      plan: "launch",
      manageUrl: "/whatsapp/pricing",
    });
  }

  return activeServices;
}

export async function buildDashboardPackageStatus(clerkId: string) {
  await connectToDatabase();

  const [
    activePackage,
    packageHistory,
    instaSubscriptionHistory,
    webSubscriptionHistory,
    callSubscriptionHistory,
    instagramAccount,
    leadChatbot,
    whatsappWorkspace,
    callWorkspace,
    activeSeparateServices,
    activeMetaAdsSubscription,
    activeWebsiteMaintenanceSubscription,
  ] = await Promise.all([
    getActivePackageSubscription(clerkId),
    PackageSubscription.exists({ clerkId }),
    InstaSubscription.exists({ clerkId }),
    WebSubscription.exists({ clerkId }),
    CallSubscription.exists({ clerkId }),
    InstagramAccount.findOne({ userId: clerkId, isActive: true }).lean(),
    WebChatbot.findOne({
      clerkId,
      type: "chatbot-lead-generation",
      isActive: true,
    }).lean(),
    WhatsAppWorkspace.findOne({ clerkId }).lean(),
    CallAssistantWorkspace.findOne({ clerkId }).lean(),
    getActiveSeparateServiceSubscriptions(clerkId),
    getActiveMetaAdsSubscription(clerkId),
    getActiveWebsiteMaintenanceSubscription(clerkId),
  ]);

  const serviceChecks = [
    {
      key: "insta",
      label: "Instagram Automation",
      ready: Boolean(instagramAccount),
      setupUrl: "/insta/accounts",
      successText: instagramAccount
        ? `Connected as ${instagramAccount.username}`
        : "Instagram account connected",
      missingTitle: "Connect your Instagram account",
      missingDescription:
        "Attach at least one active Instagram account so package automation can be enabled.",
    },
    {
      key: "web",
      label: "Website Lead Chatbot",
      ready: Boolean(leadChatbot),
      setupUrl: "/web/chatbot-lead-generation",
      successText: leadChatbot
        ? `${leadChatbot.name} is ready`
        : "Lead chatbot created",
      missingTitle: "Create your website lead chatbot",
      missingDescription:
        "Create the lead generation chatbot in free mode before starting package billing.",
    },
    {
      key: "whatsapp",
      label: "WhatsApp Automation",
      ready: Boolean(whatsappWorkspace),
      setupUrl: "/whatsapp",
      successText: whatsappWorkspace
        ? "WhatsApp free workspace is active"
        : "WhatsApp free workspace active",
      missingTitle: "Activate WhatsApp automation",
      missingDescription:
        "Open the WhatsApp dashboard once to create the free automation workspace.",
    },
    {
      key: "call",
      label: "AI Call Assistant",
      ready: Boolean(callWorkspace),
      setupUrl: "/call",
      successText: callWorkspace
        ? "AI call assistant free workspace is active"
        : "AI call assistant free workspace active",
      missingTitle: "Activate the AI call assistant",
      missingDescription:
        "Open the AI Call dashboard once to create the free call assistant workspace.",
    },
  ] as const;

  return {
    plans: dashboardPackagePlans,
    metaAdsPlans,
    websiteMaintenancePlans,
    activeMetaAdsSubscription,
    activeWebsiteMaintenanceSubscription,
    activePackage,
    firstTimeDiscountEligible:
      !packageHistory &&
      !instaSubscriptionHistory &&
      !webSubscriptionHistory &&
      !callSubscriptionHistory,
    activeSeparateServices,
    serviceChecks,
  };
}

export async function activateMetaAdsSubscription({
  clerkId,
  planId,
  subscriptionId,
  expiresAt,
  razorpayPaymentId,
}: {
  clerkId: string;
  planId: string;
  subscriptionId: string;
  expiresAt: Date;
  razorpayPaymentId?: string;
}) {
  await connectToDatabase();

  const plan = getMetaAdsPlan(planId);
  if (!plan) {
    throw new Error("Unknown Meta Ads plan");
  }

  await MetaAdsSubscription.updateMany(
    {
      clerkId,
      subscriptionId: { $ne: subscriptionId },
      status: "active",
    },
    {
      $set: {
        status: "cancelled",
        cancelledAt: new Date(),
        updatedAt: new Date(),
      },
    },
  );

  return MetaAdsSubscription.findOneAndUpdate(
    { subscriptionId },
    {
      $set: {
        clerkId,
        planId: plan.id,
        planName: plan.name,
        subscriptionId,
        monthlyBudgetInr: plan.monthlyBudgetInr,
        billingCycle: "monthly",
        status: "active",
        razorpayPaymentId,
        expiresAt,
        updatedAt: new Date(),
      },
    },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );
}

export async function cancelMetaAdsSubscriptionLocally({
  clerkId,
  subscriptionId,
}: {
  clerkId: string;
  subscriptionId: string;
}) {
  await connectToDatabase();

  const now = new Date();
  return MetaAdsSubscription.findOneAndUpdate(
    { clerkId, subscriptionId, status: "active" },
    {
      $set: {
        status: "cancelled",
        cancelledAt: now,
        updatedAt: now,
      },
    },
    { new: true },
  );
}

export async function activateWebsiteMaintenanceSubscription({
  clerkId,
  planId,
  subscriptionId,
  expiresAt,
  razorpayPaymentId,
  offerId,
}: {
  clerkId: string;
  planId: string;
  subscriptionId: string;
  expiresAt: Date;
  razorpayPaymentId?: string;
  offerId?: string;
}) {
  await connectToDatabase();

  const plan = getWebsiteMaintenancePlan(planId);
  if (!plan) {
    throw new Error("Unknown website maintenance plan");
  }

  await WebsiteMaintenanceSubscription.updateMany(
    {
      clerkId,
      subscriptionId: { $ne: subscriptionId },
      status: "active",
    },
    {
      $set: {
        status: "cancelled",
        cancelledAt: new Date(),
        updatedAt: new Date(),
      },
    },
  );

  return WebsiteMaintenanceSubscription.findOneAndUpdate(
    { subscriptionId },
    {
      $set: {
        clerkId,
        planId: plan.id,
        planName: plan.name,
        subscriptionId,
        amountInr: plan.amountInr,
        billingCycle: "monthly",
        status: "active",
        razorpayPaymentId,
        offerId,
        expiresAt,
        updatedAt: new Date(),
      },
    },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );
}

export async function cancelWebsiteMaintenanceSubscriptionLocally({
  clerkId,
  subscriptionId,
}: {
  clerkId: string;
  subscriptionId: string;
}) {
  await connectToDatabase();

  const now = new Date();
  return WebsiteMaintenanceSubscription.findOneAndUpdate(
    { clerkId, subscriptionId, status: "active" },
    {
      $set: {
        status: "cancelled",
        cancelledAt: now,
        updatedAt: now,
      },
    },
    { new: true },
  );
}

export async function activateDashboardPackageSubscription({
  clerkId,
  packageId,
  subscriptionId,
  billingCycle,
  expiresAt,
  razorpayPaymentId,
  offerId,
}: {
  clerkId: string;
  packageId: string;
  subscriptionId: string;
  billingCycle: "monthly";
  expiresAt: Date;
  razorpayPaymentId?: string;
  offerId?: string;
}) {
  await connectToDatabase();

  const plan = getDashboardPackagePlan(packageId);
  if (!plan) {
    throw new Error("Unknown dashboard package");
  }

  const activeSeparateServices =
    await getActiveSeparateServiceSubscriptions(clerkId);
  if (activeSeparateServices.length > 0) {
    throw new Error(
      "Cancel active individual service subscriptions before buying a package.",
    );
  }

  const previousPackages = await PackageSubscription.find({
    clerkId,
    subscriptionId: { $ne: subscriptionId },
    status: "active",
  }).lean();

  await Promise.all(
    previousPackages.map((subscription) =>
      cancelDashboardPackageLocally({
        clerkId,
        subscriptionId: subscription.subscriptionId,
      }),
    ),
  );

  const packageSubscription = await PackageSubscription.findOneAndUpdate(
    { subscriptionId },
    {
      $set: {
        clerkId,
        packageId: plan.id,
        packageName: plan.name,
        subscriptionId,
        plan: plan.id,
        billingCycle,
        amountInr: plan.amountInr,
        includedServices: plan.includedServices,
        status: "active",
        razorpayPaymentId,
        offerId,
        expiresAt,
        updatedAt: new Date(),
      },
    },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );

  await grantPackageServices({
    clerkId,
    subscriptionId,
    packagePlan: plan,
    expiresAt,
  });

  return packageSubscription;
}

async function grantPackageServices({
  clerkId,
  subscriptionId,
  packagePlan,
  expiresAt,
}: {
  clerkId: string;
  subscriptionId: string;
  packagePlan: DashboardPackagePlan;
  expiresAt: Date;
}) {
  const grantExpiry = nextBillingDate(expiresAt);
  const tasks: Promise<unknown>[] = [];

  if (packagePlan.includedServices.includes("web")) {
    tasks.push(initializeSubscriptionTokens(clerkId, "chatbot-lead-generation"));
    tasks.push(
      WebSubscription.findOneAndUpdate(
        { subscriptionId: packageGrantId(subscriptionId, "web") },
        {
          $set: {
            clerkId,
            chatbotType: "chatbot-lead-generation",
            chatbotName: "Lead Generation",
            chatbotMessage: "Hi, How may I help you?",
            subscriptionId: packageGrantId(subscriptionId, "web"),
            plan: packagePlan.id,
            billingCycle: "monthly",
            status: "active",
            expiresAt: grantExpiry,
            updatedAt: new Date(),
          },
        },
        { upsert: true, new: true, setDefaultsOnInsert: true },
      ),
    );
  }

  if (packagePlan.includedServices.includes("insta")) {
    tasks.push(
      InstaSubscription.findOneAndUpdate(
        { subscriptionId: packageGrantId(subscriptionId, "insta") },
        {
          $set: {
            clerkId,
            chatbotType: "Insta-Automation-Pro",
            subscriptionId: packageGrantId(subscriptionId, "insta"),
            plan: packagePlan.id,
            billingCycle: "monthly",
            status: "active",
            expiresAt: grantExpiry,
            updatedAt: new Date(),
          },
        },
        { upsert: true, new: true, setDefaultsOnInsert: true },
      ),
    );
  }

  if (packagePlan.includedServices.includes("call")) {
    tasks.push(
      CallSubscription.findOneAndUpdate(
        { subscriptionId: packageGrantId(subscriptionId, "call") },
        {
          $set: {
            clerkId,
            planType: "call-business",
            subscriptionId: packageGrantId(subscriptionId, "call"),
            plan: packagePlan.id,
            billingCycle: "monthly",
            status: "active",
            minutesLimit: 1000,
            numberLimit: 3,
            concurrentCallLimit: 3,
            agentLimit: 3,
            overageRate: 5,
            expiresAt: grantExpiry,
            updatedAt: new Date(),
          },
        },
        { upsert: true, new: true, setDefaultsOnInsert: true },
      ),
    );
  }

  if (packagePlan.includedServices.includes("whatsapp")) {
    const whatsappPlan = getPlanById("package");
    tasks.push(
      WhatsAppWorkspace.findOneAndUpdate(
        { clerkId },
        {
          $set: {
            "subscription.plan": whatsappPlan.id,
            "subscription.status": "active",
            "subscription.billingCycle": "monthly",
            "subscription.messageLimit": whatsappPlan.messageLimit,
            "subscription.numbersLimit": whatsappPlan.numbersLimit,
            "subscription.seatsLimit": whatsappPlan.seatsLimit,
            "subscription.agentsLimit": whatsappPlan.agentsLimit,
            "subscription.nextBillingDate": grantExpiry,
          },
        },
        { new: true },
      ),
    );
  }

  await Promise.all(tasks);
}

export async function cancelDashboardPackageLocally({
  clerkId,
  subscriptionId,
}: {
  clerkId: string;
  subscriptionId: string;
}) {
  await connectToDatabase();

  const now = new Date();
  const freeWhatsAppPlan = getPlanById("free");

  await Promise.all([
    PackageSubscription.findOneAndUpdate(
      { clerkId, subscriptionId },
      {
        $set: {
          status: "cancelled",
          cancelledAt: now,
          updatedAt: now,
        },
      },
    ),
    WebSubscription.updateMany(
      { clerkId, subscriptionId: packageGrantId(subscriptionId, "web") },
      { $set: { status: "cancelled", cancelledAt: now, updatedAt: now } },
    ),
    InstaSubscription.updateMany(
      { clerkId, subscriptionId: packageGrantId(subscriptionId, "insta") },
      { $set: { status: "cancelled", cancelledAt: now, updatedAt: now } },
    ),
    CallSubscription.updateMany(
      { clerkId, subscriptionId: packageGrantId(subscriptionId, "call") },
      { $set: { status: "cancelled", cancelledAt: now, updatedAt: now } },
    ),
    WhatsAppWorkspace.findOneAndUpdate(
      { clerkId },
      {
        $set: {
          "subscription.plan": freeWhatsAppPlan.id,
          "subscription.status": "trial",
          "subscription.billingCycle": "monthly",
          "subscription.messageLimit": freeWhatsAppPlan.messageLimit,
          "subscription.numbersLimit": freeWhatsAppPlan.numbersLimit,
          "subscription.seatsLimit": freeWhatsAppPlan.seatsLimit,
          "subscription.agentsLimit": freeWhatsAppPlan.agentsLimit,
        },
      },
    ),
  ]);
}
