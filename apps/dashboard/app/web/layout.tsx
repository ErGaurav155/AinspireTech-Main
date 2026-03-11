"use client";

import { useEffect, useState } from "react";
import WebSidebar from "@/components/web/WebSidebar";
import { Navbar } from "@/components/shared/Navbar";

import { useSidebar } from "@/lib/useSidebar";
import { useUser } from "@clerk/nextjs";
import WebBottomNavbar from "@/components/web/WebBottomNavbar";
import { BreadcrumbsDefault, Spinner, Toaster } from "@rocketreplai/ui";
export default function WebLayout({ children }: { children: React.ReactNode }) {
  const { isOpen, toggle } = useSidebar(true); // Default open on desktop
  const { user, isLoaded } = useUser();
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);
  if (!isLoaded || !mounted) return <Spinner label="Loading dashboard…" />;

  return (
    <>
      <div className="min-h-screen relative overflow-auto ">
        <div className="flex min-h-screen relative ">
          <WebSidebar isOpen={isOpen} onToggle={toggle} />

          <main
            className={`flex-1 min-w-0 transition-all duration-300 ${isOpen ? "md:ml-72 md:pl-1 " : "md:ml-0"}`}
          >
            <Navbar
              onSidebarToggle={toggle}
              isSidebarOpen={isOpen}
              dashboardType="web"
            />
            <div className="flex lg:hidden mt-2">
              <BreadcrumbsDefault />
            </div>
            {/* Bottom padding on mobile so content isn't hidden behind the nav bar */}
            <div className="pb-16 md:pb-0">{children}</div>
            <Toaster />
          </main>
        </div>
        <WebBottomNavbar />
      </div>
    </>
  );
}
