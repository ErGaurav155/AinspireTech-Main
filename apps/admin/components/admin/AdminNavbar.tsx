"use client";

import { Bell, Shield, ChevronLeft, ChevronRight } from "lucide-react";
import {
  BreadcrumbsDefault,
  ThemeToggle,
  useThemeStyles,
} from "@rocketreplai/ui";
import Link from "next/link";
interface AdminNavbarProps {
  onSidebarToggle?: () => void;
  isSidebarOpen?: boolean;
}

export function AdminNavbar({
  onSidebarToggle,
  isSidebarOpen,
}: AdminNavbarProps) {
  const { styles, isDark } = useThemeStyles();

  return (
    <>
      <header
        className={`sticky top-0 z-40 w-full max-w-7xl mx-auto md:rounded-lg ${
          isDark
            ? "bg-[rgba(10,10,16,0.85)] backdrop-blur-[32px] border-b border-white/[0.06]"
            : "bg-white/90 backdrop-blur-[12px] border-b border-gray-100"
        }`}
      >
        <div className="flex h-16 items-center justify-between w-full px-4 md:px-6">
          <div className="flex items-center gap-1">
            {onSidebarToggle && (
              <button
                onClick={onSidebarToggle}
                className={`flex h-8 w-8 p-0 rounded-lg items-center justify-center transition-all ${styles.pill}`}
                title={isSidebarOpen ? "Close sidebar" : "Open sidebar"}
              >
                {isSidebarOpen ? (
                  <ChevronLeft
                    className={`h-4 w-4 ${isDark ? "text-white/60" : "text-gray-500"}`}
                  />
                ) : (
                  <ChevronRight
                    className={`h-4 w-4 ${isDark ? "text-white/60" : "text-gray-500"}`}
                  />
                )}
              </button>
            )}

            <div className="hidden sm:flex ml-2">
              <BreadcrumbsDefault />
            </div>
          </div>

          <div className="flex items-center space-x-3 ml-auto">
            <div
              className={`hidden md:flex items-center px-3 py-1.5 rounded-full ${styles.badge.blue}`}
            >
              <Shield className="h-3.5 w-3.5 mr-1.5" />
              <span className="text-xs font-medium">Owner Access</span>
            </div>

            <Link
              href="/admin#attention"
              aria-label="Open attention queue"
              className={`relative p-2 rounded-lg transition-all ${styles.pill}`}
            >
              <Bell
                className={`h-4 w-4 ${isDark ? "text-white/60" : "text-gray-500"}`}
              />
            </Link>

            {/* <div className={styles.pill}> */}
            <ThemeToggle />
            {/* </div> */}
          </div>
        </div>
      </header>
    </>
  );
}
