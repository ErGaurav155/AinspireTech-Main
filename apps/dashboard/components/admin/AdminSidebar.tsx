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
} from "lucide-react";
import Image from "next/image";
import Logo from "public/assets/img/logo.png";
import { Badge } from "@rocketreplai/ui/components/radix/badge";
import { Button } from "@rocketreplai/ui/components/radix/button";
import { useApi } from "@/lib/useApi";
import { verifyOwner } from "@/lib/services/admin-actions.api";

const NAV_ITEMS = [
  {
    label: "Home",
    href: "/admin",
    icon: LayoutDashboard,
    color: "from-cyan-500 to-blue-500",
    iconBg: "bg-cyan-100",
    iconColor: "text-cyan-600",
  },
  {
    label: "Subscriptions",
    href: "/admin/subscriptions",
    icon: CreditCard,
    color: "from-green-500 to-emerald-500",
    iconBg: "bg-green-100",
    iconColor: "text-green-600",
  },
  {
    label: "Appointments",
    href: "/admin/appointments",
    icon: CalendarDays,
    color: "from-purple-500 to-pink-500",
    iconBg: "bg-purple-100",
    iconColor: "text-purple-600",
  },
  {
    label: "Rate Limits",
    href: "/admin/rate-limits",
    icon: Activity,
    color: "from-orange-500 to-red-500",
    iconBg: "bg-orange-100",
    iconColor: "text-orange-600",
  },
  {
    label: "Instagram Users",
    href: "/admin/insta",
    icon: Instagram,
    color: "from-pink-500 to-rose-500",
    iconBg: "bg-pink-100",
    iconColor: "text-pink-600",
  },
  {
    label: "Web Users",
    href: "/admin/web",
    icon: Globe,
    color: "from-blue-500 to-indigo-500",
    iconBg: "bg-blue-100",
    iconColor: "text-blue-600",
  },
];

