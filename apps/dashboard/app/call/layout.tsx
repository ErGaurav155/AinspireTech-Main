"use client";

import { useEffect, useState } from "react";
import { useUser } from "@clerk/nextjs";
import { BreadcrumbsDefault, Spinner, Toaster } from "@rocketreplai/ui";
import CallBottomNavbar from "@/components/call/CallBottomNavbar";
import CallSidebar from "@/components/call/CallSidebar";
import { Navbar } from "@/components/shared/Navbar";
import { useSidebar } from "@/lib/useSidebar";

export default function CallLayout({ children }: { children: React.ReactNode }) {
  const { isOpen, toggle } = useSidebar(true);
  const { isLoaded } = useUser();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  if (!isLoaded || !mounted) return <Spinner label="Loading call dashboard..." />;

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
