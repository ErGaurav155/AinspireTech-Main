// components/web/WebBottomNav.tsx
"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useState, useEffect, useRef } from "react";
import {
  LayoutDashboard,
  MessageSquare,
  Coins,
  Share2,
  Target,
  GraduationCap,
  ChevronRight,
  Zap,
} from "lucide-react";
import { Badge } from "@rocketreplai/ui/components/radix/badge";

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
  },
] as const;

// The 4 fixed bottom nav items
const BOTTOM_NAV_ITEMS = [
  {
    label: "Overview",
    // Computed dynamically based on selected chatbot
    getHref: (chatbotHref: string) => `${chatbotHref}/overview`,
    icon: LayoutDashboard,
  },
  {
    label: "Chats",
    getHref: (chatbotHref: string) => `${chatbotHref}/conversations`,
    icon: MessageSquare,
  },
  {
    label: "Tokens",
    getHref: () => "/web/tokens",
    icon: Coins,
  },
  {
    label: "Refer",
    getHref: () => "/web/refer",
    icon: Share2,
  },
] as const;

export default function WebBottomNavbar() {
  const pathname = usePathname();
  const router = useRouter();
  const [chatbotMenuOpen, setChatbotMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

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

  return (
    <>
      {/* Chatbot switcher popup — appears above the nav bar */}
      {chatbotMenuOpen && (
        <div
          ref={menuRef}
          className="fixed bottom-[72px] right-3 z-50 bg-white rounded-2xl shadow-[0_8px_32px_rgba(0,0,0,0.12)] border border-gray-100 overflow-hidden w-64 md:hidden"
        >
          {/* Header */}
          <div className="px-4 py-3 border-b border-gray-100">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">
              Switch Chatbot
            </p>
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
                className={`flex items-center gap-3 px-4 py-3.5 hover:bg-gray-50 transition-colors ${
                  isSelected ? "bg-purple-50/60" : ""
                }`}
              >
                <div
                  className={`w-9 h-9 rounded-full ${bot.iconBg} flex items-center justify-center flex-shrink-0`}
                >
                  <Icon className={`h-4 w-4 ${bot.iconColor}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <p
                    className={`text-sm font-semibold truncate ${
                      isSelected ? "text-purple-700" : "text-gray-700"
                    }`}
                  >
                    {bot.label}
                  </p>
                  <p className="text-xs text-gray-400">
                    {bot.id === "chatbot-education"
                      ? "MCQ Education"
                      : "AI Assistant"}
                  </p>
                </div>
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  {bot.isNew && (
                    <Badge className="bg-pink-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full">
                      NEW
                    </Badge>
                  )}
                  {isSelected && (
                    <div className="w-2 h-2 rounded-full bg-purple-500" />
                  )}
                </div>
              </Link>
            );
          })}

          {/* Buy tokens shortcut */}
          <div className="border-t border-gray-100">
            <Link
              href="/web/tokens"
              onClick={() => setChatbotMenuOpen(false)}
              className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors"
            >
              <div className="w-9 h-9 rounded-full bg-amber-50 flex items-center justify-center flex-shrink-0">
                <Coins className="h-4 w-4 text-amber-600" />
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-700">
                  Buy Tokens
                </p>
                <p className="text-xs text-gray-400">Purchase more tokens</p>
              </div>
            </Link>
          </div>
        </div>
      )}

      {/* Bottom nav bar */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 md:hidden bg-white border-t border-gray-100 shadow-[0_-4px_20px_rgba(0,0,0,0.06)]">
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
                className="flex flex-col items-center justify-center gap-1 flex-1 py-2 relative group"
              >
                {active && (
                  <span className="absolute inset-x-2 top-1 bottom-1 bg-purple-50 rounded-xl" />
                )}
                <span className="relative">
                  <Icon
                    className={`h-5 w-5 transition-colors duration-150 ${
                      active
                        ? "text-purple-500"
                        : "text-gray-400 group-hover:text-gray-600"
                    }`}
                  />
                  {active && (
                    <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 bg-purple-500 rounded-full" />
                  )}
                </span>
                <span
                  className={`relative text-[10px] font-semibold transition-colors duration-150 ${
                    active ? "text-purple-500" : "text-gray-400"
                  }`}
                >
                  {item.label}
                </span>
              </Link>
            );
          })}

          {/* Chatbot switcher — 5th slot */}
          <button
            onClick={() => setChatbotMenuOpen((prev) => !prev)}
            className="flex flex-col items-center justify-center gap-1 flex-1 py-2 relative group"
          >
            {chatbotMenuOpen && (
              <span className="absolute inset-x-2 top-1 bottom-1 bg-purple-50 rounded-xl" />
            )}

            {/* Active chatbot icon */}
            <span className="relative">
              <span
                className={`flex h-6 w-6 items-center justify-center rounded-full bg-gradient-to-br ${activeChatbot.gradient} shadow-sm`}
              >
                <activeChatbot.icon className="h-3.5 w-3.5 text-white" />
              </span>
              {/* Chevron badge */}
              <span className="absolute -bottom-0.5 -right-1 w-3 h-3 bg-white rounded-full border border-gray-200 flex items-center justify-center shadow-sm">
                <ChevronRight
                  className={`h-2 w-2 text-gray-500 transition-transform duration-200 ${
                    chatbotMenuOpen ? "rotate-90" : ""
                  }`}
                />
              </span>
            </span>

            <span
              className={`relative text-[10px] font-semibold transition-colors duration-150 max-w-[52px] truncate ${
                chatbotMenuOpen ? "text-purple-500" : "text-gray-400"
              }`}
            >
              {activeChatbot.label.split(" ")[0]}
            </span>
          </button>
        </div>

        {/* Safe area for iPhone home indicator */}
        <div className="h-safe-area-inset-bottom bg-white" />
      </nav>
    </>
  );
}
