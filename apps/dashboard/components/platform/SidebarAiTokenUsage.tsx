"use client";

import { useEffect, useMemo, useState } from "react";
import { Coins } from "lucide-react";
import { useThemeStyles } from "@rocketreplai/ui";
import { useApi } from "@/lib/useApi";
import {
  getWorkspaceAiTokenUsage,
  type WorkspaceAiTokenUsage,
} from "@/lib/services/platform.api";
import { usePlatformAccess } from "./PlatformAccessProvider";

const compactNumber = new Intl.NumberFormat("en", {
  notation: "compact",
  maximumFractionDigits: 1,
});

export default function SidebarAiTokenUsage() {
  const { isDark } = useThemeStyles();
  const { apiRequest } = useApi();
  const { primaryAccountType, clientWorkspaceId } = usePlatformAccess();
  const [usage, setUsage] = useState<WorkspaceAiTokenUsage | null>(null);

  useEffect(() => {
    if (primaryAccountType !== "MEMBER" || !clientWorkspaceId) {
      setUsage(null);
      return;
    }

    let cancelled = false;
    const load = async () => {
      try {
        const nextUsage = await getWorkspaceAiTokenUsage(
          apiRequest,
          clientWorkspaceId,
        );
        if (!cancelled) setUsage(nextUsage);
      } catch {
        if (!cancelled) setUsage(null);
      }
    };
    void load();
    const interval = window.setInterval(load, 60_000);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [apiRequest, clientWorkspaceId, primaryAccountType]);

  const percent = useMemo(() => {
    if (!usage || usage.limit <= 0) return 0;
    return Math.min(100, Math.round((usage.used / usage.limit) * 100));
  }, [usage]);

  if (primaryAccountType !== "MEMBER" || !usage) return null;

  return (
    <div className="px-4 pb-2">
      <div
        className={`rounded-xl border p-3 ${
          isDark
            ? "border-violet-400/15 bg-violet-400/[0.07]"
            : "border-violet-100 bg-violet-50/80"
        }`}
      >
        <div className="flex items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-2">
            <Coins className="h-4 w-4 flex-shrink-0 text-violet-500" />
            <span
              className={`truncate text-xs font-semibold ${
                isDark ? "text-white/75" : "text-slate-700"
              }`}
            >
              Shared agency AI tokens
            </span>
          </div>
          <span
            className={`flex-shrink-0 text-xs font-bold ${
              usage.exhausted
                ? "text-red-500"
                : isDark
                  ? "text-violet-300"
                  : "text-violet-700"
            }`}
          >
            {compactNumber.format(usage.remaining)} left
          </span>
        </div>
        <div
          className={`mt-2 h-1.5 overflow-hidden rounded-full ${
            isDark ? "bg-white/10" : "bg-violet-100"
          }`}
        >
          <div
            className={`h-full rounded-full ${
              usage.exhausted
                ? "bg-red-500"
                : "bg-gradient-to-r from-violet-500 to-fuchsia-500"
            }`}
            style={{ width: `${percent}%` }}
          />
        </div>
        <p
          className={`mt-1.5 text-[10px] ${
            isDark ? "text-white/40" : "text-slate-500"
          }`}
        >
          {compactNumber.format(usage.used)} of {compactNumber.format(usage.limit)} used across all services
        </p>
      </div>
    </div>
  );
}
