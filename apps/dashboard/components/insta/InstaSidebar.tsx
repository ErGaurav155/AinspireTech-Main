// components/insta/InstaSidebar.tsx
"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@clerk/nextjs";
import {
  Home,
  Settings,
  Users,
  Share2,
  Zap,
  ChevronDown,
  MessageSquare,
  Crown,
  Instagram,
  Check,
  LayoutDashboard,
  BarChart3,
  Menu,
  X,
} from "lucide-react";
import Image from "next/image";
import Logo from "public/assets/img/logo.png";
import { Badge } from "@rocketreplai/ui/components/radix/badge";
import { Button } from "@rocketreplai/ui/components/radix/button";
import { useApi } from "@/lib/useApi";
import { getSubscriptioninfo } from "@/lib/services/insta-actions.api";

// Move navItems outside component to prevent recreation
const NAV_ITEMS = [
  {
    label: "Home",
    href: "/insta",
    icon: LayoutDashboard,
    isNew: false,
  },
  {
    label: "Automations",
    href: "/insta/automations",
    icon: MessageSquare,
    isNew: false,
  },
  { label: "Accounts", href: "/insta/accounts", icon: Users, isNew: false },
  { label: "Refer & Earn", href: "/insta/refer", icon: Share2, isNew: true },
  { label: "Settings", href: "/insta/settings", icon: Settings, isNew: false },
] as const;

interface InstaSidebarProps {
  accountName?: string;
  accountHandle?: string;
  isSubscribed?: boolean;
  isOpen: boolean; // Required prop
  onToggle: () => void; // Required prop
}

