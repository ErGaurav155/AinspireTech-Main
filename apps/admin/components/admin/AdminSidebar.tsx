"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import Logo from "@/public/assets/img/logo.png";
import { usePathname, useRouter } from "next/navigation";
import { useAuth, useUser } from "@clerk/nextjs";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard,
  CalendarDays,
  Activity,
  Settings,
  Instagram,
  Globe,
  Shield,
  LogOut,
  CreditCard,
  X,
} from "lucide-react";
import { useApi } from "@/lib/useApi";
import { verifyOwner } from "@/lib/services/admin-actions.api";
import { AvatarCircle, Orbs, useThemeStyles } from "@rocketreplai/ui";
import Image from "next/image";
const NAV_ITEMS = [
  { label: "Home", href: "/admin", icon: LayoutDashboard, color: "blue" },
  {
    label: "Subscriptions",
    href: "/admin/subscriptions",
    icon: CreditCard,
    color: "green",
  },
  {
    label: "Appointments",
    href: "/admin/appointments",
    icon: CalendarDays,
    color: "purple",
  },
  {
    label: "Rate Limits",
    href: "/admin/rate-limits",
    icon: Activity,
    color: "amber",
  },
  {
    label: "Instagram Users",
    href: "/admin/insta",
    icon: Instagram,
    color: "pink",
  },
  { label: "Web Users", href: "/admin/web", icon: Globe, color: "cyan" },
] as const;

const BOTTOM_NAV_ITEMS = [
  { label: "Settings", href: "/admin/settings", icon: Settings, color: "gray" },
] as const;

interface AdminSidebarProps {
  isOpen: boolean;
  onToggle: () => void;
}

