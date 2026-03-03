"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useState, useEffect, useRef, useMemo } from "react";
import {
  LayoutDashboard,
  MessageSquare,
  Coins,
  Share2,
  Target,
  GraduationCap,
  ChevronRight,
  Zap,
  Users,
  MessageCircle,
  Settings,
} from "lucide-react";
import { Badge } from "@rocketreplai/ui/components/radix/badge";
import { useThemeStyles } from "@/lib/theme";

// Mirror the chatbot items from WebSidebar
const CHATBOT_ITEMS = [
  {
    id: "chatbot-lead-generation",
    label: "Lead Generation",
    href: "/web/chatbot-lead-generation",
    icon: Target,
    iconBg: "bg-purple-50",
    iconColor: "text-purple-600",
    gradient: "from-purple-500 to-pink-500",
    isNew: false,
    type: "lead",
  },
  {
    id: "chatbot-education",
    label: "Education",
    href: "/web/chatbot-education",
    icon: GraduationCap,
    iconBg: "bg-green-50",
    iconColor: "text-green-600",
    gradient: "from-green-500 to-emerald-500",
    isNew: true,
    type: "education",
  },
] as const;

// The 5 fixed bottom nav items (including Refer & Earn)
const BOTTOM_NAV_ITEMS = [
  {
    label: "Leads",
    getHref: (chatbotHref: string) => `${chatbotHref}/appointments`,
    icon: Users,
    isNew: false,
  },
  {
    label: "Chats",
    getHref: (chatbotHref: string) => `${chatbotHref}/conversations`,
    icon: MessageSquare,
    isNew: false,
  },
  {
    label: "FAQ",
    getHref: (chatbotHref: string) => `${chatbotHref}/faq`,
    icon: MessageCircle,
    isNew: false,
  },
  {
    label: "Setting",
    getHref: (chatbotHref: string) => `${chatbotHref}/settings`,
    icon: Settings,
    isNew: true,
  },
] as const;

