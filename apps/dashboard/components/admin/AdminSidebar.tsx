"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth, useUser } from "@clerk/nextjs";
import {
  LayoutDashboard,
  Users,
  CalendarDays,
  Activity,
  Settings,
  Menu,
  X,
  BarChart3,
  Instagram,
  Globe,
  Shield,
  ChevronDown,
  LogOut,
  AlertTriangle,
  CreditCard,
  Mail,
  User,
  Home,
  Sparkles,
  Check,
  Crown,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { useTheme } from "next-themes";
import { useApi } from "@/lib/useApi";
import { verifyOwner } from "@/lib/services/admin-actions.api";

import { useThemeStyles } from "@/lib/theme";
import { Orbs } from "@/components/shared/Orbs";
import { AvatarCircle } from "@/components/shared/AvatarCircle";

const AVATAR_COLORS = [
  "#f59e0b",
  "#3b82f6",
  "#22c55e",
  "#ef4444",
  "#a855f7",
  "#06b6d4",
];

const NAV_ITEMS = [
  {
    label: "Home",
    href: "/admin",
    icon: LayoutDashboard,
    color: "blue",
  },
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
  {
    label: "Web Users",
    href: "/admin/web",
    icon: Globe,
    color: "cyan",
  },
];

const BOTTOM_NAV_ITEMS = [
  {
    label: "Settings",
    href: "/admin/settings",
    icon: Settings,
    color: "gray",
  },
];

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
  const { resolvedTheme } = useTheme();
  const { styles, isDark } = useThemeStyles();

  const [isOwner, setIsOwner] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Verify owner on mount
  useEffect(() => {
    const checkOwner = async () => {
      if (!userId) return;
      try {
        const result = await verifyOwner(apiRequest);
        setIsOwner(result.isOwner);
      } catch (error) {
        console.error("Error verifying owner:", error);
        setIsOwner(false);
      } finally {
        setIsLoading(false);
      }
    };
    checkOwner();
  }, [userId, apiRequest]);

  // Redirect if not owner
  useEffect(() => {
    if (!isLoading && !isOwner && userId) {
      router.push("/");
    }
  }, [isLoading, isOwner, userId, router]);

  // Memoize active state check
  const isActive = useCallback(
    (href: string) => {
      if (href === "/admin") {
        return pathname === "/admin";
      }
      return pathname.startsWith(href);
    },
    [pathname],
  );

  // Get user initials
  const getUserInitials = useCallback(() => {
    if (!user) return "A";
    const firstName = user.firstName || "";
    const lastName = user.lastName || "";
    return (firstName[0] || "") + (lastName[0] || "") || "A";
  }, [user]);

  // Handle sign out
  const handleSignOut = useCallback(async () => {
    await signOut();
    router.push("/");
  }, [signOut, router]);

  if (!isOwner) return null;

  // Helper to get color‑specific classes for nav items (since not in base theme)
  const getColorClasses = (color: string, active: boolean) => {
    const colorMap: Record<string, { light: string; dark: string }> = {
      blue: {
        light: "bg-blue-100",
        dark: "bg-blue-500/20 border border-blue-500/30",
      },
      green: {
        light: "bg-green-100",
        dark: "bg-green-500/20 border border-green-500/30",
      },
      purple: {
        light: "bg-purple-100",
        dark: "bg-purple-500/20 border border-purple-500/30",
      },
      amber: {
        light: "bg-amber-100",
        dark: "bg-amber-500/20 border border-amber-500/30",
      },
      pink: {
        light: "bg-pink-100",
        dark: "bg-pink-500/20 border border-pink-500/30",
      },
      cyan: {
        light: "bg-cyan-100",
        dark: "bg-cyan-500/20 border border-cyan-500/30",
      },
      gray: {
        light: "bg-gray-100",
        dark: "bg-gray-500/20 border border-gray-500/30",
      },
    };

    const iconBg = active
      ? isDark
        ? `bg-${color}-500/20 border border-${color}-500/30`
        : `bg-${color}-100`
      : isDark
        ? "bg-white/[0.03] border border-white/[0.06]"
        : "bg-white/[0.03] border border-white/[0.06]"; // same as dark? original used bg-white/[0.03] for both

    const textColor = active
      ? isDark
        ? `text-${color}-400`
        : `text-${color}-600`
      : styles.text.secondary;

    const bgHover = active
      ? isDark
        ? `bg-${color}-500/10`
        : `bg-${color}-50`
      : isDark
        ? "hover:bg-white/[0.03]"
        : "hover:bg-gray-50";

    const activeDot = active
      ? isDark
        ? `bg-${color}-400`
        : `bg-${color}-600`
      : "";

    return { iconBg, textColor, bgHover, activeDot };
  };

  return (
    <>
      {/* Background orbs for dark mode */}
      {isDark && <Orbs />}

      {/* Unified sidebar */}
      <div
        className={`fixed top-0 bottom-0 md:top-1 md:bottom-1 rounded-lg w-72 z-50 shadow-xl transition-transform duration-300 backdrop-blur-sm
          ${isOpen ? "translate-x-0 left-0 md:left-1" : "-translate-x-full left-0"}
          ${isDark ? "glass-sidebar border border-white/[0.05]" : "bg-white border-r border-gray-200 shadow-lg"} overflow-hidden shimmer`}
      >
        {/* Close button for mobile */}
        <button
          onClick={onToggle}
          className={`absolute top-4 right-4 p-1.5 rounded-lg transition-colors md:hidden ${styles.pill}`}
        >
          <X className={`h-4 w-4 ${styles.text.secondary}`} />
        </button>

        <div className="flex flex-col h-full relative z-10">
          {/* Logo */}
          <div className={`p-5 border-b ${styles.divider}`}>
            <Link href="/admin" className="flex items-center gap-2.5 group">
              <div className="relative h-9 w-9 flex-shrink-0">
                <div className="absolute inset-0 rounded-full bg-gradient-to-r from-blue-500 to-cyan-400 shadow-lg" />
                <div className="absolute inset-[3px] rounded-full bg-white dark:bg-[#1A1A1E] flex items-center justify-center">
                  <span className="text-white text-xs font-bold">A</span>
                </div>
              </div>
              <span className="text-xl font-black tracking-tight">
                <span className="text-blue-400">Ainpire</span>
                <span className="text-blue-500">Tech</span>
              </span>
            </Link>
          </div>

          {/* Admin Badge */}
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

          {/* Navigation */}
          <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto mt-2">
            {NAV_ITEMS.map((item, idx) => {
              const active = isActive(item.href);
              const Icon = item.icon;
              const { iconBg, textColor, bgHover, activeDot } = getColorClasses(
                item.color,
                active,
              );

              return (
                <Link
                  key={item.label + item.href}
                  href={item.href}
                  onClick={() => {
                    if (window.innerWidth < 768) {
                      onToggle();
                    }
                  }}
                  className={`flex items-center justify-between px-3 py-2.5 rounded-xl transition-all duration-150 group relative overflow-hidden ${bgHover}`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-7 h-7 rounded-lg flex items-center justify-center transition-all duration-150 ${iconBg}`}
                    >
                      <Icon className={`h-4 w-4 ${textColor}`} />
                    </div>
                    <span className={`text-sm font-medium ${textColor}`}>
                      {item.label}
                    </span>
                  </div>
                  {active && (
                    <div className={`w-1 h-6 rounded-full ${activeDot}`} />
                  )}
                </Link>
              );
            })}

            <div className={`my-2 border-t ${styles.divider}`} />

            {BOTTOM_NAV_ITEMS.map((item) => {
              const active = isActive(item.href);
              const Icon = item.icon;
              const { iconBg, textColor, bgHover, activeDot } = getColorClasses(
                item.color,
                active,
              );

              return (
                <Link
                  key={item.label + item.href}
                  href={item.href}
                  onClick={() => {
                    if (window.innerWidth < 768) {
                      onToggle();
                    }
                  }}
                  className={`flex items-center justify-between px-3 py-2.5 rounded-xl transition-all duration-150 group relative overflow-hidden ${bgHover}`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-7 h-7 rounded-lg flex items-center justify-center ${iconBg}`}
                    >
                      <Icon className={`h-4 w-4 ${textColor}`} />
                    </div>
                    <span className={`text-sm font-medium ${textColor}`}>
                      {item.label}
                    </span>
                  </div>
                  {active && (
                    <div className={`w-1 h-6 rounded-full ${activeDot}`} />
                  )}
                </Link>
              );
            })}
          </nav>

          {/* User Info & Sign Out */}
          <div className={`p-4 border-t ${styles.divider}`}>
            <div className={`rounded-xl p-3 ${styles.innerCard}`}>
              <div className="flex items-center gap-3 mb-3">
                <AvatarCircle name={user?.fullName || "Admin User"} idx={0} />
                <div className="flex-1 min-w-0">
                  <p
                    className={`text-xs font-semibold truncate ${styles.text.primary}`}
                  >
                    {user?.fullName || "Admin User"}
                  </p>
                  <p className={`text-[10px] truncate ${styles.text.muted}`}>
                    {user?.primaryEmailAddress?.emailAddress || ""}
                  </p>
                </div>
              </div>
              <button
                onClick={handleSignOut}
                className={`w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs transition-colors ${styles.pill}`}
              >
                <LogOut className={`h-3.5 w-3.5 ${styles.text.secondary}`} />
                <span className={styles.text.secondary}>Sign Out</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Overlay for mobile */}
      {isOpen && (
        <div
          className={`fixed inset-0 z-40 md:hidden ${
            isDark
              ? "bg-black/40 backdrop-blur-sm"
              : "bg-gray-900/20 backdrop-blur-sm"
          }`}
          onClick={onToggle}
        />
      )}
    </>
  );
}
