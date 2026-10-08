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

const CLIENT_BLOCKED_PATHS = ["/packages", "/web/pricing", "/insta/pricing", "/whatsapp/pricing"];
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
  const automationPath = AUTOMATION_PATHS.some((path) => pathname === path || pathname.startsWith(`${path}/`));
  const agencyPath = pathname === "/agency" || pathname.startsWith("/agency/");
  const workspacePath = pathname === "/workspace" || pathname.startsWith("/workspace/");
  const workspaceSelectionPath = pathname === "/select-workspace";
  const callPath = pathname === "/call" || pathname.startsWith("/call/");

  useEffect(() => {
    if (!isLoaded) return;
    if (!isSignedIn) { setAccess({ clientOnly: false, agencyOnly: false, loading: false }); return; }
    let cancelled = false;
    getPlatformContext(apiRequest)
      .then((context) => {
        if (cancelled) return;
        const clientOnly = context.primaryAccountType === "MEMBER" && context.agencies.length === 0 && context.workspaces.length > 0 && context.workspaces.every((workspace: any) => Boolean(workspace.agencyId));
        const agencyOnly = context.primaryAccountType === "AGENCY";
        setAccess({ primaryAccountType: context.primaryAccountType, clientOnly, clientWorkspaceId: clientOnly ? context.workspaces[0]?._id : undefined, agencyOnly, agencyId: agencyOnly ? context.agencies[0]?._id : undefined, loading: false });
      })
      .catch(() => { if (!cancelled) setAccess({ clientOnly: false, agencyOnly: false, loading: false }); });
    return () => { cancelled = true; };
  }, [apiRequest, isLoaded, isSignedIn]);

  const redirectTarget = useMemo(() => {
    if (access.loading) return null;

    const clientWorkspacePath = access.clientWorkspaceId
      ? `/workspace/${access.clientWorkspaceId}`
      : null;
    const outsideClientWorkspace =
      workspacePath &&
      clientWorkspacePath &&
      pathname !== clientWorkspacePath &&
      !pathname.startsWith(`${clientWorkspacePath}/`);

    if (
      access.primaryAccountType === "MEMBER" &&
      access.clientWorkspaceId &&
      (agencyPath || workspaceSelectionPath || clientBlockedPath || outsideClientWorkspace || pathname === "/")
    ) {
      return clientWorkspacePath;
    }

    if (
      access.primaryAccountType === "AGENCY" &&
      access.agencyId &&
      (automationPath || workspaceSelectionPath || pathname === "/")
    ) {
      return `/agency/${access.agencyId}`;
    }

    if (
      access.primaryAccountType === "BUSINESS" &&
      (agencyPath || workspacePath || workspaceSelectionPath)
    ) {
      return "/";
    }

    return null;
  }, [access, agencyPath, automationPath, clientBlockedPath, pathname, workspacePath, workspaceSelectionPath]);

  useEffect(() => {
    if (redirectTarget) router.replace(redirectTarget);
  }, [redirectTarget, router]);

  const value = useMemo(() => access, [access]);
  if (isSignedIn && access.loading && (agencyPath || workspacePath || workspaceSelectionPath || automationPath || pathname === "/")) return <main className="flex min-h-screen items-center justify-center bg-slate-50 text-sm text-slate-500 dark:bg-slate-950 dark:text-slate-400">Checking your account type…</main>;
  if (redirectTarget && access.primaryAccountType === "MEMBER") return <main className="flex min-h-screen items-center justify-center bg-slate-50 text-sm text-slate-500 dark:bg-slate-950 dark:text-slate-400">Returning to your client workspace…</main>;
  if (redirectTarget && access.primaryAccountType === "AGENCY") return <main className="flex min-h-screen items-center justify-center bg-slate-50 text-sm text-slate-500 dark:bg-slate-950 dark:text-slate-400">Returning to your agency dashboard…</main>;
  if (redirectTarget && access.primaryAccountType === "BUSINESS") return <main className="flex min-h-screen items-center justify-center bg-slate-50 text-sm text-slate-500 dark:bg-slate-950 dark:text-slate-400">Returning to your individual dashboard…</main>;
  if (callPath) return <main className="flex min-h-screen items-center justify-center bg-slate-950 px-5 text-center text-white"><div className="max-w-xl rounded-3xl border border-cyan-500/25 bg-cyan-500/10 p-10"><Phone className="mx-auto h-10 w-10 text-cyan-400" /><p className="mt-6 text-sm font-semibold uppercase tracking-widest text-cyan-300">Coming soon</p><h1 className="mt-3 text-3xl font-bold">AI Call Assistant is not open yet</h1><p className="mt-4 text-slate-300">The service is visible as a preview only. Your existing dashboards and data are unaffected.</p></div></main>;
  return <PlatformAccessContext.Provider value={value}>{children}</PlatformAccessContext.Provider>;
}
