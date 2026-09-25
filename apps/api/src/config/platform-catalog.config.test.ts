import assert from "node:assert/strict";
import test from "node:test";
import {
  AGENCY_ADDON_CATALOG,
  AGENCY_PLAN_CATALOG,
} from "./platform-catalog.config";

test("agency plans use the approved workspace and team limits", () => {
  const monthly = new Map(
    AGENCY_PLAN_CATALOG
      .filter((item) => item.billingInterval === "monthly")
      .map((item) => [item.name, item]),
  );
  assert.equal(monthly.get("Partner")?.limits.clientWorkspaces, 5);
  assert.equal(monthly.get("Growth Partner")?.limits.clientWorkspaces, 20);
  assert.equal(monthly.get("Agency")?.limits.clientWorkspaces, 50);
  assert.equal(monthly.get("Agency")?.limits.teamMembers, 10);
});

test("per-client service limits and call preview are consistent", () => {
  for (const plan of AGENCY_PLAN_CATALOG) {
    assert.equal(plan.limits.instagramAccountsPerWorkspace, 3);
    assert.equal(plan.limits.whatsappAccountsPerWorkspace, 1);
    assert.equal(plan.limits.websiteChatbotsPerWorkspace, 1);
    assert.equal(plan.features.callAssistant, false);
    assert.equal(plan.features.callAssistantPreview, true);
  }
});

test("extra client slots also add dependent product capacity", () => {
  const addon = AGENCY_ADDON_CATALOG.find((item) => item.code === "extra-client-slots");
  assert.equal(addon?.limits.clientWorkspaces, 5);
  assert.equal(addon?.limits.instagramAccounts, 15);
  assert.equal(addon?.limits.whatsappAccounts, 5);
  assert.equal(addon?.limits.websiteChatbots, 5);
});