export default function WebBottomNavbar() {
  const pathname = usePathname();
  const router = useRouter();
  const [chatbotMenuOpen, setChatbotMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const { isDark } = useThemeStyles();

  // Determine active chatbot from pathname
  const activeChatbot =
    CHATBOT_ITEMS.find((bot) => pathname.startsWith(bot.href)) ??
    CHATBOT_ITEMS[0];

  const isActive = useCallback(
    (href: string) => pathname === href || pathname.startsWith(href),
    [pathname],
  );

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setChatbotMenuOpen(false);
      }
    };
    if (chatbotMenuOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [chatbotMenuOpen]);

  // Style constants based on theme
  const styles = useMemo(
    () => ({
      nav: isDark
        ? "fixed bottom-0 left-0 right-0 z-40 md:hidden glass-nav border-t border-white/[0.06] shadow-[0_-4px_20px_rgba(0,0,0,0.3)]"
        : "fixed bottom-0 left-0 right-0 z-40 md:hidden bg-white border-t border-gray-100 shadow-[0_-4px_20px_rgba(0,0,0,0.06)]",
      menuPopup: isDark
        ? "fixed bottom-[72px] right-3 z-50 glass-card border border-white/[0.08] rounded-2xl shadow-[0_8px_32px_rgba(0,0,0,0.5)] overflow-hidden w-64 md:hidden"
        : "fixed bottom-[72px] right-3 z-50 bg-white rounded-2xl shadow-[0_8px_32px_rgba(0,0,0,0.12)] border border-gray-100 overflow-hidden w-64 md:hidden",
      menuHeader: isDark
        ? "px-4 py-3 border-b border-white/[0.06]"
        : "px-4 py-3 border-b border-gray-100",
      menuHeaderText: isDark
        ? "text-xs font-bold text-white/40 uppercase tracking-wider"
        : "text-xs font-bold text-gray-400 uppercase tracking-wider",
      menuItem: (isSelected: boolean) =>
        isDark
          ? `flex items-center gap-3 px-4 py-3.5 hover:bg-white/[0.06] transition-colors ${
              isSelected ? "bg-purple-500/10" : ""
            }`
          : `flex items-center gap-3 px-4 py-3.5 hover:bg-gray-50 transition-colors ${
              isSelected ? "bg-purple-50/60" : ""
            }`,
      menuItemText: (isSelected: boolean) =>
        isDark
          ? `text-sm font-semibold truncate ${
              isSelected ? "text-purple-400" : "text-white/70"
            }`
          : `text-sm font-semibold truncate ${
              isSelected ? "text-purple-700" : "text-gray-700"
            }`,
      menuItemSubtext: isDark
        ? "text-xs text-white/40"
        : "text-xs text-gray-400",
      menuDivider: isDark
        ? "border-t border-white/[0.06]"
        : "border-t border-gray-100",
      activeDot: isDark
        ? "w-2 h-2 rounded-full bg-purple-400"
        : "w-2 h-2 rounded-full bg-purple-500",
      navItem: (isActive: boolean) =>
        `flex flex-col items-center justify-center gap-1 flex-1 py-2 relative group`,
      navItemBg: (isActive: boolean) =>
        isDark
          ? `absolute inset-x-2 top-1 bottom-1 rounded-xl ${
              isActive ? "bg-purple-500/10" : ""
            }`
          : `absolute inset-x-2 top-1 bottom-1 rounded-xl ${
              isActive ? "bg-purple-50" : ""
            }`,
      navIcon: (isActive: boolean) =>
        isDark
          ? `h-5 w-5 transition-colors duration-150 ${
              isActive
                ? "text-purple-400"
                : "text-white/40 group-hover:text-white/60"
            }`
          : `h-5 w-5 transition-colors duration-150 ${
              isActive
                ? "text-purple-500"
                : "text-gray-400 group-hover:text-gray-600"
            }`,
      navLabel: (isActive: boolean) =>
        isDark
          ? `relative text-[10px] font-semibold transition-colors duration-150 ${
              isActive ? "text-purple-400" : "text-white/40"
            }`
          : `relative text-[10px] font-semibold transition-colors duration-150 ${
              isActive ? "text-purple-500" : "text-gray-400"
            }`,
      navActiveDot: isDark
        ? "absolute -top-0.5 -right-0.5 w-1.5 h-1.5 bg-purple-400 rounded-full"
        : "absolute -top-0.5 -right-0.5 w-1.5 h-1.5 bg-purple-500 rounded-full",
      switcherButton: (isOpen: boolean) =>
        `flex flex-col items-center justify-center gap-1 flex-1 py-2 relative group`,
      switcherBg: (isOpen: boolean) =>
        isDark
          ? `absolute inset-x-2 top-1 bottom-1 rounded-xl ${
              isOpen ? "bg-purple-500/10" : ""
            }`
          : `absolute inset-x-2 top-1 bottom-1 rounded-xl ${
              isOpen ? "bg-purple-50" : ""
            }`,
      switcherIcon: (isOpen: boolean) =>
        `flex h-6 w-6 items-center justify-center rounded-full bg-gradient-to-br shadow-sm`,
      switcherChevron: (isOpen: boolean) =>
        isDark
          ? `absolute -bottom-0.5 -right-1 w-3 h-3 rounded-full border border-white/[0.08] bg-[#1A1A1E] flex items-center justify-center shadow-sm`
          : `absolute -bottom-0.5 -right-1 w-3 h-3 bg-white rounded-full border border-gray-200 flex items-center justify-center shadow-sm`,
      switcherChevronIcon: (isOpen: boolean) =>
        isDark
          ? `h-2 w-2 text-white/60 transition-transform duration-200 ${
              isOpen ? "rotate-90" : ""
            }`
          : `h-2 w-2 text-gray-500 transition-transform duration-200 ${
              isOpen ? "rotate-90" : ""
            }`,
      switcherLabel: (isOpen: boolean) =>
        isDark
          ? `relative text-[10px] font-semibold transition-colors duration-150 max-w-[52px] truncate ${
              isOpen ? "text-purple-400" : "text-white/40"
            }`
          : `relative text-[10px] font-semibold transition-colors duration-150 max-w-[52px] truncate ${
              isOpen ? "text-purple-500" : "text-gray-400"
            }`,
      newBadge: isDark
        ? "bg-pink-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full"
        : "bg-pink-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full",
      safeArea: isDark
        ? "h-safe-area-inset-bottom bg-[#0a0a16]"
        : "h-safe-area-inset-bottom bg-white",
    }),
    [isDark],
  );

  return (
    <>
      {/* Chatbot switcher popup */}
      {chatbotMenuOpen && (
        <div ref={menuRef} className={`${styles.menuPopup} backdrop-blur-lg`}>
          {/* Header */}
          <div className={styles.menuHeader}>
            <p className={styles.menuHeaderText}>Switch Chatbot</p>
          </div>

          {/* Chatbot options */}
          {CHATBOT_ITEMS.map((bot) => {
            const Icon = bot.icon;
            const isSelected = activeChatbot.id === bot.id;
            return (
              <Link
                key={bot.id}
                href={`${bot.href}/overview`}
                onClick={() => setChatbotMenuOpen(false)}
                className={styles.menuItem(isSelected)}
              >
                <div
                  className={`w-9 h-9 rounded-full ${bot.iconBg} flex items-center justify-center flex-shrink-0`}
                >
                  <Icon className={`h-4 w-4 ${bot.iconColor}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className={styles.menuItemText(isSelected)}>{bot.label}</p>
                  <p className={styles.menuItemSubtext}>
                    {bot.id === "chatbot-education"
                      ? "MCQ Education"
                      : "AI Assistant"}
                  </p>
                </div>
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  {bot.isNew && <Badge className={styles.newBadge}>NEW</Badge>}
                  {isSelected && <div className={styles.activeDot} />}
                </div>
              </Link>
            );
          })}

          {/* Tokens shortcut */}
          <div className={styles.menuDivider}>
            <Link
              href="/web/tokens"
              onClick={() => setChatbotMenuOpen(false)}
              className={styles.menuItem(false)}
            >
              <div
                className={`w-9 h-9 rounded-full ${
                  isDark ? "bg-amber-500/20" : "bg-amber-50"
                } flex items-center justify-center flex-shrink-0`}
              >
                <Coins
                  className={`h-4 w-4 ${
                    isDark ? "text-amber-400" : "text-amber-600"
                  }`}
                />
              </div>
              <div>
                <p
                  className={
                    isDark
                      ? "text-sm font-semibold text-white"
                      : "text-sm font-semibold text-gray-700"
                  }
                >
                  Buy Tokens
                </p>
                <p
                  className={
                    isDark ? "text-xs text-white/40" : "text-xs text-gray-400"
                  }
                >
                  Purchase more tokens
                </p>
              </div>
            </Link>
          </div>
          <div className={styles.menuDivider}>
            <Link
              href="/web/refer"
              onClick={() => setChatbotMenuOpen(false)}
              className={styles.menuItem(false)}
            >
              <div
                className={`w-9 h-9 rounded-full ${
                  isDark ? "bg-blue-500/20" : "bg-blue-50"
                } flex items-center justify-center flex-shrink-0`}
              >
                <Coins
                  className={`h-4 w-4 ${
                    isDark ? "text-blue-400" : "text-blue-600"
                  }`}
                />
              </div>
              <div>
                <p
                  className={
                    isDark
                      ? "text-sm font-semibold text-white"
                      : "text-sm font-semibold text-gray-700"
                  }
                >
                  Referrals
                </p>
                <p
                  className={
                    isDark ? "text-xs text-white/40" : "text-xs text-gray-400"
                  }
                >
                  Refer and earn money
                </p>
              </div>
            </Link>
          </div>
        </div>
      )}

      {/* Bottom nav bar */}
      <nav className={`${styles.nav} backdrop-blur-lg`}>
        <div className="flex items-center justify-around h-16 px-2">
          {/* Fixed nav items */}
          {BOTTOM_NAV_ITEMS.map((item) => {
            const href = item.getHref(activeChatbot.href);
            const active = isActive(href);
            const Icon = item.icon;
            return (
              <Link
                key={item.label}
                href={href}
                className={styles.navItem(active)}
              >
                {active && <span className={styles.navItemBg(active)} />}
                <span className="relative">
                  <Icon className={styles.navIcon(active)} />
                  {active && <span className={styles.navActiveDot} />}
                  {item?.isNew && !active && (
                    <span className="absolute -top-1 -right-1 w-2 h-2 bg-pink-500 rounded-full" />
                  )}
                </span>
                <span className={styles.navLabel(active)}>{item.label}</span>
              </Link>
            );
          })}

          {/* Chatbot switcher — 6th slot */}
          <button
            onClick={() => setChatbotMenuOpen((prev) => !prev)}
            className={styles.switcherButton(chatbotMenuOpen)}
          >
            {chatbotMenuOpen && (
              <span className={styles.switcherBg(chatbotMenuOpen)} />
            )}

            {/* Active chatbot icon */}
            <span className="relative">
              <span
                className={`${styles.switcherIcon(chatbotMenuOpen)} bg-gradient-to-br ${
                  activeChatbot.gradient
                }`}
              >
                <activeChatbot.icon className="h-3.5 w-3.5 text-white" />
              </span>
              {/* Chevron badge */}
              <span className={styles.switcherChevron(chatbotMenuOpen)}>
                <ChevronRight
                  className={styles.switcherChevronIcon(chatbotMenuOpen)}
                />
              </span>
            </span>

            <span className={styles.switcherLabel(chatbotMenuOpen)}>
              {activeChatbot.label.split(" ")[0]}
            </span>
          </button>
        </div>

        {/* Safe area for iPhone home indicator */}
        <div className={styles.safeArea} />
      </nav>
    </>
  );
}