export default function AdminSidebar({ isOpen, onToggle }: AdminSidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { userId, signOut } = useAuth();
  const { user } = useUser();
  const { apiRequest } = useApi();
  const { styles, isDark } = useThemeStyles();

  const [isOwner, setIsOwner] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkOwner = async () => {
      if (!userId) return;
      try {
        const result = await verifyOwner(apiRequest);
        setIsOwner(result.isOwner);
      } catch {
        setIsOwner(false);
      } finally {
        setIsLoading(false);
      }
    };
    checkOwner();
  }, [userId, apiRequest]);

  useEffect(() => {
    if (!isLoading && !isOwner && userId) {
      router.push("/");
    }
  }, [isLoading, isOwner, userId, router]);

  const isActive = useCallback(
    (href: string) =>
      href === "/admin" ? pathname === "/admin" : pathname.startsWith(href),
    [pathname],
  );

  const handleSignOut = useCallback(async () => {
    await signOut();
    router.push("/");
  }, [signOut, router]);

  const getColorClasses = useCallback(
    (color: string, active: boolean) => {
      const base = active
        ? isDark
          ? `bg-${color}-500/20 border border-${color}-500/30`
          : `bg-${color}-100`
        : isDark
          ? "bg-white/[0.03] border border-white/[0.06]"
          : "bg-gray-50";

      const text = active
        ? isDark
          ? `text-${color}-400`
          : `text-${color}-600`
        : styles.text.secondary;

      const hover = active
        ? isDark
          ? `bg-${color}-500/10`
          : `bg-${color}-50`
        : isDark
          ? "hover:bg-white/[0.03]"
          : "hover:bg-gray-50";

      const dot = active
        ? isDark
          ? `bg-${color}-400`
          : `bg-${color}-600`
        : "";

      return { base, text, hover, dot };
    },
    [isDark, styles.text.secondary],
  );

  if (!isOwner) return null;

  return (
    <>
      {isDark && <Orbs />}

      <AnimatePresence>
        {isOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className={`fixed inset-0 z-40 md:hidden ${
                isDark
                  ? "bg-black/40 backdrop-blur-sm"
                  : "bg-gray-900/20 backdrop-blur-sm"
              }`}
              onClick={onToggle}
            />

            <motion.div
              initial={{ x: -320 }}
              animate={{ x: 0 }}
              exit={{ x: -320 }}
              transition={{ type: "spring", stiffness: 320, damping: 32 }}
              className={`fixed top-0 bottom-0 md:top-1 md:bottom-1 left-0 md:left-1 w-72 z-50 rounded-lg shadow-xl backdrop-blur-sm overflow-hidden shimmer
                ${
                  isDark
                    ? "glass-sidebar border border-white/[0.05]"
                    : "bg-white border-r border-gray-200 shadow-lg"
                }`}
            >
              <div className="flex flex-col h-full relative z-10">
                <button
                  onClick={onToggle}
                  className={`absolute top-4 right-4 p-1.5 rounded-lg transition-colors md:hidden ${styles.pill}`}
                >
                  <X className={`h-4 w-4 ${styles.text.secondary}`} />
                </button>

                <div className={`p-3 border-b ${styles.divider}`}>
                  <Link href="/admin" className="flex items-center gap-2.5">
                    <Image
                      alt="Logo"
                      src={Logo}
                      // width={100}
                      // height={100}
                      className="object-cover h-14 w-full"
                    />
                  </Link>
                </div>

                <div className="px-4 pt-4">
                  <div className={`rounded-xl p-3 ${styles.innerCard}`}>
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full flex items-center justify-center bg-gradient-to-r from-blue-500 to-cyan-400">
                        <Shield className="h-4 w-4 text-white" />
                      </div>
                      <div>
                        <p className="text-xs font-medium text-blue-400">
                          Admin Access
                        </p>
                        <p
                          className={`text-xs font-bold truncate max-w-[150px] ${styles.text.secondary}`}
                        >
                          {user?.primaryEmailAddress?.emailAddress || "Owner"}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto mt-2">
                  {[...NAV_ITEMS, ...BOTTOM_NAV_ITEMS].map((item) => {
                    const active = isActive(item.href);
                    const Icon = item.icon;
                    const { base, text, hover, dot } = getColorClasses(
                      item.color,
                      active,
                    );

                    return (
                      <Link
                        key={item.label + item.href}
                        href={item.href}
                        onClick={() => {
                          if (window.innerWidth < 768) onToggle();
                        }}
                        className={`flex items-center justify-between px-3 py-2.5 rounded-xl transition-all duration-150 group relative overflow-hidden ${hover}`}
                      >
                        {active && (
                          <motion.span
                            layoutId="sidebar-active"
                            className={`absolute inset-0 rounded-xl ${isDark ? "bg-white/[0.03]" : "bg-gray-100"}`}
                            transition={{
                              type: "spring",
                              stiffness: 380,
                              damping: 30,
                            }}
                          />
                        )}

                        <div className="flex items-center gap-3 relative z-10">
                          <div
                            className={`w-7 h-7 rounded-lg flex items-center justify-center ${base}`}
                          >
                            <Icon className={`h-4 w-4 ${text}`} />
                          </div>
                          <span className={`text-sm font-medium ${text}`}>
                            {item.label}
                          </span>
                        </div>

                        {active && (
                          <div
                            className={`w-1 h-6 rounded-full relative z-10 ${dot}`}
                          />
                        )}
                      </Link>
                    );
                  })}
                </nav>

                <div className={`p-4 border-t ${styles.divider}`}>
                  <div className={`rounded-xl p-3 ${styles.innerCard}`}>
                    <div className="flex items-center gap-3 mb-3">
                      <AvatarCircle
                        name={user?.fullName || "Admin User"}
                        idx={0}
                      />
                      <div className="flex-1 min-w-0">
                        <p
                          className={`text-xs font-semibold truncate ${styles.text.primary}`}
                        >
                          {user?.fullName || "Admin User"}
                        </p>
                        <p
                          className={`text-[10px] truncate ${styles.text.muted}`}
                        >
                          {user?.primaryEmailAddress?.emailAddress || ""}
                        </p>
                      </div>
                    </div>

                    <button
                      onClick={handleSignOut}
                      className={`w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs transition-colors ${styles.pill}`}
                    >
                      <LogOut
                        className={`h-3.5 w-3.5 ${styles.text.secondary}`}
                      />
                      <span className={styles.text.secondary}>Sign Out</span>
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
