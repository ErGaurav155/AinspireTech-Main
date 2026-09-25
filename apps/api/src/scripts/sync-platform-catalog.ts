import "dotenv/config";
import { connectToDatabase, mongoose } from "@/config/database.config";
import {
  AGENCY_ADDON_CATALOG,
  AGENCY_PLAN_CATALOG,
} from "@/config/platform-catalog.config";
import AddonDefinition from "@/models/billing/AddonDefinition.model";
import PlanDefinition from "@/models/billing/PlanDefinition.model";
import LegacyPlan from "@/models/plan.model";

const providerPlanId = (
  plan: any,
  interval: "monthly" | "yearly",
) =>
  interval === "monthly"
    ? plan?.razorpaymonthlyplanId
    : plan?.razorpayyearlyplanId;

async function main() {
  await connectToDatabase();
  const productIds = [
    ...new Set([
      ...AGENCY_PLAN_CATALOG.map((item) => item.razorpayProductId),
      ...AGENCY_ADDON_CATALOG.map((item) => item.razorpayProductId),
    ]),
  ];
  const providerPlans = await LegacyPlan.find({ productId: { $in: productIds } }).lean();
  const byProductId = new Map(providerPlans.map((item) => [item.productId, item]));
  const missing: string[] = [];

  for (const item of AGENCY_PLAN_CATALOG) {
    if (!providerPlanId(byProductId.get(item.razorpayProductId), item.billingInterval)) {
      missing.push(`${item.razorpayProductId}:${item.billingInterval}`);
    }
  }
  for (const addon of AGENCY_ADDON_CATALOG) {
    for (const interval of ["monthly", "yearly"] as const) {
      if (!providerPlanId(byProductId.get(addon.razorpayProductId), interval)) {
        missing.push(`${addon.razorpayProductId}:${interval}`);
      }
    }
  }
  if (missing.length) {
    throw new Error(
      `Create these productId/interval entries in the existing Plan collection first: ${missing.join(", ")}`,
    );
  }

  for (const item of AGENCY_PLAN_CATALOG) {
    const provider = byProductId.get(item.razorpayProductId)!;
    await PlanDefinition.updateMany(
      { code: item.code, revision: { $ne: item.revision } },
      { $set: { active: false } },
    );
    await PlanDefinition.findOneAndUpdate(
      { code: item.code, revision: item.revision },
      {
        $set: {
          name: item.name,
          description: item.description,
          accountType: "AGENCY",
          kind: "base",
          billingInterval: item.billingInterval,
          price: item.price,
          currency: item.currency,
          features: item.features,
          limits: item.limits,
          razorpay: {
            productId: item.razorpayProductId,
            planId: providerPlanId(provider, item.billingInterval),
          },
          active: item.active,
          publishedAt: new Date(),
        },
      },
      { upsert: true, new: true },
    );
  }

  for (const addon of AGENCY_ADDON_CATALOG) {
    const provider = byProductId.get(addon.razorpayProductId)!;
    for (const interval of ["monthly", "yearly"] as const) {
      const code = `${addon.code}-${interval}`;
      await AddonDefinition.updateMany(
        { code, revision: { $ne: addon.revision } },
        { $set: { active: false } },
      );
      await AddonDefinition.findOneAndUpdate(
        { code, revision: addon.revision },
        {
          $set: {
            name: addon.name,
            accountTypes: ["AGENCY"],
            price: interval === "monthly" ? addon.monthlyPrice : addon.yearlyPrice,
            currency: "INR",
            billingInterval: interval,
            entitlementChanges: { features: {}, limits: addon.limits },
            limitOperation: "add",
            razorpay: {
              productId: addon.razorpayProductId,
              planId: providerPlanId(provider, interval),
            },
            active: true,
          },
        },
        { upsert: true, new: true },
      );
    }
  }

  console.info(
    `Synchronized ${AGENCY_PLAN_CATALOG.length} agency plans and ${AGENCY_ADDON_CATALOG.length * 2} add-ons.`,
  );
}

main()
  .then(async () => {
    await mongoose.disconnect();
    process.exit(0);
  })
  .catch(async (error) => {
    console.error(error);
    await mongoose.disconnect();
    process.exit(1);
  });
