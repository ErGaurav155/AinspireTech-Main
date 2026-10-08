import assert from "node:assert/strict";
import test from "node:test";
import {
  INDIVIDUAL_AI_ALLOWANCES,
  PACKAGE_AI_SERVICES,
} from "./individual-ai-catalog.config";

test("individual Website free allowance stays Website-only", () => {
  assert.equal(INDIVIDUAL_AI_ALLOWANCES.free.website, 10_000);
  assert.equal("instagram" in INDIVIDUAL_AI_ALLOWANCES.free, false);
  assert.equal("whatsapp" in INDIVIDUAL_AI_ALLOWANCES.free, false);
});

test("standalone subscriptions have independent service allowances", () => {
  assert.deepEqual(Object.keys(INDIVIDUAL_AI_ALLOWANCES.standalone).sort(), [
    "instagram",
    "website",
    "whatsapp",
  ]);
  assert.ok(INDIVIDUAL_AI_ALLOWANCES.standalone.website > 0);
  assert.ok(INDIVIDUAL_AI_ALLOWANCES.standalone.instagram > 0);
  assert.ok(INDIVIDUAL_AI_ALLOWANCES.standalone.whatsapp > 0);
});

test("package allowances can only be shared by included live services", () => {
  assert.deepEqual(PACKAGE_AI_SERVICES["package-starter"], [
    "website",
    "instagram",
  ]);
  assert.deepEqual(PACKAGE_AI_SERVICES["package-whatsapp"], [
    "website",
    "instagram",
    "whatsapp",
  ]);
  assert.equal(
    PACKAGE_AI_SERVICES["package-call"].includes("whatsapp"),
    false,
  );
  assert.deepEqual(PACKAGE_AI_SERVICES["package-complete"], [
    "website",
    "instagram",
    "whatsapp",
  ]);
});
