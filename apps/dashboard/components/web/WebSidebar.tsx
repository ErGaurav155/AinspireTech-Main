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
  Bot,
  Check,
  LayoutDashboard,
  BarChart3,
  Menu,
  X,
  Target,
  MessageCircle,
  GraduationCap,
  Sparkles,
  Coins,
  CreditCard,
} from "lucide-react";
import Image from "next/image";
import { Badge, Button, Orbs, useThemeStyles } from "@rocketreplai/ui";
import { useApi } from "@/lib/useApi";
import {
  getSubscriptions,
  getTokenBalance,
} from "@/lib/services/web-actions.api";

// Chatbot items
const CHATBOT_ITEMS = [
  {
    id: "chatbot-lead-generation",
    label: "Lead Generation",
    href: "/web/chatbot-lead-generation",
    icon: Target,
    gradient: "from-purple-500 to-pink-500",
    iconBg: "bg-purple-50",
    iconColor: "text-purple-600",
    isNew: false,
    displayName: "Lead Generation",
    type: "lead",
  },
  {
    id: "chatbot-education",
    label: "Education",
    href: "/web/chatbot-education",
    icon: GraduationCap,
    gradient: "from-green-500 to-emerald-500",
    iconBg: "bg-green-50",
    iconColor: "text-green-600",
    isNew: true,
    displayName: "Education",
    type: "education",
  },
];

const BOTTOM_NAV_ITEMS = [
  {
    label: "Token Dashboard",
    href: "/web/tokens",
    icon: Coins,
    isNew: false,
  },
  {
    label: "Refer & Earn",
    href: "/web/refer",
    icon: Share2,
    isNew: true,
  },
];

interface WebSidebarProps {
  chatbotName?: string;
  chatbotType?: string;
  isSubscribed?: boolean;
  isOpen: boolean;
  onToggle: () => void;
}

