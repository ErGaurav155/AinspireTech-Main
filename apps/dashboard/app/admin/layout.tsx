"use client";

import { useState, useEffect } from "react";
import AdminSidebar from "@/components/admin/AdminSidebar";
import { AdminNavbar } from "@/components/admin/AdminNavbar";
import AdminBottomNavbar from "@/components/admin/AdminBottomNavbar";
import { Toaster } from "@rocketreplai/ui/components/radix/toaster";
import { BreadcrumbsDefault } from "@rocketreplai/ui/components/shared/breadcrumbs";

export default function AdminLayout({
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
    <div className="flex min-h-screen bg-[#F8F9FA]">
      <AdminSidebar isOpen={isSidebarOpen} onToggle={toggleSidebar} />

      <main
        className={`flex-1 min-w-0 transition-all duration-300 ${
          isSidebarOpen ? "md:ml-72" : "md:ml-0"
        }`}
      >
        <AdminNavbar
          onSidebarToggle={toggleSidebar}
          isSidebarOpen={isSidebarOpen}
        />
        <div className="flex sm:hidden px-4 pt-2">
          <BreadcrumbsDefault />
        </div>

        {/* Bottom padding on mobile so content isn't hidden behind the nav bar */}
        <div className="pb-16 md:pb-0">{children}</div>

        <Toaster />
      </main>

      {/* Mobile bottom navigation */}
      <AdminBottomNavbar />
    </div>
  );
}
