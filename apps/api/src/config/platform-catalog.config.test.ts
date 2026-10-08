import assert from "node:assert/strict";
import test from "node:test";
import {
  AGENCY_ADDON_CATALOG,
  AGENCY_PLAN_CATALOG,
  FREE_AGENCY_PLAN,
} from "./platform-catalog.config";

test("free agency allowance permits one limited client without payment", () => {
  assert.equal(FREE_AGENCY_PLAN.code, "agency-free");
  assert.equal(FREE_AGENCY_PLAN.limits.clientWorkspaces, 1);
  assert.equal(FREE_AGENCY_PLAN.limits.aiTokens, 100_000);
  assert.equal(FREE_AGENCY_PLAN.limits.aiTokensPerWorkspace, 100_000);
  assert.equal(FREE_AGENCY_PLAN.limits.conversations, -1);
  assert.equal(FREE_AGENCY_PLAN.features.agencyDashboard, true);
  assert.equal(FREE_AGENCY_PLAN.features.advancedReporting, false);
});

test("agency plans use the approved client-member limits without team seats", () => {
  const monthly = new Map(
    AGENCY_PLAN_CATALOG.filter(
      (item) => item.billingInterval === "monthly",
    ).map((item) => [item.name, item]),
  );
  assert.equal(monthly.get("Partner")?.limits.clientWorkspaces, 5);
  assert.equal(monthly.get("Growth Partner")?.limits.clientWorkspaces, 20);
  assert.equal(monthly.get("Agency Pro Partner")?.limits.clientWorkspaces, 50);
  assert.equal(monthly.get("Partner")?.limits.aiTokensPerWorkspace, 200_000);
  assert.equal(monthly.get("Growth Partner")?.limits.aiTokensPerWorkspace, 250_000);
  assert.equal(monthly.get("Agency Pro Partner")?.limits.aiTokensPerWorkspace, 300_000);
  for (const plan of monthly.values()) {
    assert.equal(plan.limits.teamMembers, undefined);
    assert.equal(plan.limits.conversations, -1);
  }
  assert.equal(AGENCY_ADDON_CATALOG.length, 0);
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

