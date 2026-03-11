"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useState, useEffect, useRef, useMemo } from "react";
import {
  LayoutDashboard,
  MessageSquare,
  Users,
  Settings,
  Plus,
} from "lucide-react";
import Image from "next/image";
import { useAuth } from "@clerk/nextjs";
import { useApi } from "@/lib/useApi";
import {
  getSubscriptioninfo,
  getAllInstagramAccounts,
} from "@/lib/services/insta-actions.api";
import { useThemeStyles } from "@rocketreplai/ui";

const BOTTOM_NAV_ITEMS = [
  {
    label: "Home",
    href: "/insta",
    icon: LayoutDashboard,
  },
  {
    label: "Auto",
    href: "/insta/automations",
    icon: MessageSquare,
  },
  {
    label: "Accounts",
    href: "/insta/accounts",
    icon: Users,
  },
  {
    label: "Settings",
    href: "/insta/settings",
    icon: Settings,
  },
] as const;

interface InstagramAccount {
  username?: string;
  name?: string;
  profilePicture?: string;
  [key: string]: any;
}

export default function InstaBottomNavbar() {
  const pathname = usePathname();
  const { userId } = useAuth();
  const { apiRequest } = useApi();
  const { styles, isDark } = useThemeStyles();

  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const [accounts, setAccounts] = useState<InstagramAccount[]>([]);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [accountLimit, setAccountLimit] = useState(1);

  // Local styles using the central theme
  const localStyles = useMemo(
    () => ({
      nav: isDark
        ? "fixed bottom-0 left-0 right-0 z-40 md:hidden glass-nav border-t border-white/[0.06] shadow-[0_-4px_20px_rgba(0,0,0,0.3)]"
        : "fixed bottom-0 left-0 right-0 z-40 md:hidden bg-white border-t border-gray-100 shadow-[0_-4px_20px_rgba(0,0,0,0.06)]",
      menuPopup: isDark
        ? "fixed bottom-[72px] right-3 z-50 glass-card border border-white/[0.08] rounded-2xl shadow-[0_8px_32px_rgba(0,0,0,0.5)] overflow-hidden w-56 md:hidden"
        : "fixed bottom-[72px] right-3 z-50 bg-white rounded-2xl shadow-[0_8px_32px_rgba(0,0,0,0.12)] border border-gray-100 overflow-hidden w-56 md:hidden",
      menuItem: `flex items-center gap-3 px-4 py-3.5 border-b ${styles.divider} ${styles.rowHover} text-sm ${styles.text.primary}`,
      menuItemLast: `flex items-center gap-3 px-4 py-3.5 ${styles.rowHover} text-sm ${styles.text.primary}`,
      menuDivider: isDark
        ? "border-t border-white/[0.06]"
        : "border-t border-gray-100",

      // Account row
      accountRow: `flex items-center gap-3 px-4 py-3.5 border-b ${styles.divider}`,
      accountAvatar: `w-9 h-9 rounded-full bg-gradient-to-br from-pink-400 to-rose-500 flex items-center justify-center text-white font-bold text-sm flex-shrink-0 shadow-sm ${isDark ? "opacity-90" : ""}`,
      accountName: `text-sm font-semibold truncate ${styles.text.primary}`,
      accountHandle: `text-xs truncate ${styles.text.muted}`,

      // Account limit indicator
      limitIndicator: `px-4 py-2 border-b ${styles.divider} ${styles.innerCard}`,
      limitText: `text-xs ${styles.text.muted}`,

      // Upgrade prompt
      upgradePrompt: `px-4 py-3 border-t ${styles.divider} ${styles.icon.pink}`,
      upgradeTitle: `text-xs ${styles.text.primary} font-medium mb-1`,
      upgradeDesc: `text-xs ${styles.text.secondary}`,
      upgradeButton: `w-full ${styles.button.primary} rounded-lg text-xs h-7`,

      // Nav items
      navItem: (isActive: boolean) =>
        `flex flex-col items-center justify-center gap-1 flex-1 py-2 relative group`,
      navItemBg: (isActive: boolean) =>
        isDark
          ? `absolute inset-x-2 top-1 bottom-1 rounded-xl ${isActive ? "bg-pink-500/10" : ""}`
          : `absolute inset-x-2 top-1 bottom-1 rounded-xl ${isActive ? "bg-pink-50" : ""}`,
      navIcon: (isActive: boolean) =>
        isDark
          ? `h-5 w-5 transition-colors duration-150 ${isActive ? "text-pink-400" : "text-white/40 group-hover:text-white/60"}`
          : `h-5 w-5 transition-colors duration-150 ${isActive ? "text-pink-500" : "text-gray-400 group-hover:text-gray-600"}`,
      navLabel: (isActive: boolean) =>
        isDark
          ? `relative text-[10px] font-semibold transition-colors duration-150 ${isActive ? "text-pink-400" : "text-white/40"}`
          : `relative text-[10px] font-semibold transition-colors duration-150 ${isActive ? "text-pink-500" : "text-gray-400"}`,
      navActiveDot: isDark
        ? "absolute -top-0.5 -right-0.5 w-1.5 h-1.5 bg-pink-400 rounded-full"
        : "absolute -top-0.5 -right-0.5 w-1.5 h-1.5 bg-pink-500 rounded-full",

      // Account button
      accountButton: (isOpen: boolean) =>
        `flex flex-col items-center justify-center gap-1 flex-1 py-2 relative group`,
      accountBg: (isOpen: boolean) =>
        isDark
          ? `absolute inset-x-2 top-1 bottom-1 rounded-xl ${isOpen ? "bg-pink-500/10" : ""}`
          : `absolute inset-x-2 top-1 bottom-1 rounded-xl ${isOpen ? "bg-pink-50" : ""}`,
      accountAvatarIcon: (hasAccount: boolean) =>
        isDark
          ? hasAccount
            ? "h-6 w-6 rounded-full object-cover ring-2 ring-pink-300"
            : "flex h-6 w-6 items-center justify-center rounded-full border-2 border-dashed border-white/30 bg-white/[0.03] text-white/40 group-hover:border-pink-400 group-hover:text-pink-400 transition-colors"
          : hasAccount
            ? "h-6 w-6 rounded-full object-cover ring-2 ring-pink-300"
            : "flex h-6 w-6 items-center justify-center rounded-full border-2 border-dashed border-gray-300 bg-gray-50 text-gray-400 group-hover:border-pink-400 group-hover:text-pink-400 transition-colors",
      accountInitial: (hasAccount: boolean) =>
        isDark
          ? `flex h-6 w-6 items-center justify-center rounded-full bg-gradient-to-br from-pink-400 to-rose-500 text-white text-[10px] font-bold ring-2 ring-pink-200 shadow-sm`
          : `flex h-6 w-6 items-center justify-center rounded-full bg-gradient-to-br from-pink-400 to-rose-500 text-white text-[10px] font-bold ring-2 ring-pink-200 shadow-sm`,
      accountLabel: (isOpen: boolean) =>
        isDark
          ? `relative text-[10px] font-semibold transition-colors duration-150 ${isOpen ? "text-pink-400" : "text-white/40"}`
          : `relative text-[10px] font-semibold transition-colors duration-150 ${isOpen ? "text-pink-500" : "text-gray-400"}`,

      // Icons
      addIcon: `w-7 h-7 rounded-full ${styles.icon.pink} flex items-center justify-center`,
      addIconColor: isDark ? "text-pink-400" : "text-pink-500",
      manageIcon: `w-7 h-7 rounded-full ${styles.icon.purple} flex items-center justify-center`,
      manageIconColor: isDark ? "text-purple-400" : "text-purple-500",

      safeArea: isDark
        ? "h-safe-area-inset-bottom bg-[#0a0a16]"
        : "h-safe-area-inset-bottom bg-white",
    }),
    [isDark, styles],
  );

  // Fetch subscription status and accounts
  const fetchData = useCallback(async () => {
    if (!userId) return;
    try {
      const [subscriptionResult, accountsResult] = await Promise.all([
        getSubscriptioninfo(apiRequest),
        getAllInstagramAccounts(apiRequest),
      ]);

      const subscribed =
        subscriptionResult.subscriptions &&
        subscriptionResult.subscriptions.length > 0;
      setIsSubscribed(subscribed);
      setAccountLimit(subscribed ? 3 : 1);
      setAccounts(accountsResult.accounts || []);
    } catch {
      // silent fail
    }
  }, [userId, apiRequest]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Derive primary account info from fetched accounts
  const primaryAccount = accounts[0] ?? null;
  const accountName =
    primaryAccount?.name ?? primaryAccount?.username ?? undefined;
  const accountHandle = primaryAccount?.username ?? undefined;
  const accountAvatarUrl = primaryAccount?.profilePicture ?? undefined;

  const isActive = useCallback(
    (href: string) => {
      return (
        pathname === href || (href !== "/insta" && pathname.startsWith(href))
      );
    },
    [pathname],
  );

  // Close menu on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setAccountMenuOpen(false);
      }
    };
    if (accountMenuOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [accountMenuOpen]);

  const hasAccount = !!accountName;
  const initial = accountName ? accountName[0].toUpperCase() : null;

  return (
    <>
      {/* Account popup — appears above the nav bar */}
      {accountMenuOpen && (
        <div
          ref={menuRef}
          className={`${localStyles.menuPopup} backdrop-blur-lg`}
        >
          {/* Current connected account row */}
          {hasAccount && (
            <div className={localStyles.accountRow}>
              {accountAvatarUrl ? (
                <Image
                  src={accountAvatarUrl}
                  alt={accountName!}
                  height={36}
                  width={36}
                  className="w-9 h-9 rounded-full object-cover flex-shrink-0"
                />
              ) : (
                <div className={localStyles.accountAvatar}>{initial}</div>
              )}
              <div className="min-w-0">
                <p className={localStyles.accountName}>{accountName}</p>
                <p className={localStyles.accountHandle}>@{accountHandle}</p>
              </div>
            </div>
          )}

          {/* Account limit indicator */}
          <div className={localStyles.limitIndicator}>
            <p className={localStyles.limitText}>
              {accounts.length} / {accountLimit} accounts used
            </p>
          </div>

          {/* All accounts list */}
          {accounts.map((acc, index) => (
            <div
              key={acc._id}
              className={
                index === accounts.length - 1
                  ? localStyles.menuItemLast
                  : localStyles.menuItem
              }
            >
              <div className={localStyles.accountAvatar}>
                {(acc.name || acc.username || "?")[0].toUpperCase()}
              </div>
              <span
                className={
                  isDark
                    ? "text-sm text-white/70 truncate"
                    : "text-sm text-gray-700 truncate"
                }
              >
                @{acc.username || acc.name || "account"}
              </span>
            </div>
          ))}

          {/* Add account — only if below limit */}
          {accounts.length < accountLimit && (
            <Link
              href="/insta/accounts/add"
              onClick={() => setAccountMenuOpen(false)}
              className={localStyles.menuItem}
            >
              <div className={localStyles.addIcon}>
                <Plus className={`h-3.5 w-3.5 ${localStyles.addIconColor}`} />
              </div>
              <span
                className={
                  isDark ? "text-sm text-white/70" : "text-sm text-gray-700"
                }
              >
                Add Account
              </span>
            </Link>
          )}

          {/* Manage accounts — only if one exists */}
          {hasAccount && (
            <Link
              href="/insta/accounts"
              onClick={() => setAccountMenuOpen(false)}
              className={localStyles.menuItemLast}
            >
              <div className={localStyles.manageIcon}>
                <Users
                  className={`h-3.5 w-3.5 ${localStyles.manageIconColor}`}
                />
              </div>
              <span
                className={
                  isDark ? "text-sm text-white/70" : "text-sm text-gray-700"
                }
              >
                Manage Accounts
              </span>
            </Link>
          )}

          {/* Upgrade prompt if at limit and not subscribed */}
          {accounts.length >= accountLimit && !isSubscribed && (
            <div className={localStyles.upgradePrompt}>
              <p className={localStyles.upgradeTitle}>Account limit reached</p>
              <p className={localStyles.upgradeDesc}>
                Upgrade to Pro for up to 3 accounts.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Nav bar */}
      <nav className={`${localStyles.nav} backdrop-blur-lg`}>
        <div className="flex items-center justify-around h-16 px-2 ">
          {/* Regular nav links */}
          {BOTTOM_NAV_ITEMS.map((item) => {
            const active = isActive(item.href);
            const Icon = item.icon;
            return (
              <Link
                key={item.label}
                href={item.href}
                className={localStyles.navItem(active)}
              >
                {active && <span className={localStyles.navItemBg(active)} />}
                <span className="relative">
                  <Icon className={localStyles.navIcon(active)} />
                  {active && <span className={localStyles.navActiveDot} />}
                </span>
                <span className={localStyles.navLabel(active)}>
                  {item.label}
                </span>
              </Link>
            );
          })}

          {/* Account button — 5th slot */}
          <button
            onClick={() => setAccountMenuOpen((prev) => !prev)}
            className={localStyles.accountButton(accountMenuOpen)}
          >
            {/* Active background when menu open */}
            {accountMenuOpen && (
              <span className={localStyles.accountBg(accountMenuOpen)} />
            )}

            <span className="relative">
              {hasAccount ? (
                // Show avatar / initial if account is connected
                accountAvatarUrl ? (
                  <Image
                    src={accountAvatarUrl}
                    alt={accountName!}
                    height={24}
                    width={24}
                    className={localStyles.accountAvatarIcon(true)}
                  />
                ) : (
                  <span className={localStyles.accountInitial(true)}>
                    {initial}
                  </span>
                )
              ) : (
                // No account — show dashed add circle
                <span className={localStyles.accountAvatarIcon(false)}>
                  <Plus className="h-3.5 w-3.5" />
                </span>
              )}
            </span>

            <span className={localStyles.accountLabel(accountMenuOpen)}>
              {hasAccount ? "Account" : "Add"}
            </span>
          </button>
        </div>

        {/* Safe area for iPhone home indicator */}
        <div className={localStyles.safeArea} />
      </nav>
    </>
  );
}
