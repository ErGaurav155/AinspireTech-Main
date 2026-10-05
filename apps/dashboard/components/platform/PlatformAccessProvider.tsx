"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { usePathname, useRouter } from "next/navigation";
import { Phone } from "lucide-react";
import { useApi } from "@/lib/useApi";
import { getPlatformContext } from "@/lib/services/platform.api";

type PlatformAccess = {
  primaryAccountType?: "AGENCY" | "BUSINESS" | "MEMBER";
  clientOnly: boolean;
  clientWorkspaceId?: string;
  agencyOnly: boolean;
  agencyId?: string;
  loading: boolean;
};
const PlatformAccessContext = createContext<PlatformAccess>({ clientOnly: false, agencyOnly: false, loading: false });

const CLIENT_BLOCKED_PATHS = ["/packages", "/web/pricing", "/web/tokens", "/insta/pricing", "/whatsapp/pricing"];
const AUTOMATION_PATHS = ["/packages", "/web", "/insta", "/whatsapp", "/call"];

export function usePlatformAccess() {
  return useContext(PlatformAccessContext);
}

export default function PlatformAccessProvider({ children }: { children: React.ReactNode }) {
  const { isLoaded, isSignedIn } = useAuth();
  const { apiRequest } = useApi();
  const pathname = usePathname();
  const router = useRouter();
  const [access, setAccess] = useState<PlatformAccess>({ clientOnly: false, agencyOnly: false, loading: true });
  const matchesClientBlockedPath = CLIENT_BLOCKED_PATHS.some((path) => pathname === path || pathname.startsWith(`${path}/`));
  const instagramOAuthCallback =
    pathname === "/insta/pricing" &&
    typeof window !== "undefined" &&
    Boolean(new URLSearchParams(window.location.search).get("code"));
  const clientBlockedPath = matchesClientBlockedPath && !instagramOAuthCallback;
  const blockedPath = clientBlockedPath;
  const automationPath = AUTOMATION_PATHS.some((path) => pathname === path || pathname.startsWith(`${path}/`));
  const agencyPath = pathname === "/agency" || pathname.startsWith("/agency/");
  const callPath = pathname === "/call" || pathname.startsWith("/call/");

  useEffect(() => {
    if (!isLoaded) return;
    if (!isSignedIn) { setAccess({ clientOnly: false, agencyOnly: false, loading: false }); return; }
    let cancelled = false;
    getPlatformContext(apiRequest)
      .then((context) => {
        if (cancelled) return;
        const clientOnly = context.agencies.length === 0 && context.workspaces.length > 0 && context.workspaces.every((workspace: any) => Boolean(workspace.agencyId));
        const agencyOnly = context.primaryAccountType === "AGENCY" || (context.agencies.length > 0 && context.workspaces.length === 0);
        setAccess({ primaryAccountType: context.primaryAccountType, clientOnly, clientWorkspaceId: clientOnly ? context.workspaces[0]?._id : undefined, agencyOnly, agencyId: agencyOnly ? context.agencies[0]?._id : undefined, loading: false });
      })
      .catch(() => { if (!cancelled) setAccess({ clientOnly: false, agencyOnly: false, loading: false }); });
    return () => { cancelled = true; };
  }, [apiRequest, isLoaded, isSignedIn]);

  useEffect(() => {
    if (!access.loading && access.clientOnly && clientBlockedPath && access.clientWorkspaceId) router.replace(`/workspace/${access.clientWorkspaceId}`);
  }, [access, clientBlockedPath, router]);

  useEffect(() => {
    if (
      !access.loading &&
      access.clientOnly &&
      access.clientWorkspaceId &&
      (agencyPath || pathname === "/")
    ) {
      router.replace(`/workspace/${access.clientWorkspaceId}`);
    }
  }, [access, agencyPath, pathname, router]);

  useEffect(() => {
    if (!access.loading && access.agencyOnly && access.agencyId && (automationPath || pathname === "/")) {
      router.replace(`/agency/${access.agencyId}`);
    }
  }, [access, automationPath, pathname, router]);

  useEffect(() => {
    if (!access.loading && access.primaryAccountType === "BUSINESS" && agencyPath) {
      router.replace("/");
    }
  }, [access.loading, access.primaryAccountType, agencyPath, router]);

  const value = useMemo(() => access, [access]);
  if (isSignedIn && access.loading && (agencyPath || automationPath || pathname === "/")) return <main className="flex min-h-screen items-center justify-center bg-slate-50 text-sm text-slate-500 dark:bg-slate-950 dark:text-slate-400">Checking your account type…</main>;
  if (access.clientOnly && (agencyPath || pathname === "/")) return <main className="flex min-h-screen items-center justify-center bg-slate-50 text-sm text-slate-500 dark:bg-slate-950 dark:text-slate-400">Returning to your client workspace…</main>;
  if (access.agencyOnly && (automationPath || pathname === "/")) return <main className="flex min-h-screen items-center justify-center bg-slate-50 text-sm text-slate-500 dark:bg-slate-950 dark:text-slate-400">Returning to your agency dashboard…</main>;
  if (access.primaryAccountType === "BUSINESS" && agencyPath) return <main className="flex min-h-screen items-center justify-center bg-slate-50 text-sm text-slate-500 dark:bg-slate-950 dark:text-slate-400">Returning to your individual dashboard…</main>;
  if (callPath) return <main className="flex min-h-screen items-center justify-center bg-slate-950 px-5 text-center text-white"><div className="max-w-xl rounded-3xl border border-cyan-500/25 bg-cyan-500/10 p-10"><Phone className="mx-auto h-10 w-10 text-cyan-400" /><p className="mt-6 text-sm font-semibold uppercase tracking-widest text-cyan-300">Coming soon</p><h1 className="mt-3 text-3xl font-bold">AI Call Assistant is not open yet</h1><p className="mt-4 text-slate-300">The service is visible as a preview only. Your existing dashboards and data are unaffected.</p></div></main>;
  if (blockedPath && (access.loading || access.clientOnly)) return <main className="flex min-h-screen items-center justify-center bg-slate-950 text-sm text-slate-400">Returning to your agency-managed workspace…</main>;
  return <PlatformAccessContext.Provider value={value}>{children}</PlatformAccessContext.Provider>;
}
