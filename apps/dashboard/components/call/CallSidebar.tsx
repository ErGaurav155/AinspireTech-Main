"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import Logo from "@/public/assets/img/logo.png";
import {
  BarChart3,
  Bell,
  Bot,
  CalendarDays,
  Check,
  ChevronDown,
  CreditCard,
  GitBranch,
  Headphones,
  Instagram,
  LayoutDashboard,
  Phone,
  PlugZap,
  Sparkles,
  Settings,
  Share2,
  Users,
  X,
} from "lucide-react";
import { Badge, Orbs, useThemeStyles } from "@rocketreplai/ui";

const NAV_ITEMS = [
  { label: "Overview", href: "/call", icon: LayoutDashboard },
  { label: "Calls & Leads", href: "/call/calls", icon: Headphones },
  { label: "AI Flows", href: "/call/flows", icon: GitBranch },
  { label: "Numbers", href: "/call/numbers", icon: Phone },
  { label: "Appointments", href: "/call/appointments", icon: CalendarDays },
  { label: "Integrations", href: "/call/integrations", icon: PlugZap },
  { label: "Notifications", href: "/call/notifications", icon: Bell },
  { label: "Team", href: "/call/team", icon: Users },
  { label: "Pricing", href: "/call/pricing", icon: Sparkles },
  { label: "Billing", href: "/call/billing", icon: CreditCard },
  { label: "Settings", href: "/call/settings", icon: Settings },
] as const;

interface CallSidebarProps {
  isOpen: boolean;
  onToggle: () => void;
}

