"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, Trash2 } from "lucide-react";
import { Button, Checkbox, Label, useThemeStyles } from "@rocketreplai/ui";
import type { AgencyBillingPlan } from "@/lib/services/platform.api";
import type { SubscriptionChangeTiming } from "@/components/shared/SubscriptionTimingDialog";

type AgencyClientChoice = {
  relationship?: { workspaceId?: string };
  workspace?: {
    _id?: string;
    name?: string;
    ownerEmail?: string;
  };
};

const workspaceIdOf = (client: AgencyClientChoice) =>
  String(client.workspace?._id || client.relationship?.workspaceId || "");

export function AgencyDowngradeClientDialog({
  open,
  clients,
  currentPlan,
  targetPlan,
  targetLimit,
  timing,
  busy,
  onClose,
  onConfirm,
}: {
  open: boolean;
  clients: AgencyClientChoice[];
  currentPlan: AgencyBillingPlan;
  targetPlan: AgencyBillingPlan;
  targetLimit: number;
  timing: SubscriptionChangeTiming;
  busy: boolean;
  onClose: () => void;
  onConfirm: (retainedWorkspaceIds: string[]) => void;
}) {
  const { styles, isDark } = useThemeStyles();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [acceptedDeletion, setAcceptedDeletion] = useState(false);
  const [acceptedIrreversible, setAcceptedIrreversible] = useState(false);

  useEffect(() => {
    if (!open) {
      setSelected(new Set());
      setAcceptedDeletion(false);
      setAcceptedIrreversible(false);
    }
  }, [open]);

  const selectableClients = useMemo(
    () => clients.filter((client) => Boolean(workspaceIdOf(client))),
    [clients],
  );
  const deleteCount = Math.max(0, selectableClients.length - targetLimit);
  const ready =
    selected.size === targetLimit && acceptedDeletion && acceptedIrreversible;

  if (!open) return null;

  const toggleClient = (workspaceId: string, checked: boolean) => {
    setSelected((current) => {
      const next = new Set(current);
      if (checked) {
        if (next.size >= targetLimit) return next;
        next.add(workspaceId);
      } else {
        next.delete(workspaceId);
      }
      return next;
    });
  };

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="downgrade-client-title"
        className={`max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-2xl border p-6 shadow-2xl ${
          isDark
            ? "border-white/10 bg-[#17171c]"
            : "border-slate-200 bg-white"
        }`}
      >
        <div className="flex items-start gap-3">
          <div className="rounded-xl bg-red-100 p-2 text-red-600 dark:bg-red-500/15 dark:text-red-300">
            <AlertTriangle className="h-5 w-5" />
          </div>
          <div>
            <h2 id="downgrade-client-title" className={`text-xl font-bold ${styles.text.primary}`}>
              Choose the {targetLimit} client{targetLimit === 1 ? "" : "s"} to keep
            </h2>
            <p className={`mt-1 text-sm ${styles.text.secondary}`}>
              Changing {currentPlan.name} to {targetPlan.name} {timing === "now" ? "immediately" : "at billing-cycle end"} lowers your client limit. After Razorpay confirms the change, {deleteCount} non-selected client{deleteCount === 1 ? "" : "s"} will be permanently deleted.
            </p>
          </div>
        </div>

        <div className={`mt-5 rounded-xl border p-3 text-sm ${
          isDark
            ? "border-amber-500/25 bg-amber-500/10 text-amber-100"
            : "border-amber-200 bg-amber-50 text-amber-900"
        }`}>
          Selected {selected.size} of {targetLimit}. Existing selected clients keep their data and continue using the services allowed by the new plan.
          {timing === "cycle_end"
            ? " New client creation will be paused until the scheduled downgrade takes effect."
            : ""}
        </div>

        <div className="mt-4 space-y-2">
          {selectableClients.map((client) => {
            const workspaceId = workspaceIdOf(client);
            const checked = selected.has(workspaceId);
            const selectionFull = selected.size >= targetLimit;
            return (
              <Label
                key={workspaceId}
                htmlFor={`retain-${workspaceId}`}
                className={`flex cursor-pointer items-center gap-3 rounded-xl border p-3 ${
                  checked
                    ? "border-violet-500 bg-violet-50 dark:bg-violet-500/10"
                    : isDark
                      ? "border-white/10 bg-white/[0.03]"
                      : "border-slate-200 bg-slate-50"
                }`}
              >
                <Checkbox
                  id={`retain-${workspaceId}`}
                  checked={checked}
                  disabled={busy || (!checked && selectionFull)}
                  onCheckedChange={(value) => toggleClient(workspaceId, value === true)}
                />
                <span className="min-w-0">
                  <span className={`block truncate font-semibold ${styles.text.primary}`}>
                    {client.workspace?.name || "Unnamed client"}
                  </span>
                  <span className={`block truncate text-xs ${styles.text.secondary}`}>
                    {client.workspace?.ownerEmail || "No owner email"}
                  </span>
                </span>
              </Label>
            );
          })}
        </div>

        <div className={`mt-5 space-y-3 rounded-xl border p-4 ${
          isDark ? "border-red-500/25 bg-red-500/10" : "border-red-200 bg-red-50"
        }`}>
          <Label className="flex cursor-pointer items-start gap-3">
            <Checkbox
              checked={acceptedDeletion}
              disabled={busy}
              onCheckedChange={(value) => setAcceptedDeletion(value === true)}
              className="mt-0.5"
            />
            <span className={isDark ? "text-red-100" : "text-red-900"}>
              I understand every non-selected client loses workspace access and its WhatsApp, Instagram, chatbot, leads, appointments, conversations, and setup data will be deleted.
            </span>
          </Label>
          <Label className="flex cursor-pointer items-start gap-3">
            <Checkbox
              checked={acceptedIrreversible}
              disabled={busy}
              onCheckedChange={(value) => setAcceptedIrreversible(value === true)}
              className="mt-0.5"
            />
            <span className={isDark ? "text-red-100" : "text-red-900"}>
              I understand the non-selected Clerk organizations will be removed and this deletion cannot be undone.
            </span>
          </Label>
        </div>

        <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Button type="button" variant="outline" disabled={busy} onClick={onClose}>
            Keep current plan
          </Button>
          <Button
            type="button"
            disabled={!ready || busy}
            onClick={() => onConfirm([...selected])}
            className="bg-red-600 text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Trash2 className="mr-2 h-4 w-4" />
            {busy ? "Processing…" : `Confirm downgrade and delete ${deleteCount}`}
          </Button>
        </div>
      </div>
    </div>
  );
}
