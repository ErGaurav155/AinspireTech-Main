import assert from "node:assert/strict";
import test from "node:test";
import {
  canUpdateRazorpaySubscription,
  shouldUseIndividualReplacementCheckout,
  supportsIndividualReplacementCheckout,
} from "./individual-subscription-provider-policy.service";

test("only provider states accepted by Razorpay use in-place updates", () => {
  assert.equal(canUpdateRazorpaySubscription("authenticated"), true);
  assert.equal(canUpdateRazorpaySubscription("active"), true);
  assert.equal(canUpdateRazorpaySubscription("halted"), false);
  assert.equal(canUpdateRazorpaySubscription("cancelled"), false);
  assert.equal(canUpdateRazorpaySubscription("completed"), false);
  assert.equal(canUpdateRazorpaySubscription(undefined), false);
});

test("individual Instagram and Website plans support replacement checkout", () => {
  assert.equal(supportsIndividualReplacementCheckout("insta"), true);
  assert.equal(supportsIndividualReplacementCheckout("web"), true);
  assert.equal(supportsIndividualReplacementCheckout("package"), false);
  assert.equal(supportsIndividualReplacementCheckout("call"), false);
});

test("known Razorpay update restrictions fall back to replacement checkout", () => {
  assert.equal(
    shouldUseIndividualReplacementCheckout({
      error: {
        description:
          "Can't update subscription when subscription is not in Authenticated or Active state",
      },
    }),
    true,
  );
  assert.equal(
    shouldUseIndividualReplacementCheckout({
      error: {
        description: "subscriptions cannot be updated when payment mode is upi",
      },
    }),
    true,
  );
  assert.equal(
    shouldUseIndividualReplacementCheckout(new Error("Plan ID is invalid")),
    false,
  );
});
