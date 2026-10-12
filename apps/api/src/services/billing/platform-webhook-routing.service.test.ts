import assert from "node:assert/strict";
import test from "node:test";
import { hasPlatformBillingMarker } from "./platform-webhook-routing.service";

test("recognizes platform base-plan subscription notes", () => {
  assert.equal(
    hasPlatformBillingMarker({
      notes: {
        platformType: "plan",
        platformSubscriptionId: "platform-subscription-id",
      },
    }),
    true,
  );
});

test("recognizes platform add-on subscription notes", () => {
  assert.equal(
    hasPlatformBillingMarker({
      notes: { platformType: "addon", purchasedAddonId: "addon-id" },
    }),
    true,
  );
});

test("does not classify individual service subscriptions as platform billing", () => {
  assert.equal(
    hasPlatformBillingMarker({
      notes: {
        subscriptionType: "insta",
        buyerId: "user_123",
        amount: 999,
      },
    }),
    false,
  );
});
