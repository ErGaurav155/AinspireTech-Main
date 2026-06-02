"use client";

import { useEffect, useState } from "react";
import { useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { Lock, Rocket } from "lucide-react";
import { BreadcrumbsDefault, Spinner, Toaster } from "@rocketreplai/ui";
import CallBottomNavbar from "@/components/call/CallBottomNavbar";
import CallSidebar from "@/components/call/CallSidebar";
import { Navbar } from "@/components/shared/Navbar";
import { useSidebar } from "@/lib/useSidebar";

const CALL_DASHBOARD_ALLOWED_EMAIL = "gauravgkhaire155@gmail.com";

export default function CallLayout({ children }: { children: React.ReactNode }) {
  const { isOpen, toggle } = useSidebar(true);
  const router = useRouter();
  const { user, isLoaded } = useUser();
  const [mounted, setMounted] = useState(false);
  const userEmail = user?.primaryEmailAddress?.emailAddress?.toLowerCase();
  const canAccessCallDashboard = userEmail === CALL_DASHBOARD_ALLOWED_EMAIL;

  useEffect(() => setMounted(true), []);

  if (!isLoaded || !mounted) return <Spinner label="Loading call dashboard..." />;

  if (!canAccessCallDashboard) {
    return <CallDashboardLocked onRedirect={() => router.replace("/")} />;
  }

  return (
    <div className="min-h-screen relative overflow-auto">
      <div className="flex min-h-screen relative">
        <CallSidebar isOpen={isOpen} onToggle={toggle} />
        <main
          className={`flex-1 min-w-0 transition-all duration-300 ${
            isOpen ? "md:ml-72 md:pl-1" : "md:ml-0"
          }`}
        >
          <Navbar
            onSidebarToggle={toggle}
            isSidebarOpen={isOpen}
            dashboardType="call"
          />
          <div className="flex lg:hidden mt-2">
            <BreadcrumbsDefault />
          </div>
          <div className="pb-16 md:pb-0">{children}</div>
          <Toaster />
        </main>
      </div>
      <CallBottomNavbar />
    </div>
  );
}

function CallDashboardLocked({ onRedirect }: { onRedirect: () => void }) {
  useEffect(() => {
    const timeout = window.setTimeout(onRedirect, 2200);
    return () => window.clearTimeout(timeout);
  }, [onRedirect]);

  return (
    <div className="min-h-screen bg-[#0F0F11] px-4 py-10 text-white">
      <div className="mx-auto flex min-h-[calc(100vh-5rem)] max-w-3xl items-center justify-center">
        <div className="relative w-full overflow-hidden rounded-3xl border border-white/[0.08] bg-white/[0.04] p-6 text-center shadow-2xl backdrop-blur-xl md:p-10">
          <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-pink-500 via-rose-400 to-amber-300" />
          <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-pink-500/15 text-pink-300">
            <Lock className="h-8 w-8" />
          </div>
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-amber-400/20 bg-amber-400/10 px-3 py-1 text-xs font-bold uppercase tracking-widest text-amber-300">
            <Rocket className="h-3.5 w-3.5" />
            Beta mode
          </div>
          <h1 className="text-3xl font-black tracking-tight md:text-4xl">
            Call dashboard is locked
          </h1>
          <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-white/60 md:text-base">
            This area is in development right now and is only available to the
            internal beta account. You will be redirected back home.
          </p>
          <button
            type="button"
            onClick={onRedirect}
            className="mt-6 rounded-xl bg-gradient-to-r from-pink-500 to-rose-500 px-5 py-2.5 text-sm font-bold text-white shadow-lg shadow-pink-500/20 transition hover:from-pink-600 hover:to-rose-600"
          >
            Go Home
          </button>
        </div>
      </div>
    </div>
  );
}
