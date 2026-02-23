// components/shared/Navbar.tsx
"use client";

import { useState } from "react";
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

interface NavbarProps {
  onSidebarToggle?: () => void;
  isSidebarOpen?: boolean;
  dashboardType?: "web" | "insta"; // Add this to know which dashboard we're in
}

export function Navbar({
  onSidebarToggle,
  isSidebarOpen,
  dashboardType,
}: NavbarProps) {
  const pathname = usePathname();

  // Determine which dashboard we're in (fallback to pathname if dashboardType not provided)
  const isInstaDashboard =
    dashboardType === "insta" || pathname?.startsWith("/insta");
  const isWebDashboard =
    dashboardType === "web" || pathname?.startsWith("/web");

  // Get chatbot type from pathname for web dashboard
  const getChatbotType = () => {
    if (pathname?.includes("/lead-generation")) return "lead-generation";
    if (pathname?.includes("/education")) return "education";
    return null;
  };

  // Get Instagram specific info
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

  // Dynamic styling based on dashboard
  const getThemeColors = () => {
    if (isInstaDashboard) {
      return {
        primary: "pink",
        gradient: "from-pink-500 to-rose-500",
        lightBg: "bg-pink-50",
        lightBorder: "border-pink-200",
        text: "text-pink-500",
        hoverBg: "hover:bg-pink-50",
        shadow: "shadow-pink-200",
      };
    } else if (isWebDashboard) {
      return {
        primary: "purple",
        gradient: "from-purple-500 to-pink-500",
        lightBg: "bg-purple-50",
        lightBorder: "border-purple-200",
        text: "text-purple-500",
        hoverBg: "hover:bg-purple-50",
        shadow: "shadow-purple-200",
      };
    }
    return {
      primary: "gray",
      gradient: "from-gray-500 to-gray-600",
      lightBg: "bg-gray-50",
      lightBorder: "border-gray-200",
      text: "text-gray-500",
      hoverBg: "hover:bg-gray-50",
      shadow: "shadow-gray-200",
    };
  };

  const theme = getThemeColors();

  return (
    <header className="sticky top-0 z-40 w-full bg-[#F8F9FA]  max-w-7xl mx-auto">
      <div className="flex h-16 items-center justify-between w-full px-4 md:px-6">
        <div className="flex items-center gap-1">
          {/* Sidebar Toggle Button - Show for both web and insta dashboards */}
          {(isWebDashboard || isInstaDashboard) && onSidebarToggle && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onSidebarToggle}
              className="flex h-8 w-8 p-0 rounded-lg border border-gray-200 bg-white hover:bg-gray-50"
              title={isSidebarOpen ? "Close sidebar" : "Open sidebar"}
            >
              {isSidebarOpen ? (
                <ChevronLeft className="h-4 w-4 text-gray-600" />
              ) : (
                <ChevronRight className="h-4 w-4 text-gray-600" />
              )}
            </Button>
          )}

          {/* Breadcrumbs */}
          <div className="hidden sm:flex">
            <BreadcrumbsDefault />
          </div>
        </div>

        {/* Rest of the navbar remains the same */}
        <div className="flex items-center space-x-2 ml-auto">
          {/* Support Link - Always visible */}
          <Button
            variant="ghost"
            size="sm"
            asChild
            className={`text-xs font-semibold bg-gradient-to-r ${theme.gradient} text-white px-3 md:px-4 py-1.5 rounded-full hover:opacity-90 transition-opacity shadow-sm ${theme.shadow}`}
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
                className={`text-xs font-semibold ${theme.text} border ${theme.lightBorder} py-1.5 rounded-full ${theme.hoverBg} transition-colors`}
              >
                <Link href="/insta/collaboration">
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
                  className={`text-xs font-semibold ${theme.text} border ${theme.lightBorder} px-3 md:px-4 py-1.5 rounded-full ${theme.hoverBg} transition-colors hidden lg:inline-flex`}
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
                  className={`text-xs font-semibold ${theme.text} border ${theme.lightBorder} px-3 md:px-4 py-1.5 rounded-full ${theme.hoverBg} transition-colors`}
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
                className="text-xs font-semibold text-amber-500 border border-amber-200 px-3 md:px-4 py-1.5 rounded-full hover:bg-amber-50 transition-colors"
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
