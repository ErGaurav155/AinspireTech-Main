// app/insta/layout.tsx
"use client";

import { useEffect, useState } from "react";
import InstaSidebar from "@/components/insta/InstaSidebar";
import { Navbar } from "@/components/shared/Navbar";
import { Toaster } from "@rocketreplai/ui/components/radix/toaster";
import { BreadcrumbsDefault } from "@rocketreplai/ui/components/shared/breadcrumbs";
import InstaBottomNavbar from "@/components/insta/InstaBottomNavbar";

// Replace these with however you fetch the connected IG account in your app
// e.g. from a context, SWR hook, server component prop, etc.
const PLACEHOLDER_ACCOUNT = {
  accountName: undefined as string | undefined,
  accountHandle: undefined as string | undefined,
  accountAvatarUrl: undefined as string | undefined,
};

export default function InstaLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
    setIsSidebarOpen(window.innerWidth >= 768);

    const handleResize = () => {
      setIsSidebarOpen(window.innerWidth >= 768);
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const toggleSidebar = () => setIsSidebarOpen((prev) => !prev);

  return (
    <div className="flex min-h-screen bg-[#F8F9FC]">
      <InstaSidebar
        isOpen={isSidebarOpen}
        onToggle={toggleSidebar}
        accountName={PLACEHOLDER_ACCOUNT.accountName}
        accountHandle={PLACEHOLDER_ACCOUNT.accountHandle}
      />

      <main
        className={`flex-1 min-w-0 transition-all duration-300 min-h-screen ${
          isSidebarOpen ? "md:ml-72" : "md:ml-0"
        }`}
      >
        <Navbar
          onSidebarToggle={toggleSidebar}
          isSidebarOpen={isSidebarOpen}
          dashboardType="insta"
        />
        <div className="flex lg:hidden">
          <BreadcrumbsDefault />
        </div>

        {/* Bottom padding so content doesn't hide behind the mobile nav bar */}
        <div className="pb-16 md:pb-0">{children}</div>

        <Toaster />
      </main>

      {/* Mobile bottom navigation — receives same account info as sidebar */}
      <InstaBottomNavbar
        accountName={PLACEHOLDER_ACCOUNT.accountName}
        accountHandle={PLACEHOLDER_ACCOUNT.accountHandle}
        accountAvatarUrl={PLACEHOLDER_ACCOUNT.accountAvatarUrl}
      />
    </div>
  );
}
