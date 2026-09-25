"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Plus } from "lucide-react";
import { useParams } from "next/navigation";
import { useApi } from "@/lib/useApi";
import { getAgencyClients } from "@/lib/services/platform.api";

export default function AgencyClientsPage() {
  const { agencyId } = useParams<{ agencyId: string }>();
  const { apiRequest } = useApi();
  const [clients, setClients] = useState<any[]>([]);
  const load = useCallback(async () => setClients(await getAgencyClients(apiRequest, agencyId)), [agencyId, apiRequest]);
  useEffect(() => void load(), [load]);

  return (
    <div className="mx-auto max-w-6xl">
      <div className="flex items-center justify-between"><div><p className="text-sm text-violet-400">Agency</p><h1 className="mt-1 text-3xl font-bold">Clients</h1></div><Link href={`/agency/${agencyId}/clients/add`} className="flex items-center gap-2 rounded-xl bg-violet-500 px-5 py-3 font-semibold"><Plus className="h-4 w-4" /> Add client</Link></div>
      <div className="mt-8 space-y-4">
        {clients.map((item) => (
          <div key={item.workspace?._id} className="flex flex-col justify-between gap-5 rounded-2xl border border-white/10 bg-white/5 p-6 md:flex-row md:items-center">
            <div><h2 className="text-lg font-semibold">{item.workspace?.name}</h2><p className="mt-1 text-sm text-slate-400">{item.workspace?.ownerEmail}</p></div>
            <div className="flex flex-wrap gap-2">{["WHATSAPP", "INSTAGRAM", "WEBSITE", "CALL"].map((service) => { const config = item.services?.find((value: any) => value.service === service); const comingSoon = service === "CALL"; return <span key={service} className={`rounded-full border px-3 py-1 text-xs ${comingSoon ? "border-cyan-500/30 bg-cyan-500/10 text-cyan-300" : config?.enabled ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300" : "border-white/10 text-slate-500"}`}>{service === "WEBSITE" ? "Website" : service.charAt(0) + service.slice(1).toLowerCase()}: {comingSoon ? "Coming soon" : config?.enabled ? config.setupStatus.replace("_", " ") : "Not enabled"}</span>; })}</div>
            <Link href={`/workspace/${item.workspace?._id}?agency=${agencyId}`} className="rounded-xl border border-white/10 px-4 py-2 text-center text-sm font-semibold hover:bg-white/5">Manage client</Link>
          </div>
        ))}
        {!clients.length && <div className="rounded-2xl border border-dashed border-white/15 p-12 text-center text-slate-400">No client workspaces yet.</div>}
      </div>
    </div>
  );
}
