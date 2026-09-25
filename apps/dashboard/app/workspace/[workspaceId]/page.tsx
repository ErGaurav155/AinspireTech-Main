"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Bot, Instagram, MessageCircle, Phone } from "lucide-react";
import { useParams, useSearchParams } from "next/navigation";
import { useApi } from "@/lib/useApi";
import { getWorkspace } from "@/lib/services/platform.api";

const serviceMeta: Record<string, { label: string; icon: any; href: string }> = {
  WHATSAPP: { label: "WhatsApp Automation", icon: MessageCircle, href: "/whatsapp" },
  INSTAGRAM: { label: "Instagram Automation", icon: Instagram, href: "/insta" },
  WEBSITE: { label: "Website Chatbot", icon: Bot, href: "/web" },
  CALL: { label: "AI Call Assistant", icon: Phone, href: "/call" },
};

export default function WorkspaceOverviewPage() {
  const { workspaceId } = useParams<{ workspaceId: string }>();
  const agencyId = useSearchParams().get("agency");
  const { apiRequest } = useApi();
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState("");
  const load = useCallback(async () => { try { setData(await getWorkspace(apiRequest, workspaceId)); } catch (value: any) { setError(value.message || "Workspace access denied"); } }, [apiRequest, workspaceId]);
  useEffect(() => void load(), [load]);
  const agencyManaged = data?.access?.accessKind === "agency_management";

  return (
    <main className="min-h-screen bg-slate-950 px-5 py-10 text-white">
      <div className="mx-auto max-w-6xl">
        {agencyId && <Link href={`/agency/${agencyId}/clients`} className="text-sm text-violet-400 hover:underline">← Return to agency clients</Link>}
        {error ? <div className="mt-6 rounded-xl border border-red-500/30 bg-red-500/10 p-5 text-red-300">{error}</div> : <>
          <p className="mt-6 text-sm text-emerald-400">Business workspace</p><h1 className="mt-1 text-3xl font-bold">{data?.workspace?.name || "Loading…"}</h1><p className="mt-2 text-slate-400">Only enabled modules are shown. Every API request still verifies membership, permission and entitlement.</p>
          <div className="mt-8 grid gap-5 md:grid-cols-2">{data?.services?.filter((service: any) => service.effectiveEnabled || service.comingSoon).map((service: any) => { const meta = serviceMeta[service.service]; const Icon = meta.icon; const comingSoon = service.service === "CALL"; const unavailableInAgencyContext = agencyManaged && !comingSoon; return <article key={service.service} className="rounded-2xl border border-white/10 bg-white/5 p-6"><Icon className="h-7 w-7 text-violet-400" /><h2 className="mt-5 text-xl font-semibold">{meta.label}</h2><p className="mt-2 text-sm capitalize text-slate-400">Setup: {service.setupStatus.replace("_", " ")}</p>{comingSoon ? <span className="mt-5 inline-block rounded-full bg-cyan-500/10 px-3 py-1 text-xs text-cyan-300">Coming soon</span> : unavailableInAgencyContext ? <p className="mt-5 text-xs text-amber-300">Agency client setup opens after this module completes workspace-scoped API migration.</p> : <Link href={meta.href} className="mt-5 inline-block rounded-xl bg-violet-500 px-4 py-2 text-sm font-semibold">Open module</Link>}</article>; })}</div>
          {!data?.services?.some((service: any) => service.effectiveEnabled || service.comingSoon) && <div className="mt-8 rounded-2xl border border-dashed border-white/15 p-12 text-center text-slate-400">No entitled services are enabled for this workspace.</div>}
        </>}
      </div>
    </main>
  );
}
