"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useAuth, useUser } from "@clerk/nextjs";
import Logo from "@/public/assets/img/logo.png";
import {
  Bot,
  CalendarCheck,
  Check,
  ChevronDown,
  CircleHelp,
  CreditCard,
  FileText,
  Instagram,
  LayoutDashboard,
  MessageCircle,
  PackageCheck,
  Phone,
  Settings,
  Workflow,
  X,
} from "lucide-react";
import { Badge, Orbs, useThemeStyles } from "@rocketreplai/ui";
import {
  CALL_ASSISTANT_COMING_SOON_TEXT,
  isCallAssistantAdmin,
} from "@/lib/call-access";

const NAV_ITEMS = [
  { label: "Overview", href: "/whatsapp", icon: LayoutDashboard },
  { label: "Automations", href: "/whatsapp/automations", icon: Workflow },
  { label: "Appointments", href: "/whatsapp/appointments", icon: CalendarCheck },
  { label: "FAQs", href: "/whatsapp/faqs", icon: CircleHelp },
  { label: "Business Info", href: "/whatsapp/business-info", icon: FileText },
  { label: "Pricing", href: "/whatsapp/pricing", icon: CreditCard },
  { label: "Packages", href: "/packages", icon: PackageCheck },
  { label: "Settings", href: "/whatsapp/settings", icon: Settings },
] as const;

interface WhatsAppSidebarProps {
  isOpen: boolean;
  onToggle: () => void;
}

export default function WhatsAppSidebar({
  isOpen,
  onToggle,
}: WhatsAppSidebarProps) {
  const pathname = usePathname();
  const { userId } = useAuth();
  const { user } = useUser();
  const { isDark } = useThemeStyles();
  const [isProductOpen, setIsProductOpen] = useState(false);
  const isCallAdmin = isCallAssistantAdmin({
    userId,
    email: user?.primaryEmailAddress?.emailAddress,
  });

  const styles = useMemo(
    () => ({
      sidebar: isDark
        ? "fixed top-0 bottom-0 md:top-1 md:bottom-1 rounded-lg w-[min(18rem,calc(100vw-1rem))] md:w-72 z-50 shadow-xl transition-transform duration-300 glass-sidebar border border-white/[0.05] overflow-hidden shimmer"
        : "fixed top-0 bottom-0 md:top-1 md:bottom-1 rounded-lg w-[min(18rem,calc(100vw-1rem))] md:w-72 z-50 shadow-xl transition-transform duration-300 bg-white border border-gray-200 overflow-hidden",
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
                ? "bg-emerald-500/10 text-emerald-300"
                : "text-white/45 hover:bg-white/[0.06] hover:text-white/75"
            }`
          : `flex items-center justify-between px-3 py-2.5 rounded-xl transition-all duration-150 group ${
              active
                ? "bg-emerald-50 text-emerald-700 shadow-sm"
                : "text-gray-500 hover:bg-gray-50 hover:text-gray-800"
            }`,
      navIcon: (active: boolean) =>
        `h-[18px] w-[18px] flex-shrink-0 ${active ? "text-emerald-500" : ""}`,
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
              ? "bg-emerald-500/12 text-emerald-300"
              : "bg-white text-emerald-700 shadow-sm"
            : isDark
              ? "text-white/60 hover:bg-white/[0.06] hover:text-white/75"
              : "text-gray-500 hover:bg-white hover:text-gray-800"
        }`,
    }),
    [isDark],
  );

  const isActive = (href: string) =>
    pathname === href || (href !== "/whatsapp" && pathname.startsWith(href));

  const productMetaClass = isDark ? "text-[11px] text-white/35" : "text-[11px] text-gray-400";

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

        <div className="flex h-full flex-col relative z-10">
          <div className={styles.logoContainer}>
            <Link href="/whatsapp" className="flex items-center">
              <Image alt="Logo" src={Logo} className="object-cover h-14 w-full" />
            </Link>
          </div>

          <div className="p-4">
            <div
              className={`rounded-xl p-3 border ${
                isDark
                  ? "bg-emerald-500/10 border-emerald-500/20"
                  : "bg-emerald-50 border-emerald-100"
              }`}
            >
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 text-white">
                  <MessageCircle className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <p className={isDark ? "break-words text-sm font-bold text-white" : "break-words text-sm font-bold text-gray-900"}>
                    WhatsApp Automation
                  </p>
                  <p className={isDark ? "text-xs text-white/45" : "text-xs text-gray-500"}>
                    Booking and replies
                  </p>
                </div>
                <Badge className="ml-auto bg-emerald-500 text-white text-[10px] rounded-full">
                  ADMIN
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
                  {active && <div className="w-1 h-6 rounded-full bg-emerald-500" />}
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
                      <p className={productMetaClass}>Instagram Automation</p>
                    </div>
                  </Link>
                  <Link href="/web" className={styles.productOption(false)}>
                    <Bot className="h-4 w-4" />
                    <div className="min-w-0">
                      <p className="text-sm font-semibold">Web Dashboard</p>
                      <p className={productMetaClass}>Website Chatbot</p>
                    </div>
                  </Link>
                  {isCallAdmin ? (
                    <Link href="/call" className={styles.productOption(false)}>
                      <Phone className="h-4 w-4" />
                      <div className="min-w-0">
                        <p className="text-sm font-semibold">Call Dashboard</p>
                        <p className={productMetaClass}>AI Receptionist</p>
                      </div>
                    </Link>
                  ) : (
                    <div
                      className={`${styles.productOption(false)} cursor-not-allowed opacity-60`}
                    >
                      <Phone className="h-4 w-4" />
                      <div className="min-w-0">
                        <p className="text-sm font-semibold">Call Dashboard</p>
                        <p className={productMetaClass}>
                          {CALL_ASSISTANT_COMING_SOON_TEXT}
                        </p>
                      </div>
                    </div>
                  )}
                  <Link href="/whatsapp" className={styles.productOption(true)}>
                    <MessageCircle className="h-4 w-4 text-emerald-500" />
                    <div className="min-w-0">
                      <p className="text-sm font-semibold">WhatsApp Dashboard</p>
                      <p className={productMetaClass}>Business Automation</p>
                    </div>
                    <Check className="ml-auto h-4 w-4 text-emerald-500" />
                  </Link>
                </div>
              )}
              <button
                type="button"
                className={styles.productButton}
                onClick={() => setIsProductOpen((v) => !v)}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <MessageCircle className="h-4 w-4 text-emerald-500" />
                  <div className="min-w-0">
                    <p className="text-sm font-semibold">WhatsApp Dashboard</p>
                    <p className={productMetaClass}>Business Automation</p>
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
