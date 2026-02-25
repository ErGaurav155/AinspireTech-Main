// components/web/WebSidebar.tsx
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
import Logo from "public/assets/img/logo.png";
import { Badge } from "@rocketreplai/ui/components/radix/badge";
import { Button } from "@rocketreplai/ui/components/radix/button";
import { useApi } from "@/lib/useApi";
import {
  getSubscriptions,
  getTokenBalance,
} from "@/lib/services/web-actions.api";

// Move navItems outside component to prevent recreation
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
  isOpen: boolean; // Required prop
  onToggle: () => void; // Required prop
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
  const [isLoading, setIsLoading] = useState(true);
  const [isChatbotOpen, setIsChatbotOpen] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(
    initialIsSubscribed ?? false,
  );
  const [tokenBalance, setTokenBalance] = useState<number>(0);
  const [pricingClose, setPricingClose] = useState(false);
  const [selectedChatbot, setSelectedChatbot] = useState(() => {
    // Determine selected chatbot from pathname
    if (pathname.includes("/web/chatbot-lead-generation"))
      return "chatbot-lead-generation";
    if (pathname.includes("/web/chatbot-education")) return "chatbot-education";
    return initialChatbotType || "chatbot-lead-generation";
  });

  // Fetch subscription and token status
  const fetchStatus = useCallback(async () => {
    if (!userId) return;
    try {
      const [subscriptionsData, tokenData] = await Promise.all([
        getSubscriptions(apiRequest),
        getTokenBalance(apiRequest),
      ]);

      // Check if any subscription is active
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

  // Memoize active state check
  const isActive = useCallback(
    (href: string) => {
      return pathname === href || pathname.startsWith(href);
    },
    [pathname],
  );

  // Get current chatbot details
  const currentChatbot =
    CHATBOT_ITEMS.find((bot) => bot.id === selectedChatbot) || CHATBOT_ITEMS[1];

  // Get chatbot display name from path
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

  // Memoize sidebar content
  const SidebarContent = useMemo(() => {
    const Content = () => (
      <div className="flex flex-col h-full">
        {/* Logo */}
        <div className="p-5 border-b border-gray-100">
          <Link href="/web" className="flex items-center gap-2.5">
            <div className="relative h-9 w-9 flex-shrink-0">
              <div className="absolute inset-0 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 shadow-md shadow-purple-200" />
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
              <span className="text-purple-500">Rocket</span>
              <span className="text-pink-600">Replai</span>
            </span>
          </Link>
        </div>

        {/* Token Balance Badge */}
        {tokenBalance > 0 && (
          <div className="px-4 pt-4">
            <div className="bg-gradient-to-r from-amber-50 to-yellow-50 border border-amber-100 rounded-xl p-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-full bg-amber-100 flex items-center justify-center">
                    <Coins className="h-3.5 w-3.5 text-amber-600" />
                  </div>
                  <div>
                    <p className="text-xs text-amber-600 font-medium">
                      Token Balance
                    </p>
                    <p className="text-sm font-bold text-amber-800">
                      {tokenBalance.toLocaleString()}
                    </p>
                  </div>
                </div>
                <Button
                  onClick={() => router.push("/web/tokens")}
                  size="sm"
                  className="h-7 px-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-xs"
                >
                  Buy
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Chatbot Selector */}
        <div className="p-4 border-b border-gray-100 relative z-10">
          <button
            onClick={() => setIsChatbotOpen(!isChatbotOpen)}
            className="w-full flex items-center justify-between p-3 rounded-xl bg-gray-50 hover:bg-gray-100 transition-colors group"
          >
            <div className="flex items-center gap-3">
              <div
                className={`w-9 h-9 rounded-full bg-gradient-to-br ${currentChatbot.gradient} flex items-center justify-center text-white font-bold text-sm shadow-sm`}
              >
                {getChatbotDisplayName()[0].toUpperCase()}
              </div>
              <div className="text-left min-w-0">
                <p className="text-sm font-semibold text-gray-800 truncate max-w-[130px]">
                  {getChatbotDisplayName()}
                </p>
                <p className="text-xs text-gray-400 truncate max-w-[130px]">
                  {selectedChatbot === "chatbot-education"
                    ? "MCQ Bot"
                    : "AI Chatbot"}
                </p>
              </div>
            </div>
            <ChevronDown
              className={`h-4 w-4 text-gray-400 flex-shrink-0 transition-transform duration-200 ${
                isChatbotOpen ? "rotate-180" : ""
              }`}
            />
          </button>

          {isChatbotOpen && (
            <div className="mt-2 bg-white border border-gray-100 rounded-xl shadow-lg overflow-hidden absolute left-4 right-4">
              {CHATBOT_ITEMS.map((bot) => (
                <Link
                  key={bot.id}
                  href={`${bot.href}/overview`}
                  className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors"
                  onClick={() => {
                    setSelectedChatbot(bot.id);
                    setIsChatbotOpen(false);
                    // On mobile, close sidebar after selection
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
                    <p className="text-sm font-medium text-gray-700">
                      {bot.label}
                    </p>
                    <p className="text-xs text-gray-400">
                      {bot.id === "chatbot-education"
                        ? "MCQ Education"
                        : "AI Assistant"}
                    </p>
                  </div>
                  {bot.isNew && (
                    <Badge className="bg-pink-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                      NEW
                    </Badge>
                  )}
                </Link>
              ))}
              <div className="border-t border-gray-100 my-1" />
              <Link
                href="/web/tokens"
                className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors"
                onClick={() => {
                  setIsChatbotOpen(false);
                  // On mobile, close sidebar after navigation
                  if (window.innerWidth < 768) {
                    onToggle();
                  }
                }}
              >
                <div className="w-7 h-7 rounded-full bg-amber-100 flex items-center justify-center">
                  <Coins className="h-3.5 w-3.5 text-amber-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-700">
                    Buy Tokens
                  </p>
                  <p className="text-xs text-gray-400">Purchase more tokens</p>
                </div>
              </Link>
            </div>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-3 space-y-0.5 max-h-max overflow-y-auto">
          {/* Chatbot-specific navigation */}
          {selectedChatbot !== "chatbot-education" ? (
            <>
              <Link
                href={`${currentChatbot.href}/overview`}
                onClick={() => {
                  // On mobile, close sidebar after navigation
                  if (window.innerWidth < 768) {
                    onToggle();
                  }
                }}
                className={`flex items-center justify-between px-3 py-2.5 rounded-xl transition-all duration-150 group ${
                  isActive(`${currentChatbot.href}/overview`)
                    ? "bg-purple-50 text-purple-600 shadow-sm"
                    : "text-gray-500 hover:bg-gray-50 hover:text-gray-800"
                }`}
              >
                <div className="flex items-center gap-3">
                  <LayoutDashboard
                    className={`h-[18px] w-[18px] flex-shrink-0 transition-colors ${
                      isActive(`${currentChatbot.href}/overview`)
                        ? "text-purple-500"
                        : "text-gray-400 group-hover:text-gray-600"
                    }`}
                  />
                  <span className="text-sm font-medium">Overview</span>
                </div>
              </Link>

              <Link
                href={`${currentChatbot.href}/conversations`}
                onClick={() => {
                  // On mobile, close sidebar after navigation
                  if (window.innerWidth < 768) {
                    onToggle();
                  }
                }}
                className={`flex items-center justify-between px-3 py-2.5 rounded-xl transition-all duration-150 group ${
                  isActive(`${currentChatbot.href}/conversations`)
                    ? "bg-purple-50 text-purple-600 shadow-sm"
                    : "text-gray-500 hover:bg-gray-50 hover:text-gray-800"
                }`}
              >
                <div className="flex items-center gap-3">
                  <MessageSquare
                    className={`h-[18px] w-[18px] flex-shrink-0 transition-colors ${
                      isActive(`${currentChatbot.href}/conversations`)
                        ? "text-purple-500"
                        : "text-gray-400 group-hover:text-gray-600"
                    }`}
                  />
                  <span className="text-sm font-medium">Conversations</span>
                </div>
              </Link>

              <Link
                href={`${currentChatbot.href}/faq`}
                onClick={() => {
                  // On mobile, close sidebar after navigation
                  if (window.innerWidth < 768) {
                    onToggle();
                  }
                }}
                className={`flex items-center justify-between px-3 py-2.5 rounded-xl transition-all duration-150 group ${
                  isActive(`${currentChatbot.href}/faq`)
                    ? "bg-purple-50 text-purple-600 shadow-sm"
                    : "text-gray-500 hover:bg-gray-50 hover:text-gray-800"
                }`}
              >
                <div className="flex items-center gap-3">
                  <MessageCircle
                    className={`h-[18px] w-[18px] flex-shrink-0 transition-colors ${
                      isActive(`${currentChatbot.href}/faq`)
                        ? "text-purple-500"
                        : "text-gray-400 group-hover:text-gray-600"
                    }`}
                  />
                  <span className="text-sm font-medium">FAQ Management</span>
                </div>
              </Link>
            </>
          ) : (
            // Education chatbot specific navigation
            <>
              <Link
                href="/web/chatbot-education/overview"
                onClick={() => {
                  // On mobile, close sidebar after navigation
                  if (window.innerWidth < 768) {
                    onToggle();
                  }
                }}
                className={`flex items-center justify-between px-3 py-2.5 rounded-xl transition-all duration-150 group ${
                  isActive("/web/chatbot-education/overview")
                    ? "bg-green-50 text-green-600 shadow-sm"
                    : "text-gray-500 hover:bg-gray-50 hover:text-gray-800"
                }`}
              >
                <div className="flex items-center gap-3">
                  <LayoutDashboard
                    className={`h-[18px] w-[18px] flex-shrink-0 transition-colors ${
                      isActive("/web/chatbot-education/overview")
                        ? "text-green-500"
                        : "text-gray-400 group-hover:text-gray-600"
                    }`}
                  />
                  <span className="text-sm font-medium">Overview</span>
                </div>
              </Link>

              <Link
                href="/web/chatbot-education/questions"
                onClick={() => {
                  // On mobile, close sidebar after navigation
                  if (window.innerWidth < 768) {
                    onToggle();
                  }
                }}
                className={`flex items-center justify-between px-3 py-2.5 rounded-xl transition-all duration-150 group ${
                  isActive("/web/chatbot-education/questions")
                    ? "bg-green-50 text-green-600 shadow-sm"
                    : "text-gray-500 hover:bg-gray-50 hover:text-gray-800"
                }`}
              >
                <div className="flex items-center gap-3">
                  <GraduationCap
                    className={`h-[18px] w-[18px] flex-shrink-0 transition-colors ${
                      isActive("/web/chatbot-education/questions")
                        ? "text-green-500"
                        : "text-gray-400 group-hover:text-gray-600"
                    }`}
                  />
                  <span className="text-sm font-medium">MCQ Questions</span>
                </div>
              </Link>

              <Link
                href="/web/chatbot-education/responses"
                onClick={() => {
                  // On mobile, close sidebar after navigation
                  if (window.innerWidth < 768) {
                    onToggle();
                  }
                }}
                className={`flex items-center justify-between px-3 py-2.5 rounded-xl transition-all duration-150 group ${
                  isActive("/web/chatbot-education/responses")
                    ? "bg-green-50 text-green-600 shadow-sm"
                    : "text-gray-500 hover:bg-gray-50 hover:text-gray-800"
                }`}
              >
                <div className="flex items-center gap-3">
                  <Users
                    className={`h-[18px] w-[18px] flex-shrink-0 transition-colors ${
                      isActive("/web/chatbot-education/responses")
                        ? "text-green-500"
                        : "text-gray-400 group-hover:text-gray-600"
                    }`}
                  />
                  <span className="text-sm font-medium">Student Responses</span>
                </div>
              </Link>
            </>
          )}

          {/* Integration link for all chatbots */}
          <Link
            href={`${currentChatbot.href}/integration`}
            onClick={() => {
              // On mobile, close sidebar after navigation
              if (window.innerWidth < 768) {
                onToggle();
              }
            }}
            className={`flex items-center justify-between px-3 py-2.5 rounded-xl transition-all duration-150 group ${
              isActive(`${currentChatbot.href}/integration`)
                ? "bg-purple-50 text-purple-600 shadow-sm"
                : "text-gray-500 hover:bg-gray-50 hover:text-gray-800"
            }`}
          >
            <div className="flex items-center gap-3">
              <Zap
                className={`h-[18px] w-[18px] flex-shrink-0 transition-colors ${
                  isActive(`${currentChatbot.href}/integration`)
                    ? "text-purple-500"
                    : "text-gray-400 group-hover:text-gray-600"
                }`}
              />
              <span className="text-sm font-medium">Integration</span>
            </div>
          </Link>

          <div className="border-t border-gray-100 my-2" />

          {/* Bottom navigation items */}
          {BOTTOM_NAV_ITEMS.map((item) => {
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
                    ? "bg-purple-50 text-purple-600 shadow-sm"
                    : "text-gray-500 hover:bg-gray-50 hover:text-gray-800"
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon
                    className={`h-[18px] w-[18px] flex-shrink-0 transition-colors ${
                      active
                        ? "text-purple-500"
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
            <div className="bg-gradient-to-br from-gray-50 to-purple-50/50 rounded-2xl p-4 border border-purple-100/50">
              <div className="flex items-center gap-2 mb-3">
                <Sparkles className="h-4 w-4 text-purple-500" />
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
                {[
                  "Unlimited Conversations",
                  "Priority Support",
                  "Advanced Analytics",
                  "Custom Training",
                ].map((feature) => (
                  <li
                    key={feature}
                    className="flex items-center gap-2 text-xs text-gray-600"
                  >
                    <div className="w-4 h-4 rounded-full bg-purple-100 flex items-center justify-center flex-shrink-0">
                      <Check className="h-2.5 w-2.5 text-purple-500" />
                    </div>
                    {feature}
                  </li>
                ))}
              </ul>
              <Button
                onClick={() => router.push("/web/pricing")}
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
    selectedChatbot,
    isChatbotOpen,
    isSubscribed,
    tokenBalance,
    router,
    isActive,
    getChatbotDisplayName,
    currentChatbot,
    pricingClose,
    onToggle,
  ]);
  if (isLoading) {
    return (
      <div className="fixed left-0 top-0 bottom-0 w-60 lg:w-72bg-white border-r border-gray-200 flex items-center justify-center">
        <div className="w-5 h-5 border-2 border-t-transparent border-cyan-500 rounded-full animate-spin" />
      </div>
    );
  }
  return (
    <>
      {/* Unified sidebar - works the same on mobile and desktop */}
      <div
        className={`fixed top-0 bottom-0  md:top-2 md:bottom-2 rounded-lg w-60 lg:w-72 bg-white border border-gray-300 z-50 shadow-xl transition-transform duration-300 ${
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
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-40 md:hidden"
          onClick={onToggle}
        />
      )}
    </>
  );
}
