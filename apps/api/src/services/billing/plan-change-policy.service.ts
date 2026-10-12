type ComparablePlan = {
  code: string;
  billingInterval: "monthly" | "yearly";
  price: number;
  limits?: Record<string, unknown>;
};

export type PlanChangePolicy = {
  type: "same" | "upgrade" | "downgrade" | "billing_interval_change";
  scheduleChangeAt: "now" | "cycle_end";
};

const clientCapacity = (plan: ComparablePlan) => {
  const value = Number(plan.limits?.clientWorkspaces);
  return Number.isFinite(value) ? value : 0;
};

export const getPlanChangePolicy = (
  current: ComparablePlan,
  target: ComparablePlan,
): PlanChangePolicy => {
  if (current.code === target.code) {
    return { type: "same", scheduleChangeAt: "cycle_end" };
  }

  if (current.billingInterval !== target.billingInterval) {
    return {
      type: "billing_interval_change",
      scheduleChangeAt: "cycle_end",
    };
  }

  const currentCapacity = clientCapacity(current);
  const targetCapacity = clientCapacity(target);
  if (targetCapacity > currentCapacity) {
    return { type: "upgrade", scheduleChangeAt: "now" };
  }
  if (targetCapacity < currentCapacity) {
    return { type: "downgrade", scheduleChangeAt: "cycle_end" };
  }

  return Number(target.price) > Number(current.price)
    ? { type: "upgrade", scheduleChangeAt: "now" }
    : { type: "downgrade", scheduleChangeAt: "cycle_end" };
};