export default function InstaSidebar({
  accountName,
  accountHandle,
  isSubscribed: initialIsSubscribed,
  isOpen,
  onToggle,
}: InstaSidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { userId } = useAuth();
  const { apiRequest } = useApi();
  const [isLoading, setIsLoading] = useState(true);
  const [isAccountOpen, setIsAccountOpen] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(
    initialIsSubscribed ?? false,
  );
  const [pricingClose, setPricingClose] = useState(false);

  // Memoize fetch function
  const fetchSubscriptionStatus = useCallback(async () => {
    if (!userId) return;
    try {
      const { subscriptions } = await getSubscriptioninfo(apiRequest);
      setIsSubscribed(subscriptions && subscriptions.length > 0);
    } catch {
      // silent fail
    }
  }, [userId, apiRequest]);

  // Run only once on mount
  useEffect(() => {
    if (!initialIsSubscribed) {
      fetchSubscriptionStatus();
    }
    setIsLoading(false);
  }, [fetchSubscriptionStatus, initialIsSubscribed]);

  // Memoize active state check
  const isActive = useCallback(
    (href: string) => {
      return (
        pathname === href || (href !== "/insta" && pathname.startsWith(href))
      );
    },
    [pathname],
  );

  // Memoize sidebar content to prevent unnecessary re-renders
  const SidebarContent = useMemo(() => {
    const Content = () => (
      <div className="flex flex-col h-full">
        {/* Logo */}
        <div className="p-5 border-b border-gray-100">
          <Link href="/insta" className="flex items-center gap-2.5">
            <div className="relative h-9 w-9 flex-shrink-0">
              <div className="absolute inset-0 rounded-full bg-gradient-to-br from-pink-500 to-rose-500 shadow-md shadow-pink-200" />
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
              <span className="text-pink-500">Rocket</span>
              <span className="text-purple-600">Replai</span>
            </span>
          </Link>
        </div>

        {/* Account Selector */}
        <div className="p-4 border-b border-gray-100 relative z-10">
          <button
            onClick={() => setIsAccountOpen(!isAccountOpen)}
            className="w-full flex items-center justify-between p-3 rounded-xl bg-gray-50 hover:bg-gray-100 transition-colors group"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-pink-400 to-rose-500 flex items-center justify-center text-white font-bold text-sm shadow-sm">
                {(accountName || "U")[0].toUpperCase()}
              </div>
              <div className="text-left min-w-0">
                <p className="text-sm font-semibold text-gray-800 truncate max-w-[130px]">
                  {accountName || "My Account"}
                </p>
                <p className="text-xs text-gray-400 truncate max-w-[130px]">
                  @{accountHandle || "connect account"}
                </p>
              </div>
            </div>
            <ChevronDown
              className={`h-4 w-4 text-gray-400 flex-shrink-0 transition-transform duration-200 ${
                isAccountOpen ? "rotate-180" : ""
              }`}
            />
          </button>

          {isAccountOpen && (
            <div className="mt-2 bg-white border border-gray-100 rounded-xl shadow-lg overflow-hidden absolute left-4 right-4">
              <Link
                href="/insta/accounts/add"
                className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors text-sm text-gray-700"
                onClick={() => {
                  setIsAccountOpen(false);
                  // On mobile, close sidebar after navigation
                  if (window.innerWidth < 768) {
                    onToggle();
                  }
                }}
              >
                <div className="w-7 h-7 rounded-full bg-pink-100 flex items-center justify-center">
                  <Instagram className="h-3.5 w-3.5 text-pink-500" />
                </div>
                Add Instagram Account
              </Link>
              <Link
                href="/insta/accounts"
                className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors text-sm text-gray-700"
                onClick={() => {
                  setIsAccountOpen(false);
                  // On mobile, close sidebar after navigation
                  if (window.innerWidth < 768) {
                    onToggle();
                  }
                }}
              >
                <div className="w-7 h-7 rounded-full bg-purple-100 flex items-center justify-center">
                  <Users className="h-3.5 w-3.5 text-purple-500" />
                </div>
                Manage Accounts
              </Link>
            </div>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-3 space-y-0.5 max-h-max overflow-y-auto">
          {NAV_ITEMS.map((item) => {
            const active = isActive(item.href);
            const Icon = item.icon;
            return (
              <Link
                key={item.label + item.href}
                href={item.href}
                onClick={() => {
                  // On mobile, close sidebar after navigation
                  if (window.innerWidth < 768) {
                    onToggle();
                  }
                }}
                className={`flex items-center justify-between px-3 py-2.5 rounded-xl transition-all duration-150 group ${
                  active
                    ? "bg-pink-50 text-pink-600 shadow-sm"
                    : "text-gray-500 hover:bg-gray-50 hover:text-gray-800"
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon
                    className={`h-[18px] w-[18px] flex-shrink-0 transition-colors ${
                      active
                        ? "text-pink-500"
                        : "text-gray-400 group-hover:text-gray-600"
                    }`}
                  />
                  <span className="text-sm font-medium">{item.label}</span>
                </div>
                {item?.isNew && (
                  <Badge className="bg-pink-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm">
                    NEW
                  </Badge>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Upgrade Section — only show for free users */}
        {!isSubscribed && !pricingClose && (
          <div className="p-4 border-t border-gray-100">
            <div className="bg-gradient-to-br from-gray-50 to-pink-50/50 rounded-2xl p-4 border border-pink-100/50">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-[13px] font-bold text-gray-800">
                  Unlock more power 🚀
                </span>
                <Button
                  onClick={() => setPricingClose(true)}
                  size="sm"
                  className="h-5 px-2 bg-red-500 hover:bg-red-600 text-white rounded-lg text-xs ml-auto"
                >
                  X
                </Button>
              </div>
              <ul className="space-y-2 mb-4">
                {["Unlimited DMs", "Unlimited Contacts", "Growth Features"].map(
                  (feature) => (
                    <li
                      key={feature}
                      className="flex items-center gap-2 text-xs text-gray-600"
                    >
                      <div className="w-4 h-4 rounded-full bg-pink-100 flex items-center justify-center flex-shrink-0">
                        <Check className="h-2.5 w-2.5 text-pink-500" />
                      </div>
                      {feature}
                    </li>
                  ),
                )}
              </ul>
              <Button
                onClick={() => {
                  router.push("/insta/pricing");
                  // On mobile, close sidebar after navigation
                  if (window.innerWidth < 768) {
                    onToggle();
                  }
                }}
                className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white rounded-full text-xs font-bold h-9 shadow-md shadow-purple-200/50 transition-all hover:shadow-purple-300/60"
              >
                <Crown className="h-3.5 w-3.5 mr-1.5" />
                Upgrade to Pro
              </Button>
            </div>
          </div>
        )}
      </div>
    );
    return Content;
  }, [
    accountName,
    accountHandle,
    isAccountOpen,
    isSubscribed,
    router,
    isActive,
    onToggle,
    pricingClose,
  ]);
  if (isLoading) {
    return (
      <div className="fixed left-0 top-0 bottom-0 w-72 bg-white border-r border-gray-200 flex items-center justify-center">
        <div className="w-5 h-5 border-2 border-t-transparent border-cyan-500 rounded-full animate-spin" />
      </div>
    );
  }
  return (
    <>
      {/* Unified sidebar - works the same on mobile and desktop */}
      <div
        className={`fixed top-0 bottom-0 md:top-2 md:bottom-2 rounded-lg  w-72 bg-white border border-gray-300 z-50 shadow-xl transition-transform duration-300 ${
          isOpen
            ? "translate-x-0 left-0 md:left-2"
            : "-translate-x-full left-0 "
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
      {typeof window !== "undefined" && isOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-40 md:hidden"
          onClick={onToggle}
        />
      )}
    </>
  );
}
