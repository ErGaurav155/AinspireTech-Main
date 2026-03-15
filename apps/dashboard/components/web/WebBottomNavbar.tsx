"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import {
  LayoutDashboard,
  MessageSquare,
  Coins,
  Share2,
  Target,
  GraduationCap,
  ChevronRight,
  Zap,
  MessageCircle,
  Settings,
  X,
} from "lucide-react";
import { Badge } from "@rocketreplai/ui";
import { useThemeStyles } from "@rocketreplai/ui";

const CHATBOT_ITEMS = [
  {
    id: "chatbot-lead-generation",
    label: "Lead Generation",
    href: "/web/chatbot-lead-generation",
    icon: Target,
    color: "#a855f7",
    description: "AI Assistant",
    isNew: false,
    type: "lead",
  },
  {
    id: "chatbot-education",
    label: "Education",
    href: "/web/chatbot-education",
    icon: GraduationCap,
    color: "#22c55e",
    description: "MCQ Education",
    isNew: true,
    type: "education",
  },
] as const;

const MENU_ITEMS = [
  ...CHATBOT_ITEMS,
  {
    id: "tokens",
    label: "Buy Tokens",
    href: "/web/tokens",
    icon: Coins,
    color: "#f59e0b",
    description: "Purchase more tokens",
    isNew: false,
    type: "global",
  },
  {
    id: "refer",
    label: "Referrals",
    href: "/web/refer",
    icon: Share2,
    color: "#3b82f6",
    description: "Refer and earn money",
    isNew: true,
    type: "global",
  },
] as const;

const BASE_NAV_ITEMS = [
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
  {
    label: "Integrate",
    getHref: (chatbotHref: string) => `${chatbotHref}/integration`,
    icon: Zap,
    isNew: false,
  },
] as const;

const LEAD_NAV_ITEMS = [
  {
    label: "Leads",
    getHref: (chatbotHref: string) => `${chatbotHref}/conversations`,
    icon: MessageSquare,
    isNew: false,
  },
] as const;

const EDUCATION_NAV_ITEMS = [
  {
    label: "Home",
    getHref: (chatbotHref: string) => `${chatbotHref}`,
    icon: LayoutDashboard,
    isNew: false,
  },
] as const;

