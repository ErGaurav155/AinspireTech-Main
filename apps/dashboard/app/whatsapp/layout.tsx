"use client";

import { useEffect, useState } from "react";
import { BreadcrumbsDefault, Spinner, Toaster } from "@rocketreplai/ui";
import { Navbar } from "@/components/shared/Navbar";
import WhatsAppBottomNavbar from "@/components/whatsapp/WhatsAppBottomNavbar";
import WhatsAppSidebar from "@/components/whatsapp/WhatsAppSidebar";
import { useSidebar } from "@/lib/useSidebar";

export default function WhatsAppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isOpen, toggle } = useSidebar(true);
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  if (!mounted) {
    return <Spinner label="Loading WhatsApp dashboard..." />;
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
