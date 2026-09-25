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
  const [catalog, setCatalog] = useState<{ plans: any[]; addons: any[] }>({ plans: [], addons: [] });
  const [interval, setInterval] = useState<"monthly" | "yearly">("monthly");
  const [busy, setBusy] = useState("");
  const [message, setMessage] = useState("");
  const load = useCallback(async () => setCatalog(await getAgencyPlans(apiRequest, agencyId)), [agencyId, apiRequest]);
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
      <div><p className="text-sm text-violet-400">Agency billing</p><h1 className="mt-1 text-3xl font-bold">Choose a plan</h1><p className="mt-2 text-slate-400">All paid access is activated by verified Razorpay webhooks.</p></div>
      <div className="mt-6 inline-flex rounded-xl border border-white/10 bg-white/5 p-1">{(["monthly", "yearly"] as const).map((value) => <button key={value} onClick={() => setInterval(value)} className={`rounded-lg px-5 py-2 text-sm capitalize ${interval === value ? "bg-violet-500" : "text-slate-400"}`}>{value}{value === "yearly" ? " · 2 months free" : ""}</button>)}</div>
      {message && <div className="mt-6 rounded-xl border border-violet-500/30 bg-violet-500/10 p-4 text-sm text-violet-200">{message}</div>}
      <div className="mt-8 grid gap-5 lg:grid-cols-3">{plans.map((plan) => {
        const limits = plan.limits || {};
        const features = plan.features || {};
        return <article key={plan.code} className="rounded-2xl border border-white/10 bg-white/5 p-6"><h2 className="text-xl font-bold">{plan.name}</h2><p className="mt-2 min-h-10 text-sm text-slate-400">{plan.description}</p><p className="mt-6 text-3xl font-bold">₹{Number(plan.price).toLocaleString("en-IN")}</p><p className="text-sm text-slate-500">per {interval === "monthly" ? "month" : "year"}</p><ul className="mt-6 space-y-3 text-sm text-slate-300">{[
          `${limits.clientWorkspaces} client workspaces`, `${limits.teamMembers} agency team members`, "1 WhatsApp account per client", "3 Instagram accounts per client", "1 website chatbot per client", `${Number(limits.aiTokens || 0).toLocaleString("en-IN")} AI tokens`, features.advancedReporting ? "Advanced reporting" : "Standard reporting", features.customBranding ? "Branding controls" : "RocketReplAI branding", features.prioritySupport ? "Priority support" : "Standard support", "AI Call Assistant — coming soon",
        ].map((item) => <li key={item} className="flex gap-2"><Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />{item}</li>)}</ul><button onClick={() => choose(plan)} disabled={busy === plan.code} className="mt-7 w-full rounded-xl bg-violet-500 px-5 py-3 font-semibold disabled:opacity-50">{busy === plan.code ? "Please wait…" : `Choose ${plan.name}`}</button></article>;
      })}</div>
      <section className="mt-10"><h2 className="text-2xl font-bold">Available add-ons</h2><p className="mt-2 text-sm text-slate-400">Add-on reductions and cancellation are scheduled for the billing-cycle end, so already-paid capacity remains available.</p><div className="mt-5 grid gap-4 sm:grid-cols-2">{catalog.addons.filter((addon) => addon.billingInterval === interval).map((addon) => <div key={addon.code} className="rounded-2xl border border-white/10 bg-white/5 p-5"><h3 className="font-semibold">{addon.name}</h3><p className="mt-2 text-lg font-bold">₹{Number(addon.price).toLocaleString("en-IN")} <span className="text-sm font-normal text-slate-500">/{interval === "monthly" ? "mo" : "yr"}</span></p></div>)}</div></section>
    </div>
  );
}