export default function WebBottomNavbar() {
  const pathname = usePathname();
  const { isDark } = useThemeStyles();

  const [menuOpen, setMenuOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);

  const activeChatbot =
    CHATBOT_ITEMS.find((bot) => pathname.startsWith(bot.href)) ??
    CHATBOT_ITEMS[0];

  const isOnChatbotPage = useMemo(() => pathname.includes("/web"), [pathname]);

  const navItems = useMemo(() => {
    if (!isOnChatbotPage) return [];

    if (activeChatbot.type === "lead") {
      return [...LEAD_NAV_ITEMS, ...BASE_NAV_ITEMS];
    }

    return [...EDUCATION_NAV_ITEMS, ...BASE_NAV_ITEMS];
  }, [activeChatbot.type, isOnChatbotPage]);

  const isActive = useCallback((href: string) => pathname === href, [pathname]);

  const isMenuItemActive = useCallback(
    (item: (typeof MENU_ITEMS)[number]) => {
      if (item.type === "global") return pathname === item.href;
      return pathname.startsWith(item.href);
    },
    [pathname],
  );

  return (
    <>
      <DropdownMenu.Root open={menuOpen} onOpenChange={setMenuOpen}>
        <AnimatePresence>
          {menuOpen && (
            <DropdownMenu.Portal forceMount>
              <DropdownMenu.Content asChild sideOffset={8}>
                <motion.div
                  initial={{ opacity: 0, y: 20, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.98 }}
                  transition={{ duration: 0.18, ease: "easeOut" }}
                  className={`fixed bottom-0 -right-5 z-50 w-64 md:hidden rounded-xl overflow-hidden ${
                    isDark
                      ? "bg-white/[0.04] border border-white/[0.08] shadow-[0_8px_32px_rgba(0,0,0,0.35),inset_0_1px_0_rgba(255,255,255,0.07)] backdrop-blur-[24px]"
                      : "bg-white border border-gray-100 shadow-sm"
                  }`}
                >
                  <div
                    className={`flex items-center justify-between px-4 py-3 border-b ${
                      isDark ? "border-white/[0.06]" : "border-gray-100"
                    }`}
                  >
                    <p
                      className={`text-xs font-bold tracking-wider ${
                        isDark ? "text-white/40" : "text-gray-400"
                      }`}
                    >
                      Menu
                    </p>

                    <button
                      onClick={() => setMenuOpen(false)}
                      className="p-1 rounded-md"
                    >
                      <X
                        className={`h-4 w-4 ${
                          isDark ? "text-white/60" : "text-gray-500"
                        }`}
                      />
                    </button>
                  </div>

                  <div className="max-h-[60vh] overflow-y-auto">
                    {MENU_ITEMS.map((item) => {
                      const Icon = item.icon;
                      const active = isMenuItemActive(item);

                      return (
                        <DropdownMenu.Item asChild key={item.id}>
                          <Link
                            href={
                              item.type === "global"
                                ? item.href
                                : `${item.href}`
                            }
                            className={`flex items-center gap-3 px-4 py-3.5 transition-colors ${
                              isDark
                                ? "hover:bg-white/[0.06] border-b border-white/[0.06]"
                                : "hover:bg-gray-50 border-b border-gray-100"
                            }`}
                          >
                            <div
                              className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0"
                              style={{
                                background: isDark
                                  ? `${item.color}20`
                                  : `${item.color}10`,
                                border: `1px solid ${item.color}${
                                  isDark ? "30" : "20"
                                }`,
                              }}
                            >
                              <Icon
                                className="h-4 w-4"
                                style={{ color: item.color }}
                              />
                            </div>

                            <div className="flex-1 min-w-0">
                              <p
                                className={`text-sm font-semibold truncate ${
                                  active
                                    ? isDark
                                      ? "text-purple-400"
                                      : "text-purple-600"
                                    : isDark
                                      ? "text-white/70"
                                      : "text-gray-700"
                                }`}
                              >
                                {item.label}
                              </p>

                              <p
                                className={`text-xs ${
                                  isDark ? "text-white/40" : "text-gray-400"
                                }`}
                              >
                                {"description" in item ? item.description : ""}
                              </p>
                            </div>

                            <div className="flex items-center gap-1.5">
                              {item.isNew && (
                                <Badge className="bg-pink-500 text-white text-[9px] px-1.5 py-0.5 rounded-full">
                                  NEW
                                </Badge>
                              )}
                              {active && (
                                <span
                                  className={`w-2 h-2 rounded-full ${
                                    isDark ? "bg-purple-400" : "bg-purple-500"
                                  }`}
                                />
                              )}
                            </div>
                          </Link>
                        </DropdownMenu.Item>
                      );
                    })}
                  </div>
                </motion.div>
              </DropdownMenu.Content>
            </DropdownMenu.Portal>
          )}
        </AnimatePresence>

        {isOnChatbotPage && (
          <nav
            className={`fixed bottom-0 left-0 right-0 z-[45] md:hidden ${
              isDark
                ? "bg-[rgba(10,10,16,0.85)] backdrop-blur-[32px] border-t border-white/[0.06]"
                : "bg-white/90 backdrop-blur-[12px] border-t border-gray-100"
            }`}
          >
            <div className="flex items-center justify-around h-16 px-2">
              {navItems.map((item) => {
                const href = item.getHref(activeChatbot.href);
                const active = isActive(href);
                const Icon = item.icon;

                return (
                  <Link
                    key={item.label}
                    href={href}
                    className="flex flex-col items-center justify-center gap-1 flex-1 py-2 relative"
                  >
                    {active && (
                      <motion.span
                        layoutId="nav-active"
                        className={`absolute inset-x-2 top-1 bottom-1 rounded-xl ${
                          isDark ? "bg-purple-500/10" : "bg-purple-50"
                        }`}
                        transition={{
                          type: "spring",
                          stiffness: 380,
                          damping: 30,
                        }}
                      />
                    )}

                    <span className="relative">
                      <Icon
                        className={`h-5 w-5 transition-colors ${
                          active
                            ? isDark
                              ? "text-purple-400"
                              : "text-purple-600"
                            : isDark
                              ? "text-white/50"
                              : "text-gray-500"
                        }`}
                      />
                    </span>

                    <span
                      className={`relative text-[10px] font-semibold ${
                        active
                          ? isDark
                            ? "text-purple-400"
                            : "text-purple-600"
                          : isDark
                            ? "text-white/50"
                            : "text-gray-500"
                      }`}
                    >
                      {item.label}
                    </span>
                  </Link>
                );
              })}

              <DropdownMenu.Trigger asChild>
                <button
                  ref={triggerRef}
                  className="flex flex-col items-center justify-center gap-1 flex-1 py-2 relative"
                >
                  {menuOpen && (
                    <span
                      className={`absolute inset-x-2 top-1 bottom-1 rounded-xl ${
                        isDark ? "bg-purple-500/10" : "bg-purple-50"
                      }`}
                    />
                  )}

                  <span className="relative">
                    <span
                      className="flex h-6 w-6 items-center justify-center rounded-full shadow-sm"
                      style={{
                        background: `linear-gradient(135deg, ${activeChatbot.color}80, ${activeChatbot.color})`,
                      }}
                    >
                      <activeChatbot.icon className="h-3.5 w-3.5 text-white" />
                    </span>

                    <span
                      className={`absolute -bottom-0.5 -right-1 w-3 h-3 rounded-full flex items-center justify-center ${
                        isDark
                          ? "bg-[#1A1A1E] border border-white/[0.08]"
                          : "bg-white border border-gray-200"
                      }`}
                    >
                      <ChevronRight
                        className={`h-2 w-2 transition-transform ${
                          menuOpen ? "rotate-90" : ""
                        } ${isDark ? "text-white/60" : "text-gray-500"}`}
                      />
                    </span>
                  </span>

                  <span
                    className={`relative text-[10px] font-semibold ${
                      menuOpen
                        ? isDark
                          ? "text-purple-400"
                          : "text-purple-600"
                        : isDark
                          ? "text-white/50"
                          : "text-gray-500"
                    }`}
                  >
                    Menu
                  </span>
                </button>
              </DropdownMenu.Trigger>
            </div>

            <div
              className={`h-safe-area-inset-bottom ${
                isDark ? "bg-[rgba(10,10,16,0.85)]" : "bg-white"
              }`}
            />
          </nav>
        )}
      </DropdownMenu.Root>
    </>
  );
}
