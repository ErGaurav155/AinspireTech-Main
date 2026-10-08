"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Coins, RefreshCw } from "lucide-react";
import { useApi } from "@/lib/useApi";
import {
  getIndividualAiTokenUsage,
  getWorkspaceAiTokenUsage,
  type IndividualAiTokenUsage,
  type WorkspaceAiTokenUsage,
} from "@/lib/services/platform.api";
import { usePlatformAccess } from "@/components/platform/PlatformAccessProvider";

type ServiceKey = "website" | "instagram" | "whatsapp";

const labels: Record<ServiceKey, string> = {
  website: "Website",
  instagram: "Instagram",
  whatsapp: "WhatsApp",
};

export default function WorkspaceAiTokenUsageCard({
  currentService,
}: {
  currentService: ServiceKey;
}) {
  const { apiRequest } = useApi();
  const access = usePlatformAccess();
  const [usage, setUsage] = useState<
    WorkspaceAiTokenUsage | IndividualAiTokenUsage | null
  >(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    const member =
      access.primaryAccountType === "MEMBER" && access.clientWorkspaceId;
    const individual = access.primaryAccountType === "BUSINESS";
    if (!member && !individual) return;
    setLoading(true);
    setError("");
    try {
      if (member) {
        setUsage(
          await getWorkspaceAiTokenUsage(
            apiRequest,
            access.clientWorkspaceId!,
          ),
        );
      } else {
        setUsage(await getIndividualAiTokenUsage(apiRequest, currentService));
      }
    } catch (value: any) {
      setError(value.message || "Unable to load shared token usage");
    } finally {
      setLoading(false);
    }
  }, [
    access.clientWorkspaceId,
    access.primaryAccountType,
    apiRequest,
    currentService,
  ]);

  useEffect(() => {
    void load();
  }, [load]);

  const percentage = useMemo(() => {
    if (!usage || usage.limit <= 0) return 0;
    return Math.min(100, Math.round((usage.used / usage.limit) * 100));
  }, [usage]);

  if (
    access.primaryAccountType !== "MEMBER" &&
    access.primaryAccountType !== "BUSINESS"
  ) {
    return null;
  }

  const individualUsage = usage?.mode === "individual" ? usage : null;
  const shared =
    usage?.mode === "agency_workspace" ||
    Boolean(individualUsage?.sharedAcrossServices);
  const heading =
    usage?.mode === "agency_workspace"
      ? "Shared monthly AI tokens"
      : individualUsage?.sharedAcrossServices
        ? "Shared package AI tokens"
        : `${labels[currentService]} monthly AI tokens`;
  const description =
    usage?.mode === "agency_workspace"
      ? "Website, Instagram and WhatsApp use the same agency-provided balance."
      : individualUsage?.sharedAcrossServices
        ? "Only services included in your package use this shared monthly balance."
        : `${labels[currentService]} has its own plan allowance and cannot spend tokens allocated to another service.`;

  return (
    <section className="rounded-2xl border border-violet-200 bg-gradient-to-br from-violet-50 to-white p-5 text-slate-900 shadow-sm dark:border-violet-500/25 dark:from-violet-500/10 dark:to-white/[0.03] dark:text-white">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="rounded-xl bg-violet-500 p-2.5 text-white">
            <Coins className="h-5 w-5" />
          </div>
          <div>
            <p className="font-bold">{heading}</p>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              {description}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => void load()}
          disabled={loading}
          className="rounded-lg border border-slate-200 bg-white p-2 text-slate-500 hover:text-violet-600 disabled:opacity-50 dark:border-white/10 dark:bg-white/5 dark:text-slate-400"
          aria-label="Refresh token usage"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
        </button>
      </div>

      {error && <p className="mt-4 text-sm text-red-600 dark:text-red-300">{error}</p>}
      {!error && individualUsage && !individualUsage.metered && (
        <p className="mt-4 rounded-xl border border-slate-200 bg-white/70 p-3 text-sm text-slate-600 dark:border-white/10 dark:bg-white/[0.03] dark:text-slate-300">
          This free service currently follows its existing action or message limit.
          Subscribe to this service or an eligible package to receive a monthly AI
          token allowance.
        </p>
      )}
      {!error && usage && (usage.mode !== "individual" || usage.metered) && (
        <>
          <div className="mt-5 flex items-end justify-between gap-4">
            <div>
              <p className="text-2xl font-black">
                {usage.remaining === -1
                  ? "Unlimited"
                  : usage.remaining.toLocaleString("en-IN")}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                tokens remaining until {new Date(usage.periodEnd).toLocaleDateString("en-IN")}
              </p>
            </div>
            <p className="text-sm font-semibold text-violet-600 dark:text-violet-300">
              {usage.used.toLocaleString("en-IN")} / {usage.limit === -1 ? "∞" : usage.limit.toLocaleString("en-IN")} used
            </p>
          </div>
          {usage.limit !== -1 && (
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-200 dark:bg-white/10">
              <div
                className={`h-full rounded-full ${usage.exhausted ? "bg-red-500" : "bg-gradient-to-r from-violet-500 to-fuchsia-500"}`}
                style={{ width: `${percentage}%` }}
              />
            </div>
          )}
          {shared && <div className="mt-4 grid grid-cols-3 gap-2">
            {(Object.keys(labels) as ServiceKey[]).filter((service) => {
              if (usage.mode === "agency_workspace") return true;
              return usage.buckets.some((bucket) =>
                bucket.services.includes(service),
              );
            }).map((service) => (
              <div
                key={service}
                className={`rounded-xl border p-3 ${service === currentService ? "border-violet-400 bg-violet-500/10" : "border-slate-200 bg-white/70 dark:border-white/10 dark:bg-white/[0.03]"}`}
              >
                <p className="truncate text-[11px] text-slate-500 dark:text-slate-400">{labels[service]}</p>
                <p className="mt-1 text-sm font-bold">{usage.byService[service].toLocaleString("en-IN")}</p>
              </div>
            ))}
          </div>}
          {individualUsage && individualUsage.buckets.length > 1 && (
            <div className="mt-4 space-y-2">
              {individualUsage.buckets.map((bucket) => (
                <div
                  key={bucket.key}
                  className="flex items-center justify-between rounded-xl border border-slate-200 bg-white/70 px-3 py-2 text-xs dark:border-white/10 dark:bg-white/[0.03]"
                >
                  <span className="text-slate-500 dark:text-slate-400">
                    {bucket.label}
                  </span>
                  <span className="font-semibold">
                    {bucket.remaining.toLocaleString("en-IN")} remaining
                  </span>
                </div>
              ))}
            </div>
          )}
          {usage.exhausted && (
            <p className="mt-4 rounded-xl bg-red-500/10 p-3 text-sm font-medium text-red-700 dark:text-red-300">
              The monthly balance is exhausted. AI replies are paused and will resume automatically next month.
            </p>
          )}
        </>
      )}
    </section>
  );
}
