"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Plus, Trash2 } from "lucide-react";
import { useParams } from "next/navigation";
import { useApi } from "@/lib/useApi";
import { deleteAgencyClient, getAgencyClients } from "@/lib/services/platform.api";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";

export default function AgencyClientsPage() {
  const { agencyId } = useParams<{ agencyId: string }>();
  const { apiRequest } = useApi();
  const [clients, setClients] = useState<any[]>([]);
  const [clientToDelete, setClientToDelete] = useState<any>(null);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");
  const load = useCallback(async () => setClients(await getAgencyClients(apiRequest, agencyId)), [agencyId, apiRequest]);
  useEffect(() => void load(), [load]);

  const removeClient = async () => {
    const workspaceId = clientToDelete?.workspace?._id;
    if (!workspaceId || deleting) return;
    setDeleting(true);
    setError("");
    try {
      await deleteAgencyClient(apiRequest, agencyId, workspaceId);
      setClientToDelete(null);
      await load();
    } catch (value: any) {
      setError(value?.message || "Unable to delete client workspace");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="mx-auto max-w-6xl">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center"><div><p className="text-sm text-violet-500 dark:text-violet-400">Agency</p><h1 className="mt-1 text-3xl font-bold">Clients</h1></div><Link href={`/agency/${agencyId}/clients/add`} className="flex items-center justify-center gap-2 rounded-xl bg-violet-500 px-5 py-3 font-semibold text-white"><Plus className="h-4 w-4" /> Add client</Link></div>
      {error && <div className="mt-6 rounded-xl border border-red-500/30 bg-red-50 p-4 text-sm text-red-700 dark:bg-red-500/10 dark:text-red-300">{error}</div>}
      <div className="mt-8 space-y-4">
        {clients.map((item) => (
          <div key={item.workspace?._id} className="flex flex-col justify-between gap-5 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-white/5 dark:shadow-none md:flex-row md:items-center">
            <div><h2 className="text-lg font-semibold">{item.workspace?.name}</h2><p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{item.workspace?.ownerEmail}</p></div>
            <div className="flex flex-wrap gap-2">{["WHATSAPP", "INSTAGRAM", "WEBSITE", "CALL"].map((service) => { const config = item.services?.find((value: any) => value.service === service); const comingSoon = service === "CALL"; return <span key={service} className={`rounded-full border px-3 py-1 text-xs ${comingSoon ? "border-cyan-500/30 bg-cyan-50 text-cyan-700 dark:bg-cyan-500/10 dark:text-cyan-300" : config?.enabled ? "border-emerald-500/30 bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300" : "border-slate-200 text-slate-500 dark:border-white/10"}`}>{service === "WEBSITE" ? "Website" : service.charAt(0) + service.slice(1).toLowerCase()}: {comingSoon ? "Coming soon" : config?.enabled ? config.setupStatus.replace("_", " ") : "Not enabled"}</span>; })}</div>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Link href={`/workspace/${item.workspace?._id}`} className="rounded-xl border border-slate-200 px-4 py-2 text-center text-sm font-semibold hover:bg-slate-50 dark:border-white/10 dark:hover:bg-white/5">Manage client</Link>
              <button type="button" onClick={() => { setError(""); setClientToDelete(item); }} className="inline-flex items-center justify-center gap-2 rounded-xl border border-red-200 px-4 py-2 text-sm font-semibold text-red-600 transition hover:bg-red-50 dark:border-red-500/30 dark:text-red-300 dark:hover:bg-red-500/10"><Trash2 className="h-4 w-4" /> Delete</button>
            </div>
          </div>
        ))}
        {!clients.length && <div className="rounded-2xl border border-dashed border-slate-300 p-12 text-center text-slate-500 dark:border-white/15 dark:text-slate-400">No client workspaces yet.</div>}
      </div>
      <ConfirmDialog
        open={Boolean(clientToDelete)}
        onOpenChange={(open) => { if (!open && !deleting) setClientToDelete(null); }}
        onConfirm={removeClient}
        title={`Delete ${clientToDelete?.workspace?.name || "client workspace"}?`}
        description="This permanently removes the client workspace and releases its agency plan slot. It cannot be restored."
        confirmText="Permanently delete client"
        cancelText="Keep client"
        isDestructive
        isLoading={deleting}
        acknowledgements={[
          { id: "remove-client-access", label: "I understand every client member and pending invitation will lose access to this Clerk workspace." },
          { id: "delete-client-services", label: "I understand the client's WhatsApp, Instagram, website chatbot, integrations and configuration will be deleted." },
          { id: "delete-client-results", label: "I understand the client's leads, conversations, appointments, usage and automation history will be deleted." },
          { id: "delete-client-permanent", label: "I understand this deletion is permanent and the data cannot be recovered." },
        ]}
      />
    </div>
  );
}