export default function CallSidebar({ isOpen, onToggle }: CallSidebarProps) {
  const pathname = usePathname();
  const { isDark } = useThemeStyles();
  const [isProductOpen, setIsProductOpen] = useState(false);

  const styles = useMemo(
    () => ({
      sidebar: isDark
        ? "fixed top-0 bottom-0 md:top-1 md:bottom-1 rounded-lg w-72 z-50 shadow-xl transition-transform duration-300 glass-sidebar border border-white/[0.05] overflow-hidden shimmer"
        : "fixed top-0 bottom-0 md:top-1 md:bottom-1 rounded-lg w-72 z-50 shadow-xl transition-transform duration-300 bg-white border border-gray-200",
      overlay: isDark
        ? "fixed inset-0 bg-black/60 backdrop-blur-lg z-40 md:hidden"
        : "fixed inset-0 bg-black/40 z-40 md:hidden",
      closeButton: isDark
        ? "absolute top-4 right-4 p-1.5 rounded-lg glass-pill md:hidden"
        : "absolute top-4 right-4 p-1.5 rounded-lg bg-gray-100 hover:bg-gray-200 transition-colors md:hidden",
      logoContainer: isDark
        ? "p-3 border-b border-white/[0.06]"
        : "p-3 border-b border-gray-100",
      navLink: (active: boolean) =>
        isDark
          ? `flex items-center justify-between px-3 py-2.5 rounded-xl transition-all duration-150 group ${
              active
                ? "bg-cyan-500/10 text-cyan-300"
                : "text-white/45 hover:bg-white/[0.06] hover:text-white/75"
            }`
          : `flex items-center justify-between px-3 py-2.5 rounded-xl transition-all duration-150 group ${
              active
                ? "bg-cyan-50 text-cyan-700 shadow-sm"
                : "text-gray-500 hover:bg-gray-50 hover:text-gray-800"
            }`,
      navIcon: (active: boolean) =>
        `h-[18px] w-[18px] flex-shrink-0 ${active ? "text-cyan-500" : ""}`,
      productSwitcher: isDark
        ? "relative rounded-xl border border-white/[0.08] bg-white/[0.04] shadow-lg backdrop-blur-3xl"
        : "relative rounded-xl border border-gray-100 bg-gray-50 shadow-lg",
      productButton: isDark
        ? "w-full flex items-center justify-between rounded-xl px-3 py-3 text-white/80 hover:bg-white/[0.06] transition-colors"
        : "w-full flex items-center justify-between rounded-xl px-3 py-3 text-gray-800 hover:bg-white transition-colors",
      productMenu: isDark
        ? "absolute left-0 right-0 bottom-[calc(100%+8px)] rounded-xl border border-white/[0.08] bg-gray-900/95 shadow-xl backdrop-blur-3xl overflow-hidden"
        : "absolute left-0 right-0 bottom-[calc(100%+8px)] rounded-xl border border-gray-100 bg-white shadow-xl overflow-hidden",
      productOption: (active: boolean) =>
        `flex items-center gap-3 px-3 py-2.5 transition-colors ${
          active
            ? isDark
              ? "bg-cyan-500/12 text-cyan-300"
              : "bg-white text-cyan-700 shadow-sm"
            : isDark
              ? "text-white/60 hover:bg-white/[0.06] hover:text-white/75"
              : "text-gray-500 hover:bg-white hover:text-gray-800"
        }`,
    }),
    [isDark],
  );

  const isActive = (href: string) =>
    pathname === href || (href !== "/call" && pathname.startsWith(href));

  return (
    <>
      {isDark && <Orbs />}
      <div
        className={`${styles.sidebar} ${
          isOpen ? "translate-x-0 left-0 md:left-1" : "-translate-x-full left-0"
        } backdrop-blur-xl`}
      >
        <button type="button" onClick={onToggle} className={styles.closeButton}>
          <X className={isDark ? "h-4 w-4 text-white/60" : "h-4 w-4 text-gray-600"} />
        </button>

        <div className="flex flex-col h-full relative z-10">
          <div className={styles.logoContainer}>
            <Link href="/call" className="flex items-center">
              <Image alt="Logo" src={Logo} className="object-cover h-14 w-full" />
            </Link>
          </div>

          <div className="p-4">
            <div
              className={`rounded-xl p-3 border ${
                isDark
                  ? "bg-cyan-500/10 border-cyan-500/20"
                  : "bg-cyan-50 border-cyan-100"
              }`}
            >
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-cyan-500 to-emerald-500 flex items-center justify-center text-white">
                  <Phone className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <p className={isDark ? "text-sm font-bold text-white" : "text-sm font-bold text-gray-900"}>
                    AI Call Assistant
                  </p>
                  <p className={isDark ? "text-xs text-white/45" : "text-xs text-gray-500"}>
                    24/7 receptionist
                  </p>
                </div>
                <Badge className="ml-auto bg-cyan-500 text-white text-[10px] rounded-full">
                  NEW
                </Badge>
              </div>
            </div>
          </div>

          <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
            {NAV_ITEMS.map((item) => {
              const active = isActive(item.href);
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => {
                    if (window.innerWidth < 768) onToggle();
                  }}
                  className={styles.navLink(active)}
                >
                  <div className="flex items-center gap-3">
                    <Icon className={styles.navIcon(active)} />
                    <span className="text-sm font-medium">{item.label}</span>
                  </div>
                  {active && <div className="w-1 h-6 rounded-full bg-cyan-500" />}
                </Link>
              );
            })}
          </nav>

          <div className="p-4 pt-0">
            <div className={styles.productSwitcher}>
              {isProductOpen && (
                <div className={styles.productMenu}>
                  <Link href="/insta" className={styles.productOption(false)}>
                    <Instagram className="h-4 w-4" />
                    <div className="min-w-0">
                      <p className="text-sm font-semibold">Insta Dashboard</p>
                      <p className={isDark ? "text-[11px] text-white/35" : "text-[11px] text-gray-400"}>
                        Instagram Automation
                      </p>
                    </div>
                  </Link>
                  <Link href="/web" className={styles.productOption(false)}>
                    <Bot className="h-4 w-4" />
                    <div className="min-w-0">
                      <p className="text-sm font-semibold">Web Dashboard</p>
                      <p className={isDark ? "text-[11px] text-white/35" : "text-[11px] text-gray-400"}>
                        Website Chatbot
                      </p>
                    </div>
                  </Link>
                  <Link href="/call" className={styles.productOption(true)}>
                    <Phone className="h-4 w-4 text-cyan-500" />
                    <div className="min-w-0">
                      <p className="text-sm font-semibold">Call Dashboard</p>
                      <p className={isDark ? "text-[11px] text-white/35" : "text-[11px] text-gray-400"}>
                        AI Receptionist
                      </p>
                    </div>
                    <Check className="ml-auto h-4 w-4 text-cyan-500" />
                  </Link>
                </div>
              )}
              <button
                type="button"
                className={styles.productButton}
                onClick={() => setIsProductOpen((v) => !v)}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <Phone className="h-4 w-4 text-cyan-500" />
                  <div className="min-w-0">
                    <p className="text-sm font-semibold">Call Dashboard</p>
                    <p className={isDark ? "text-[11px] text-white/35" : "text-[11px] text-gray-400"}>
                      AI Receptionist
                    </p>
                  </div>
                </div>
                <ChevronDown className="h-4 w-4 text-gray-400" />
              </button>
            </div>
          </div>
        </div>
      </div>
      {isOpen && <div className={styles.overlay} onClick={onToggle} />}
    </>
  );
}
