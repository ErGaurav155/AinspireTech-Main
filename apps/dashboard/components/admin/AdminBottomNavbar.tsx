"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useState, useEffect, useRef, useMemo } from "react";
import { useTheme } from "next-themes";
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
  Home,
  Megaphone,
  GraduationCap,
  LogOut,
  Info,
  ArrowRight,
} from "lucide-react";
import { Badge } from "@rocketreplai/ui/components/radix/badge";

import { useThemeStyles } from "@/lib/theme";

// Admin menu sections
const ADMIN_SECTIONS = [
  {
    id: "home",
    label: "Home",
    href: "/admin",
    icon: LayoutDashboard,
    color: "#3b82f6",
    description: "Overview",
  },
  {
    id: "subscriptions",
    label: "Subscriptions",
    href: "/admin/subscriptions",
    icon: CreditCard,
    color: "#22c55e",
    description: "Manage plans",
  },
  {
    id: "appointments",
    label: "Appointments",
    href: "/admin/appointments",
    icon: CalendarDays,
    color: "#a855f7",
    description: "Bookings",
  },
  {
    id: "rate-limits",
    label: "Rate Limits",
    href: "/admin/rate-limits",
    icon: Activity,
    color: "#f59e0b",
    description: "API limits",
  },
  {
    id: "instagram",
    label: "Instagram",
    href: "/admin/insta",
    icon: Instagram,
    color: "#ec4899",
    description: "Insta users",
  },
  {
    id: "web",
    label: "Web Users",
    href: "/admin/web",
    icon: Globe,
    color: "#3b82f6",
    description: "Web users",
  },
  {
    id: "settings",
    label: "Settings",
    href: "/admin/settings",
    icon: Settings,
    color: "#6b7280",
    description: "Preferences",
  },
];

// The 4 fixed bottom nav items for quick access
const BOTTOM_NAV_ITEMS = [
  {
    label: "Home",
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
  const { styles, isDark } = useThemeStyles();
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
          className={`fixed bottom-[72px] right-3 z-50 overflow-hidden w-64 md:hidden ${styles.card}`}
        >
          {/* Header */}
          <div className={`px-4 py-3 border-b ${styles.divider}`}>
            <p
              className={`text-xs font-medium tracking-wider ${styles.text.muted}`}
            >
              Admin Menu
            </p>
          </div>

          {/* All admin sections */}
          <div className="max-h-[60vh] overflow-y-auto">
            {ADMIN_SECTIONS.map((section) => {
              const Icon = section.icon;
              const active = isActive(section.href);

              return (
                <Link
                  key={section.id}
                  href={section.href}
                  onClick={() => setMenuOpen(false)}
                  className={`flex items-center gap-3 px-4 py-3.5 transition-colors border-b ${styles.divider} ${styles.rowHover}`}
                >
                  <div
                    className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0`}
                    style={{
                      background: isDark
                        ? `${section.color}20`
                        : `${section.color}10`,
                      border: `1px solid ${section.color}${isDark ? "30" : "20"}`,
                    }}
                  >
                    <Icon
                      className="h-4 w-4"
                      style={{ color: section.color }}
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p
                      className={`text-sm font-semibold truncate ${
                        active ? styles.text.primary : styles.text.secondary
                      }`}
                    >
                      {section.label}
                    </p>
                    <p className={`text-xs ${styles.text.muted}`}>
                      {section.description}
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    {active && (
                      <div
                        className={`w-2 h-2 rounded-full ${
                          isDark ? "bg-blue-400" : "bg-cyan-500"
                        }`}
                      />
                    )}
                  </div>
                </Link>
              );
            })}
          </div>

          {/* Admin badge */}
          <div className={`p-3 ${styles.badge.blue}`}>
            <div className="flex items-center gap-2">
              <Shield className="h-4 w-4" />
              <span className="text-xs font-medium">Admin Access</span>
              <Badge
                className="ml-auto text-[9px] px-1.5 py-0.5 rounded-full"
                variant="outline"
              >
                Owner
              </Badge>
            </div>
          </div>
        </div>
      )}
      {/* Bottom nav bar */}
      <nav
        className={`fixed bottom-0 left-0 right-0 z-[45] md:hidden ${
          isDark
            ? "bg-[rgba(10,10,16,0.85)] backdrop-blur-[32px] border-t border-white/[0.06]"
            : "bg-white/90 backdrop-blur-[12px] border-t border-gray-100"
        }`}
      >
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
                  <span
                    className={`absolute inset-x-2 top-1 bottom-1 rounded-xl ${
                      isDark ? "bg-blue-500/10" : "bg-cyan-50"
                    }`}
                  />
                )}
                <span className="relative">
                  <Icon
                    className={`h-5 w-5 transition-colors duration-150 ${
                      active
                        ? isDark
                          ? "text-blue-400"
                          : "text-cyan-600"
                        : isDark
                          ? "text-white/60"
                          : "text-gray-500"
                    }`}
                  />
                  {active && (
                    <span
                      className={`absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full ${
                        isDark ? "bg-blue-400" : "bg-cyan-500"
                      }`}
                    />
                  )}
                </span>
                <span
                  className={`relative text-[10px] font-semibold transition-colors duration-150 ${
                    active
                      ? isDark
                        ? "text-blue-400"
                        : "text-cyan-600"
                      : isDark
                        ? "text-white/60"
                        : "text-gray-500"
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
              <span
                className={`absolute inset-x-2 top-1 bottom-1 rounded-xl ${
                  isDark ? "bg-blue-500/10" : "bg-cyan-50"
                }`}
              />
            )}

            {/* Active section icon */}
            <span className="relative">
              <span
                className="flex h-6 w-6 items-center justify-center rounded-full shadow-sm"
                style={{
                  background: `linear-gradient(135deg, ${activeSection.color}80, ${activeSection.color})`,
                }}
              >
                <activeSection.icon className="h-3.5 w-3.5 text-white" />
              </span>
              {/* Chevron badge */}
              <span
                className={`absolute -bottom-0.5 -right-1 w-3 h-3 rounded-full flex items-center justify-center shadow-sm ${styles.pill}`}
              >
                <ChevronRight
                  className={`h-2 w-2 transition-transform duration-200 ${
                    menuOpen ? "rotate-90" : ""
                  } ${isDark ? "text-white/60" : "text-gray-500"}`}
                />
              </span>
            </span>

            <span
              className={`relative text-[10px] font-semibold transition-colors duration-150 max-w-[52px] truncate ${
                menuOpen
                  ? isDark
                    ? "text-blue-400"
                    : "text-cyan-600"
                  : isDark
                    ? "text-white/60"
                    : "text-gray-500"
              }`}
            >
              Menu
            </span>
          </button>
        </div>

        {/* Safe area for iPhone home indicator */}
        <div
          className={`h-safe-area-inset-bottom ${
            isDark ? "bg-[rgba(10,10,16,0.85)]" : "bg-white/90"
          }`}
        />
      </nav>
    </>
  );
}
