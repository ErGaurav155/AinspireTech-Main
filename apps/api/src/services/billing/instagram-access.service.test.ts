import assert from "node:assert/strict";
import test from "node:test";
import {
  buildInstagramAccess,
  INSTAGRAM_FREE_ACCOUNT_LIMIT,
  INSTAGRAM_FREE_HOURLY_API_LIMIT,
  INSTAGRAM_PAID_ACCOUNT_LIMIT,
  INSTAGRAM_PAID_HOURLY_API_LIMIT,
} from "./instagram-access.service";

test("paid Instagram access displays unlimited but enforces the 5,000 safety ceiling", () => {
  const access = buildInstagramAccess(true, "agency");
  assert.equal(access.tier, "pro");
  assert.equal(access.displayHourlyApiLimit, "Unlimited");
  assert.equal(access.hourlyApiLimit, INSTAGRAM_PAID_HOURLY_API_LIMIT);
  assert.equal(access.accountLimit, INSTAGRAM_PAID_ACCOUNT_LIMIT);
});

test("free Instagram access retains the 200-call and one-account limits", () => {
  const access = buildInstagramAccess(false, "free");
  assert.equal(access.tier, "free");
  assert.equal(access.displayHourlyApiLimit, "200");
  assert.equal(access.hourlyApiLimit, INSTAGRAM_FREE_HOURLY_API_LIMIT);
  assert.equal(access.accountLimit, INSTAGRAM_FREE_ACCOUNT_LIMIT);
});
