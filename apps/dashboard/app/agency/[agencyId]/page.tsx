"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Building2, CreditCard, Plus, Users } from "lucide-react";
import { useParams } from "next/navigation";
import { useApi } from "@/lib/useApi";
import { getAgency, getAgencyClients } from "@/lib/services/platform.api";

export default function AgencyOverviewPage() {
  const { agencyId } = useParams<{ agencyId: string }>();
  const { apiRequest } = useApi();
  const [agency, setAgency] = useState<any>(null);
  const [clients, setClients] = useState<any[]>([]);

  const load = useCallback(async () => {
    const [agencyData, clientData] = await Promise.all([
      getAgency(apiRequest, agencyId),
      getAgencyClients(apiRequest, agencyId),
    ]);
    setAgency(agencyData);
    setClients(clientData);
  }, [agencyId, apiRequest]);
  useEffect(() => void load(), [load]);

  const limit = agency?.entitlements?.limits?.clientWorkspaces || 0;
  return (
    <div className="mx-auto max-w-6xl">
      <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-center">
        <div><p className="text-sm text-violet-400">Agency overview</p><h1 className="mt-1 text-3xl font-bold">{agency?.agency?.name || "Loading…"}</h1></div>
        <Link href={`/agency/${agencyId}/clients/add`} className="inline-flex items-center justify-center gap-2 rounded-xl bg-violet-500 px-5 py-3 font-semibold"><Plus className="h-4 w-4" /> Add client</Link>
      </div>
      <div className="mt-8 grid gap-4 sm:grid-cols-3">
        {[
          { label: "Client workspaces", value: `${clients.length} / ${limit || "—"}`, icon: Building2 },
          { label: "Agency team", value: agency?.entitlements?.limits?.teamMembers || "—", icon: Users },
          { label: "Billing status", value: agency?.entitlements?.sourcePlanCodes?.length ? "Active" : "Plan required", icon: CreditCard },
        ].map(({ label, value, icon: Icon }) => <div key={label} className="rounded-2xl border border-white/10 bg-white/5 p-6"><Icon className="h-5 w-5 text-violet-400" /><p className="mt-5 text-2xl font-bold">{value}</p><p className="mt-1 text-sm text-slate-400">{label}</p></div>)}
      </div>
      {!agency?.entitlements?.sourcePlanCodes?.length && <div className="mt-8 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-6"><h2 className="font-semibold text-amber-200">Choose an agency plan before adding clients</h2><Link className="mt-3 inline-block text-sm font-semibold text-amber-300 underline" href={`/agency/${agencyId}/billing`}>View plans</Link></div>}
    </div>
  );
}
