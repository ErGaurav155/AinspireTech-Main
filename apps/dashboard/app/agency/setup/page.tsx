"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { Building2, Check } from "lucide-react";
import { useRouter } from "next/navigation";
import { useApi } from "@/lib/useApi";
import { createAgency, getPlatformContext } from "@/lib/services/platform.api";

export default function AgencySetupPage() {
  const router = useRouter();
  const { apiRequest } = useApi();
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [checking, setChecking] = useState(true);
  const [error, setError] = useState("");

  const findExistingAgency = useCallback(async () => {
    try {
      const context = await getPlatformContext(apiRequest);
      if (context.agencies[0]?._id) { router.replace(`/agency/${context.agencies[0]._id}`); return; }
      if (!context.canCreatePrimaryAccount && context.workspaces[0]?._id) {
        router.replace(`/workspace/${context.workspaces[0]._id}`);
        return;
      }
      if (!context.canCreatePrimaryAccount) {
        setError("This account is already a member of another RocketReplAI workspace and cannot create a second primary account.");
        setChecking(false);
        return;
      }
    } catch (value: any) { setError(value.message || "Unable to load your account"); }
    setChecking(false);
  }, [apiRequest, router]);

  useEffect(() => void findExistingAgency(), [findExistingAgency]);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (name.trim().length < 2 || busy) return;
    setBusy(true); setError("");
    try {
      const result = await createAgency(apiRequest, name.trim());
      router.replace(`/agency/${result.agency._id}`);
    } catch (value: any) { setError(value.message || "Unable to create agency"); setBusy(false); }
  };

  if (checking) return <main className="flex min-h-screen items-center justify-center bg-slate-950 text-slate-300">Preparing agency setup…</main>;
  return (
    <main className="min-h-screen bg-slate-950 px-5 py-14 text-white">
      <div className="mx-auto grid max-w-5xl gap-8 lg:grid-cols-2">
        <section className="rounded-3xl border border-white/10 bg-white/5 p-8">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-violet-500"><Building2 className="h-7 w-7" /></div>
          <p className="mt-7 text-sm font-semibold text-violet-400">Agency setup</p><h1 className="mt-2 text-3xl font-bold">Create your agency workspace</h1><p className="mt-3 text-slate-400">This is the private control centre for your team, clients, usage and reporting.</p>
          <form onSubmit={submit} className="mt-8"><label className="text-sm font-medium" htmlFor="agency-name">Agency name</label><input id="agency-name" autoFocus value={name} onChange={(event) => setName(event.target.value)} maxLength={160} placeholder="ABC Digital Agency" className="mt-2 w-full rounded-xl border border-white/10 bg-slate-900 px-4 py-3 outline-none focus:border-violet-500" />{error && <p className="mt-3 text-sm text-red-300">{error}</p>}<button disabled={busy || name.trim().length < 2} className="mt-5 w-full rounded-xl bg-violet-500 px-5 py-3 font-semibold disabled:opacity-50">{busy ? "Creating…" : "Create agency"}</button></form>
        </section>
        <aside className="rounded-3xl border border-violet-500/30 bg-violet-500/10 p-8">
          <span className="rounded-full bg-violet-500 px-3 py-1 text-xs font-bold">FREE STARTER ACCESS</span><h2 className="mt-6 text-2xl font-bold">Invite your first client free</h2><p className="mt-3 text-slate-300">No payment is required to create the agency or its first client workspace.</p>
          <ul className="mt-7 space-y-4 text-sm text-slate-200">{["1 client workspace", "100,000 AI tokens per month", "1,000 conversations per month", "WhatsApp, Instagram and Website modules", "1 WhatsApp, 3 Instagram accounts and 1 chatbot per client"].map((item) => <li key={item} className="flex gap-3"><Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />{item}</li>)}</ul>
          <p className="mt-8 text-xs text-slate-400">For another client, choose Partner, Growth Partner or Agency. Paid access is granted only after a verified payment webhook.</p>
        </aside>
      </div>
    </main>
  );
}
