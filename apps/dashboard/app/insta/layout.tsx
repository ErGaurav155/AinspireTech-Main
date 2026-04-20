"use client";

import { useEffect, useState } from "react";
import InstaSidebar from "@/components/insta/InstaSidebar";
import { Navbar } from "@/components/shared/Navbar";
import { BreadcrumbsDefault, Spinner, Toaster } from "@rocketreplai/ui";
import InstaBottomNavbar from "@/components/insta/InstaBottomNavbar";
import { useSidebar } from "@/lib/useSidebar";
import { useUser } from "@clerk/nextjs";
import {
  InstaAccountProvider,
  useInstaAccount,
} from "@/context/Instaaccountcontext ";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";

function InstaReconnectGuard() {
  const { selectedAccount, isAccLoading } = useInstaAccount();
  const pathname = usePathname();
  const router = useRouter();
  const isReconnectFlow = pathname === "/insta/accounts/add";

  const needsReconnect = Boolean(selectedAccount?.needsReconnect);
  const disconnectedReason =
    selectedAccount?.disconnectedReason ||
    "This Instagram account is disconnected. Please reconnect to continue.";

  useEffect(() => {
    if (isAccLoading || !needsReconnect) return;
    if (pathname !== "/insta/settings" && !isReconnectFlow) {
      router.replace("/insta/settings?reconnect=1");
    }
  }, [isAccLoading, isReconnectFlow, needsReconnect, pathname, router]);

  if (isAccLoading || !needsReconnect || isReconnectFlow) return null;

  return (
    <div className="fixed inset-0 z-[90] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-lg rounded-3xl border border-white/10 bg-[#101114] text-white shadow-2xl p-6">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-2xl bg-red-500/15 text-red-400 flex items-center justify-center flex-shrink-0">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div className="flex-1">
            <h2 className="text-xl font-semibold">Account Disconnected</h2>
            <p className="mt-2 text-sm text-white/70">{disconnectedReason}</p>
            {selectedAccount?.username ? (
              <p className="mt-2 text-sm text-pink-300">
                Selected account: @{selectedAccount.username}
              </p>
            ) : null}
          </div>
        </div>

        <div className="mt-6 flex flex-wrap gap-3">
          <button
            onClick={() => router.push("/insta/accounts/add")}
            className="inline-flex items-center gap-2 rounded-xl bg-pink-500 hover:bg-pink-600 px-4 py-2.5 text-sm font-medium text-white transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            Reconnect
          </button>
          {pathname !== "/insta/settings" ? (
            <button
              onClick={() => router.push("/insta/settings?reconnect=1")}
              className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] hover:bg-white/[0.08] px-4 py-2.5 text-sm font-medium text-white transition-colors"
            >
              Open Settings
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export default function InstaLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isOpen, toggle } = useSidebar(true);
  const { user, isLoaded } = useUser();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!isLoaded || !mounted) return <Spinner label="Loading dashboard…" />;

  return (
    // ✅ InstaAccountProvider wraps everything so every page and both navbars
    //    share the same selected-account state without prop-drilling.
    <InstaAccountProvider>
      <div className="min-h-screen relative overflow-auto">
        <InstaReconnectGuard />
        <div className="flex min-h-screen relative">
          <InstaSidebar isOpen={isOpen} onToggle={toggle} />

          <main
            className={`flex-1 min-w-0 transition-all duration-300 ${
              isOpen ? "md:ml-72 md:pl-1" : "md:ml-0"
            }`}
          >
            <Navbar
              onSidebarToggle={toggle}
              isSidebarOpen={isOpen}
              dashboardType="insta"
            />
            <div className="flex lg:hidden mt-2">
              <BreadcrumbsDefault />
            </div>

            {/* Bottom padding so content doesn't hide behind the mobile nav bar */}
            <div className="pb-16 md:pb-0">{children}</div>

            <Toaster />
          </main>
        </div>

        <InstaBottomNavbar />
      </div>
    </InstaAccountProvider>
  );
}
