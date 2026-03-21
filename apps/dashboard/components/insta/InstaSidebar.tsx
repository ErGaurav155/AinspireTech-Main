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
} from "lucide-react";
import Image from "next/image";

import { useApi } from "@/lib/useApi";
import {
  getSubscriptioninfo,
  getAllInstagramAccounts,
} from "@/lib/services/insta-actions.api";
import { Badge, Button, Orbs, useThemeStyles } from "@rocketreplai/ui";

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

interface InstagramAccount {
  _id?: string;
  instagramId?: string;
  username?: string;
  name?: string;
  profilePicture?: string;
  [key: string]: any;
}

interface InstaSidebarProps {
  isOpen: boolean;
  onToggle: () => void;
}

export default function InstaSidebar({ isOpen, onToggle }: InstaSidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { userId } = useAuth();
  const { apiRequest } = useApi();
  const { styles, isDark } = useThemeStyles();

  const [isLoading, setIsLoading] = useState(true);
  const [isAccountOpen, setIsAccountOpen] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [pricingClose, setPricingClose] = useState(false);
  const [accounts, setAccounts] = useState<InstagramAccount[]>([]);
  const [accountLimit, setAccountLimit] = useState(1);

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

      // Handle different response structures for accounts
      let accountsList: InstagramAccount[] = [];
      if (accountsResult?.accounts && Array.isArray(accountsResult.accounts)) {
        accountsList = accountsResult.accounts.map((item: any) => {
          // Extract account info based on your API structure
          return item.accountInfo || item;
        });
      } else if (Array.isArray(accountsResult)) {
        accountsList = accountsResult;
      }
      setAccounts(accountsList);
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setIsLoading(false);
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

  // Memoize active state check
  const isActive = useCallback(
    (href: string) => {
      return (
        pathname === href || (href !== "/insta" && pathname.startsWith(href))
      );
    },
    [pathname],
  );

  // Build local styles using central theme
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
      closeIcon: isDark
        ? `h-4 w-4 ${styles.text.muted}`
        : `h-4 w-4 text-gray-600`,

      // Logo section
      logoContainer: `p-3 border-b ${styles.divider}`,
      logoText: `text-xl font-black tracking-tight ${isDark ? "text-white" : "text-gray-900"}`,
      logoRocket: isDark ? "text-pink-400" : "text-pink-500",
      logoReplai: isDark ? "text-purple-400" : "text-purple-600",

      // Account selector
      selectorButton: `w-full flex items-center justify-between p-3 rounded-xl transition-colors group ${styles.innerCard} ${styles.rowHover}`,
      selectorAvatar: `w-9 h-9 rounded-full bg-gradient-to-br from-pink-400 to-rose-500 flex items-center justify-center text-white font-bold text-sm shadow-sm ${isDark ? "opacity-90" : ""}`,
      selectorName: `text-sm font-semibold truncate max-w-[130px] ${styles.text.primary}`,
      selectorHandle: `text-xs truncate max-w-[130px] ${styles.text.muted}`,
      selectorChevron: `h-4 w-4 flex-shrink-0 ${styles.text.muted} transition-transform duration-200`,

      // Dropdown
      dropdown: isDark
        ? "mt-2 glass-card border border-white/[0.08] rounded-xl shadow-lg overflow-hidden absolute left-4 right-4 bg-gray-900/70 backdrop-blur-3xl z-50"
        : "mt-2 bg-white border border-gray-100 rounded-xl shadow-lg overflow-hidden absolute left-4 right-4 z-50",
      dropdownLimit: `px-4 py-2 border-b ${styles.divider} ${isDark ? "bg-white/[0.03]" : "bg-gray-50"}`,
      dropdownLimitText: `text-xs ${styles.text.muted}`,
      dropdownItem: `flex items-center gap-3 px-4 py-3 border-b ${styles.divider} ${styles.rowHover} text-sm ${styles.text.primary}`,
      dropdownItemLast: `flex items-center gap-3 px-4 py-3 ${styles.rowHover} text-sm ${styles.text.primary}`,
      dropdownUpgrade: `px-4 py-3 border-t ${styles.divider} ${styles.icon.pink}`,
      dropdownUpgradeTitle: `text-xs ${styles.text.primary} font-medium mb-1`,
      dropdownUpgradeDesc: `text-xs ${styles.text.secondary} mb-2`,
      dropdownUpgradeButton: `w-full ${styles.button.primary} rounded-lg text-xs h-7`,

      // Add account icon
      addIcon: `w-7 h-7 rounded-full ${styles.icon.pink} flex items-center justify-center`,
      addIconColor: isDark ? "text-pink-400" : "text-pink-500",

      // Manage icon
      manageIcon: `w-7 h-7 rounded-full ${styles.icon.purple} flex items-center justify-center`,
      manageIconColor: isDark ? "text-purple-400" : "text-purple-500",

      // Navigation
      navLink: (isActive: boolean) =>
        isDark
          ? `flex items-center justify-between px-3 py-2.5 rounded-xl transition-all duration-150 group ${
              isActive
                ? "bg-pink-500/10 text-pink-400"
                : "text-white/40 hover:bg-white/[0.06] hover:text-white/70"
            }`
          : `flex items-center justify-between px-3 py-2.5 rounded-xl transition-all duration-150 group ${
              isActive
                ? "bg-pink-50 text-pink-600 shadow-sm"
                : "text-gray-500 hover:bg-gray-50 hover:text-gray-800"
            }`,
      navIcon: (isActive: boolean) =>
        isDark
          ? `h-[18px] w-[18px] flex-shrink-0 transition-colors ${
              isActive
                ? "text-pink-400"
                : "text-white/40 group-hover:text-white/60"
            }`
          : `h-[18px] w-[18px] flex-shrink-0 transition-colors ${
              isActive
                ? "text-pink-500"
                : "text-gray-400 group-hover:text-gray-600"
            }`,
      navLabel: "text-sm font-medium",

      // Upgrade section
      upgradeCard: isDark
        ? `bg-gradient-to-br from-white/[0.03] to-pink-500/10 rounded-2xl p-4 border border-pink-500/20`
        : `bg-gradient-to-br from-gray-50 to-pink-50/50 rounded-2xl p-4 border border-pink-100/50`,
      upgradeTitle: isDark
        ? `text-[13px] font-bold text-white`
        : `text-[13px] font-bold text-gray-800`,
      upgradeFeature: `text-xs ${styles.text.secondary}`,
      upgradeFeatureIcon: `w-4 h-4 rounded-full ${styles.icon.pink} flex items-center justify-center flex-shrink-0`,
      upgradeFeatureIconColor: isDark ? "text-pink-400" : "text-pink-500",
      upgradeClose: isDark
        ? `h-5 px-2 bg-red-500/80 hover:bg-red-500 text-white rounded-lg text-xs ml-auto`
        : `h-5 px-2 bg-red-500 hover:bg-red-600 text-white rounded-lg text-xs ml-auto`,
      upgradeButton: isDark
        ? `w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white rounded-full text-xs font-bold h-9 shadow-md shadow-purple-500/20 transition-all hover:shadow-purple-500/40`
        : `w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white rounded-full text-xs font-bold h-9 shadow-md shadow-purple-200/50 transition-all hover:shadow-purple-300/60`,

      newBadge: isDark
        ? `bg-pink-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm`
        : `bg-pink-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm`,

      loadingContainer: `fixed left-0 top-0 bottom-0 w-72  ${styles.divider} flex items-center justify-center`,
    }),
    [isDark, styles],
  );

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
            onClick={() => setIsAccountOpen(!isAccountOpen)}
            className={localStyles.selectorButton}
          >
            <div className="flex items-center gap-3">
              <div className={localStyles.selectorAvatar}>
                {(accountName || "U")[0].toUpperCase()}
              </div>
              <div className="text-left min-w-0">
                <p className={localStyles.selectorName}>
                  {accountName || "My Account"}
                </p>
                <p className={localStyles.selectorHandle}>
                  @{accountHandle || "connect account"}
                </p>
              </div>
            </div>
            {isSubscribed && (
              <Button
                asChild
                className={`
              text-sm font-semibold rounded-md p-1
              transition-all duration-300
              ${
                isDark
                  ? `
               text-orange-300
                shadow-[0_0_10px_rgba(210, 138, 29, 0.4)]
                 `
                  : `
                 text-orange-700
        
                 shadow-sm
               `
              }
             `}
              >
                <span className="flex items-center gap-1">
                  <Crown className="w-4 h-4 text-orange-400 animate-pulse" />
                  Pro
                </span>
              </Button>
            )}
            <ChevronDown
              className={`${localStyles.selectorChevron} ${
                isAccountOpen ? "rotate-180" : ""
              }`}
            />
          </button>

          {isAccountOpen && (
            <div className={localStyles.dropdown}>
              {/* Account limit info */}
              <div className={localStyles.dropdownLimit}>
                <p className={localStyles.dropdownLimitText}>
                  {accounts.length} / {accountLimit} accounts used
                </p>
              </div>

              {/* List existing accounts - FIXED: Added unique keys */}
              {accounts.map((acc, index) => {
                // Generate a unique key from _id, instagramId, or index as last resort
                const accountKey =
                  acc._id || acc.instagramId || `account-${index}`;
                return (
                  <div
                    key={accountKey}
                    className={
                      index === accounts.length - 1
                        ? localStyles.dropdownItemLast
                        : localStyles.dropdownItem
                    }
                  >
                    <div className={localStyles.selectorAvatar}>
                      {(acc.name || acc.username || "?")[0].toUpperCase()}
                    </div>
                    <span className="truncate">
                      @{acc.username || acc.name || "account"}
                    </span>
                  </div>
                );
              })}

              {/* Add account — only if below limit */}
              {accounts.length < accountLimit && (
                <Link
                  href="/insta/accounts/add"
                  className={localStyles.dropdownItem}
                  onClick={() => {
                    setIsAccountOpen(false);
                    if (window.innerWidth < 768) {
                      onToggle();
                    }
                  }}
                >
                  <div className={localStyles.addIcon}>
                    <Instagram
                      className={`h-3.5 w-3.5 ${localStyles.addIconColor}`}
                    />
                  </div>
                  Add Instagram Account
                </Link>
              )}

              {/* Show upgrade prompt if at limit and not subscribed */}
              {accounts.length >= accountLimit && !isSubscribed && (
                <div
                  key="upgrade-prompt"
                  className={localStyles.dropdownUpgrade}
                >
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
                      if (window.innerWidth < 768) {
                        onToggle();
                      }
                    }}
                    size="sm"
                    className={localStyles.dropdownUpgradeButton}
                  >
                    <Crown className="h-3 w-3 mr-1" />
                    Upgrade to Pro
                  </Button>
                </div>
              )}

              <Link
                href="/insta/accounts"
                className={localStyles.dropdownItemLast}
                onClick={() => {
                  setIsAccountOpen(false);
                  if (window.innerWidth < 768) {
                    onToggle();
                  }
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
                key={item.label + item.href}
                href={item.href}
                onClick={() => {
                  if (window.innerWidth < 768) {
                    onToggle();
                  }
                }}
                className={localStyles.navLink(active)}
              >
                <div className="flex items-center gap-3">
                  <Icon className={localStyles.navIcon(active)} />
                  <span className={localStyles.navLabel}>{item.label}</span>
                </div>
                {item?.isNew && (
                  <Badge className={localStyles.newBadge}>NEW</Badge>
                )}
                {active && (
                  <div
                    className={`w-1 h-6 rounded-full bg-pink-500 text-pink-300`}
                  />
                )}
              </Link>
            );
          })}
        </nav>

        {/* Upgrade Section — only show for free users */}
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
                  (feature, index) => (
                    <li
                      key={`feature-${index}`} // FIXED: Added unique key for feature list
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
                  if (window.innerWidth < 768) {
                    onToggle();
                  }
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
    accountHandle,
    accountLimit,
    accountName,
    accounts,
    isAccountOpen,
    isActive,
    isDark,
    isSubscribed,
    localStyles,
    onToggle,
    pricingClose,
    router,
  ]);

  if (isLoading) {
    return <div className={localStyles.loadingContainer}></div>;
  }
  return (
    <>
      {isDark && <Orbs />}
      {/* Unified sidebar - works the same on mobile and desktop */}
      <div
        className={`${localStyles.sidebar} ${
          isOpen ? "translate-x-0 left-0 md:left-1" : "-translate-x-full left-0"
        } backdrop-blur-xl`}
      >
        {/* Close button for mobile */}
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

      {/* Overlay for mobile when sidebar is open */}
      {isOpen && <div className={localStyles.overlay} onClick={onToggle} />}
    </>
  );
}
