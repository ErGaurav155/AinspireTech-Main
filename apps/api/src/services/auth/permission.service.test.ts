import assert from "node:assert/strict";
import test from "node:test";
import { getEffectivePermissions, hasPermission } from "./permission.service";

test("client members cannot access agency billing", () => {
  const permissions = getEffectivePermissions({ role: "CLIENT_MEMBER" });
  assert.equal(hasPermission(permissions, "agency.billing.manage"), false);
  assert.equal(hasPermission(permissions, "conversations.view"), true);
});

test("agency staff do not inherit destructive or billing permissions", () => {
  const permissions = getEffectivePermissions({ role: "AGENCY_STAFF" });
  assert.equal(hasPermission(permissions, "agency.billing.manage"), false);
  assert.equal(hasPermission(permissions, "clients.archive"), false);
  assert.equal(hasPermission(permissions, "clients.view"), true);
});

test("explicit denies override role defaults and grants", () => {
  const permissions = getEffectivePermissions({
    role: "AGENCY_ADMIN",
    granted: ["agency.billing.manage"],
    denied: ["agency.billing.manage", "clients.create"],
  });
  assert.equal(hasPermission(permissions, "agency.billing.manage"), false);
  assert.equal(hasPermission(permissions, "clients.create"), false);
});
