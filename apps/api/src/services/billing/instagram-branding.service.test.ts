import assert from "node:assert/strict";
import test from "node:test";
import { FREE_AGENCY_PLAN } from "@/config/platform-catalog.config";
import { shouldShowInstagramBrandingForAccess } from "./instagram-branding.service";

test("free individual Instagram automation keeps RocketReplAI branding", () => {
  assert.equal(
    shouldShowInstagramBrandingForAccess({
      agencyManaged: false,
      sourcePlanCodes: [],
      hasPaidInstagramSubscription: false,
      hasPaidInstagramPackage: false,
    }),
    true,
  );
});

test("paid individual and package Instagram automation remove branding", () => {
  assert.equal(
    shouldShowInstagramBrandingForAccess({
      agencyManaged: false,
      sourcePlanCodes: [],
      hasPaidInstagramSubscription: true,
      hasPaidInstagramPackage: false,
    }),
    false,
  );
  assert.equal(
    shouldShowInstagramBrandingForAccess({
      agencyManaged: false,
      sourcePlanCodes: [],
      hasPaidInstagramSubscription: false,
      hasPaidInstagramPackage: true,
    }),
    false,
  );
  assert.equal(
    shouldShowInstagramBrandingForAccess({
      agencyManaged: false,
      sourcePlanCodes: ["instagram-pro-monthly"],
      hasPaidInstagramSubscription: false,
      hasPaidInstagramPackage: false,
    }),
    false,
  );
});

test("agency client branding follows the agency plan", () => {
  assert.equal(
    shouldShowInstagramBrandingForAccess({
      agencyManaged: true,
      sourcePlanCodes: [FREE_AGENCY_PLAN.code],
      hasPaidInstagramSubscription: false,
      hasPaidInstagramPackage: false,
    }),
    true,
  );
  assert.equal(
    shouldShowInstagramBrandingForAccess({
      agencyManaged: true,
      sourcePlanCodes: ["partner-monthly"],
      hasPaidInstagramSubscription: false,
      hasPaidInstagramPackage: false,
    }),
    false,
  );
});
