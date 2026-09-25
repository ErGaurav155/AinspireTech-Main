import assert from "node:assert/strict";
import test from "node:test";
import { calculateEntitlements } from "./entitlement-calculator";

test("additional client slot add-ons multiply and add to the base limit", () => {
  const result = calculateEntitlements(
    [{ code: "growth", features: { agencyDashboard: true }, limits: { clientWorkspaces: 20 } }],
    [{
      code: "extra-client-slots",
      features: {},
      limits: { clientWorkspaces: 5 },
      quantity: 2,
      limitOperation: "add",
    }],
  );
  assert.equal(result.limits.clientWorkspaces, 30);
  assert.equal(result.features.agencyDashboard, true);
});

test("unlimited base limits remain unlimited after add-ons", () => {
  const result = calculateEntitlements(
    [{ code: "agency", features: {}, limits: { conversations: -1 } }],
    [{ code: "more", features: {}, limits: { conversations: 1000 }, quantity: 3, limitOperation: "add" }],
  );
  assert.equal(result.limits.conversations, -1);
});

test("replacement add-ons replace a finite limit", () => {
  const result = calculateEntitlements(
    [{ code: "partner", features: {}, limits: { teamMembers: 2 } }],
    [{ code: "seat-pack", features: {}, limits: { teamMembers: 10 }, quantity: 1, limitOperation: "replace" }],
  );
  assert.equal(result.limits.teamMembers, 10);
});
