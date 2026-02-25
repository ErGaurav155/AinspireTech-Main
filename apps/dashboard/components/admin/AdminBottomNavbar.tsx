"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useState, useEffect, useRef } from "react";
import {
  LayoutDashboard,
  CreditCard,
  CalendarDays,
  Activity,
  Settings,
  Instagram,
  Globe,
  Shield,
  ChevronRight,
  Sparkles,
  Users,
} from "lucide-react";
import { Badge } from "@rocketreplai/ui/components/radix/badge";

// Admin menu sections
const ADMIN_SECTIONS = [
  {
    id: "dashboard",
    label: "Dashboard",
    href: "/admin",
    icon: LayoutDashboard,
    iconBg: "bg-cyan-50",
    iconColor: "text-cyan-600",
    gradient: "from-cyan-500 to-blue-500",
  },
  {
    id: "subscriptions",
    label: "Subscriptions",
    href: "/admin/subscriptions",
    icon: CreditCard,
    iconBg: "bg-green-50",
    iconColor: "text-green-600",
    gradient: "from-green-500 to-emerald-500",
  },
  {
    id: "appointments",
    label: "Appointments",
    href: "/admin/appointments",
    icon: CalendarDays,
    iconBg: "bg-purple-50",
    iconColor: "text-purple-600",
    gradient: "from-purple-500 to-pink-500",
  },
  {
    id: "rate-limits",
    label: "Rate Limits",
    href: "/admin/rate-limits",
    icon: Activity,
    iconBg: "bg-orange-50",
    iconColor: "text-orange-600",
    gradient: "from-orange-500 to-red-500",
  },
  {
    id: "instagram",
    label: "Instagram",
    href: "/admin/insta",
    icon: Instagram,
    iconBg: "bg-pink-50",
    iconColor: "text-pink-600",
    gradient: "from-pink-500 to-rose-500",
  },
  {
    id: "web",
    label: "Web Users",
    href: "/admin/web",
    icon: Globe,
    iconBg: "bg-blue-50",
    iconColor: "text-blue-600",
    gradient: "from-blue-500 to-indigo-500",
  },
  {
    id: "settings",
    label: "Settings",
    href: "/admin/settings",
    icon: Settings,
    iconBg: "bg-gray-50",
    iconColor: "text-gray-600",
    gradient: "from-gray-500 to-gray-600",
  },
];

// The 4 fixed bottom nav items for quick access
const BOTTOM_NAV_ITEMS = [
  {
    label: "Dash",
    href: "/admin",
    icon: LayoutDashboard,
  },
  {
    label: "Subs",
    href: "/admin/subscriptions",
    icon: CreditCard,
  },
  {
    label: "Insta",
    href: "/admin/insta",
    icon: Instagram,
  },
  {
    label: "Web",
    href: "/admin/web",
    icon: Globe,
  },
] as const;

