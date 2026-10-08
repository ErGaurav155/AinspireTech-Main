"use client";

import Script from "next/script";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Check } from "lucide-react";
import { useParams } from "next/navigation";
import { useApi } from "@/lib/useApi";
import { createAgencyPlanCheckout, getAgencyPlans } from "@/lib/services/platform.api";

export default function AgencyBillingPage() {
  const { agencyId } = useParams<{ agencyId: string }>();
  const { apiRequest } = useApi();
  const [catalog, setCatalog] = useState<{ plans: any[] }>({ plans: [] });
  const [interval, setInterval] = useState<"monthly" | "yearly">("monthly");
  const [busy, setBusy] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const load = useCallback(async () => {
    setLoading(true);
    setLoadError("");
    try {
      setCatalog(await getAgencyPlans(apiRequest, agencyId));
    } catch (value: any) {
      setLoadError(value.message || "Unable to load agency plans");
    } finally {
      setLoading(false);
    }
  }, [agencyId, apiRequest]);
  useEffect(() => void load(), [load]);
  const plans = useMemo(() => catalog.plans.filter((plan) => plan.billingInterval === interval), [catalog, interval]);

  const choose = async (plan: any) => {
    setBusy(plan.code); setMessage("");
    try {
      const checkout = await createAgencyPlanCheckout(apiRequest, agencyId, plan.code);
      if (checkout.status === "pending_provider_confirmation") {
        setMessage("Plan change requested. Access changes only after Razorpay confirms it.");
        return;
      }
      if (!(window as any).Razorpay) throw new Error("Razorpay checkout is still loading");
      const instance = new (window as any).Razorpay({
        key: checkout.keyId,
        subscription_id: checkout.subscriptionId,
        name: "RocketReplAI",
        description: `${plan.name} agency plan`,
        handler: () => setMessage("Payment received. Your plan will activate after secure webhook confirmation."),
        theme: { color: "#8b5cf6" },
      });
      instance.on("payment.failed", () => setMessage("Payment failed. No paid access was granted."));
      instance.open();
    } catch (value: any) {
      setMessage(value.message || "Unable to start checkout");
    } finally { setBusy(""); }
  };

  return (
    <div className="mx-auto max-w-6xl">
      <Script src="https://checkout.razorpay.com/v1/checkout.js" strategy="afterInteractive" />
      <div><p className="text-sm text-violet-500 dark:text-violet-400">Agency billing</p><h1 className="mt-1 text-3xl font-bold">Choose a plan</h1><p className="mt-2 text-slate-500 dark:text-slate-400">All paid access is activated by verified Razorpay webhooks.</p></div>
      <div className="mt-6 inline-flex rounded-xl border border-slate-200 bg-white p-1 dark:border-white/10 dark:bg-white/5">{(["monthly", "yearly"] as const).map((value) => <button key={value} onClick={() => setInterval(value)} className={`rounded-lg px-5 py-2 text-sm capitalize ${interval === value ? "bg-violet-500 text-white" : "text-slate-500 dark:text-slate-400"}`}>{value}{value === "yearly" ? " · 2 months free" : ""}</button>)}</div>
      {message && <div className="mt-6 rounded-xl border border-violet-500/30 bg-violet-50 p-4 text-sm text-violet-800 dark:bg-violet-500/10 dark:text-violet-200">{message}</div>}
      {loading && <div className="mt-8 rounded-2xl border border-slate-200 bg-white p-8 text-center text-slate-500 dark:border-white/10 dark:bg-white/5 dark:text-slate-400">Loading agency plans…</div>}
      {!loading && loadError && <div className="mt-8 rounded-2xl border border-red-200 bg-red-50 p-6 text-red-800 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-200"><p className="font-semibold">Agency plans could not be loaded.</p><p className="mt-1 text-sm">{loadError}</p><button type="button" onClick={() => void load()} className="mt-4 rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white">Try again</button></div>}
      {!loading && !loadError && plans.length === 0 && <div className="mt-8 rounded-2xl border border-amber-200 bg-amber-50 p-6 text-amber-900 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-100"><p className="font-semibold">No {interval} agency plans are published.</p><p className="mt-1 text-sm">The server catalog is empty or has not finished synchronizing yet.</p><button type="button" onClick={() => void load()} className="mt-4 rounded-xl bg-amber-600 px-4 py-2 text-sm font-semibold text-white">Refresh plans</button></div>}
      {!loading && !loadError && <div className="mt-8 grid gap-5 lg:grid-cols-3">{plans.map((plan) => {
        const limits = plan.limits || {};
        const features = plan.features || {};
        return <article key={plan.code} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-white/5 dark:shadow-none"><h2 className="text-xl font-bold">{plan.name}</h2><p className="mt-2 min-h-10 text-sm text-slate-500 dark:text-slate-400">{plan.description}</p><p className="mt-6 text-3xl font-bold">₹{Number(plan.price).toLocaleString("en-IN")}</p><p className="text-sm text-slate-500 dark:text-slate-400">per {interval === "monthly" ? "month" : "year"}</p><ul className="mt-6 space-y-3 text-sm text-slate-700 dark:text-slate-300">{[
          `${limits.clientWorkspaces} client members (one per workspace)`, "1 agency owner account", "1 WhatsApp account per client", "3 Instagram accounts per client", "1 website chatbot per client", `${Number(limits.aiTokensPerWorkspace || 0).toLocaleString("en-IN")} AI tokens per client each month`, `${Number(limits.aiTokens || 0).toLocaleString("en-IN")} total agency AI tokens`, "Unlimited conversations while AI tokens remain", features.advancedReporting ? "Advanced reporting" : "Standard reporting", features.customBranding ? "Branding controls" : "RocketReplAI branding", features.prioritySupport ? "Priority support" : "Standard support", "AI Call Assistant — coming soon",
        ].map((item) => <li key={item} className="flex gap-2"><Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500 dark:text-emerald-400" />{item}</li>)}</ul><button onClick={() => choose(plan)} disabled={busy === plan.code} className="mt-7 w-full rounded-xl bg-violet-500 px-5 py-3 font-semibold text-white disabled:opacity-50">{busy === plan.code ? "Please wait…" : `Choose ${plan.name}`}</button></article>;
      })}</div>}
    </div>
  );
}
