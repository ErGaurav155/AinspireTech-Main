"use client";

import { useCallback, useEffect, useState } from "react";
import { UserButton } from "@clerk/nextjs";
import { ThemeToggle } from "@rocketreplai/ui";
import Link from "next/link";
import { Bot, Building2, Instagram, MessageCircle, Phone, Trash2, Workflow } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { useApi } from "@/lib/useApi";
import { deleteAgencyClient, getWorkspace } from "@/lib/services/platform.api";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";

const serviceMeta: Record<string, { label: string; icon: any; href: string }> = {
  WHATSAPP: { label: "WhatsApp Automation", icon: MessageCircle, href: "/whatsapp" },
  INSTAGRAM: { label: "Instagram Automation", icon: Instagram, href: "/insta" },
  WEBSITE: { label: "Website Chatbot", icon: Bot, href: "/web" },
  CALL: { label: "AI Call Assistant", icon: Phone, href: "/call" },
};

function ClientConfigurationSummary({ data }: { data: any }) {
  const config = data?.clientConfiguration;
  if (!config) return null;
  const whatsappQuestions =
    config.whatsapp?.automationConfig?.appointmentQuestions || [];
  const whatsappFaqs = config.whatsapp?.faqs || [];
  const instagramFlows = config.instagram?.flows || [];
  const webQuestions = config.website?.flow?.questions || [];
  const factEntries = Object.entries(config.business?.information || {}).filter(
    ([, value]) => value !== undefined && value !== null && value !== "",
  );

  return (
    <section className="mt-8">
      <div className="flex items-center gap-3">
        <Workflow className="h-5 w-5 text-violet-500" />
        <div>
          <h2 className="text-xl font-bold">Client business and flow setup</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Read-only information configured by this client across enabled services.
          </p>
        </div>
      </div>
      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <article className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-white/10 dark:bg-white/5">
          <div className="flex items-center gap-2 font-semibold"><Building2 className="h-4 w-4 text-violet-500" /> Business information</div>
          <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
            {[
              ["Contact", config.business?.ownerContactName || "Not added"],
              ["Email", config.business?.ownerEmail || "Not added"],
              ["Phone", config.business?.phone || "Not added"],
              ["Knowledge", config.business?.knowledge?.ready ? "Ready" : "Not configured"],
              ["Website", config.business?.knowledge?.websiteUrl || "Not added"],
              ["Reference file", config.business?.knowledge?.fileName || "Not added"],
              ...factEntries.map(([key, value]) => [key, String(value)]),
            ].map(([label, value]) => <div key={`${label}-${value}`}><dt className="text-xs uppercase tracking-wide text-slate-400">{label}</dt><dd className="mt-1 break-words text-slate-700 dark:text-slate-200">{value}</dd></div>)}
          </dl>
        </article>

        <article className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-white/10 dark:bg-white/5">
          <div className="flex items-center gap-2 font-semibold"><MessageCircle className="h-4 w-4 text-emerald-500" /> WhatsApp setup</div>
          <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">Automation: {config.whatsapp?.automationConfig?.enabled ? "Enabled" : "Not enabled"} · Appointment flow: {config.whatsapp?.appointmentConfig?.enabled ? "Enabled" : "Not enabled"}</p>
          <p className="mt-4 text-xs font-semibold uppercase tracking-wide text-slate-400">Appointment questions</p>
          <ul className="mt-2 space-y-2 text-sm">{whatsappQuestions.length ? whatsappQuestions.map((question: any) => <li key={question.id || question.question} className="rounded-lg bg-slate-50 px-3 py-2 dark:bg-white/5">{question.question}</li>) : <li className="text-slate-400">No appointment questions configured.</li>}</ul>
          <p className="mt-5 text-xs font-semibold uppercase tracking-wide text-slate-400">Frequently asked questions</p>
          <div className="mt-2 space-y-2 text-sm">
            {whatsappFaqs.length ? whatsappFaqs.map((faq: any) => (
              <div key={faq.id || faq.question} className="rounded-lg bg-slate-50 px-3 py-2 dark:bg-white/5">
                <div className="flex items-start justify-between gap-2">
                  <p className="font-medium text-slate-800 dark:text-slate-100">{faq.question}</p>
                  {!faq.isActive && <span className="rounded-full bg-slate-200 px-2 py-0.5 text-[10px] text-slate-500 dark:bg-white/10 dark:text-slate-400">Inactive</span>}
                </div>
                <p className="mt-1 whitespace-pre-wrap text-slate-500 dark:text-slate-400">{faq.answer}</p>
              </div>
            )) : <p className="text-slate-400">No WhatsApp FAQs configured.</p>}
          </div>
        </article>

        <article className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-white/10 dark:bg-white/5">
          <div className="flex items-center gap-2 font-semibold"><Instagram className="h-4 w-4 text-pink-500" /> Instagram flows</div>
          <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">{config.instagram?.accounts?.length || 0} connected account(s) · {instagramFlows.length} automation flow(s)</p>
          <ul className="mt-3 space-y-2 text-sm">{instagramFlows.length ? instagramFlows.map((flow: any) => <li key={flow._id} className="rounded-lg bg-slate-50 px-3 py-2 dark:bg-white/5"><span className="font-medium">{flow.name}</span><span className="ml-2 text-xs capitalize text-slate-400">{flow.automationType} · {flow.dmFlow?.mode === "collect_form" ? `${flow.dmFlow.questions?.length || 0} questions` : "link reply"}</span></li>) : <li className="text-slate-400">No Instagram flows configured.</li>}</ul>
        </article>

        <article className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-white/10 dark:bg-white/5">
          <div className="flex items-center gap-2 font-semibold"><Bot className="h-4 w-4 text-purple-500" /> Website customer flow</div>
          <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">Chatbot: {config.website?.chatbot?.name || "Not created"}</p>
          <div className="mt-3 flex flex-wrap gap-2">{(config.website?.flow?.quickReplies || []).map((reply: string) => <span key={reply} className="rounded-full bg-purple-500/10 px-3 py-1 text-xs text-purple-600 dark:text-purple-300">{reply}</span>)}</div>
          <ul className="mt-3 space-y-2 text-sm">{webQuestions.length ? webQuestions.map((question: any) => <li key={question.id || question.question} className="rounded-lg bg-slate-50 px-3 py-2 dark:bg-white/5">{question.question}</li>) : <li className="text-slate-400">No website flow questions configured.</li>}</ul>
        </article>
      </div>
    </section>
  );
}