export default function WebSidebar({
  chatbotName: initialChatbotName,
  chatbotType: initialChatbotType,
  isSubscribed: initialIsSubscribed,
  isOpen,
  onToggle,
}: WebSidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { userId } = useAuth();
  const { apiRequest } = useApi();
  const { isDark } = useThemeStyles();

  const [isLoading, setIsLoading] = useState(true);
  const [isChatbotOpen, setIsChatbotOpen] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(
    initialIsSubscribed ?? false,
  );
  const [tokenBalance, setTokenBalance] = useState<number>(0);
  const [pricingClose, setPricingClose] = useState(false);

  // Determine selected chatbot based on URL path
  const selectedChatbot = useMemo(() => {
    if (pathname.includes("/web/chatbot-lead-generation"))
      return "chatbot-lead-generation";
    if (pathname.includes("/web/chatbot-education")) return "chatbot-education";
    return initialChatbotType || "chatbot-lead-generation";
  }, [pathname, initialChatbotType]);

  // Fetch subscription and token status
  const fetchStatus = useCallback(async () => {
    if (!userId) return;
    try {
      const [subscriptionsData, tokenData] = await Promise.all([
        getSubscriptions(apiRequest),
        getTokenBalance(apiRequest),
      ]);

      const hasActiveSub = subscriptionsData?.some(
        (sub: any) => sub.status === "active",
      );
      setIsSubscribed(hasActiveSub || false);
      setTokenBalance(tokenData?.availableTokens || 0);
    } catch {
      // silent fail
    }
  }, [userId, apiRequest]);

  useEffect(() => {
    if (!initialIsSubscribed) {
      fetchStatus();
    }
    setIsLoading(false);
  }, [fetchStatus, initialIsSubscribed]);

  const isActive = useCallback(
    (href: string) => {
      return pathname === href || pathname.startsWith(href);
    },
    [pathname],
  );

  const currentChatbot = useMemo(
    () =>
      CHATBOT_ITEMS.find((bot) => bot.id === selectedChatbot) ||
      CHATBOT_ITEMS[0],
    [selectedChatbot],
  );

  const getChatbotDisplayName = useCallback(() => {
    if (pathname.includes("/web/chatbot-lead-generation"))
      return "Lead Generation";
    if (pathname.includes("/web/chatbot-education")) return "Education";
    if (pathname.includes("/web/tokens")) return "Token Dashboard";
    if (pathname.includes("/web/analytics")) return "Analytics";
    if (pathname.includes("/web/refer")) return "Refer & Earn";
    if (pathname.includes("/web/settings")) return "Settings";
    return initialChatbotName || currentChatbot?.label || "Select Chatbot";
  }, [pathname, initialChatbotName, currentChatbot]);

  // Style constants based on theme
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
      closeIcon: isDark ? "h-4 w-4 text-white/60" : "h-4 w-4 text-gray-600",
      logoContainer: isDark
        ? "p-5 border-b border-white/[0.06]"
        : "p-5 border-b border-gray-100",
      logoText: isDark
        ? "text-xl font-black tracking-tight text-white"
        : "text-xl font-black tracking-tight",
      logoRocket: isDark ? "text-purple-400" : "text-purple-500",
      logoReplai: isDark ? "text-pink-400" : "text-pink-600",
      tokenCard: isDark
        ? "bg-gradient-to-r from-amber-500/10 to-yellow-500/10 border border-amber-500/20 rounded-xl p-3"
        : "bg-gradient-to-r from-amber-50 to-yellow-50 border border-amber-100 rounded-xl p-3",
      tokenIcon: isDark
        ? "w-7 h-7 rounded-full bg-amber-500/20 flex items-center justify-center"
        : "w-7 h-7 rounded-full bg-amber-100 flex items-center justify-center",
      tokenLabel: isDark
        ? "text-xs text-amber-400 font-medium"
        : "text-xs text-amber-600 font-medium",
      tokenValue: isDark
        ? "text-sm font-bold text-amber-400"
        : "text-sm font-bold text-amber-800",
      tokenButton: isDark
        ? "h-7 px-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-xs"
        : "h-7 px-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-xs",
      selectorButton: isDark
        ? "w-full flex items-center justify-between p-3 rounded-xl glass-pill hover:bg-white/[0.09] transition-colors group"
        : "w-full flex items-center justify-between p-3 rounded-xl bg-gray-50 hover:bg-gray-100 transition-colors group",
      selectorName: isDark
        ? "text-sm font-semibold text-white truncate max-w-[130px]"
        : "text-sm font-semibold text-gray-800 truncate max-w-[130px]",
      selectorType: isDark
        ? "text-xs text-white/40 truncate max-w-[130px]"
        : "text-xs text-gray-400 truncate max-w-[130px]",
      selectorChevron: isDark
        ? "h-4 w-4 text-white/40 flex-shrink-0"
        : "h-4 w-4 text-gray-400 flex-shrink-0",
      dropdown: isDark
        ? "mt-2 glass-card border border-white/[0.08] rounded-xl shadow-lg overflow-hidden absolute left-4 right-4 bg-gray-900/70 backdrop-blur-3xl"
        : "mt-2 bg-white border border-gray-100 rounded-xl shadow-lg overflow-hidden absolute left-4 right-4",
      dropdownItem: isDark
        ? "flex items-center gap-3 px-4 py-3 hover:bg-white/[0.06] transition-colors"
        : "flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors",
      dropdownDivider: isDark
        ? "border-t border-white/[0.06] my-1"
        : "border-t border-gray-100 my-1",
      navLink: (isActive: boolean) =>
        isDark
          ? `flex items-center justify-between px-3 py-2.5 rounded-xl transition-all duration-150 group ${
              isActive
                ? "bg-purple-500/10 text-purple-400"
                : "text-white/40 hover:bg-white/[0.06] hover:text-white/70"
            }`
          : `flex items-center justify-between px-3 py-2.5 rounded-xl transition-all duration-150 group ${
              isActive
                ? "bg-purple-50 text-purple-600 shadow-sm"
                : "text-gray-500 hover:bg-gray-50 hover:text-gray-800"
            }`,
      navIcon: (isActive: boolean) =>
        isDark
          ? `h-[18px] w-[18px] flex-shrink-0 transition-colors ${
              isActive
                ? "text-purple-400"
                : "text-white/40 group-hover:text-white/60"
            }`
          : `h-[18px] w-[18px] flex-shrink-0 transition-colors ${
              isActive
                ? "text-purple-500"
                : "text-gray-400 group-hover:text-gray-600"
            }`,
      navDivider: isDark
        ? "border-t border-white/[0.06] my-2"
        : "border-t border-gray-100 my-2",
      upgradeCard: isDark
        ? "bg-gradient-to-br from-white/[0.03] to-purple-500/10 rounded-2xl p-4 border border-purple-500/20"
        : "bg-gradient-to-br from-gray-50 to-purple-50/50 rounded-2xl p-4 border border-purple-100/50",
      upgradeTitle: isDark
        ? "text-[13px] font-bold text-white"
        : "text-[13px] font-bold text-gray-800",
      upgradeFeature: isDark
        ? "text-xs text-white/60"
        : "text-xs text-gray-600",
      upgradeFeatureIcon: isDark
        ? "w-4 h-4 rounded-full bg-purple-500/20 flex items-center justify-center flex-shrink-0"
        : "w-4 h-4 rounded-full bg-purple-100 flex items-center justify-center flex-shrink-0",
      upgradeClose: isDark
        ? "h-5 px-2 bg-red-500/80 hover:bg-red-500 text-white rounded-lg text-xs ml-auto"
        : "h-5 px-2 bg-red-500 hover:bg-red-600 text-white rounded-lg text-xs ml-auto",
      upgradeButton: isDark
        ? "w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white rounded-full text-xs font-bold h-9 shadow-md shadow-purple-500/20 transition-all hover:shadow-purple-500/40"
        : "w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white rounded-full text-xs font-bold h-9 shadow-md shadow-purple-200/50 transition-all hover:shadow-purple-300/60",
      newBadge: isDark
        ? "bg-pink-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full"
        : "bg-pink-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full",
    }),
    [isDark],
  );

  const SidebarContent = useMemo(() => {
    const Content = () => (
      <div className="flex flex-col h-full relative z-10">
        {/* Logo */}
        <div className={styles.logoContainer}>
          <Link href="/web" className="flex items-center gap-2.5">
            <div className="relative h-9 w-9 flex-shrink-0">
              <div className="absolute inset-0 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 shadow-md" />
              <div
                className={`absolute inset-[3px] rounded-full ${
                  isDark ? "bg-[#1A1A1E]" : "bg-white"
                } flex items-center justify-center`}
              >
                <Image
                  alt="Logo"
                  src={Logo}
                  width={18}
                  height={18}
                  className="object-contain"
                />
              </div>
            </div>
            <span className={styles.logoText}>
              <span className={styles.logoRocket}>Rocket</span>
              <span className={styles.logoReplai}>Replai</span>
            </span>
          </Link>
        </div>

        {/* Token Balance Badge */}
        {tokenBalance > 0 && (
          <div className="px-4 pt-4">
            <div className={styles.tokenCard}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className={styles.tokenIcon}>
                    <Coins className="h-3.5 w-3.5 text-amber-500" />
                  </div>
                  <div>
                    <p className={styles.tokenLabel}>Token Balance</p>
                    <p className={styles.tokenValue}>
                      {tokenBalance.toLocaleString()}
                    </p>
                  </div>
                </div>
                <Button
                  onClick={() => router.push("/web/tokens")}
                  size="sm"
                  className={styles.tokenButton}
                >
                  Buy
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Chatbot Selector */}
        <div className="p-4 relative z-10">
          <button
            onClick={() => setIsChatbotOpen(!isChatbotOpen)}
            className={styles.selectorButton}
          >
            <div className="flex items-center gap-3">
              <div
                className={`w-9 h-9 rounded-full bg-gradient-to-br ${
                  currentChatbot.gradient
                } flex items-center justify-center text-white font-bold text-sm shadow-sm`}
              >
                {currentChatbot.displayName[0].toUpperCase()}
              </div>
              <div className="text-left min-w-0">
                <p className={styles.selectorName}>
                  {currentChatbot.displayName}
                </p>
                <p className={styles.selectorType}>
                  {selectedChatbot === "chatbot-education"
                    ? "MCQ Bot"
                    : "AI Chatbot"}
                </p>
              </div>
            </div>
            <ChevronDown
              className={`${styles.selectorChevron} transition-transform duration-200 ${
                isChatbotOpen ? "rotate-180" : ""
              }`}
            />
          </button>

          {isChatbotOpen && (
            <div className={styles.dropdown}>
              {CHATBOT_ITEMS.map((bot) => (
                <Link
                  key={bot.id}
                  href={`${bot.href}/overview`}
                  className={styles.dropdownItem}
                  onClick={() => {
                    setIsChatbotOpen(false);
                    if (window.innerWidth < 768) {
                      onToggle();
                    }
                  }}
                >
                  <div
                    className={`w-7 h-7 rounded-full ${bot.iconBg} flex items-center justify-center`}
                  >
                    <bot.icon className={`h-3.5 w-3.5 ${bot.iconColor}`} />
                  </div>
                  <div className="flex-1">
                    <p
                      className={`text-sm font-medium ${
                        isDark ? "text-white" : "text-gray-700"
                      }`}
                    >
                      {bot.label}
                    </p>
                    <p
                      className={`text-xs ${
                        isDark ? "text-white/40" : "text-gray-400"
                      }`}
                    >
                      {bot.id === "chatbot-education"
                        ? "MCQ Education"
                        : "AI Assistant"}
                    </p>
                  </div>
                  {bot.isNew && <Badge className={styles.newBadge}>NEW</Badge>}
                </Link>
              ))}
              <div className={styles.dropdownDivider} />
              <Link
                href="/web/tokens"
                className={styles.dropdownItem}
                onClick={() => {
                  setIsChatbotOpen(false);
                  if (window.innerWidth < 768) {
                    onToggle();
                  }
                }}
              >
                <div
                  className={`w-7 h-7 rounded-full ${
                    isDark ? "bg-amber-500/20" : "bg-amber-100"
                  } flex items-center justify-center`}
                >
                  <Coins
                    className={`h-3.5 w-3.5 ${
                      isDark ? "text-amber-400" : "text-amber-600"
                    }`}
                  />
                </div>
                <div>
                  <p
                    className={`text-sm font-medium ${
                      isDark ? "text-white" : "text-gray-700"
                    }`}
                  >
                    Buy Tokens
                  </p>
                  <p
                    className={`text-xs ${
                      isDark ? "text-white/40" : "text-gray-400"
                    }`}
                  >
                    Purchase more tokens
                  </p>
                </div>
              </Link>
            </div>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto no-scrollbar">
          {/* Overview - Always shown */}
          <Link
            href={`${currentChatbot.href}/overview`}
            onClick={() => {
              if (window.innerWidth < 768) onToggle();
            }}
            className={styles.navLink(
              isActive(`${currentChatbot.href}/overview`),
            )}
          >
            <div className="flex items-center justify-between gap-3 w-full">
              <div className="flex items-center justify-start gap-3">
                <LayoutDashboard
                  className={styles.navIcon(
                    isActive(`${currentChatbot.href}/overview`),
                  )}
                />
                <span className="text-sm font-medium">Overview</span>
              </div>
            </div>
            {isActive(`${currentChatbot.href}/overview`) && (
              <div className={`w-1 h-6 rounded-full bg-purple-500`} />
            )}
          </Link>

          {/* Lead Generation specific items */}
          {selectedChatbot === "chatbot-lead-generation" && (
            <>
              <Link
                href={`${currentChatbot.href}/appointments`}
                onClick={() => {
                  if (window.innerWidth < 768) onToggle();
                }}
                className={styles.navLink(
                  isActive(`${currentChatbot.href}/appointments`),
                )}
              >
                <div className="flex items-center justify-between gap-3 w-full">
                  <div className="flex items-center justify-start gap-3">
                    <Users
                      className={styles.navIcon(
                        isActive(`${currentChatbot.href}/appointments`),
                      )}
                    />
                    <span className="text-sm font-medium">
                      Appointment Form
                    </span>
                  </div>
                </div>
                {isActive(`${currentChatbot.href}/appointments`) && (
                  <div className={`w-1 h-6 rounded-full bg-purple-500`} />
                )}
              </Link>

              <Link
                href={`${currentChatbot.href}/conversations`}
                onClick={() => {
                  if (window.innerWidth < 768) onToggle();
                }}
                className={styles.navLink(
                  isActive(`${currentChatbot.href}/conversations`),
                )}
              >
                <div className="flex items-center justify-between gap-3 w-full">
                  <div className="flex items-center justify-start gap-3">
                    <MessageSquare
                      className={styles.navIcon(
                        isActive(`${currentChatbot.href}/conversations`),
                      )}
                    />
                    <span className="text-sm font-medium">Conversations</span>
                  </div>
                </div>
                {isActive(`${currentChatbot.href}/conversations`) && (
                  <div className={`w-1 h-6 rounded-full bg-purple-500`} />
                )}
              </Link>
            </>
          )}

          {/* Common items for both chatbots */}
          <Link
            href={`${currentChatbot.href}/faq`}
            onClick={() => {
              if (window.innerWidth < 768) onToggle();
            }}
            className={styles.navLink(isActive(`${currentChatbot.href}/faq`))}
          >
            <div className="flex items-center justify-between gap-3 w-full">
              <div className="flex items-center justify-start gap-3">
                <MessageCircle
                  className={styles.navIcon(
                    isActive(`${currentChatbot.href}/faq`),
                  )}
                />
                <span className="text-sm font-medium">FAQ Management</span>
              </div>
            </div>
            {isActive(`${currentChatbot.href}/faq`) && (
              <div className={`w-1 h-6 rounded-full bg-purple-500`} />
            )}
          </Link>

          <Link
            href={`${currentChatbot.href}/settings`}
            onClick={() => {
              if (window.innerWidth < 768) onToggle();
            }}
            className={styles.navLink(
              isActive(`${currentChatbot.href}/settings`),
            )}
          >
            <div className="flex items-center justify-between gap-3 w-full">
              <div className="flex items-center justify-start gap-3">
                <Settings
                  className={styles.navIcon(
                    isActive(`${currentChatbot.href}/settings`),
                  )}
                />
                <span className="text-sm font-medium">Settings</span>
              </div>
            </div>
            {isActive(`${currentChatbot.href}/settings`) && (
              <div className={`w-1 h-6 rounded-full bg-purple-500`} />
            )}
          </Link>

          <Link
            href={`${currentChatbot.href}/integration`}
            onClick={() => {
              if (window.innerWidth < 768) onToggle();
            }}
            className={styles.navLink(
              isActive(`${currentChatbot.href}/integration`),
            )}
          >
            <div className="flex items-center justify-between gap-3 w-full">
              <div className="flex items-center justify-start gap-3">
                <Zap
                  className={styles.navIcon(
                    isActive(`${currentChatbot.href}/integration`),
                  )}
                />
                <span className="text-sm font-medium">Integration</span>
              </div>
            </div>
            {isActive(`${currentChatbot.href}/integration`) && (
              <div className={`w-1 h-6 rounded-full bg-purple-500`} />
            )}
          </Link>

          <div className={styles.navDivider} />

          {/* Bottom navigation items */}
          {BOTTOM_NAV_ITEMS.map((item) => {
            const active = isActive(item.href);
            const Icon = item.icon;
            return (
              <Link
                key={item.label + item.href}
                href={item.href}
                onClick={() => {
                  if (window.innerWidth < 768) onToggle();
                }}
                className={styles.navLink(active)}
              >
                <div className="flex items-center justify-between gap-3 w-full">
                  <div className="flex items-center justify-start gap-3">
                    <Icon className={styles.navIcon(active)} />
                    <span className="text-sm font-medium">{item.label}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {item?.isNew && (
                      <Badge className={styles.newBadge}>NEW</Badge>
                    )}
                    {active && (
                      <div className={`w-1 h-6 rounded-full bg-purple-500`} />
                    )}
                  </div>
                </div>
              </Link>
            );
          })}
        </nav>

        {/* Upgrade Section — only show for free users */}
        {!isSubscribed && !pricingClose && (
          <div className="p-4">
            <div className={styles.upgradeCard}>
              <div className="flex items-center gap-2 mb-3">
                <Sparkles
                  className={`h-4 w-4 ${
                    isDark ? "text-purple-400" : "text-purple-500"
                  }`}
                />
                <span className={styles.upgradeTitle}>
                  Unlock more power 🚀
                </span>
                <Button
                  onClick={() => setPricingClose(true)}
                  size="sm"
                  className={styles.upgradeClose}
                >
                  X
                </Button>
              </div>
              <ul className="space-y-2 mb-4">
                {[
                  "Unlimited Conversations",
                  "Priority Support",
                  "Advanced Analytics",
                  "Custom Training",
                ].map((feature) => (
                  <li key={feature} className="flex items-center gap-2 text-xs">
                    <div className={styles.upgradeFeatureIcon}>
                      <Check
                        className={`h-2.5 w-2.5 ${
                          isDark ? "text-purple-400" : "text-purple-500"
                        }`}
                      />
                    </div>
                    <span className={styles.upgradeFeature}>{feature}</span>
                  </li>
                ))}
              </ul>
              <Button
                onClick={() => {
                  router.push("/web/pricing");
                  if (window.innerWidth < 768) onToggle();
                }}
                className={styles.upgradeButton}
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
    selectedChatbot,
    isChatbotOpen,
    isSubscribed,
    tokenBalance,
    router,
    isActive,
    currentChatbot,
    pricingClose,
    onToggle,
    styles,
    isDark,
  ]);

  if (isLoading) {
    return (
      <div
        className={`fixed left-0 top-0 bottom-0 w-72 ${
          isDark
            ? "bg-[#1A1A1E] border-white/[0.06]"
            : "bg-white border-gray-200"
        } border-r flex items-center justify-center`}
      >
        <div
          className={`w-5 h-5 border-2 border-t-transparent ${
            isDark ? "border-purple-400" : "border-purple-500"
          } rounded-full animate-spin`}
        />
      </div>
    );
  }

  return (
    <>
      {isDark && <Orbs />}
      <div
        className={`${styles.sidebar} ${
          isOpen ? "translate-x-0 left-0 md:left-1" : "-translate-x-full left-0"
        } backdrop-blur-xl`}
      >
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onToggle();
          }}
          className={`${styles.closeButton} z-[60]`}
        >
          <X className={styles.closeIcon} />
        </button>
        <SidebarContent />
      </div>

      {isOpen && <div className={styles.overlay} onClick={onToggle} />}
    </>
  );
}