export default function AdminBottomNavbar() {
  const pathname = usePathname();
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Determine active section from pathname
  const activeSection =
    ADMIN_SECTIONS.find((section) => pathname.startsWith(section.href)) ??
    ADMIN_SECTIONS[0];

  // Memoize active state check
  const isActive = useCallback(
    (href: string) => {
      return (
        pathname === href || (href !== "/admin" && pathname.startsWith(href))
      );
    },
    [pathname],
  );
  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    if (menuOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [menuOpen]);

  return (
    <>
      {/* Admin menu popup — appears above the nav bar */}
      {menuOpen && (
        <div
          ref={menuRef}
          className="fixed bottom-[72px] right-3 z-50 bg-white rounded-2xl shadow-[0_8px_32px_rgba(0,0,0,0.12)] border border-gray-100 overflow-hidden w-64 md:hidden"
        >
          {/* Header */}
          <div className="px-4 py-3 border-b border-gray-100">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">
              Admin Menu
            </p>
          </div>

          {/* All admin sections */}
          {ADMIN_SECTIONS.map((section) => {
            const Icon = section.icon;
            const isSelected = activeSection.id === section.id;
            return (
              <Link
                key={section.id}
                href={section.href}
                onClick={() => setMenuOpen(false)}
                className={`flex items-center gap-3 px-4 py-3.5 hover:bg-gray-50 transition-colors ${
                  isSelected ? "bg-cyan-50/60" : ""
                }`}
              >
                <div
                  className={`w-9 h-9 rounded-full ${section.iconBg} flex items-center justify-center flex-shrink-0`}
                >
                  <Icon className={`h-4 w-4 ${section.iconColor}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <p
                    className={`text-sm font-semibold truncate ${
                      isSelected ? "text-cyan-700" : "text-gray-700"
                    }`}
                  >
                    {section.label}
                  </p>
                  <p className="text-xs text-gray-400">
                    {section.id === "dashboard" && "Overview"}
                    {section.id === "subscriptions" && "Manage plans"}
                    {section.id === "appointments" && "Bookings"}
                    {section.id === "rate-limits" && "API limits"}
                    {section.id === "instagram" && "Insta users"}
                    {section.id === "web" && "Web users"}
                    {section.id === "settings" && "Preferences"}
                  </p>
                </div>
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  {isSelected && (
                    <div className="w-2 h-2 rounded-full bg-cyan-500" />
                  )}
                </div>
              </Link>
            );
          })}

          {/* Admin badge */}
          <div className="border-t border-gray-100 bg-gradient-to-r from-cyan-50 to-blue-50 p-3">
            <div className="flex items-center gap-2">
              <Shield className="h-4 w-4 text-cyan-600" />
              <span className="text-xs font-medium text-cyan-700">
                Admin Access
              </span>
              <Badge className="bg-cyan-500 text-white text-[9px] px-1.5 py-0.5 rounded-full ml-auto">
                Owner
              </Badge>
            </div>
          </div>
        </div>
      )}

      {/* Bottom nav bar */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 md:hidden bg-white border-t border-gray-100 shadow-[0_-4px_20px_rgba(0,0,0,0.06)]">
        <div className="flex items-center justify-around h-16 px-2">
          {/* Fixed nav items */}
          {BOTTOM_NAV_ITEMS.map((item) => {
            const active = isActive(item.href);
            const Icon = item.icon;
            return (
              <Link
                key={item.label}
                href={item.href}
                className="flex flex-col items-center justify-center gap-1 flex-1 py-2 relative group"
              >
                {active && (
                  <span className="absolute inset-x-2 top-1 bottom-1 bg-cyan-50 rounded-xl" />
                )}
                <span className="relative">
                  <Icon
                    className={`h-5 w-5 transition-colors duration-150 ${
                      active
                        ? "text-cyan-500"
                        : "text-gray-400 group-hover:text-gray-600"
                    }`}
                  />
                  {active && (
                    <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 bg-cyan-500 rounded-full" />
                  )}
                </span>
                <span
                  className={`relative text-[10px] font-semibold transition-colors duration-150 ${
                    active ? "text-cyan-500" : "text-gray-400"
                  }`}
                >
                  {item.label}
                </span>
              </Link>
            );
          })}

          {/* Menu button — 5th slot */}
          <button
            onClick={() => setMenuOpen((prev) => !prev)}
            className="flex flex-col items-center justify-center gap-1 flex-1 py-2 relative group"
          >
            {menuOpen && (
              <span className="absolute inset-x-2 top-1 bottom-1 bg-cyan-50 rounded-xl" />
            )}

            {/* Active section icon */}
            <span className="relative">
              <span
                className={`flex h-6 w-6 items-center justify-center rounded-full bg-gradient-to-br ${activeSection.gradient} shadow-sm`}
              >
                <activeSection.icon className="h-3.5 w-3.5 text-white" />
              </span>
              {/* Chevron badge */}
              <span className="absolute -bottom-0.5 -right-1 w-3 h-3 bg-white rounded-full border border-gray-200 flex items-center justify-center shadow-sm">
                <ChevronRight
                  className={`h-2 w-2 text-gray-500 transition-transform duration-200 ${
                    menuOpen ? "rotate-90" : ""
                  }`}
                />
              </span>
            </span>

            <span
              className={`relative text-[10px] font-semibold transition-colors duration-150 max-w-[52px] truncate ${
                menuOpen ? "text-cyan-500" : "text-gray-400"
              }`}
            >
              Menu
            </span>
          </button>
        </div>

        {/* Safe area for iPhone home indicator */}
        <div className="h-safe-area-inset-bottom bg-white" />
      </nav>
    </>
  );
}
