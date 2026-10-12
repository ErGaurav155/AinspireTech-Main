import assert from "node:assert/strict";
import test from "node:test";
import { getPlanChangePolicy } from "./plan-change-policy.service";

const plan = (
  code: string,
  clientWorkspaces: number,
  billingInterval: "monthly" | "yearly" = "monthly",
  price = clientWorkspaces * 1000,
) => ({ code, billingInterval, price, limits: { clientWorkspaces } });

test("same plan cannot create another subscription", () => {
  assert.deepEqual(
    getPlanChangePolicy(plan("partner-monthly", 5), plan("partner-monthly", 5)),
    { type: "same", scheduleChangeAt: "cycle_end" },
  );
});

test("higher agency tier upgrades immediately", () => {
  assert.deepEqual(
    getPlanChangePolicy(plan("partner-monthly", 5), plan("growth-monthly", 20)),
    { type: "upgrade", scheduleChangeAt: "now" },
  );
});

test("lower agency tier downgrades at cycle end", () => {
  assert.deepEqual(
    getPlanChangePolicy(plan("growth-monthly", 20), plan("partner-monthly", 5)),
    { type: "downgrade", scheduleChangeAt: "cycle_end" },
  );
});

test("billing interval changes at cycle end", () => {
  assert.deepEqual(
    getPlanChangePolicy(
      plan("partner-monthly", 5),
      plan("partner-yearly", 5, "yearly", 99990),
    ),
    { type: "billing_interval_change", scheduleChangeAt: "cycle_end" },
  );
});
