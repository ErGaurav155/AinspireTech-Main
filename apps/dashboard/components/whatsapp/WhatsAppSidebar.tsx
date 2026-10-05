"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
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
  Plus,
  Settings,
  Sparkles,
  Workflow,
  X,
} from "lucide-react";
import { Badge, Button, Orbs, useThemeStyles } from "@rocketreplai/ui";
import {
  CALL_ASSISTANT_COMING_SOON_TEXT,
  useCallAssistantAdmin,
} from "@/lib/call-access";
import { usePlatformAccess } from "@/components/platform/PlatformAccessProvider";
import { useApi } from "@/lib/useApi";
import { getWhatsAppDashboard } from "@/lib/services/whatsapp-actions.api";

const NAV_ITEMS = [
  { label: "Overview", href: "/whatsapp", icon: LayoutDashboard, isNew: false },
  {
    label: "Automations",
    href: "/whatsapp/automations",
    icon: Workflow,
    isNew: false,
  },
  {
    label: "Appointments",
    href: "/whatsapp/appointments",
    icon: CalendarCheck,
    isNew: false,
  },
  { label: "FAQs", href: "/whatsapp/faqs", icon: CircleHelp, isNew: false },
  {
    label: "Business Info",
    href: "/whatsapp/business-info",
    icon: FileText,
    isNew: false,
  },
  {
    label: "Settings",
    href: "/whatsapp/settings",
    icon: Settings,
    isNew: false,
  },
  {
    label: "Pricing",
    href: "/whatsapp/pricing",
    icon: CreditCard,
    isNew: false,
  },
  { label: "Packages", href: "/packages", icon: PackageCheck, isNew: true },
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
  const { isDark } = useThemeStyles();
  const { apiRequest } = useApi();
  const [isAccountOpen, setIsAccountOpen] = useState(false);
  const [isProductOpen, setIsProductOpen] = useState(false);
  const [workspace, setWorkspace] = useState<any>(null);
  const [workspaceLoading, setWorkspaceLoading] = useState(true);
  const [pricingClose, setPricingClose] = useState(false);
  const isCallAdmin = useCallAssistantAdmin();
  const { clientOnly, loading: platformAccessLoading } = usePlatformAccess();
  const hideClientBilling = clientOnly || platformAccessLoading;

  const loadWorkspace = useCallback(async () => {
    try {
      const result = await getWhatsAppDashboard(apiRequest);
      setWorkspace(result?.workspace || null);
    } catch {
      setWorkspace(null);
    } finally {
      setWorkspaceLoading(false);
    }
  }, [apiRequest]);

  useEffect(() => {
    void loadWorkspace();
  }, [loadWorkspace]);

  const isConnected = Boolean(
    workspace?.isConfigured || workspace?.meta?.phoneNumberId,
  );
  const isSubscribed = Boolean(
    workspace?.subscription?.plan && workspace.subscription.plan !== "free",
  );
  const accountName =
    workspace?.onboarding?.businessDisplayName ||
    workspace?.organization?.name ||
    workspace?.meta?.displayPhoneNumber ||
    "WhatsApp account";
  const accountDetail =
    workspace?.meta?.displayPhoneNumber || "WhatsApp Business connected";

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
      navDivider: isDark
        ? "border-t border-white/[0.06] my-2"
        : "border-t border-gray-100 my-2",
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
      newBadge: isDark
        ? "bg-pink-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full"
        : "bg-pink-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full",
      selectorButton: isDark
        ? "w-full flex items-center justify-between gap-2 p-3 rounded-xl border border-white/[0.08] bg-white/[0.04] hover:bg-white/[0.07] transition-colors"
        : "w-full flex items-center justify-between gap-2 p-3 rounded-xl border border-gray-100 bg-gray-50 hover:bg-gray-100 transition-colors",
      selectorName: isDark
        ? "truncate text-sm font-semibold text-white"
        : "truncate text-sm font-semibold text-gray-800",
      selectorDetail: isDark
        ? "truncate text-xs text-white/40"
        : "truncate text-xs text-gray-500",
      accountMenu: isDark
        ? "absolute left-4 right-4 top-full z-50 mt-2 overflow-hidden rounded-xl border border-white/[0.08] bg-gray-900/95 shadow-xl backdrop-blur-3xl"
        : "absolute left-4 right-4 top-full z-50 mt-2 overflow-hidden rounded-xl border border-gray-100 bg-white shadow-xl",
      accountItem: isDark
        ? "flex w-full items-center gap-3 border-b border-white/[0.06] px-4 py-3 text-left text-white/80"
        : "flex w-full items-center gap-3 border-b border-gray-100 px-4 py-3 text-left text-gray-800",
      accountAction: isDark
        ? "flex w-full items-center gap-3 px-4 py-3 text-sm text-white/70 transition-colors hover:bg-white/[0.06] hover:text-white"
        : "flex w-full items-center gap-3 px-4 py-3 text-sm text-gray-600 transition-colors hover:bg-gray-50 hover:text-gray-900",
      upgradeCard: isDark
        ? "rounded-2xl border border-emerald-500/20 bg-gradient-to-br from-white/[0.03] to-emerald-500/10 p-4"
        : "rounded-2xl border border-emerald-100 bg-gradient-to-br from-gray-50 to-emerald-50/70 p-4",
      upgradeTitle: isDark
        ? "text-[13px] font-bold text-white"
        : "text-[13px] font-bold text-gray-800",
      upgradeText: isDark ? "text-xs text-white/55" : "text-xs text-gray-600",
      upgradeButton:
        "h-9 w-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 text-xs font-bold text-white shadow-md transition-all hover:from-emerald-600 hover:to-teal-600",
    }),
    [isDark],
  );

  const isActive = (href: string) =>
    pathname === href || (href !== "/whatsapp" && pathname.startsWith(href));

  const productMetaClass = isDark
    ? "text-[11px] text-white/35"
    : "text-[11px] text-gray-400";

  return (
    <>
      {isDark && <Orbs />}
      <div
        className={`${styles.sidebar} ${
          isOpen ? "translate-x-0 left-0 md:left-1" : "-translate-x-full left-0"
        } backdrop-blur-xl`}
      >
        <button type="button" onClick={onToggle} className={styles.closeButton}>
          <X
            className={
              isDark ? "h-4 w-4 text-white/60" : "h-4 w-4 text-gray-600"
            }
          />
        </button>

        <div className="flex h-full flex-col relative z-10">
          <div className={styles.logoContainer}>
            <Link href="/whatsapp" className="flex items-center">
              <Image
                alt="Logo"
                src={Logo}
                className="object-cover h-14 w-full"
              />
            </Link>
          </div>

          <div className="relative z-20 p-4">
            <button
              type="button"
              className={styles.selectorButton}
              onClick={() => setIsAccountOpen((open) => !open)}
              aria-expanded={isAccountOpen}
            >
              <div className="flex min-w-0 flex-1 items-center gap-3">
                <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-emerald-500 to-teal-500 text-white shadow-sm">
                  <MessageCircle className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1 text-left">
                  <p className={styles.selectorName}>
                    {workspaceLoading
                      ? "Loading account..."
                      : isConnected
                        ? accountName
                        : "No account connected"}
                  </p>
                  <p className={styles.selectorDetail}>
                    {isConnected ? accountDetail : "Add a WhatsApp account"}
                  </p>
                </div>
              </div>
              {!workspaceLoading && (
                <Badge
                  className={`flex-shrink-0 rounded-full text-[10px] ${
                    clientOnly || isSubscribed
                      ? "bg-emerald-500 text-white"
                      : isDark
                        ? "bg-white/[0.08] text-white/55"
                        : "bg-gray-200 text-gray-600"
                  }`}
                >
                  {clientOnly ? "AGENCY" : isSubscribed ? "PRO" : "FREE"}
                </Badge>
              )}
              <ChevronDown
                className={`h-4 w-4 flex-shrink-0 text-gray-400 transition-transform ${
                  isAccountOpen ? "rotate-180" : ""
                }`}
              />
            </button>

            {isAccountOpen && (
              <div className={styles.accountMenu}>
                {isConnected && (
                  <div className={styles.accountItem}>
                    <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-500">
                      <MessageCircle className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold">{accountName}</p>
                      <p className={styles.selectorDetail}>{accountDetail}</p>
                    </div>
                    <Check className="h-4 w-4 flex-shrink-0 text-emerald-500" />
                  </div>
                )}
                <Link
                  href="/whatsapp/settings"
                  className={styles.accountAction}
                  onClick={() => {
                    setIsAccountOpen(false);
                    if (window.innerWidth < 768) onToggle();
                  }}
                >
                  <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-500">
                    {isConnected ? (
                      <Settings className="h-3.5 w-3.5" />
                    ) : (
                      <Plus className="h-3.5 w-3.5" />
                    )}
                  </div>
                  {isConnected ? "Manage account" : "Add account"}
                </Link>
              </div>
            )}
          </div>

          <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
            {NAV_ITEMS.filter((item) => !hideClientBilling || !["Pricing", "Packages"].includes(item.label)).map((item) => {
              const active = isActive(item.href);
              const Icon = item.icon;
              return (
                <div key={item.href}>
                  {item.label === "Pricing" && (
                    <div className={styles.navDivider} />
                  )}
                  <Link
                    href={item.href}
                    onClick={() => {
                      if (window.innerWidth < 768) onToggle();
                    }}
                    className={styles.navLink(active)}
                  >
                    <div className="flex items-center gap-3">
                      <Icon className={styles.navIcon(active)} />
                      <span className="text-sm font-medium">{item.label}</span>
                    </div>{" "}
                    <div className="flex items-center gap-2">
                      {item?.isNew && (
                        <Badge className={styles.newBadge}>NEW</Badge>
                      )}
                      {active && (
                        <div className="w-1 h-6 rounded-full bg-emerald-500" />
                      )}
                    </div>
                  </Link>
                </div>
              );
            })}
          </nav>

          {!hideClientBilling &&
            !workspaceLoading &&
            !isSubscribed &&
            !pricingClose && (
              <div className="p-4 pt-1">
                <div className={styles.upgradeCard}>
                  <div className="mb-3 flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-emerald-500" />
                    <span className={styles.upgradeTitle}>Unlock more power</span>
                    <button
                      type="button"
                      onClick={() => setPricingClose(true)}
                      className="ml-auto rounded-md bg-red-500 px-2 py-0.5 text-[10px] font-semibold text-white hover:bg-red-600"
                      aria-label="Dismiss upgrade offer"
                    >
                      X
                    </button>
                  </div>
                  <ul className={`mb-4 space-y-2 ${styles.upgradeText}`}>
                    {["Unlimited response messages", "Appointment automation", "Owner alerts and follow-ups"].map(
                      (feature) => (
                        <li key={feature} className="flex items-center gap-2">
                          <Check className="h-3.5 w-3.5 flex-shrink-0 text-emerald-500" />
                          <span>{feature}</span>
                        </li>
                      ),
                    )}
                  </ul>
                  <Button asChild className={styles.upgradeButton}>
                    <Link
                      href="/whatsapp/pricing"
                      onClick={() => {
                        if (window.innerWidth < 768) onToggle();
                      }}
                    >
                      Upgrade to Pro
                    </Link>
                  </Button>
                </div>
              </div>
            )}

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
                      <p className="text-sm font-semibold">
                        WhatsApp Dashboard
                      </p>
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
