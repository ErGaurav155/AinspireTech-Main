"use client";

import { useEffect, useState } from "react";
import InstaSidebar from "@/components/insta/InstaSidebar";
import { Navbar } from "@/components/shared/Navbar";
import { BreadcrumbsDefault, Spinner, Toaster } from "@rocketreplai/ui";

import InstaBottomNavbar from "@/components/insta/InstaBottomNavbar";
import { useSidebar } from "@/lib/useSidebar";
import { useUser } from "@clerk/nextjs";

export default function InstaLayout({
  children,
}: {
  children: React.ReactNode;
}) {
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
        <div className="flex min-h-screen relative">
          <InstaSidebar isOpen={isOpen} onToggle={toggle} />

          <main
            className={`flex-1 min-w-0 transition-all duration-300 ${
              isOpen ? "md:ml-72  md:pl-1" : "md:ml-0"
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
    </>
  );
}
