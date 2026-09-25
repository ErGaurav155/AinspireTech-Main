"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Building2, Plus, RefreshCw, Store } from "lucide-react";
import { useApi } from "@/lib/useApi";
import {
  createAgency,
  createBusinessWorkspace,
  getPlatformContext,
} from "@/lib/services/platform.api";

export default function SelectWorkspacePage() {
  const { apiRequest } = useApi();
  const [data, setData] = useState<any>(null);
  const [name, setName] = useState("");
  const [mode, setMode] = useState<"agency" | "business">("agency");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    try {
      setData(await getPlatformContext(apiRequest));
    } catch (value: any) {
      setError(value.message || "Unable to load workspaces");
    }
  }, [apiRequest]);

  useEffect(() => void load(), [load]);

  const create = async () => {
    if (name.trim().length < 2) return;
    setBusy(true);
    setError("");
    try {
      if (mode === "agency") await createAgency(apiRequest, name.trim());
      else await createBusinessWorkspace(apiRequest, name.trim());
      setName("");
      await load();
    } catch (value: any) {
      setError(value.message || "Unable to create workspace");
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="min-h-screen bg-slate-950 px-5 py-12 text-white">
      <div className="mx-auto max-w-5xl">
        <div className="mb-10 flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-violet-400">RocketReplAI</p>
            <h1 className="mt-2 text-3xl font-bold">Choose your workspace</h1>
            <p className="mt-2 text-slate-400">Invited client workspaces appear here automatically.</p>
          </div>
          <button onClick={load} className="rounded-xl border border-white/10 p-3 text-slate-400 hover:text-white">
            <RefreshCw className="h-4 w-4" />
          </button>
        </div>

        {error && <div className="mb-6 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-300">{error}</div>}

        <div className="grid gap-4 md:grid-cols-2">
          {data?.agencies?.map((agency: any) => (
            <Link key={agency._id} href={`/agency/${agency._id}`} className="rounded-2xl border border-white/10 bg-white/5 p-6 transition hover:border-violet-500/50 hover:bg-white/10">
              <Building2 className="h-8 w-8 text-violet-400" />
              <h2 className="mt-5 text-xl font-semibold">{agency.name}</h2>
              <p className="mt-1 text-sm text-slate-400">Agency dashboard</p>
            </Link>
          ))}
          {data?.workspaces?.map((workspace: any) => (
            <Link key={workspace._id} href={`/workspace/${workspace._id}`} className="rounded-2xl border border-white/10 bg-white/5 p-6 transition hover:border-emerald-500/50 hover:bg-white/10">
              <Store className="h-8 w-8 text-emerald-400" />
              <h2 className="mt-5 text-xl font-semibold">{workspace.name}</h2>
              <p className="mt-1 text-sm text-slate-400">Business workspace</p>
            </Link>
          ))}
        </div>

        <section className="mt-10 rounded-2xl border border-white/10 bg-white/5 p-6">
          <div className="flex items-center gap-3"><Plus className="h-5 w-5 text-violet-400" /><h2 className="text-lg font-semibold">Create a workspace</h2></div>
          <div className="mt-5 flex gap-2">
            {(["agency", "business"] as const).map((item) => (
              <button key={item} onClick={() => setMode(item)} className={`rounded-lg px-4 py-2 text-sm capitalize ${mode === item ? "bg-violet-500" : "bg-white/5 text-slate-400"}`}>{item}</button>
            ))}
          </div>
          <div className="mt-4 flex flex-col gap-3 sm:flex-row">
            <input value={name} onChange={(event) => setName(event.target.value)} placeholder={mode === "agency" ? "Agency name" : "Business name"} className="flex-1 rounded-xl border border-white/10 bg-slate-900 px-4 py-3 outline-none focus:border-violet-500" />
            <button disabled={busy || name.trim().length < 2} onClick={create} className="rounded-xl bg-violet-500 px-6 py-3 font-semibold disabled:opacity-50">{busy ? "Creating…" : "Create"}</button>
          </div>
        </section>
      </div>
    </main>
  );
}
