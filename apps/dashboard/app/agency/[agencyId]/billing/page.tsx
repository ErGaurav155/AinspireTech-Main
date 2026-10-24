"use client";

import Script from "next/script";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Check, Trash2 } from "lucide-react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useApi } from "@/lib/useApi";
import {
  abandonAgencyPlanCheckout,
  createAgencyPlanCheckout,
  cancelAgencyPlan,
  getAgencyClients,
  getAgencyPlans,
  type AgencyBillingCatalog,
  type AgencyBillingPlan,
} from "@/lib/services/platform.api";
import {
  SubscriptionTimingDialog,
  type SubscriptionChangeTiming,
} from "@/components/shared/SubscriptionTimingDialog";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { AgencyDowngradeClientDialog } from "@/components/platform/AgencyDowngradeClientDialog";

const emptyCatalog: AgencyBillingCatalog = {
  plans: [],
  addons: [],
  currentSubscription: null,
};

const formatDate = (value?: string) => {
  if (!value) return "the end of the current billing cycle";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "the end of the current billing cycle"
    : new Intl.DateTimeFormat("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
      }).format(date);
};

const clientCapacity = (plan?: AgencyBillingPlan) =>
  Number(plan?.limits?.clientWorkspaces || 0);

export default function AgencyBillingPage() {
  const { agencyId } = useParams<{ agencyId: string }>();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { apiRequest } = useApi();
  const [catalog, setCatalog] = useState<AgencyBillingCatalog>(emptyCatalog);
  const [interval, setInterval] = useState<"monthly" | "yearly">("monthly");
  const [busy, setBusy] = useState("");
  const [message, setMessage] = useState("");
  const [promoCode, setPromoCode] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [changeTarget, setChangeTarget] = useState<AgencyBillingPlan | null>(null);
  const [clients, setClients] = useState<any[]>([]);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelBusy, setCancelBusy] = useState(false);
  const [discardingPending, setDiscardingPending] = useState(false);
  const [downgradeSelection, setDowngradeSelection] = useState<{
    plan: AgencyBillingPlan;
    timing: SubscriptionChangeTiming;
  } | null>(null);

  const refreshCatalog = useCallback(async () => {
    const next = await getAgencyPlans(apiRequest, agencyId);
    setCatalog(next);
    return next;
  }, [agencyId, apiRequest]);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError("");
    try {
      const [, agencyClients] = await Promise.all([
        refreshCatalog(),
        getAgencyClients(apiRequest, agencyId),
      ]);
      setClients(agencyClients);
    } catch (value: any) {
      setLoadError(value.message || "Unable to load agency plans");
    } finally {
      setLoading(false);
    }
  }, [agencyId, apiRequest, refreshCatalog]);

  useEffect(() => void load(), [load]);

  const plans = useMemo(
    () => catalog.plans.filter((plan) => plan.billingInterval === interval),
    [catalog.plans, interval],
  );
  const subscription = catalog.currentSubscription;
  const currentPlan = useMemo(
    () => catalog.plans.find((plan) => plan.code === subscription?.planCode),
    [catalog.plans, subscription?.planCode],
  );
  const pendingPlan = useMemo(
    () =>
      catalog.plans.find(
        (plan) => plan.code === subscription?.pendingChange?.planCode,
      ),
    [catalog.plans, subscription?.pendingChange?.planCode],
  );

  const waitForActivation = useCallback(
    async (planCode: string) => {
      for (let attempt = 0; attempt < 15; attempt += 1) {
        const next = await refreshCatalog();
        if (
          next.currentSubscription?.status === "active" &&
          next.currentSubscription.planCode === planCode
        ) {
          return true;
        }
        await new Promise((resolve) => setTimeout(resolve, 2000));
      }
      return false;
    },
    [refreshCatalog],
  );

  const discardPendingCheckout = useCallback(
    async (localSubscriptionId: string) => {
      setDiscardingPending(true);
      try {
        await abandonAgencyPlanCheckout(
          apiRequest,
          agencyId,
          localSubscriptionId,
        );
        await refreshCatalog();
        setMessage(
          "The unapproved plan checkout was discarded. Your current plan is unchanged, and you can choose another plan.",
        );
      } catch (value: any) {
        setMessage(value.message || "Unable to discard the pending checkout");
      } finally {
        setDiscardingPending(false);
      }
    },
    [agencyId, apiRequest, refreshCatalog],
  );

  useEffect(() => {
    if (
      searchParams.get("razorpay_checkout") !== "1" ||
      searchParams.get("checkoutKind") !== "agency"
    )
      return;
    const planCode = searchParams.get("productId") || "";
    const timing = searchParams.get("scheduleChangeAt");
    const paymentId = searchParams.get("razorpay_payment_id");
    const signature = searchParams.get("razorpay_signature");
    const localSubscriptionId = searchParams.get("localSubscriptionId");
    const finish = async () => {
      if (!paymentId || !signature) {
        if (localSubscriptionId) {
          await discardPendingCheckout(localSubscriptionId);
        } else {
          setMessage("Payment was not completed. Your current plan is unchanged.");
        }
      } else if (timing === "cycle_end") {
        await refreshCatalog().catch(() => undefined);
        setMessage(
          "New plan mandate authorized. The plan change will apply at the end of the current billing cycle.",
        );
      } else if (planCode) {
        setMessage("Payment received. Confirming your plan with Razorpay…");
        const activated = await waitForActivation(planCode).catch(() => false);
        setMessage(
          activated
            ? "Your new agency plan is active."
            : "Payment was received. Razorpay confirmation is still processing; refresh in a moment.",
        );
      }
      router.replace(`/agency/${agencyId}/billing`, { scroll: false });
    };
    void finish();
  }, [
    agencyId,
    discardPendingCheckout,
    refreshCatalog,
    router,
    searchParams,
    waitForActivation,
  ]);

  const choose = async (
    plan: AgencyBillingPlan,
    scheduleChangeAt?: SubscriptionChangeTiming,
    retainedWorkspaceIds?: string[],
  ) => {
    if (subscription?.planCode === plan.code) return;
    if (subscription && !scheduleChangeAt) {
      setChangeTarget(plan);
      return;
    }

    setBusy(plan.code);
    setMessage("");
    let replacementCheckoutId = "";
    try {
      const checkout = await createAgencyPlanCheckout(
        apiRequest,
        agencyId,
        plan.code,
        scheduleChangeAt,
        retainedWorkspaceIds,
        promoCode,
      );
      replacementCheckoutId = checkout.replacementCheckout
        ? String(checkout.localSubscriptionId || "")
        : "";
      if (checkout.status === "pending_provider_confirmation") {
        await refreshCatalog();
        setMessage(
          checkout.scheduleChangeAt === "cycle_end"
            ? `Plan change scheduled for ${formatDate(checkout.effectiveAt)}. Your current plan remains active until then.`
            : "Immediate plan change requested. Access will update after Razorpay confirms it.",
        );
        return;
      }
      if (!(window as any).Razorpay) {
        throw new Error("Razorpay checkout is still loading");
      }
      const apiUrl = process.env.NEXT_PUBLIC_API_URL;
      if (!apiUrl) throw new Error("NEXT_PUBLIC_API_URL is required for checkout");
      const callbackUrl = new URL("/api/razorpay/checkout-callback", apiUrl);
      callbackUrl.searchParams.set(
        "returnTo",
        `${window.location.origin}/agency/${agencyId}/billing`,
      );
      callbackUrl.searchParams.set("kind", "agency");
      callbackUrl.searchParams.set("subscriptionId", checkout.subscriptionId);
      callbackUrl.searchParams.set("productId", plan.code);
      if (checkout.scheduleChangeAt) {
        callbackUrl.searchParams.set(
          "scheduleChangeAt",
          checkout.scheduleChangeAt,
        );
      }
      if (checkout.replacementCheckout && checkout.localSubscriptionId) {
        callbackUrl.searchParams.set(
          "localSubscriptionId",
          checkout.localSubscriptionId,
        );
      }
      const mobileCheckout =
        /Android|iPhone|iPad|iPod|IEMobile|Opera Mini/i.test(
          navigator.userAgent,
        );
      let checkoutCompleted = false;
      let abandonmentStarted = false;
      const abandonReplacement = async () => {
        if (
          checkoutCompleted ||
          abandonmentStarted ||
          !checkout.replacementCheckout ||
          !checkout.localSubscriptionId
        ) {
          return;
        }
        abandonmentStarted = true;
        await discardPendingCheckout(checkout.localSubscriptionId);
      };
      const instance = new (window as any).Razorpay({
        key: checkout.keyId,
        subscription_id: checkout.subscriptionId,
        name: "RocketReplAI",
        description: `${plan.name} agency plan`,
        ...(mobileCheckout
          ? { callback_url: callbackUrl.toString(), redirect: true }
          : {}),
        handler: async () => {
          checkoutCompleted = true;
          if (
            checkout.replacementCheckout &&
            checkout.scheduleChangeAt === "cycle_end"
          ) {
            setMessage(
              `New plan mandate authorized. ${plan.name} will start ${formatDate(checkout.effectiveAt)} and your current plan remains active until then.`,
            );
            await refreshCatalog().catch(() => undefined);
            return;
          }
          setMessage("Payment received. Confirming your plan with Razorpay…");
          try {
            const activated = await waitForActivation(plan.code);
            setMessage(
              activated
                ? `${plan.name} is now your active plan.`
                : "Payment was received. Razorpay confirmation is still processing; the plan will appear automatically shortly.",
            );
          } catch {
            setMessage(
              "Payment was received. Razorpay confirmation is still processing; refresh in a moment.",
            );
          }
        },
        modal: {
          ondismiss: () => void abandonReplacement(),
        },
        theme: { color: "#8b5cf6" },
      });
      instance.on("payment.failed", () => {
        setMessage("Payment failed. No paid access was granted.");
        void abandonReplacement();
      });
      instance.open();
    } catch (value: any) {
      if (replacementCheckoutId) {
        await discardPendingCheckout(replacementCheckoutId);
      } else {
        setMessage(value.message || "Unable to start checkout");
      }
    } finally {
      setBusy("");
    }
  };

  const cancelCurrentPlan = async () => {
    setCancelBusy(true);
    setMessage("");
    try {
      const result = await cancelAgencyPlan(apiRequest, agencyId);
      await refreshCatalog();
      setCancelOpen(false);
      setMessage(
        `Cancellation scheduled for ${formatDate(result.effectiveAt)}. Your current access remains available until then; client deletion starts only after Razorpay confirms the final cancellation.`,
      );
    } catch (value: any) {
      setMessage(value.message || "Unable to cancel the agency plan");
    } finally {
      setCancelBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-6xl">
      <Script
        src="https://checkout.razorpay.com/v1/checkout.js"
        strategy="afterInteractive"
      />

      <div>
        <p className="text-sm text-violet-500 dark:text-violet-400">
          Agency billing
        </p>
        <h1 className="mt-1 text-3xl font-bold">Plans and billing</h1>
        <p className="mt-2 text-slate-500 dark:text-slate-400">
          Choose whether an upgrade, downgrade, or billing-cycle change happens
          immediately or at the end of the current period.
        </p>
      </div>

      {subscription && (
        <section className="mt-6 rounded-2xl border border-violet-200 bg-violet-50 p-5 dark:border-violet-500/30 dark:bg-violet-500/10">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-violet-600 dark:text-violet-300">
                Current plan
              </p>
              <h2 className="mt-1 text-xl font-bold">
                {currentPlan?.name || subscription.planCode}
              </h2>
              <p className="mt-1 text-sm capitalize text-slate-600 dark:text-slate-300">
                {subscription.billingInterval} · {subscription.status.replace("_", " ")}
                {subscription.currentPeriodEnd
                  ? ` · Current period ends ${formatDate(subscription.currentPeriodEnd)}`
                  : ""}
              </p>
            </div>
            <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold capitalize text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300">
              {subscription.status}
            </span>
          </div>
          {subscription.pendingChange && (
            <div className="mt-4 rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-100">
              <p>
                {subscription.pendingChange.requiresCheckout
                  ? `Checkout for ${pendingPlan?.name || subscription.pendingChange.planCode} has not been approved. Continue it or discard it; your current plan is unchanged.`
                  : `Change to ${pendingPlan?.name || subscription.pendingChange.planCode} is pending${
                      subscription.pendingChange.effectiveAt
                        ? ` for ${formatDate(subscription.pendingChange.effectiveAt)}`
                        : " provider confirmation"
                    }. Another change cannot be requested until it is applied.`}
              </p>
              {subscription.pendingChange.requiresCheckout &&
                subscription.pendingChange.pendingCheckoutId && (
                  <button
                    type="button"
                    disabled={discardingPending}
                    onClick={() =>
                      void discardPendingCheckout(
                        subscription.pendingChange!.pendingCheckoutId!,
                      )
                    }
                    className="mt-3 rounded-lg border border-amber-500/40 px-3 py-1.5 text-xs font-semibold transition hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-60 dark:hover:bg-amber-500/20"
                  >
                    {discardingPending
                      ? "Discarding checkout…"
                      : "Discard pending checkout"}
                  </button>
                )}
            </div>
          )}
          {subscription.cancelAtPeriodEnd && (
            <div className="mt-4 rounded-xl border border-red-300 bg-red-50 p-3 text-sm text-red-900 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-100">
              Cancellation is scheduled for {formatDate(subscription.currentPeriodEnd)}. Client access and data remain available until Razorpay confirms the cancellation at period end.
            </div>
          )}
          <button
            type="button"
            onClick={() => setCancelOpen(true)}
            disabled={
              Boolean(subscription.pendingChange) ||
              Boolean(subscription.cancelAtPeriodEnd) ||
              cancelBusy
            }
            className="mt-4 inline-flex items-center rounded-xl border border-red-300 px-4 py-2 text-sm font-semibold text-red-700 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-red-500/40 dark:text-red-300 dark:hover:bg-red-500/10"
          >
            <Trash2 className="mr-2 h-4 w-4" />
            {subscription.cancelAtPeriodEnd
              ? "Cancellation scheduled"
              : "Cancel plan"}
          </button>
        </section>
      )}

      <div className="mt-6 inline-flex rounded-xl border border-slate-200 bg-white p-1 dark:border-white/10 dark:bg-white/5">
        {(["monthly", "yearly"] as const).map((value) => (
          <button
            key={value}
            onClick={() => setInterval(value)}
            className={`rounded-lg px-5 py-2 text-sm capitalize ${
              interval === value
                ? "bg-violet-500 text-white"
                : "text-slate-500 dark:text-slate-400"
            }`}
          >
            {value}
            {value === "yearly" ? " · 2 months free" : ""}
          </button>
        ))}
      </div>

      <div className="mt-4 max-w-md rounded-2xl border border-slate-200 bg-white p-4 dark:border-white/10 dark:bg-white/5">
        <label htmlFor="agency-promo-code" className="text-sm font-semibold">
          Coupon code
        </label>
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
          The discount and number of discounted billing cycles are configured in the linked Razorpay Offer.
        </p>
        <input
          id="agency-promo-code"
          value={promoCode}
          onChange={(event) => setPromoCode(event.target.value.toUpperCase())}
          maxLength={40}
          placeholder="Enter coupon (optional)"
          className="mt-3 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm uppercase outline-none focus:border-violet-500 dark:border-white/10 dark:bg-slate-900"
        />
      </div>

      {message && (
        <div className="mt-6 rounded-xl border border-violet-500/30 bg-violet-50 p-4 text-sm text-violet-800 dark:bg-violet-500/10 dark:text-violet-200">
          {message}
        </div>
      )}
      {loading && (
        <div className="mt-8 rounded-2xl border border-slate-200 bg-white p-8 text-center text-slate-500 dark:border-white/10 dark:bg-white/5 dark:text-slate-400">
          Loading agency plans…
        </div>
      )}
      {!loading && loadError && (
        <div className="mt-8 rounded-2xl border border-red-200 bg-red-50 p-6 text-red-800 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-200">
          <p className="font-semibold">Agency plans could not be loaded.</p>
          <p className="mt-1 text-sm">{loadError}</p>
          <button
            type="button"
            onClick={() => void load()}
            className="mt-4 rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white"
          >
            Try again
          </button>
        </div>
      )}
      {!loading && !loadError && plans.length === 0 && (
        <div className="mt-8 rounded-2xl border border-amber-200 bg-amber-50 p-6 text-amber-900 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-100">
          <p className="font-semibold">No {interval} agency plans are published.</p>
          <p className="mt-1 text-sm">
            The server catalog is empty or has not finished synchronizing yet.
          </p>
          <button
            type="button"
            onClick={() => void load()}
            className="mt-4 rounded-xl bg-amber-600 px-4 py-2 text-sm font-semibold text-white"
          >
            Refresh plans
          </button>
        </div>
      )}

      {!loading && !loadError && (
        <div className="mt-8 grid gap-5 lg:grid-cols-3">
          {plans.map((plan) => {
            const limits = plan.limits || {};
            const features = plan.features || {};
            const isCurrent = subscription?.planCode === plan.code;
            const isPendingTarget =
              subscription?.pendingChange?.planCode === plan.code;
            const canResumePendingCheckout = Boolean(
              isPendingTarget && subscription?.pendingChange?.requiresCheckout,
            );
            const hasPendingChange = Boolean(subscription?.pendingChange);
            const unresolvedPayment = subscription?.status === "pending";
            const intervalChange =
              Boolean(currentPlan) &&
              currentPlan?.billingInterval !== plan.billingInterval;
            const upgrade =
              !intervalChange &&
              clientCapacity(plan) > clientCapacity(currentPlan);
            const disabled =
              isCurrent ||
              (isPendingTarget && !canResumePendingCheckout) ||
              (hasPendingChange && !canResumePendingCheckout) ||
              Boolean(subscription?.cancelAtPeriodEnd) ||
              unresolvedPayment ||
              busy === plan.code;
            const buttonLabel = isCurrent
              ? subscription?.status === "pending"
                ? "Payment pending"
                : "Current plan"
              : isPendingTarget
                ? canResumePendingCheckout
                  ? "Continue plan checkout"
                  : "Change pending"
                : hasPendingChange
                  ? "Another change is pending"
                  : busy === plan.code
                    ? "Please wait…"
                    : !subscription
                      ? `Choose ${plan.name}`
                      : intervalChange
                        ? "Change billing interval"
                        : upgrade
                          ? "Upgrade plan"
                          : "Downgrade plan";

            return (
              <article
                key={plan.code}
                className={`rounded-2xl border bg-white p-6 shadow-sm dark:bg-white/5 dark:shadow-none ${
                  isCurrent
                    ? "border-violet-500 ring-2 ring-violet-500/20 dark:border-violet-400"
                    : "border-slate-200 dark:border-white/10"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <h2 className="text-xl font-bold">{plan.name}</h2>
                  {isCurrent && (
                    <span className="rounded-full bg-violet-100 px-2.5 py-1 text-xs font-semibold text-violet-700 dark:bg-violet-500/20 dark:text-violet-300">
                      Current
                    </span>
                  )}
                </div>
                <p className="mt-2 min-h-10 text-sm text-slate-500 dark:text-slate-400">
                  {plan.description}
                </p>
                <p className="mt-6 text-3xl font-bold">
                  ₹{Number(plan.price).toLocaleString("en-IN")}
                </p>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  per {interval === "monthly" ? "month" : "year"}
                </p>
                <ul className="mt-6 space-y-3 text-sm text-slate-700 dark:text-slate-300">
                  {[
                    `${limits.clientWorkspaces} client members (one per workspace)`,
                    "1 agency owner account",
                    "1 WhatsApp account per client",
                    "3 Instagram accounts per client",
                    "1 website chatbot per client",
                    `${Number(limits.aiTokensPerWorkspace || 0).toLocaleString("en-IN")} shared AI tokens per client each month`,
                    `${Number(limits.aiTokens || 0).toLocaleString("en-IN")} total agency AI tokens`,
                    "One shared balance across Website, Instagram and WhatsApp",
                    "Unlimited conversations while AI tokens remain",
                    features.advancedReporting
                      ? "Advanced reporting"
                      : "Standard reporting",
                    features.customBranding
                      ? "Branding controls"
                      : "RocketReplAI branding",
                    features.prioritySupport
                      ? "Priority support"
                      : "Standard support",
                    "AI Call Assistant — coming soon",
                  ].map((item) => (
                    <li key={item} className="flex gap-2">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500 dark:text-emerald-400" />
                      {item}
                    </li>
                  ))}
                </ul>
                <button
                  onClick={() => void choose(plan)}
                  disabled={disabled}
                  className={`mt-7 w-full rounded-xl px-5 py-3 font-semibold transition disabled:cursor-not-allowed ${
                    isCurrent
                      ? "bg-slate-200 text-slate-500 dark:bg-white/10 dark:text-slate-400"
                      : "bg-violet-500 text-white hover:bg-violet-600 disabled:opacity-50"
                  }`}
                >
                  {buttonLabel}
                </button>
              </article>
            );
          })}
        </div>
      )}
      <SubscriptionTimingDialog
        open={Boolean(changeTarget && currentPlan)}
        currentName={currentPlan?.name || "Current plan"}
        targetName={changeTarget?.name || "New plan"}
        periodEnd={subscription?.currentPeriodEnd}
        busy={Boolean(changeTarget && busy === changeTarget.code)}
        onClose={() => setChangeTarget(null)}
        onConfirm={(timing) => {
          if (!changeTarget) return;
          const target = changeTarget;
          setChangeTarget(null);
          const targetLimit = clientCapacity(target);
          const activeClients = clients.filter(
            (client) => client.workspace?._id || client.relationship?.workspaceId,
          );
          const reducesClientCapacity =
            targetLimit >= 0 && targetLimit < clientCapacity(currentPlan);
          if (reducesClientCapacity && activeClients.length > targetLimit) {
            setDowngradeSelection({ plan: target, timing });
            return;
          }
          void choose(target, timing);
        }}
      />
      {downgradeSelection && currentPlan && (
        <AgencyDowngradeClientDialog
          open
          clients={clients}
          currentPlan={currentPlan}
          targetPlan={downgradeSelection.plan}
          targetLimit={clientCapacity(downgradeSelection.plan)}
          timing={downgradeSelection.timing}
          busy={busy === downgradeSelection.plan.code}
          onClose={() => setDowngradeSelection(null)}
          onConfirm={(retainedWorkspaceIds) => {
            const request = downgradeSelection;
            setDowngradeSelection(null);
            void choose(request.plan, request.timing, retainedWorkspaceIds);
          }}
        />
      )}
      <ConfirmDialog
        open={cancelOpen}
        onOpenChange={setCancelOpen}
        onConfirm={() => void cancelCurrentPlan()}
        title="Cancel your agency plan?"
        description={`Cancellation is scheduled for ${formatDate(subscription?.currentPeriodEnd)}. Paid access remains active until then. After Razorpay confirms the final cancellation, the cleanup is permanent.`}
        confirmText="Cancel at period end"
        isDestructive
        isLoading={cancelBusy}
        acknowledgements={[
          {
            id: "cancel-client-access",
            label:
              "I understand every client member will lose access when the plan ends.",
          },
          {
            id: "cancel-organizations",
            label:
              "I understand all client Clerk organizations and invitations will be removed.",
          },
          {
            id: "cancel-automation-data",
            label:
              "I understand all client WhatsApp, Instagram, chatbot, leads, appointments, conversations, integrations, and setup data will be deleted.",
          },
          {
            id: "cancel-irreversible",
            label: "I understand this deletion cannot be undone after cancellation takes effect.",
          },
        ]}
      />
    </div>
  );
}
