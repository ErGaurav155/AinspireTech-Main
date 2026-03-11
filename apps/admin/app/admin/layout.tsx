"use client";

import AdminSidebar from "@/components/admin/AdminSidebar";
import { AdminNavbar } from "@/components/admin/AdminNavbar";
import AdminBottomNavbar from "@/components/admin/AdminBottomNavbar";
import { Toaster } from "@rocketreplai/ui";
import { useSidebar } from "@/lib/useSidebar";
import { useUser } from "@clerk/nextjs";
import { useEffect, useState } from "react";
import { Spinner } from "@rocketreplai/ui";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, isLoaded } = useUser();
  const { isOpen, toggle } = useSidebar();
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);
  if (!isLoaded || !mounted) return <Spinner label="Loading dashboard…" />;

  return (
    <>
      <div className="min-h-screen relative overflow-auto ">
        <div className="flex min-h-screen relative ">
          <AdminSidebar isOpen={isOpen} onToggle={toggle} />

          <main
            className={`flex-1 min-w-0 transition-all duration-300 ${isOpen ? "md:ml-72 md:pl-1 " : "md:ml-0"}`}
          >
            <AdminNavbar onSidebarToggle={toggle} isSidebarOpen={isOpen} />
            <div className="pb-16 md:pb-0">{children}</div>

            <Toaster />
          </main>
        </div>

        <AdminBottomNavbar />
      </div>
    </>
  );
}
