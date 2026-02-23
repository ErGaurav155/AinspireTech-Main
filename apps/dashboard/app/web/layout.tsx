// app/web/layout.tsx
"use client";

import { useEffect, useState } from "react";
import WebSidebar from "@/components/web/WebSidebar";
import { Navbar } from "@/components/shared/Navbar";
import { Toaster } from "@rocketreplai/ui/components/radix/toaster";
import { BreadcrumbsDefault } from "@rocketreplai/ui/components/shared/breadcrumbs";
import WebBottomNavbar from "@/components/web/WebBottomNavbar";

export default function WebLayout({ children }: { children: React.ReactNode }) {
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
    <div className="flex bg-[#F8F9FA]">
      <WebSidebar isOpen={isSidebarOpen} onToggle={toggleSidebar} />

      <main
        className={`flex-1 min-w-0  transition-all duration-300 ${
          isSidebarOpen ? "md:ml-60 lg:ml-72" : "md:ml-0"
        }`}
      >
        <Navbar
          onSidebarToggle={toggleSidebar}
          isSidebarOpen={isSidebarOpen}
          dashboardType="web"
        />
        <div className="flex lg:hidden">
          <BreadcrumbsDefault />
        </div>

        {/* Bottom padding on mobile so content isn't hidden behind the nav bar */}
        <div className="pb-16 md:pb-0">{children}</div>

        <Toaster />
      </main>

      {/* Mobile bottom navigation with chatbot switcher */}
      <WebBottomNavbar />
    </div>
  );
}
