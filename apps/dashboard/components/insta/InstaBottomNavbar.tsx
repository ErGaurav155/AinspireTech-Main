"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useState, useEffect, useRef, useMemo } from "react";
import {
  LayoutDashboard,
  MessageSquare,
  Users,
  Settings,
  Plus,
  Crown,
  Check,
  Contact,
} from "lucide-react";
import Image from "next/image";
import { useAuth } from "@clerk/nextjs";
import { useApi } from "@/lib/useApi";
import { getSubscriptioninfo } from "@/lib/services/insta-actions.api";
import { Button, useThemeStyles } from "@rocketreplai/ui";
import { useInstaAccount } from "@/context/Instaaccountcontext ";

// ─── Constants ────────────────────────────────────────────────────────────────

const BOTTOM_NAV_ITEMS = [
  { label: "Home", href: "/insta", icon: LayoutDashboard },
  { label: "Auto", href: "/insta/automations", icon: MessageSquare },
  { label: "Accounts", href: "/insta/accounts", icon: Users },
  { label: "Contacts", href: "/insta/lead", icon: Contact, isNew: true },
  { label: "Settings", href: "/insta/settings", icon: Settings },
] as const;

// ─── Component ────────────────────────────────────────────────────────────────

export default function InstaBottomNavbar() {
  const pathname = usePathname();
  const router = useRouter();
  const { userId } = useAuth();
  const { apiRequest } = useApi();
  const { styles, isDark } = useThemeStyles();

  // ✅ All account data from context
  const { accounts, selectedAccount, selectAccount } = useInstaAccount();

  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [accountLimit, setAccountLimit] = useState(1);

  // ── Fetch subscription only ───────────────────────────────────────────────

  useEffect(() => {
    if (!userId) return;
    const fetch = async () => {
      try {
        const result = await getSubscriptioninfo(apiRequest);
        const subscribed =
          result.subscriptions && result.subscriptions.length > 0;
        setIsSubscribed(subscribed);
        setAccountLimit(subscribed ? 3 : 1);
      } catch {
        // silent
      }
    };
    fetch();
  }, [userId, apiRequest]);

  // ── Active check ──────────────────────────────────────────────────────────

  const isActive = useCallback(
    (href: string) =>
      pathname === href || (href !== "/insta" && pathname.startsWith(href)),
    [pathname],
  );

  // ── Close popup on outside click ──────────────────────────────────────────

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setAccountMenuOpen(false);
      }
    };
    if (accountMenuOpen) {
      document.addEventListener("mousedown", handler);
    }
    return () => document.removeEventListener("mousedown", handler);
  }, [accountMenuOpen]);

  // ── Styles ────────────────────────────────────────────────────────────────

  const localStyles = useMemo(
    () => ({
      nav: isDark
        ? "fixed bottom-0 left-0 right-0 z-40 md:hidden glass-nav border-t border-white/[0.06] shadow-[0_-4px_20px_rgba(0,0,0,0.3)]"
        : "fixed bottom-0 left-0 right-0 z-40 md:hidden bg-white border-t border-gray-100 shadow-[0_-4px_20px_rgba(0,0,0,0.06)]",
      menuPopup: isDark
        ? "fixed bottom-[72px] right-3 z-50 glass-card border border-white/[0.08] rounded-2xl shadow-[0_8px_32px_rgba(0,0,0,0.5)] overflow-hidden w-60 md:hidden"
        : "fixed bottom-[72px] right-3 z-50 bg-white rounded-2xl shadow-[0_8px_32px_rgba(0,0,0,0.12)] border border-gray-100 overflow-hidden w-60 md:hidden",
      menuItem: `flex items-center gap-3 px-4 py-3 border-b ${styles.divider} ${styles.rowHover} text-sm ${styles.text.primary} w-full text-left`,
      menuItemLast: `flex items-center gap-3 px-4 py-3 ${styles.rowHover} text-sm ${styles.text.primary} w-full text-left`,
      // ✅ highlight selected account
      menuItemSelected: isDark
        ? "bg-pink-500/10 border-l-2 border-pink-500"
        : "bg-pink-50 border-l-2 border-pink-500",
      accountRow: `flex items-center gap-3 px-4 py-3 border-b ${styles.divider}`,
      accountAvatar: `w-9 h-9 rounded-full bg-gradient-to-br from-pink-400 to-rose-500 flex items-center justify-center text-white font-bold text-sm flex-shrink-0 shadow-sm overflow-hidden`,
      accountName: `text-sm font-semibold truncate ${styles.text.primary}`,
      accountHandle: `text-xs truncate ${styles.text.muted}`,
      limitIndicator: `px-4 py-2 border-b ${styles.divider} ${isDark ? "bg-white/[0.03]" : "bg-gray-50"}`,
      limitText: `text-xs ${styles.text.muted}`,
      upgradePrompt: `px-4 py-3 border-t ${styles.divider} ${isDark ? "bg-pink-500/10" : "bg-pink-50"}`,
      upgradeTitle: `text-xs ${styles.text.primary} font-medium mb-1`,
      upgradeDesc: `text-xs ${styles.text.secondary} mb-2`,
      addIcon: `w-7 h-7 rounded-full ${styles.icon.pink} flex items-center justify-center flex-shrink-0`,
      addIconColor: isDark ? "text-pink-400" : "text-pink-500",
      manageIcon: `w-7 h-7 rounded-full ${styles.icon.purple} flex items-center justify-center flex-shrink-0`,
      manageIconColor: isDark ? "text-purple-400" : "text-purple-500",
      navItem: `flex flex-col items-center justify-center gap-1 flex-1 py-2 relative group`,
      navItemBg: (active: boolean) =>
        `absolute inset-x-2 top-1 bottom-1 rounded-xl ${
          active ? (isDark ? "bg-pink-500/10" : "bg-pink-50") : ""
        }`,
      navIcon: (active: boolean) =>
        isDark
          ? `h-5 w-5 transition-colors duration-150 ${
              active
                ? "text-pink-400"
                : "text-white/40 group-hover:text-white/60"
            }`
          : `h-5 w-5 transition-colors duration-150 ${
              active
                ? "text-pink-500"
                : "text-gray-400 group-hover:text-gray-600"
            }`,
      navLabel: (active: boolean) =>
        `relative text-[10px] font-semibold transition-colors duration-150 ${
          isDark
            ? active
              ? "text-pink-400"
              : "text-white/40"
            : active
              ? "text-pink-500"
              : "text-gray-400"
        }`,
      navActiveDot: `absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full ${
        isDark ? "bg-pink-400" : "bg-pink-500"
      }`,
      accountButton: `flex flex-col items-center justify-center gap-1 flex-1 py-2 relative group`,
      accountBg: (open: boolean) =>
        `absolute inset-x-2 top-1 bottom-1 rounded-xl ${
          open ? (isDark ? "bg-pink-500/10" : "bg-pink-50") : ""
        }`,
      accountAvatarSmall: `h-6 w-6 rounded-full object-cover ring-2 ring-pink-300`,
      accountInitialSmall: `flex h-6 w-6 items-center justify-center rounded-full bg-gradient-to-br from-pink-400 to-rose-500 text-white text-[10px] font-bold ring-2 ring-pink-200 shadow-sm`,
      accountPlaceholder: `flex h-6 w-6 items-center justify-center rounded-full border-2 border-dashed ${
        isDark
          ? "border-white/30 text-white/40"
          : "border-gray-300 text-gray-400"
      } group-hover:border-pink-400 group-hover:text-pink-400 transition-colors`,
      accountLabel: (open: boolean) =>
        `relative text-[10px] font-semibold transition-colors duration-150 ${
          isDark
            ? open
              ? "text-pink-400"
              : "text-white/40"
            : open
              ? "text-pink-500"
              : "text-gray-400"
        }`,
      safeArea: isDark
        ? "h-safe-area-inset-bottom bg-[#0a0a16]"
        : "h-safe-area-inset-bottom bg-white",
    }),
    [isDark, styles],
  );

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <>
      {/* Account popup */}
      {accountMenuOpen && (
        <div
          ref={menuRef}
          className={`${localStyles.menuPopup} backdrop-blur-lg`}
        >
          {/* Header — currently selected account */}
          {selectedAccount && (
            <div className={localStyles.accountRow}>
              <div className={localStyles.accountAvatar}>
                {selectedAccount.profilePicture ? (
                  <Image
                    src={selectedAccount.profilePicture}
                    alt={selectedAccount.username}
                    width={36}
                    height={36}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span>{selectedAccount.username[0]?.toUpperCase()}</span>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className={localStyles.accountName}>
                  @{selectedAccount.username}
                </p>
                <p className={localStyles.accountHandle}>
                  {selectedAccount.followersCount.toLocaleString()} followers
                </p>
              </div>
              {isSubscribed && (
                <span className="flex items-center gap-1 text-xs font-bold text-orange-400 flex-shrink-0">
                  <Crown className="w-3.5 h-3.5 animate-pulse" />
                  Pro
                </span>
              )}
            </div>
          )}

          {/* Account count */}
          <div className={localStyles.limitIndicator}>
            <p className={localStyles.limitText}>
              {accounts.length} / {accountLimit} accounts used
            </p>
          </div>

          {/* ✅ All accounts — tap to select */}
          {accounts.map((acc) => {
            const isSelected = acc.instagramId === selectedAccount?.instagramId;
            return (
              <button
                key={acc.instagramId}
                onClick={() => {
                  selectAccount(acc.instagramId);
                  setAccountMenuOpen(false);
                }}
                className={`${localStyles.menuItem} ${isSelected ? localStyles.menuItemSelected : ""}`}
              >
                <div
                  className={localStyles.accountAvatar}
                  style={{ width: 28, height: 28, fontSize: 11 }}
                >
                  {acc.profilePicture ? (
                    <Image
                      src={acc.profilePicture}
                      alt={acc.username}
                      width={28}
                      height={28}
                      className="w-full h-full object-cover rounded-full"
                    />
                  ) : (
                    <span>{acc.username[0]?.toUpperCase()}</span>
                  )}
                </div>
                <div className="flex-1 min-w-0 text-left">
                  <p
                    className={`text-sm font-medium truncate ${isDark ? "text-white/80" : "text-gray-700"}`}
                  >
                    @{acc.username}
                  </p>
                  <div className="flex items-center gap-1.5">
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${acc.isActive ? "bg-green-400" : "bg-gray-400"}`}
                    />
                    <p className={`text-xs ${styles.text.muted}`}>
                      {acc.isActive ? "Active" : "Inactive"}
                    </p>
                  </div>
                </div>
                {isSelected && (
                  <Check className="h-4 w-4 text-pink-400 flex-shrink-0" />
                )}
              </button>
            );
          })}

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
                Connect new account
              </span>
            </Link>
          )}

          {/* Manage accounts */}
          {accounts.length > 0 && (
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
              <Button
                onClick={() => {
                  router.push("/insta/pricing");
                  setAccountMenuOpen(false);
                }}
                size="sm"
                className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white rounded-lg text-xs h-7"
              >
                <Crown className="h-3 w-3 mr-1" />
                Upgrade to Pro
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Bottom nav bar */}
      <nav className={`${localStyles.nav} backdrop-blur-lg`}>
        <div className="flex items-center justify-around h-16 md:px-2">
          {/* Regular nav links */}
          {BOTTOM_NAV_ITEMS.map((item) => {
            const active = isActive(item.href);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={localStyles.navItem}
              >
                <span className={localStyles.navItemBg(active)} />
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

          {/* Account switcher button — 5th slot */}
          <button
            onClick={() => setAccountMenuOpen((prev) => !prev)}
            className={localStyles.accountButton}
          >
            {accountMenuOpen && (
              <span className={localStyles.accountBg(accountMenuOpen)} />
            )}

            <span className="relative">
              {selectedAccount ? (
                selectedAccount.profilePicture ? (
                  <Image
                    src={selectedAccount.profilePicture}
                    alt={selectedAccount.username}
                    width={24}
                    height={24}
                    className={localStyles.accountAvatarSmall}
                  />
                ) : (
                  <span className={localStyles.accountInitialSmall}>
                    {selectedAccount.username[0]?.toUpperCase()}
                  </span>
                )
              ) : (
                <span className={localStyles.accountPlaceholder}>
                  <Plus className="h-3.5 w-3.5" />
                </span>
              )}
            </span>

            <span className={localStyles.accountLabel(accountMenuOpen)}>
              {selectedAccount ? "Account" : "Add"}
            </span>
          </button>
        </div>

        <div className={localStyles.safeArea} />
      </nav>
    </>
  );
}
