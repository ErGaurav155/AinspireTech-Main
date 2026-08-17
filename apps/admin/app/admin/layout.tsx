"use client";

import AdminSidebar from "@/components/admin/AdminSidebar";
import { AdminNavbar } from "@/components/admin/AdminNavbar";
import AdminBottomNavbar from "@/components/admin/AdminBottomNavbar";
import { Toaster } from "@rocketreplai/ui";
import { useSidebar } from "@/lib/useSidebar";
import { useAuth, useUser } from "@clerk/nextjs";
import { useEffect, useState } from "react";
import { GateScreen, Spinner, useThemeStyles } from "@rocketreplai/ui";
import { ShieldAlert } from "lucide-react";
import { useApi } from "@/lib/useApi";
import { verifyOwner } from "@/lib/services/admin-actions.api";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, isLoaded } = useUser();
  const { signOut } = useAuth();
  const { apiRequest } = useApi();
  const { styles } = useThemeStyles();
  const { isOpen, toggle } = useSidebar();
  const currentUserId = user?.id;
  const [mounted, setMounted] = useState(false);
  const [access, setAccess] = useState<
    "checking" | "granted" | "denied" | "error"
  >("checking");
  const [accessAttempt, setAccessAttempt] = useState(0);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!isLoaded || !currentUserId) return;
    let active = true;
    setAccess("checking");
    verifyOwner(apiRequest)
      .then((result) => {
        if (active) setAccess(result?.isOwner ? "granted" : "denied");
      })
      .catch(() => {
        if (active) setAccess("error");
      });
    return () => {
      active = false;
    };
  }, [accessAttempt, apiRequest, currentUserId, isLoaded]);

  if (!isLoaded || !mounted || access === "checking") {
    return <Spinner label="Verifying owner access…" />;
  }

  if (!user || access === "denied" || access === "error") {
    return (
      <GateScreen
        icon={<ShieldAlert className="h-8 w-8 text-red-500" />}
        title={access === "error" ? "Access check unavailable" : "Owner access required"}
        body={
          access === "error"
            ? "The admin API could not verify this session. Please sign in again."
            : "This console is restricted to the RocketReplai owner account."
        }
        subText={user?.primaryEmailAddress?.emailAddress || undefined}
      >
        <div className="flex flex-col gap-2">
          {access === "error" && (
            <button
              className="rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-blue-700"
              onClick={() => {
                setAccess("checking");
                setAccessAttempt((value) => value + 1);
              }}
            >
              Retry access check
            </button>
          )}
          <button
            className={`px-5 py-2.5 text-sm font-medium ${styles.pill}`}
            onClick={() => void signOut({ redirectUrl: "/sign-in" })}
          >
            {access === "error" ? "Sign out" : "Sign in with owner account"}
          </button>
        </div>
      </GateScreen>
    );
  }

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
