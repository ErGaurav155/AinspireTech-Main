"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Instagram,
  Bot,
  Menu,
  X,
  Sparkles,
  MessageSquare,
  Target,
  GraduationCap,
  Coins,
  ChevronLeft,
  ChevronRight,
  HandshakeIcon,
} from "lucide-react";
import { Button } from "@rocketreplai/ui/components/radix/button";
import { BreadcrumbsDefault } from "@rocketreplai/ui/components/shared/breadcrumbs";
import { ThemeToggle } from "@rocketreplai/ui/components/shared/theme-toggle";
import { UserButton } from "@clerk/nextjs";
import { useThemeStyles } from "@/lib/theme";

interface NavbarProps {
  onSidebarToggle?: () => void;
  isSidebarOpen?: boolean;
  dashboardType?: "web" | "insta";
}

export function Navbar({
  onSidebarToggle,
  isSidebarOpen,
  dashboardType,
}: NavbarProps) {
  const pathname = usePathname();
  const { styles, isDark } = useThemeStyles();

  const isInstaDashboard =
    dashboardType === "insta" || pathname?.startsWith("/insta");
  const isWebDashboard =
    dashboardType === "web" || pathname?.startsWith("/web");

  const getChatbotType = () => {
    if (pathname?.includes("/lead-generation")) return "lead-generation";
    if (pathname?.includes("/education")) return "education";
    return null;
  };

  const getInstaInfo = () => {
    if (pathname?.includes("/insta/accounts")) {
      return {
        label: "Add Account",
        icon: Instagram,
        href: "/insta/accounts/add",
      };
    }
    return null;
  };

  const chatbotType = getChatbotType();
  const instaAction = getInstaInfo();

  return (
    <header
      className={`${isDark ? "sticky top-0 z-40 w-full max-w-7xl mx-auto glass-nav rounded-xl" : "sticky top-0 z-40 w-full max-w-7xl mx-auto bg-white/90 backdrop-blur-[12px] border-b border-gray-100 rounded-xl"} `}
    >
      <div className="flex h-16 items-center justify-between w-full px-4 md:px-6">
        <div className="flex items-center gap-1">
          {/* Sidebar Toggle Button */}
          {(isWebDashboard || isInstaDashboard) && onSidebarToggle && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onSidebarToggle}
              className={`flex h-8 w-8 p-0 rounded-lg ${isDark ? "glass-pill" : "border border-gray-200 bg-white hover:bg-gray-50"}`}
              title={isSidebarOpen ? "Close sidebar" : "Open sidebar"}
            >
              {isSidebarOpen ? (
                <ChevronLeft
                  className={`h-4 w-4 ${isDark ? "text-white/60" : "text-gray-600"}`}
                />
              ) : (
                <ChevronRight
                  className={`h-4 w-4 ${isDark ? "text-white/60" : "text-gray-600"}`}
                />
              )}
            </Button>
          )}

          {/* Breadcrumbs */}
          <div className="hidden lg:flex">
            <BreadcrumbsDefault />
          </div>
        </div>

        <div className="flex items-center space-x-2 ml-auto">
          {/* Support Link */}
          <Button
            variant="ghost"
            size="sm"
            asChild
            className={`text-xs font-semibold bg-gradient-to-r ${
              isInstaDashboard
                ? "from-pink-500 to-rose-500"
                : "from-purple-500 to-pink-500"
            } text-white px-3 md:px-4 py-1.5 rounded-full hover:opacity-90 transition-opacity shadow-sm ${
              !isDark && `shadow-${isInstaDashboard ? "pink" : "purple"}-200`
            }`}
          >
            <Link href={isInstaDashboard ? "/insta/support" : "/web/support"}>
              Support
            </Link>
          </Button>

          {/* Instagram Specific Actions */}
          {isInstaDashboard && (
            <>
              <Button
                variant="ghost"
                size="sm"
                asChild
                className={`text-xs font-semibold ${isDark ? "text-pink-400 border-pink-500/30 hover:bg-white/[0.06]" : "text-pink-500 border-pink-200 hover:bg-pink-50"} border px-3 md:px-4 py-1.5 rounded-full transition-colors`}
              >
                <Link href="/insta/refer">
                  <HandshakeIcon className="h-3.5 w-3.5 mr-1.5" />
                  <span className="hidden lg:inline">
                    Collab<span className="hidden xl:inline">oration</span>
                  </span>
                </Link>
              </Button>

              {instaAction && (
                <Button
                  variant="ghost"
                  size="sm"
                  asChild
                  className={`text-xs font-semibold ${isDark ? "text-pink-400 border-pink-500/30 hover:bg-white/[0.06]" : "text-pink-500 border-pink-200 hover:bg-pink-50"} border px-3 md:px-4 py-1.5 rounded-full transition-colors hidden lg:inline-flex`}
                >
                  <Link href={instaAction.href}>
                    <instaAction.icon className="h-3.5 w-3.5 mr-1.5" />
                    <span className="hidden lg:inline">
                      {instaAction.label}
                    </span>
                  </Link>
                </Button>
              )}
            </>
          )}

          {/* Web Dashboard Specific Actions */}
          {isWebDashboard && (
            <>
              {chatbotType && (
                <Button
                  variant="ghost"
                  size="sm"
                  asChild
                  className={`text-xs font-semibold ${isDark ? "text-pink-400 border-pink-500/30 hover:bg-white/[0.06]" : "text-pink-500 border-pink-200 hover:bg-pink-50"} border px-3 md:px-4 py-1.5 rounded-full transition-colors`}
                >
                  <Link href={`/web/${chatbotType}/build`}>
                    <Bot className="h-3.5 w-3.5 mr-1.5" />
                    <span className="hidden sm:inline">Build</span>
                  </Link>
                </Button>
              )}

              <Button
                variant="ghost"
                size="sm"
                asChild
                className={`text-xs font-semibold ${isDark ? "text-amber-400 border-amber-500/30 hover:bg-white/[0.06]" : "text-amber-500 border-amber-200 hover:bg-amber-50"} border px-3 md:px-4 py-1.5 rounded-full transition-colors`}
              >
                <Link href="/web/tokens">
                  <Coins className="h-3.5 w-3.5 mr-1.5" />
                  <span className="hidden sm:inline">Tokens</span>
                </Link>
              </Button>
            </>
          )}

          {/* Theme Toggle */}
          <ThemeToggle />

          {/* User Button */}
          <UserButton />
        </div>
      </div>
    </header>
  );
}
