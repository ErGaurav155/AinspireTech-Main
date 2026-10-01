"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Activity, Building2, CalendarCheck, CreditCard, MessageCircle, Plus, Target, Users, Zap } from "lucide-react";
import { useParams } from "next/navigation";
import { useApi } from "@/lib/useApi";
import { getAgency, getAgencyAnalytics, getAgencyClients } from "@/lib/services/platform.api";

export default function AgencyOverviewPage() {
  const { agencyId } = useParams<{ agencyId: string }>();
  const { apiRequest } = useApi();
  const [agency, setAgency] = useState<any>(null);
  const [clients, setClients] = useState<any[]>([]);
  const [analytics, setAnalytics] = useState<any>(null);
  const [days, setDays] = useState(30);
  const [error, setError] = useState("");

  const loadCore = useCallback(async () => {
    try {
      const [agencyData, clientData] = await Promise.all([getAgency(apiRequest, agencyId), getAgencyClients(apiRequest, agencyId)]);
      setAgency(agencyData); setClients(clientData);
    } catch (value: any) { setError(value.message || "Unable to load agency"); }
  }, [agencyId, apiRequest]);
  const loadAnalytics = useCallback(async () => {
    try { setAnalytics(await getAgencyAnalytics(apiRequest, agencyId, days)); }
    catch (value: any) { setError(value.message || "Unable to load analytics"); }
  }, [agencyId, apiRequest, days]);
  useEffect(() => void loadCore(), [loadCore]);
  useEffect(() => void loadAnalytics(), [loadAnalytics]);

  const limit = agency?.entitlements?.limits?.clientWorkspaces || 0;
  const planCode = agency?.entitlements?.sourcePlanCodes?.[0] || "agency-free";
  const isFree = planCode === "agency-free";
  const planName = isFree ? "Free Agency" : planCode.replace(/-(monthly|yearly)$/, "").replaceAll("-", " ");
  const totals = analytics?.totals || {};
  const metricCards = [
    { label: "Tracked AI tokens", value: Number(totals.tokens || 0).toLocaleString("en-IN"), icon: Zap },
    { label: "Leads captured", value: Number(totals.leads || 0).toLocaleString("en-IN"), icon: Target },
    { label: "Conversations", value: Number(totals.conversations || 0).toLocaleString("en-IN"), icon: MessageCircle },
    { label: "Appointments", value: Number(totals.appointments || 0).toLocaleString("en-IN"), icon: CalendarCheck },
    { label: "Booking rate", value: `${totals.bookingRate || 0}%`, icon: Activity },
  ];

  return (
    <div className="mx-auto max-w-7xl">
      <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-center">
        <div><p className="text-sm text-violet-500 dark:text-violet-400">Agency overview</p><h1 className="mt-1 text-3xl font-bold">{agency?.agency?.name || "Loading…"}</h1></div>
        <Link href={`/agency/${agencyId}/clients/add`} className="inline-flex items-center justify-center gap-2 rounded-xl bg-violet-500 px-5 py-3 font-semibold text-white"><Plus className="h-4 w-4" /> Add client</Link>
      </div>
      {error && <div className="mt-6 rounded-xl border border-red-500/30 bg-red-50 p-4 text-sm text-red-700 dark:bg-red-500/10 dark:text-red-300">{error}</div>}
      <div className="mt-8 grid gap-4 sm:grid-cols-3">
        {[{ label: "Client workspaces", value: `${clients.length} / ${limit || "—"}`, icon: Building2 }, { label: "Agency team limit", value: agency?.entitlements?.limits?.teamMembers || "—", icon: Users }, { label: "Current plan", value: planName, icon: CreditCard }].map(({ label, value, icon: Icon }) => <div key={label} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-white/5 dark:shadow-none"><Icon className="h-5 w-5 text-violet-500 dark:text-violet-400" /><p className="mt-5 text-2xl font-bold capitalize">{value}</p><p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{label}</p></div>)}
      </div>
      {isFree && <div className="mt-8 flex flex-col justify-between gap-4 rounded-2xl border border-violet-300 bg-violet-50 p-6 dark:border-violet-500/30 dark:bg-violet-500/10 sm:flex-row sm:items-center"><div><h2 className="font-semibold text-violet-900 dark:text-violet-100">Your first client is included free</h2><p className="mt-1 text-sm text-slate-600 dark:text-slate-300">Upgrade only when you need client number two or more usage capacity.</p></div><Link className="shrink-0 rounded-xl bg-violet-500 px-4 py-2 text-center text-sm font-semibold text-white" href={`/agency/${agencyId}/billing`}>Compare paid plans</Link></div>}

      <section className="mt-10">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div><p className="text-sm text-violet-500 dark:text-violet-400">Client performance</p><h2 className="mt-1 text-2xl font-bold">Activity and conversion</h2></div><div className="flex rounded-xl border border-slate-200 bg-white p-1 dark:border-white/10 dark:bg-white/5">{[7, 30, 90].map((value) => <button key={value} onClick={() => setDays(value)} className={`rounded-lg px-4 py-2 text-xs font-semibold ${days === value ? "bg-violet-500 text-white" : "text-slate-500 dark:text-slate-400"}`}>{value} days</button>)}</div></div>
        <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">{metricCards.map(({ label, value, icon: Icon }) => <div key={label} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-white/5 dark:shadow-none"><Icon className="h-5 w-5 text-emerald-500 dark:text-emerald-400" /><p className="mt-4 text-2xl font-bold">{value}</p><p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{label}</p></div>)}</div>
        <div className="mt-5 overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-white/10 dark:bg-transparent">
          <div className="overflow-x-auto"><table className="w-full min-w-[760px] text-left text-sm"><thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500 dark:bg-white/5 dark:text-slate-400"><tr><th className="px-5 py-4">Client</th><th className="px-5 py-4">Tokens</th><th className="px-5 py-4">Leads</th><th className="px-5 py-4">Contacts</th><th className="px-5 py-4">Conversations</th><th className="px-5 py-4">Appointments</th><th className="px-5 py-4">Service activity</th></tr></thead><tbody className="divide-y divide-slate-200 dark:divide-white/10">{analytics?.clients?.map((client: any) => <tr key={client.workspaceId} className="hover:bg-slate-50 dark:hover:bg-white/[0.03]"><td className="px-5 py-4 font-semibold">{client.name}</td><td className="px-5 py-4">{Number(client.tokens).toLocaleString("en-IN")}</td><td className="px-5 py-4">{client.leads}</td><td className="px-5 py-4">{client.contacts}</td><td className="px-5 py-4">{client.conversations}</td><td className="px-5 py-4">{client.appointments}</td><td className="px-5 py-4 text-xs text-slate-500 dark:text-slate-400">WA {client.services.whatsapp.conversations} · IG {client.services.instagram.conversations} · Web {client.services.website.conversations}</td></tr>)}</tbody></table></div>
          {!analytics?.clients?.length && <div className="p-10 text-center text-sm text-slate-500 dark:text-slate-400">No client activity in this date range.</div>}
        </div>
        <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">Analytics include only records already attached to a client workspace. Token totals use the usage ledger and website token totals currently available.</p>
      </section>
    </div>
  );
}