const BOTTOM_NAV_ITEMS = [
  {
    label: "Settings",
    href: "/admin/settings",
    icon: Settings,
    color: "from-gray-500 to-gray-600",
    iconBg: "bg-gray-100",
    iconColor: "text-gray-600",
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

  // Sidebar content
  const SidebarContent = useMemo(() => {
    const Content = () => (
      <div className="flex flex-col h-full">
        {/* Logo */}
        <div className="p-5 border-b border-gray-100">
          <Link href="/admin" className="flex items-center gap-2.5">
            <div className="relative h-9 w-9 flex-shrink-0">
              <div className="absolute inset-0 rounded-full bg-gradient-to-br from-cyan-500 to-blue-500 shadow-md shadow-cyan-200" />
              <div className="absolute inset-[3px] rounded-full bg-white flex items-center justify-center">
                <Image
                  alt="Logo"
                  src={Logo}
                  width={18}
                  height={18}
                  className="object-contain"
                />
              </div>
            </div>
            <span className="text-xl font-black tracking-tight">
              <span className="text-cyan-500">Ainpire</span>
              <span className="text-blue-600">Tech</span>
            </span>
          </Link>
        </div>

        {/* Admin Badge */}
        <div className="px-4 pt-4">
          <div className="bg-gradient-to-r from-cyan-50 to-blue-50 border border-cyan-200 rounded-xl p-3">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-gradient-to-r from-cyan-500 to-blue-500 flex items-center justify-center">
                <Shield className="h-4 w-4 text-white" />
              </div>
              <div>
                <p className="text-xs text-cyan-600 font-medium">
                  Admin Access
                </p>
                <p className="text-xs font-bold text-cyan-800 truncate max-w-[150px]">
                  {user?.primaryEmailAddress?.emailAddress || "Owner"}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto mt-2">
          {NAV_ITEMS.map((item) => {
            const active = isActive(item.href);
            const Icon = item.icon;
            return (
              <Link
                key={item.label + item.href}
                href={item.href}
                onClick={() => {
                  if (window.innerWidth < 768) {
                    onToggle();
                  }
                }}
                className={`flex items-center justify-between px-3 py-2.5 rounded-xl transition-all duration-150 group ${
                  active
                    ? "bg-cyan-50 text-cyan-600 shadow-sm"
                    : "text-gray-500 hover:bg-gray-50 hover:text-gray-800"
                }`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-7 h-7 rounded-lg ${active ? item.iconBg : "bg-gray-100"} flex items-center justify-center`}
                  >
                    <Icon
                      className={`h-4 w-4 ${
                        active
                          ? item.iconColor
                          : "text-gray-400 group-hover:text-gray-600"
                      }`}
                    />
                  </div>
                  <span className="text-sm font-medium">{item.label}</span>
                </div>
              </Link>
            );
          })}

          <div className="border-t border-gray-100 my-2" />

          {BOTTOM_NAV_ITEMS.map((item) => {
            const active = isActive(item.href);
            const Icon = item.icon;
            return (
              <Link
                key={item.label + item.href}
                href={item.href}
                onClick={() => {
                  if (window.innerWidth < 768) {
                    onToggle();
                  }
                }}
                className={`flex items-center justify-between px-3 py-2.5 rounded-xl transition-all duration-150 group ${
                  active
                    ? "bg-cyan-50 text-cyan-600 shadow-sm"
                    : "text-gray-500 hover:bg-gray-50 hover:text-gray-800"
                }`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-7 h-7 rounded-lg ${active ? item.iconBg : "bg-gray-100"} flex items-center justify-center`}
                  >
                    <Icon
                      className={`h-4 w-4 ${
                        active
                          ? item.iconColor
                          : "text-gray-400 group-hover:text-gray-600"
                      }`}
                    />
                  </div>
                  <span className="text-sm font-medium">{item.label}</span>
                </div>
              </Link>
            );
          })}
        </nav>

        {/* User Info & Sign Out */}
        <div className="p-4 border-t border-gray-100">
          <div className="bg-gray-50 rounded-xl p-3">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-8 h-8 rounded-full bg-gradient-to-r from-cyan-500 to-blue-500 flex items-center justify-center text-white text-xs font-bold">
                {getUserInitials()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-gray-800 truncate">
                  {user?.fullName || "Admin User"}
                </p>
                <p className="text-[10px] text-gray-400 truncate">
                  {user?.primaryEmailAddress?.emailAddress || ""}
                </p>
              </div>
            </div>
            <button
              onClick={handleSignOut}
              className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-white border border-gray-200 rounded-lg text-xs text-gray-600 hover:bg-gray-50 transition-colors"
            >
              <LogOut className="h-3.5 w-3.5" />
              Sign Out
            </button>
          </div>
        </div>
      </div>
    );
    return Content;
  }, [isActive, user, getUserInitials, handleSignOut, onToggle]);

  if (isLoading) {
    return (
      <div className="fixed left-0 top-0 bottom-0 w-72 bg-white border-r border-gray-200 flex items-center justify-center">
        <div className="w-5 h-5 border-2 border-t-transparent border-cyan-500 rounded-full animate-spin" />
      </div>
    );
  }

  if (!isOwner) return null;

  return (
    <>
      {/* Unified sidebar - works the same on mobile and desktop */}
      <div
        className={`fixed top-0 bottom-0 md:top-2 md:bottom-2 rounded-lg w-72 bg-white border border-gray-300 z-50 shadow-xl transition-transform duration-300 ${
          isOpen ? "translate-x-0 left-0 md:left-2" : "-translate-x-full left-0"
        }`}
      >
        {/* Close button for mobile */}
        <button
          onClick={onToggle}
          className="absolute top-4 right-4 p-1.5 rounded-lg bg-gray-100 hover:bg-gray-200 transition-colors md:hidden"
        >
          <X className="h-4 w-4 text-gray-600" />
        </button>
        <SidebarContent />
      </div>

      {/* Overlay for mobile when sidebar is open */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-40 md:hidden"
          onClick={onToggle}
        />
      )}
    </>
  );
}