export default function WorkspaceOverviewPage() {
  const { workspaceId } = useParams<{ workspaceId: string }>();
  const router = useRouter();
  const { apiRequest } = useApi();
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState("");
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const load = useCallback(async () => { try { setData(await getWorkspace(apiRequest, workspaceId)); } catch (value: any) { setError(value.message || "Workspace access denied"); } }, [apiRequest, workspaceId]);
  useEffect(() => void load(), [load]);
  const agencyManaged = data?.access?.accessKind === "agency_management";
  const verifiedAgencyId = agencyManaged ? data?.access?.agencyId : undefined;

  const removeClient = async () => {
    if (!agencyManaged || !verifiedAgencyId || deleting) return;
    setDeleting(true);
    setError("");
    try {
      await deleteAgencyClient(apiRequest, verifiedAgencyId, workspaceId);
      router.replace(`/agency/${verifiedAgencyId}/clients`);
    } catch (value: any) {
      setError(value?.message || "Unable to delete client workspace");
      setDeleting(false);
      setDeleteOpen(false);
    }
  };

  return (
    <main className="min-h-screen bg-slate-50 px-5 py-10 text-slate-900 transition-colors dark:bg-slate-950 dark:text-white">
      <div className="mx-auto max-w-6xl">
        <div className="flex items-center justify-between gap-3"><div>{verifiedAgencyId && <Link href={`/agency/${verifiedAgencyId}/clients`} className="text-sm text-violet-600 hover:underline dark:text-violet-400">← Return to agency clients</Link>}</div><div className="flex items-center gap-2">{verifiedAgencyId && <button type="button" onClick={() => setDeleteOpen(true)} className="inline-flex items-center gap-2 rounded-xl border border-red-200 px-3 py-2 text-xs font-semibold text-red-600 hover:bg-red-50 dark:border-red-500/30 dark:text-red-300 dark:hover:bg-red-500/10"><Trash2 className="h-4 w-4" /><span className="hidden sm:inline">Delete client</span></button>}<ThemeToggle /><UserButton /></div></div>
        {error ? <div className="mt-6 rounded-xl border border-red-500/30 bg-red-50 p-5 text-red-700 dark:bg-red-500/10 dark:text-red-300">{error}</div> : <>
          <p className="mt-6 text-sm text-emerald-600 dark:text-emerald-400">Business workspace</p><h1 className="mt-1 text-3xl font-bold">{data?.workspace?.name || "Loading…"}</h1><p className="mt-2 text-slate-500 dark:text-slate-400">Only enabled modules are shown. Every API request still verifies membership, permission and entitlement.</p>
          {data?.managedBy && <div className="mt-6 rounded-2xl border border-violet-300 bg-violet-50 p-5 dark:border-violet-500/25 dark:bg-violet-500/10"><p className="text-xs uppercase tracking-widest text-violet-700 dark:text-violet-300">Managed by agency</p><p className="mt-2 font-semibold">{data.managedBy.agencyName}</p><p className="mt-1 text-sm text-slate-600 dark:text-slate-300">Your agency provides these services under its {data.managedBy.planName} plan. Billing and prices are managed by the agency.</p></div>}
          <ClientConfigurationSummary data={data} />
          <div className="mt-8 grid gap-5 md:grid-cols-2">{data?.services?.filter((service: any) => service.effectiveEnabled || service.comingSoon).map((service: any) => { const meta = serviceMeta[service.service]; const Icon = meta.icon; const comingSoon = service.service === "CALL"; const unavailableInAgencyContext = agencyManaged && !comingSoon; return <article key={service.service} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-white/5 dark:shadow-none"><Icon className="h-7 w-7 text-violet-500 dark:text-violet-400" /><h2 className="mt-5 text-xl font-semibold">{meta.label}</h2><p className="mt-2 text-sm capitalize text-slate-500 dark:text-slate-400">Setup: {service.setupStatus.replace("_", " ")}</p>{comingSoon ? <span className="mt-5 inline-block rounded-full bg-cyan-50 px-3 py-1 text-xs text-cyan-700 dark:bg-cyan-500/10 dark:text-cyan-300">Coming soon</span> : unavailableInAgencyContext ? <p className="mt-5 text-xs text-amber-700 dark:text-amber-300">Agency client setup opens after this module completes workspace-scoped API migration.</p> : <Link href={meta.href} className="mt-5 inline-block rounded-xl bg-violet-500 px-4 py-2 text-sm font-semibold text-white">Open module</Link>}</article>; })}</div>
          {!data?.services?.some((service: any) => service.effectiveEnabled || service.comingSoon) && <div className="mt-8 rounded-2xl border border-dashed border-slate-300 p-12 text-center text-slate-500 dark:border-white/15 dark:text-slate-400">No entitled services are enabled for this workspace.</div>}
        </>}
      </div>
      <ConfirmDialog
        open={Boolean(verifiedAgencyId && deleteOpen)}
        onOpenChange={(open) => { if (!deleting) setDeleteOpen(open); }}
        onConfirm={removeClient}
        title={`Delete ${data?.workspace?.name || "client workspace"}?`}
        description="This permanently removes this client and releases the agency plan slot. It cannot be restored."
        confirmText="Permanently delete client"
        cancelText="Keep client"
        isDestructive
        isLoading={deleting}
        acknowledgements={[
          { id: "workspace-remove-access", label: "I understand every client member and pending invitation will lose access to this Clerk workspace." },
          { id: "workspace-delete-services", label: "I understand the client's WhatsApp, Instagram, website chatbot, integrations and configuration will be deleted." },
          { id: "workspace-delete-results", label: "I understand the client's leads, conversations, appointments, usage and automation history will be deleted." },
          { id: "workspace-delete-permanent", label: "I understand this deletion is permanent and the data cannot be recovered." },
        ]}
      />
    </main>
  );
}
