import CallAssistantWorkspace from "@/models/call/CallAssistantWorkspace.model";
import CallSubscription from "@/models/call/CallSubscription.model";
import WhatsAppWorkspace from "@/models/whatsapp/WhatsAppWorkspace.model";
import {
  getOrCreateWhatsAppWorkspace,
  getPlanById,
} from "@/services/whatsapp/whatsapp.service";

type BillingCycle = "monthly" | "yearly";

const toDate = (value?: Date) =>
  value || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

const callWorkspacePlanFromSubscription = (planType?: string) => {
  if (planType === "call-starter") return "starter";
  if (planType === "call-growth") return "growth";
  if (planType === "call-enterprise") return "enterprise";
  return "business";
};

export async function syncCallWorkspaceFromSubscription(subscription: any) {
  if (!subscription?.clerkId) return null;

  return CallAssistantWorkspace.findOneAndUpdate(
    { clerkId: subscription.clerkId },
    {
      $set: {
        isConfigured: true,
        "subscription.plan": callWorkspacePlanFromSubscription(
          subscription.planType,
        ),
        "subscription.status": "active",
        "subscription.billingCycle": subscription.billingCycle || "monthly",
        "subscription.minutesLimit": subscription.minutesLimit || 200,
        "subscription.callsLimit": 999999,
        "subscription.concurrentCallLimit":
          subscription.concurrentCallLimit || subscription.numberLimit || 3,
        "subscription.overageRate": subscription.overageRate || 5,
        "subscription.isFree": false,
        "subscription.nextBillingDate": toDate(subscription.expiresAt),
        updatedAt: new Date(),
      },
    },
    { new: true, upsert: true, setDefaultsOnInsert: true },
  );
}

export async function activateCallPaidSubscription({
  clerkId,
  planType,
  subscriptionId,
  plan,
  billingCycle,
  expiresAt,
  minutesLimit,
  numberLimit,
  concurrentCallLimit,
  agentLimit,
  overageRate,
}: {
  clerkId: string;
  planType: string;
  subscriptionId: string;
  plan?: string;
  billingCycle: BillingCycle;
  expiresAt?: Date;
  minutesLimit?: number;
  numberLimit?: number;
  concurrentCallLimit?: number;
  agentLimit?: number;
  overageRate?: number;
}) {
  const subscription = await CallSubscription.findOneAndUpdate(
    { subscriptionId },
    {
      $set: {
        clerkId,
        planType,
        subscriptionId,
        plan: plan || planType,
        billingCycle,
        status: "active",
        minutesLimit: Number(minutesLimit) || 200,
        numberLimit: Number(numberLimit) || Number(concurrentCallLimit) || 3,
        concurrentCallLimit:
          Number(concurrentCallLimit) || Number(numberLimit) || 3,
        agentLimit: Number(agentLimit) || 1,
        overageRate: Number(overageRate) || 5,
        expiresAt: toDate(expiresAt),
        updatedAt: new Date(),
      },
    },
    { new: true, upsert: true, setDefaultsOnInsert: true },
  );

  await syncCallWorkspaceFromSubscription(subscription);
  return subscription;
}

export async function renewCallPaidSubscription({
  subscriptionId,
  expiresAt,
}: {
  subscriptionId: string;
  expiresAt: Date;
}) {
  const subscription = await CallSubscription.findOneAndUpdate(
    { subscriptionId },
    {
      $set: {
        status: "active",
        expiresAt,
        updatedAt: new Date(),
      },
    },
    { new: true },
  );

  if (subscription) await syncCallWorkspaceFromSubscription(subscription);
  return subscription;
}

export async function downgradeCallWorkspaceToFree(clerkId: string) {
  return CallAssistantWorkspace.findOneAndUpdate(
    { clerkId },
    {
      $set: {
        "subscription.plan": "free",
        "subscription.status": "trial",
        "subscription.minutesLimit": 10,
        "subscription.callsLimit": 10,
        "subscription.concurrentCallLimit": 1,
        "subscription.overageRate": 0,
        "subscription.isFree": true,
        updatedAt: new Date(),
      },
    },
    { new: true },
  );
}

export const resolveWhatsAppPaidPlanId = (productId?: string) =>
  productId === "package" ? "package" : "launch";

export async function activateWhatsAppPaidSubscription({
  clerkId,
  productId,
  subscriptionId,
  billingCycle,
  expiresAt,
  razorpayPaymentId,
  offerId,
}: {
  clerkId: string;
  productId?: string;
  subscriptionId: string;
  billingCycle: BillingCycle;
  expiresAt?: Date;
  razorpayPaymentId?: string;
  offerId?: string;
}) {
  const workspace = await getOrCreateWhatsAppWorkspace(clerkId);
  const plan = getPlanById(resolveWhatsAppPaidPlanId(productId));
  const nextBillingDate = toDate(expiresAt);

  workspace.subscription.plan = plan.id;
  workspace.subscription.status = "active";
  workspace.subscription.billingCycle = billingCycle;
  workspace.subscription.messageLimit = plan.messageLimit;
  workspace.subscription.numbersLimit = plan.numbersLimit;
  workspace.subscription.seatsLimit = plan.seatsLimit;
  workspace.subscription.agentsLimit = plan.agentsLimit;
  workspace.subscription.nextBillingDate = nextBillingDate;
  workspace.subscription.subscriptionId = subscriptionId;
  workspace.subscription.razorpayPaymentId = razorpayPaymentId || "";
  workspace.subscription.offerId = offerId || "";
  workspace.subscription.activatedAt = new Date();
  await workspace.save();

  return workspace;
}

export async function renewWhatsAppPaidSubscription({
  subscriptionId,
  expiresAt,
}: {
  subscriptionId: string;
  expiresAt: Date;
}) {
  return WhatsAppWorkspace.findOneAndUpdate(
    { "subscription.subscriptionId": subscriptionId },
    {
      $set: {
        "subscription.status": "active",
        "subscription.nextBillingDate": expiresAt,
        updatedAt: new Date(),
      },
    },
    { new: true },
  );
}

export async function downgradeWhatsAppSubscriptionToFree(
  subscriptionId: string,
) {
  const freePlan = getPlanById("free");
  return WhatsAppWorkspace.findOneAndUpdate(
    { "subscription.subscriptionId": subscriptionId },
    {
      $set: {
        "subscription.plan": freePlan.id,
        "subscription.status": "trial",
        "subscription.billingCycle": "monthly",
        "subscription.messageLimit": freePlan.messageLimit,
        "subscription.numbersLimit": freePlan.numbersLimit,
        "subscription.seatsLimit": freePlan.seatsLimit,
        "subscription.agentsLimit": freePlan.agentsLimit,
        updatedAt: new Date(),
      },
      $unset: {
        "subscription.subscriptionId": "",
        "subscription.razorpayPaymentId": "",
        "subscription.offerId": "",
        "subscription.activatedAt": "",
      },
    },
    { new: true },
  );
}
