import IndividualSubscriptionChange from "@/models/billing/IndividualSubscriptionChange.model";
import CallSubscription from "@/models/call/CallSubscription.model";
import InstaSubscription from "@/models/insta/InstaSubscription.model";
import PackageSubscription from "@/models/packages/PackageSubscription.model";
import MetaAdsSubscription from "@/models/packages/MetaAdsSubscription.model";
import WebsiteMaintenanceSubscription from "@/models/packages/WebsiteMaintenanceSubscription.model";
import ContentCreationSubscription from "@/models/packages/ContentCreationSubscription.model";
import WebSubscription from "@/models/web/Websubcription.model";
import WhatsAppWorkspace from "@/models/whatsapp/WhatsAppWorkspace.model";
import User from "@/models/user.model";
import {
  activateContentCreationSubscription,
  activateDashboardPackageSubscription,
  activateMetaAdsSubscription,
  activateWebsiteMaintenanceSubscription,
} from "@/services/packages/package-subscription.service";
import {
  activateCallPaidSubscription,
  activateWhatsAppPaidSubscription,
} from "@/services/billing/paid-subscription.service";

const asPositiveNumber = (value: unknown, fallback: number) => {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : fallback;
};

export async function applyConfirmedIndividualSubscriptionChange(entity: any) {
  const subscriptionId = String(entity?.id || "");
  const providerPlanId = String(entity?.plan_id || "");
  if (!subscriptionId || !providerPlanId) return null;

  const change = await IndividualSubscriptionChange.findOne({
    subscriptionId,
    targetProviderPlanId: providerPlanId,
    status: "pending",
  }).sort({ createdAt: -1 });
  if (!change) return null;

  const expiresAt = entity.current_end
    ? new Date(Number(entity.current_end) * 1000)
    : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
  const metadata = change.metadata || {};

  if (change.subscriptionKind === "package") {
    await activateDashboardPackageSubscription({
      clerkId: change.clerkId,
      packageId: change.targetProductId,
      subscriptionId,
      billingCycle: "monthly",
      expiresAt,
    });
  } else if (change.subscriptionKind === "meta-ads") {
    await activateMetaAdsSubscription({
      clerkId: change.clerkId,
      planId: change.targetProductId,
      subscriptionId,
      expiresAt,
    });
  } else if (change.subscriptionKind === "website-maintenance") {
    await activateWebsiteMaintenanceSubscription({
      clerkId: change.clerkId,
      planId: change.targetProductId,
      subscriptionId,
      expiresAt,
    });
  } else if (change.subscriptionKind === "content-creation") {
    await activateContentCreationSubscription({
      clerkId: change.clerkId,
      planId: change.targetProductId,
      subscriptionId,
      expiresAt,
    });
  } else if (change.subscriptionKind === "call") {
    await activateCallPaidSubscription({
      clerkId: change.clerkId,
      planType: change.targetProductId,
      subscriptionId,
      plan: change.targetProductId,
      billingCycle: change.targetBillingCycle,
      expiresAt,
      minutesLimit: asPositiveNumber(metadata.minutesLimit, 200),
      numberLimit: asPositiveNumber(metadata.numberLimit, 3),
      concurrentCallLimit: asPositiveNumber(metadata.concurrentCallLimit, 3),
      agentLimit: asPositiveNumber(metadata.agentLimit, 1),
      overageRate: asPositiveNumber(metadata.overageRate, 5),
    });
  } else if (change.subscriptionKind === "whatsapp") {
    await activateWhatsAppPaidSubscription({
      clerkId: change.clerkId,
      productId: change.targetProductId,
      subscriptionId,
      billingCycle: change.targetBillingCycle,
      expiresAt,
    });
  } else if (change.subscriptionKind === "insta") {
    await InstaSubscription.findOneAndUpdate(
      { subscriptionId, clerkId: change.clerkId },
      {
        $set: {
          chatbotType: "Insta-Automation-Pro",
          plan: change.targetProductId,
          billingCycle: change.targetBillingCycle,
          status: "active",
          expiresAt,
          updatedAt: new Date(),
        },
      },
    );
    const replyLimit = Number(metadata.planLimit);
    const accountLimit = Number(metadata.accountLimit);
    if (Number.isFinite(replyLimit) && Number.isFinite(accountLimit)) {
      await User.updateOne(
        { clerkId: change.clerkId },
        { $set: { replyLimit, accountLimit, updatedAt: new Date() } },
      );
    }
  } else {
    await WebSubscription.findOneAndUpdate(
      {
        subscriptionId,
        clerkId: change.clerkId,
        chatbotType: "chatbot-lead-generation",
      },
      {
        $set: {
          plan: change.targetProductId,
          billingCycle: change.targetBillingCycle,
          status: "active",
          expiresAt,
          updatedAt: new Date(),
        },
      },
    );
  }

  change.status = "applied";
  change.appliedAt = new Date();
  await change.save();
  return change;
}

export async function findOwnedIndividualSubscription(
  clerkId: string,
  subscriptionId: string,
  kind: string,
) {
  if (kind === "insta") {
    return InstaSubscription.findOne({ clerkId, subscriptionId, status: "active" }).lean();
  }
  if (kind === "web") {
    return WebSubscription.findOne({
      clerkId,
      subscriptionId,
      chatbotType: "chatbot-lead-generation",
      status: "active",
    }).lean();
  }
  if (kind === "call") {
    return CallSubscription.findOne({ clerkId, subscriptionId, status: "active" }).lean();
  }
  if (kind === "whatsapp") {
    return WhatsAppWorkspace.findOne({
      clerkId,
      "subscription.subscriptionId": subscriptionId,
      "subscription.status": "active",
    }).lean();
  }
  if (kind === "package") {
    return PackageSubscription.findOne({ clerkId, subscriptionId, status: "active" }).lean();
  }

  if (kind === "meta-ads") {
    return MetaAdsSubscription.findOne({
      clerkId,
      subscriptionId,
      status: "active",
    }).lean();
  }
  if (kind === "website-maintenance") {
    return WebsiteMaintenanceSubscription.findOne({
      clerkId,
      subscriptionId,
      status: "active",
    }).lean();
  }
  return ContentCreationSubscription.findOne({
    clerkId,
    subscriptionId,
    status: "active",
  }).lean();
}
