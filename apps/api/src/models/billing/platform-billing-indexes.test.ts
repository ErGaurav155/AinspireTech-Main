import assert from "node:assert/strict";
import test from "node:test";
import PlatformSubscription from "./PlatformSubscription.model";
import PurchasedAddon from "./PurchasedAddon.model";

test("provider subscription uniqueness excludes pending null ids", () => {
  const definition = PlatformSubscription.schema
    .indexes()
    .find(([, options]) => options.name === "uniq_platform_provider_subscription_present");

  assert.ok(definition);
  assert.equal(definition[1].unique, true);
  assert.deepEqual(definition[1].partialFilterExpression, {
    providerSubscriptionId: { $type: "string" },
  });
});

test("add-on provider uniqueness excludes pending null references", () => {
  const definition = PurchasedAddon.schema
    .indexes()
    .find(([, options]) => options.name === "uniq_addon_provider_reference_present");

  assert.ok(definition);
  assert.equal(definition[1].unique, true);
  assert.deepEqual(definition[1].partialFilterExpression, {
    providerReference: { $type: "string" },
  });
});
