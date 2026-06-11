"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import { Lock, MessageCircle } from "lucide-react";
import { BreadcrumbsDefault, Spinner, Toaster } from "@rocketreplai/ui";
import { Navbar } from "@/components/shared/Navbar";
import WhatsAppBottomNavbar from "@/components/whatsapp/WhatsAppBottomNavbar";
import WhatsAppSidebar from "@/components/whatsapp/WhatsAppSidebar";
import { isAdminOwnerEmail } from "@/lib/admin-owner";
import { useSidebar } from "@/lib/useSidebar";

export default function WhatsAppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isOpen, toggle } = useSidebar(true);
  const router = useRouter();
  const { user, isLoaded } = useUser();
  const [mounted, setMounted] = useState(false);
  const userEmail = user?.primaryEmailAddress?.emailAddress;
  const canAccessWhatsAppDashboard = isAdminOwnerEmail(userEmail);

  useEffect(() => setMounted(true), []);

  if (!isLoaded || !mounted) {
    return <Spinner label="Loading WhatsApp dashboard..." />;
  }

  if (!canAccessWhatsAppDashboard) {
    return <WhatsAppDashboardLocked onRedirect={() => router.replace("/")} />;
  }

  return (
    <div className="min-h-screen relative overflow-auto">
      <div className="flex min-h-screen relative">
        <WhatsAppSidebar isOpen={isOpen} onToggle={toggle} />
        <main
          className={`flex-1 min-w-0 transition-all duration-300 ${
            isOpen ? "md:ml-72 md:pl-1" : "md:ml-0"
          }`}
        >
          <Navbar
            onSidebarToggle={toggle}
            isSidebarOpen={isOpen}
            dashboardType="whatsapp"
          />
          <div className="flex lg:hidden mt-2">
            <BreadcrumbsDefault />
          </div>
          <div className="pb-16 md:pb-0">{children}</div>
          <Toaster />
        </main>
      </div>
      <WhatsAppBottomNavbar />
    </div>
  );
}

function WhatsAppDashboardLocked({ onRedirect }: { onRedirect: () => void }) {
  useEffect(() => {
    const timeout = window.setTimeout(onRedirect, 2200);
    return () => window.clearTimeout(timeout);
  }, [onRedirect]);

  return (
    <div className="min-h-screen bg-[#0F0F11] px-4 py-10 text-white">
      <div className="mx-auto flex min-h-[calc(100vh-5rem)] max-w-3xl items-center justify-center">
        <div className="relative w-full overflow-hidden rounded-3xl border border-white/[0.08] bg-white/[0.04] p-6 text-center shadow-2xl backdrop-blur-xl md:p-10">
          <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-emerald-400 via-teal-400 to-cyan-300" />
          <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-500/15 text-emerald-300">
            <Lock className="h-8 w-8" />
          </div>
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1 text-xs font-bold uppercase tracking-widest text-emerald-300">
            <MessageCircle className="h-3.5 w-3.5" />
            Admin beta
          </div>
          <h1 className="text-3xl font-black tracking-tight md:text-4xl">
            WhatsApp dashboard is locked
          </h1>
          <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-white/60 md:text-base">
            This automation workspace is currently available only to the admin
            account while Meta IDs and production webhooks are being connected.
          </p>
          <button
            type="button"
            onClick={onRedirect}
            className="mt-6 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 px-5 py-2.5 text-sm font-bold text-white shadow-lg shadow-emerald-500/20 transition hover:from-emerald-600 hover:to-teal-600"
          >
            Go Home
          </button>
        </div>
      </div>
    </div>
  );
}
