"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import {
  Menu,
  X,
  Bell,
  Shield,
  AlertTriangle,
  Home,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { Button } from "@rocketreplai/ui/components/radix/button";
import { BreadcrumbsDefault } from "@rocketreplai/ui/components/shared/breadcrumbs";
import { ThemeToggle } from "@rocketreplai/ui/components/shared/theme-toggle";
import { Badge } from "@rocketreplai/ui/components/radix/badge";

interface AdminNavbarProps {
  onSidebarToggle?: () => void;
  isSidebarOpen?: boolean;
}

export function AdminNavbar({
  onSidebarToggle,
  isSidebarOpen,
}: AdminNavbarProps) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const pathname = usePathname();
  const { user } = useUser();

  const isOwner =
    user?.primaryEmailAddress?.emailAddress === "gauravgkhaire@gmail.com";

  return (
    <header className="sticky top-0 z-40 w-full bg-[#F8F9FA] max-w-7xl mx-auto">
      <div className="flex h-16 items-center justify-between w-full px-4 md:px-6">
        <div className="flex items-center gap-1">
          {/* Sidebar Toggle Button */}
          {onSidebarToggle && (
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

        {/* Right side actions */}
        <div className="flex items-center space-x-3 ml-auto">
          {/* Owner Badge */}
          {isOwner && (
            <Badge className="bg-gradient-to-r from-cyan-500 to-blue-500 text-white border-0 px-3 py-1.5 rounded-full hidden md:flex items-center">
              <Shield className="h-3.5 w-3.5 mr-1.5" />
              Owner Access
            </Badge>
          )}

          {/* Notification Bell */}
          <Button
            variant="ghost"
            size="icon"
            className="relative text-gray-600 hover:text-gray-800"
          >
            <Bell className="h-5 w-5" />
            <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
          </Button>

          {/* Home Link */}
          <Button
            variant="ghost"
            size="sm"
            asChild
            className="text-xs font-semibold text-cyan-600 border border-cyan-200 px-4 py-1.5 rounded-full hover:bg-cyan-50 transition-colors inline-flex"
          >
            <Link href="/">
              <Home className="h-3.5 w-3.5 mr-1.5" />
              Main Site
            </Link>
          </Button>

          {/* Theme Toggle */}
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
