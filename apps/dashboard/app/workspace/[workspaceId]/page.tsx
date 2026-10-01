"use client";

import { useCallback, useEffect, useState } from "react";
import { UserButton } from "@clerk/nextjs";
import { ThemeToggle } from "@rocketreplai/ui";
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
    <main className="min-h-screen bg-slate-50 px-5 py-10 text-slate-900 transition-colors dark:bg-slate-950 dark:text-white">
      <div className="mx-auto max-w-6xl">
        <div className="flex items-center justify-between gap-3"><div>{agencyId && <Link href={`/agency/${agencyId}/clients`} className="text-sm text-violet-600 hover:underline dark:text-violet-400">← Return to agency clients</Link>}</div><div className="flex items-center gap-2"><ThemeToggle /><UserButton /></div></div>
        {error ? <div className="mt-6 rounded-xl border border-red-500/30 bg-red-50 p-5 text-red-700 dark:bg-red-500/10 dark:text-red-300">{error}</div> : <>
          <p className="mt-6 text-sm text-emerald-600 dark:text-emerald-400">Business workspace</p><h1 className="mt-1 text-3xl font-bold">{data?.workspace?.name || "Loading…"}</h1><p className="mt-2 text-slate-500 dark:text-slate-400">Only enabled modules are shown. Every API request still verifies membership, permission and entitlement.</p>
          {data?.managedBy && <div className="mt-6 rounded-2xl border border-violet-300 bg-violet-50 p-5 dark:border-violet-500/25 dark:bg-violet-500/10"><p className="text-xs uppercase tracking-widest text-violet-700 dark:text-violet-300">Managed by agency</p><p className="mt-2 font-semibold">{data.managedBy.agencyName}</p><p className="mt-1 text-sm text-slate-600 dark:text-slate-300">Your agency provides these services under its {data.managedBy.planName} plan. Billing and prices are managed by the agency.</p></div>}
          <div className="mt-8 grid gap-5 md:grid-cols-2">{data?.services?.filter((service: any) => service.effectiveEnabled || service.comingSoon).map((service: any) => { const meta = serviceMeta[service.service]; const Icon = meta.icon; const comingSoon = service.service === "CALL"; const unavailableInAgencyContext = agencyManaged && !comingSoon; return <article key={service.service} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-white/5 dark:shadow-none"><Icon className="h-7 w-7 text-violet-500 dark:text-violet-400" /><h2 className="mt-5 text-xl font-semibold">{meta.label}</h2><p className="mt-2 text-sm capitalize text-slate-500 dark:text-slate-400">Setup: {service.setupStatus.replace("_", " ")}</p>{comingSoon ? <span className="mt-5 inline-block rounded-full bg-cyan-50 px-3 py-1 text-xs text-cyan-700 dark:bg-cyan-500/10 dark:text-cyan-300">Coming soon</span> : unavailableInAgencyContext ? <p className="mt-5 text-xs text-amber-700 dark:text-amber-300">Agency client setup opens after this module completes workspace-scoped API migration.</p> : <Link href={meta.href} className="mt-5 inline-block rounded-xl bg-violet-500 px-4 py-2 text-sm font-semibold text-white">Open module</Link>}</article>; })}</div>
          {!data?.services?.some((service: any) => service.effectiveEnabled || service.comingSoon) && <div className="mt-8 rounded-2xl border border-dashed border-slate-300 p-12 text-center text-slate-500 dark:border-white/15 dark:text-slate-400">No entitled services are enabled for this workspace.</div>}
        </>}
      </div>
    </main>
  );
}
