"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@clerk/nextjs";
import Logo from "@/public/assets/img/logo.png";
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
  Plus,
} from "lucide-react";
import Image from "next/image";

import { useApi } from "@/lib/useApi";
import { getSubscriptioninfo } from "@/lib/services/insta-actions.api";
import { Badge, Button, Orbs, useThemeStyles } from "@rocketreplai/ui";
import { useInstaAccount } from "@/context/Instaaccountcontext ";

// ─── Constants ────────────────────────────────────────────────────────────────

const NAV_ITEMS = [
  { label: "Home", href: "/insta", icon: LayoutDashboard, isNew: false },
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

// ─── Props ────────────────────────────────────────────────────────────────────

interface InstaSidebarProps {
  isOpen: boolean;
  onToggle: () => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function InstaSidebar({ isOpen, onToggle }: InstaSidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { userId } = useAuth();
  const { apiRequest } = useApi();
  const { styles, isDark } = useThemeStyles();

  // ✅ All account data comes from context — no local fetch needed
  const {
    accounts,
    selectedAccount,
    selectAccount,
    isAccLoading: accountsLoading,
  } = useInstaAccount();

  const [isAccountOpen, setIsAccountOpen] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [accountLimit, setAccountLimit] = useState(1);
  const [pricingClose, setPricingClose] = useState(false);
  const [subsLoading, setSubsLoading] = useState(true);

  // ── Fetch subscription info only (accounts come from context) ─────────────

  const fetchSubscription = useCallback(async () => {
    if (!userId) return;
    try {
      const result = await getSubscriptioninfo(apiRequest);
      const subscribed =
        result.subscriptions && result.subscriptions.length > 0;
      setIsSubscribed(subscribed);
      setAccountLimit(subscribed ? 3 : 1);
    } catch (error) {
      console.error("Error fetching subscription:", error);
    } finally {
      setSubsLoading(false);
    }
  }, [userId, apiRequest]);

  useEffect(() => {
    fetchSubscription();
  }, [fetchSubscription]);

  // ── Active route check ────────────────────────────────────────────────────

  const isActive = useCallback(
    (href: string) =>
      pathname === href || (href !== "/insta" && pathname.startsWith(href)),
    [pathname],
  );

  // ── Styles ────────────────────────────────────────────────────────────────

  const localStyles = useMemo(
    () => ({
      sidebar: isDark
        ? `fixed top-0 bottom-0 md:top-1 md:bottom-1 rounded-lg w-72 z-50 shadow-xl transition-transform duration-300 glass-sidebar border border-white/[0.05] overflow-hidden shimmer`
        : `fixed top-0 bottom-0 md:top-1 md:bottom-1 rounded-lg w-72 z-50 shadow-xl transition-transform duration-300 bg-white border border-gray-300`,
      overlay: isDark
        ? `fixed inset-0 bg-black/60 backdrop-blur-sm z-40 md:hidden`
        : `fixed inset-0 bg-black/40 z-40 md:hidden`,
      closeButton: isDark
        ? `absolute top-4 right-4 p-1.5 rounded-lg glass-pill md:hidden`
        : `absolute top-4 right-4 p-1.5 rounded-lg bg-gray-100 hover:bg-gray-200 transition-colors md:hidden`,
      closeIcon: `h-4 w-4 ${styles.text.muted}`,
      logoContainer: `p-3 border-b ${styles.divider}`,
      selectorButton: `w-full flex items-center justify-between p-3 rounded-xl transition-colors group ${styles.innerCard} ${styles.rowHover}`,
      selectorAvatar: `w-9 h-9 rounded-full bg-gradient-to-br from-pink-400 to-rose-500 flex items-center justify-center text-white font-bold text-sm shadow-sm flex-shrink-0 overflow-hidden`,
      selectorName: `text-sm font-semibold truncate max-w-[130px] ${styles.text.primary}`,
      selectorHandle: `text-xs truncate max-w-[130px] ${styles.text.muted}`,
      selectorChevron: `h-4 w-4 flex-shrink-0 ${styles.text.muted} transition-transform duration-200`,
      dropdown: isDark
        ? "mt-2 glass-card border border-white/[0.08] rounded-xl shadow-lg overflow-hidden absolute left-4 right-4 bg-gray-900/70 backdrop-blur-3xl z-50"
        : "mt-2 bg-white border border-gray-100 rounded-xl shadow-lg overflow-hidden absolute left-4 right-4 z-50",
      dropdownLimit: `px-4 py-2 border-b ${styles.divider} ${isDark ? "bg-white/[0.03]" : "bg-gray-50"}`,
      dropdownLimitText: `text-xs ${styles.text.muted}`,
      dropdownItem: `flex items-center gap-3 px-4 py-3 border-b ${styles.divider} ${styles.rowHover} text-sm ${styles.text.primary} w-full text-left`,
      dropdownItemLast: `flex items-center gap-3 px-4 py-3 ${styles.rowHover} text-sm ${styles.text.primary} w-full text-left`,
      dropdownUpgrade: `px-4 py-3 border-t ${styles.divider} ${styles.icon.pink}`,
      dropdownUpgradeTitle: `text-xs ${styles.text.primary} font-medium mb-1`,
      dropdownUpgradeDesc: `text-xs ${styles.text.secondary} mb-2`,
      addIcon: `w-7 h-7 rounded-full ${styles.icon.pink} flex items-center justify-center flex-shrink-0`,
      addIconColor: isDark ? "text-pink-400" : "text-pink-500",
      manageIcon: `w-7 h-7 rounded-full ${styles.icon.purple} flex items-center justify-center flex-shrink-0`,
      manageIconColor: isDark ? "text-purple-400" : "text-purple-500",
      navLink: (active: boolean) =>
        isDark
          ? `flex items-center justify-between px-3 py-2.5 rounded-xl transition-all duration-150 group ${
              active
                ? "bg-pink-500/10 text-pink-400"
                : "text-white/40 hover:bg-white/[0.06] hover:text-white/70"
            }`
          : `flex items-center justify-between px-3 py-2.5 rounded-xl transition-all duration-150 group ${
              active
                ? "bg-pink-50 text-pink-600 shadow-sm"
                : "text-gray-500 hover:bg-gray-50 hover:text-gray-800"
            }`,
      navIcon: (active: boolean) =>
        isDark
          ? `h-[18px] w-[18px] flex-shrink-0 transition-colors ${
              active
                ? "text-pink-400"
                : "text-white/40 group-hover:text-white/60"
            }`
          : `h-[18px] w-[18px] flex-shrink-0 transition-colors ${
              active
                ? "text-pink-500"
                : "text-gray-400 group-hover:text-gray-600"
            }`,
      navLabel: "text-sm font-medium",
      upgradeCard: isDark
        ? `bg-gradient-to-br from-white/[0.03] to-pink-500/10 rounded-2xl p-4 border border-pink-500/20`
        : `bg-gradient-to-br from-gray-50 to-pink-50/50 rounded-2xl p-4 border border-pink-100/50`,
      upgradeTitle: `text-[13px] font-bold ${isDark ? "text-white" : "text-gray-800"}`,
      upgradeFeature: `text-xs ${styles.text.secondary}`,
      upgradeFeatureIcon: `w-4 h-4 rounded-full ${styles.icon.pink} flex items-center justify-center flex-shrink-0`,
      upgradeFeatureIconColor: isDark ? "text-pink-400" : "text-pink-500",
      upgradeClose: `h-5 px-2 ${isDark ? "bg-red-500/80 hover:bg-red-500" : "bg-red-500 hover:bg-red-600"} text-white rounded-lg text-xs ml-auto`,
      upgradeButton: `w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white rounded-full text-xs font-bold h-9 shadow-md transition-all`,
      newBadge: `bg-pink-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm`,
      loadingContainer: `fixed left-0 top-0 bottom-0 w-72 ${styles.divider} flex items-center justify-center`,
      // ✅ selected item highlight in dropdown
      dropdownSelected: isDark
        ? "bg-pink-500/10 border-l-2 border-pink-500"
        : "bg-pink-50 border-l-2 border-pink-500",
    }),
    [isDark, styles],
  );

  // ─── Sidebar content ───────────────────────────────────────────────────────

  const SidebarContent = useMemo(() => {
    const Content = () => (
      <div className="flex flex-col h-full relative z-10">
        {/* Logo */}
        <div className={localStyles.logoContainer}>
          <Link href="/insta" className="flex items-center">
            <Image alt="Logo" src={Logo} className="object-cover h-14 w-full" />
          </Link>
        </div>

        {/* Account Selector */}
        <div className="p-4 relative z-10">
          <button
            onClick={() => setIsAccountOpen((v) => !v)}
            className={localStyles.selectorButton}
          >
            <div className="flex items-center gap-3 min-w-0 flex-1">
              {/* ✅ Show selected account avatar */}
              <div className={localStyles.selectorAvatar}>
                {selectedAccount?.profilePicture ? (
                  <Image
                    src={selectedAccount.profilePicture}
                    alt={selectedAccount.username}
                    width={36}
                    height={36}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span>
                    {(selectedAccount?.username || "U")[0].toUpperCase()}
                  </span>
                )}
              </div>
              <div className="text-left min-w-0 flex-1">
                <p className={localStyles.selectorName}>
                  {selectedAccount?.username
                    ? `@${selectedAccount.username}`
                    : "Select account"}
                </p>
                <p className={localStyles.selectorHandle}>
                  {selectedAccount
                    ? `${selectedAccount.followersCount.toLocaleString()} followers`
                    : "No account connected"}
                </p>
              </div>
            </div>

            {isSubscribed && (
              <span className="flex items-center gap-1 text-sm font-semibold text-orange-400 flex-shrink-0 mr-1">
                <Crown className="w-4 h-4 animate-pulse" />
                Pro
              </span>
            )}

            <ChevronDown
              className={`${localStyles.selectorChevron} ${isAccountOpen ? "rotate-180" : ""}`}
            />
          </button>

          {/* ✅ Dropdown — shows ALL accounts, highlights selected */}
          {isAccountOpen && (
            <div className={localStyles.dropdown}>
              <div className={localStyles.dropdownLimit}>
                <p className={localStyles.dropdownLimitText}>
                  {accounts.length} / {accountLimit} accounts used
                </p>
              </div>

              {accounts.map((acc) => {
                const isSelected =
                  acc.instagramId === selectedAccount?.instagramId;
                return (
                  <button
                    key={acc.instagramId}
                    onClick={() => {
                      selectAccount(acc.instagramId);
                      setIsAccountOpen(false);
                    }}
                    className={`${localStyles.dropdownItem} ${isSelected ? localStyles.dropdownSelected : ""}`}
                  >
                    <div
                      className={localStyles.selectorAvatar}
                      style={{ width: 28, height: 28, fontSize: 12 }}
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
                    <div className="flex-1 text-left min-w-0">
                      <p
                        className={`text-sm font-medium truncate ${isDark ? "text-white" : "text-gray-800"}`}
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
                  className={localStyles.dropdownItemLast}
                  onClick={() => {
                    setIsAccountOpen(false);
                    if (window.innerWidth < 768) onToggle();
                  }}
                >
                  <div className={localStyles.addIcon}>
                    <Plus
                      className={`h-3.5 w-3.5 ${localStyles.addIconColor}`}
                    />
                  </div>
                  Connect new account
                </Link>
              )}

              {/* Upgrade prompt if at limit and not subscribed */}
              {accounts.length >= accountLimit && !isSubscribed && (
                <div className={localStyles.dropdownUpgrade}>
                  <p className={localStyles.dropdownUpgradeTitle}>
                    Account limit reached
                  </p>
                  <p className={localStyles.dropdownUpgradeDesc}>
                    Upgrade to Pro to connect up to 3 accounts.
                  </p>
                  <Button
                    onClick={() => {
                      router.push("/insta/pricing");
                      setIsAccountOpen(false);
                      if (window.innerWidth < 768) onToggle();
                    }}
                    size="sm"
                    className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white rounded-lg text-xs h-7"
                  >
                    <Crown className="h-3 w-3 mr-1" />
                    Upgrade to Pro
                  </Button>
                </div>
              )}

              {/* Manage accounts */}
              <Link
                href="/insta/accounts"
                className={localStyles.dropdownItemLast}
                onClick={() => {
                  setIsAccountOpen(false);
                  if (window.innerWidth < 768) onToggle();
                }}
              >
                <div className={localStyles.manageIcon}>
                  <Users
                    className={`h-3.5 w-3.5 ${localStyles.manageIconColor}`}
                  />
                </div>
                Manage Accounts
              </Link>
            </div>
          )}
        </div>

        {/* Navigation */}
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
                className={localStyles.navLink(active)}
              >
                <div className="flex items-center gap-3">
                  <Icon className={localStyles.navIcon(active)} />
                  <span className={localStyles.navLabel}>{item.label}</span>
                </div>
                {item.isNew && (
                  <Badge className={localStyles.newBadge}>NEW</Badge>
                )}
                {active && <div className="w-1 h-6 rounded-full bg-pink-500" />}
              </Link>
            );
          })}
        </nav>

        {/* Upgrade section — only for free users */}
        {!isSubscribed && !pricingClose && (
          <div className="p-4">
            <div className={localStyles.upgradeCard}>
              <div className="flex items-center gap-2 mb-3">
                <span className={localStyles.upgradeTitle}>
                  Unlock more power 🚀
                </span>
                <Button
                  onClick={() => setPricingClose(true)}
                  size="sm"
                  className={localStyles.upgradeClose}
                >
                  X
                </Button>
              </div>
              <ul className="space-y-2 mb-4">
                {["Unlimited DMs", "Unlimited Contacts", "Growth Features"].map(
                  (feature) => (
                    <li
                      key={feature}
                      className="flex items-center gap-2 text-xs"
                    >
                      <div className={localStyles.upgradeFeatureIcon}>
                        <Check
                          className={`h-2.5 w-2.5 ${localStyles.upgradeFeatureIconColor}`}
                        />
                      </div>
                      <span className={localStyles.upgradeFeature}>
                        {feature}
                      </span>
                    </li>
                  ),
                )}
              </ul>
              <Button
                onClick={() => {
                  router.push("/insta/pricing");
                  if (window.innerWidth < 768) onToggle();
                }}
                className={localStyles.upgradeButton}
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
    accounts,
    accountLimit,
    isAccountOpen,
    isActive,
    isDark,
    isSubscribed,
    localStyles,
    onToggle,
    pricingClose,
    router,
    selectAccount,
    selectedAccount,
    styles,
  ]);

  // ─── Loading state ─────────────────────────────────────────────────────────

  if (accountsLoading && subsLoading) {
    return <div className={localStyles.loadingContainer} />;
  }

  return (
    <>
      {isDark && <Orbs />}

      {/* Sidebar */}
      <div
        className={`${localStyles.sidebar} ${
          isOpen ? "translate-x-0 left-0 md:left-1" : "-translate-x-full left-0"
        } backdrop-blur-xl`}
      >
        {/* Close button — mobile only */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onToggle();
          }}
          className={`${localStyles.closeButton} z-[60]`}
        >
          <X className={localStyles.closeIcon} />
        </button>

        <SidebarContent />
      </div>

      {/* Mobile overlay */}
      {isOpen && <div className={localStyles.overlay} onClick={onToggle} />}
    </>
  );
}
