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
    <div className="relative min-h-screen w-full overflow-x-hidden">
      <div className="relative flex min-h-screen w-full min-w-0">
        <WhatsAppSidebar isOpen={isOpen} onToggle={toggle} />
        <main
          className={`w-full min-w-0 flex-1 overflow-x-hidden transition-all duration-300 ${
            isOpen ? "md:ml-72 md:pl-1" : "md:ml-0"
          }`}
        >
          <Navbar
            onSidebarToggle={toggle}
            isSidebarOpen={isOpen}
            dashboardType="whatsapp"
          />
          <div className="mt-2 min-w-0 overflow-x-auto lg:hidden">
            <BreadcrumbsDefault />
          </div>
          <div className="min-w-0 pb-20 md:pb-0">{children}</div>
          <Toaster />
        </main>
      </div>
      <WhatsAppBottomNavbar />
    </div>
  );
}
