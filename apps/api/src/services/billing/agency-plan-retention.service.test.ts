import assert from "node:assert/strict";
import test from "node:test";
import { selectAgencyWorkspaceIdsForRemoval } from "./agency-plan-retention-policy.service";

test("upgrade or in-limit changes never remove existing clients", () => {
  assert.deepEqual(
    selectAgencyWorkspaceIdsForRemoval({
      activeWorkspaceIds: ["a", "b", "c"],
      retainedWorkspaceIds: [],
      targetLimit: 5,
    }),
    [],
  );
});

test("downgrade removes only clients not selected for retention", () => {
  assert.deepEqual(
    selectAgencyWorkspaceIdsForRemoval({
      activeWorkspaceIds: ["a", "b", "c", "d"],
      retainedWorkspaceIds: ["d", "b"],
      targetLimit: 2,
    }),
    ["a", "c"],
  );
});

test("stale retained clients are replaced with available clients without exceeding the limit", () => {
  assert.deepEqual(
    selectAgencyWorkspaceIdsForRemoval({
      activeWorkspaceIds: ["a", "b", "c"],
      retainedWorkspaceIds: ["removed", "c"],
      targetLimit: 2,
    }),
    ["b"],
  );
});
