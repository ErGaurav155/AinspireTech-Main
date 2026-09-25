"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Check, ChevronLeft, ChevronRight } from "lucide-react";
import { useApi } from "@/lib/useApi";
import { createAgencyClient, type PlatformService } from "@/lib/services/platform.api";

export default function AddAgencyClientPage() {
  const { agencyId } = useParams<{ agencyId: string }>();
  const router = useRouter();
  const { apiRequest } = useApi();
  const [step, setStep] = useState(1);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({ businessName: "", ownerContactName: "", ownerEmail: "", phone: "", services: ["WHATSAPP", "INSTAGRAM", "WEBSITE"] as PlatformService[], sendInvitation: true });
  const toggle = (service: PlatformService) => setForm((value) => ({ ...value, services: value.services.includes(service) ? value.services.filter((item) => item !== service) : [...value.services, service] }));
  const submit = async () => {
    setBusy(true); setError("");
    try { const result = await createAgencyClient(apiRequest, agencyId, form); router.push(`/workspace/${result.workspace._id}?agency=${agencyId}`); }
    catch (value: any) { setError(value.message || "Unable to create client"); setBusy(false); }
  };

  return (
    <div className="mx-auto max-w-3xl">
      <button onClick={() => router.back()} className="mb-6 flex items-center gap-2 text-sm text-slate-400 hover:text-white"><ChevronLeft className="h-4 w-4" /> Back</button>
      <p className="text-sm text-violet-400">Step {step} of 3</p><h1 className="mt-1 text-3xl font-bold">Add a client</h1>
      <div className="mt-8 rounded-2xl border border-white/10 bg-white/5 p-6 md:p-8">
        {step === 1 && <div className="space-y-5"><h2 className="text-xl font-semibold">Business information</h2>{[
          ["businessName", "Business name", "Acme Dental"], ["ownerContactName", "Owner or contact name", "Aarav Sharma"], ["ownerEmail", "Client email", "owner@example.com"], ["phone", "Phone", "+91…"],
        ].map(([key, label, placeholder]) => <label key={key} className="block"><span className="mb-2 block text-sm text-slate-300">{label}</span><input type={key === "ownerEmail" ? "email" : "text"} value={(form as any)[key]} onChange={(event) => setForm({ ...form, [key]: event.target.value })} placeholder={placeholder} className="w-full rounded-xl border border-white/10 bg-slate-900 px-4 py-3 outline-none focus:border-violet-500" /></label>)}</div>}
        {step === 2 && <div><h2 className="text-xl font-semibold">Services</h2><p className="mt-2 text-sm text-slate-400">Choose the modules this client can use.</p><div className="mt-5 grid gap-3 sm:grid-cols-2">{(["WHATSAPP", "INSTAGRAM", "WEBSITE"] as PlatformService[]).map((service) => { const selected = form.services.includes(service); return <button key={service} onClick={() => toggle(service)} className={`flex items-center justify-between rounded-xl border p-4 text-left ${selected ? "border-violet-500 bg-violet-500/10" : "border-white/10"}`}><span>{service === "WEBSITE" ? "Website Chatbot" : `${service.charAt(0)}${service.slice(1).toLowerCase()} Automation`}</span>{selected && <Check className="h-4 w-4 text-violet-400" />}</button>; })}<div className="rounded-xl border border-cyan-500/20 bg-cyan-500/5 p-4 text-slate-400"><div className="flex justify-between"><span>AI Call Assistant</span><span className="text-xs text-cyan-400">Coming soon</span></div></div></div></div>}
        {step === 3 && <div><h2 className="text-xl font-semibold">Client login</h2><p className="mt-2 text-sm text-slate-400">An invitation will be sent to <strong className="text-white">{form.ownerEmail}</strong>. After accepting it, the client lands in only their own workspace.</p><label className="mt-6 flex items-center gap-3 rounded-xl border border-white/10 p-4"><input type="checkbox" checked={form.sendInvitation} onChange={(event) => setForm({ ...form, sendInvitation: event.target.checked })} /><span>Send Clerk workspace invitation now</span></label><div className="mt-5 rounded-xl bg-slate-900 p-4 text-sm text-slate-400"><p>Business: <span className="text-white">{form.businessName}</span></p><p className="mt-2">Services: <span className="text-white">{form.services.join(", ")}</span></p></div></div>}
        {error && <div className="mt-5 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-300">{error}</div>}
        <div className="mt-8 flex justify-between"><button disabled={step === 1} onClick={() => setStep((value) => value - 1)} className="rounded-xl border border-white/10 px-5 py-3 disabled:opacity-30">Previous</button>{step < 3 ? <button disabled={step === 1 && (!form.businessName || !form.ownerEmail)} onClick={() => setStep((value) => value + 1)} className="flex items-center gap-2 rounded-xl bg-violet-500 px-5 py-3 font-semibold disabled:opacity-50">Continue <ChevronRight className="h-4 w-4" /></button> : <button disabled={busy} onClick={submit} className="rounded-xl bg-violet-500 px-5 py-3 font-semibold disabled:opacity-50">{busy ? "Creating…" : "Create client"}</button>}</div>
      </div>
    </div>
  );
}
