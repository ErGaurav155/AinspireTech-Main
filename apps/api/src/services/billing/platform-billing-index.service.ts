import PlatformSubscription from "@/models/billing/PlatformSubscription.model";
import PurchasedAddon from "@/models/billing/PurchasedAddon.model";

const isMissingIndexError = (error: unknown) => {
  const code = Number((error as any)?.code || 0);
  return code === 26 || code === 27;
};

async function dropLegacyIndex(
  collection: { dropIndex: (name: string) => Promise<unknown> },
  indexName: string,
) {
  try {
    await collection.dropIndex(indexName);
    return true;
  } catch (error) {
    if (isMissingIndexError(error)) return false;
    throw error;
  }
}

/**
 * Sparse unique indexes still index explicit null values. Pending checkouts do
 * not have a provider id yet, so the old index allowed only one such record.
 * Create the partial replacements first to preserve uniqueness for real ids,
 * then remove the legacy indexes. This is idempotent across deployments.
 */
export async function ensurePlatformBillingIndexes() {
  await PlatformSubscription.collection.createIndex(
    { provider: 1, providerSubscriptionId: 1 },
    {
      name: "uniq_platform_provider_subscription_present",
      unique: true,
      partialFilterExpression: {
        providerSubscriptionId: { $type: "string" },
      },
    },
  );

  await PurchasedAddon.collection.createIndex(
    { provider: 1, providerReference: 1 },
    {
      name: "uniq_addon_provider_reference_present",
      unique: true,
      partialFilterExpression: {
        providerReference: { $type: "string" },
      },
    },
  );

  const [removedSubscriptionIndex, removedAddonIndex] = await Promise.all([
    dropLegacyIndex(
      PlatformSubscription.collection,
      "provider_1_providerSubscriptionId_1",
    ),
    dropLegacyIndex(
      PurchasedAddon.collection,
      "provider_1_providerReference_1",
    ),
  ]);

  return { removedSubscriptionIndex, removedAddonIndex };
}
