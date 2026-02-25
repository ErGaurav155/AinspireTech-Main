// components/insta/InstaBottomNav.tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useState, useEffect, useRef } from "react";
import {
  LayoutDashboard,
  MessageSquare,
  Users,
  Settings,
  Plus,
} from "lucide-react";
import Image from "next/image";

const BOTTOM_NAV_ITEMS = [
  {
    label: "Home",
    href: "/insta/dashboard",
    icon: LayoutDashboard,
  },
  {
    label: "Auto",
    href: "/insta/automations",
    icon: MessageSquare,
  },
  {
    label: "Accounts",
    href: "/insta/accounts",
    icon: Users,
  },
  {
    label: "Settings",
    href: "/insta/settings",
    icon: Settings,
  },
] as const;

interface InstaBottomNavProps {
  accountName?: string;
  accountHandle?: string;
  accountAvatarUrl?: string;
}

export default function InstaBottomNavbar({
  accountName,
  accountHandle,
  accountAvatarUrl,
}: InstaBottomNavProps) {
  const pathname = usePathname();
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const isActive = useCallback(
    (href: string) => {
      return (
        pathname === href ||
        (href !== "/insta/dashboard" && pathname.startsWith(href))
      );
    },
    [pathname],
  );

  // Close menu on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setAccountMenuOpen(false);
      }
    };
    if (accountMenuOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [accountMenuOpen]);

  const hasAccount = !!accountName;
  const initial = accountName ? accountName[0].toUpperCase() : null;

  return (
    <>
      {/* Account popup — appears above the nav bar */}
      {accountMenuOpen && (
        <div
          ref={menuRef}
          className="fixed bottom-[72px] right-3 z-50 bg-white rounded-2xl shadow-[0_8px_32px_rgba(0,0,0,0.12)] border border-gray-100 overflow-hidden w-56 md:hidden"
        >
          {/* Current connected account row */}
          {hasAccount && (
            <div className="flex items-center gap-3 px-4 py-3.5 border-b border-gray-100">
              {accountAvatarUrl ? (
                <Image
                  src={accountAvatarUrl}
                  alt={accountName}
                  height={36}
                  width={36}
                  className="w-9 h-9 rounded-full object-cover flex-shrink-0"
                />
              ) : (
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-pink-400 to-rose-500 flex items-center justify-center text-white font-bold text-sm flex-shrink-0 shadow-sm">
                  {initial}
                </div>
              )}
              <div className="min-w-0">
                <p className="text-sm font-semibold text-gray-800 truncate">
                  {accountName}
                </p>
                <p className="text-xs text-gray-400 truncate">
                  @{accountHandle}
                </p>
              </div>
            </div>
          )}

          {/* Add account */}
          <Link
            href="/insta/accounts/add"
            onClick={() => setAccountMenuOpen(false)}
            className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors text-sm text-gray-700"
          >
            <div className="w-7 h-7 rounded-full bg-pink-100 flex items-center justify-center flex-shrink-0">
              <Plus className="h-3.5 w-3.5 text-pink-500" />
            </div>
            Add Account
          </Link>

          {/* Manage accounts — only if one exists */}
          {hasAccount && (
            <Link
              href="/insta/accounts"
              onClick={() => setAccountMenuOpen(false)}
              className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors text-sm text-gray-700 border-t border-gray-100"
            >
              <div className="w-7 h-7 rounded-full bg-purple-100 flex items-center justify-center flex-shrink-0">
                <Users className="h-3.5 w-3.5 text-purple-500" />
              </div>
              Manage Accounts
            </Link>
          )}
        </div>
      )}

      {/* Nav bar */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 md:hidden bg-white border-t border-gray-100 shadow-[0_-4px_20px_rgba(0,0,0,0.06)]">
        <div className="flex items-center justify-around h-16 px-2">
          {/* Regular nav links */}
          {BOTTOM_NAV_ITEMS.map((item) => {
            const active = isActive(item.href);
            const Icon = item.icon;
            return (
              <Link
                key={item.label}
                href={item.href}
                className="flex flex-col items-center justify-center gap-1 flex-1 py-2 relative group"
              >
                {active && (
                  <span className="absolute inset-x-2 top-1 bottom-1 bg-pink-50 rounded-xl" />
                )}
                <span className="relative">
                  <Icon
                    className={`h-5 w-5 transition-colors duration-150 ${
                      active
                        ? "text-pink-500"
                        : "text-gray-400 group-hover:text-gray-600"
                    }`}
                  />
                  {active && (
                    <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 bg-pink-500 rounded-full" />
                  )}
                </span>
                <span
                  className={`relative text-[10px] font-semibold transition-colors duration-150 ${
                    active ? "text-pink-500" : "text-gray-400"
                  }`}
                >
                  {item.label}
                </span>
              </Link>
            );
          })}

          {/* Account button — 5th slot */}
          <button
            onClick={() => setAccountMenuOpen((prev) => !prev)}
            className="flex flex-col items-center justify-center gap-1 flex-1 py-2 relative group"
          >
            {/* Active background when menu open */}
            {accountMenuOpen && (
              <span className="absolute inset-x-2 top-1 bottom-1 bg-pink-50 rounded-xl" />
            )}

            <span className="relative">
              {hasAccount ? (
                // Show avatar / initial if account is connected
                accountAvatarUrl ? (
                  <Image
                    src={accountAvatarUrl}
                    alt={accountName}
                    height={24}
                    width={24}
                    className="h-6 w-6 rounded-full object-cover ring-2 ring-pink-300"
                  />
                ) : (
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-gradient-to-br from-pink-400 to-rose-500 text-white text-[10px] font-bold ring-2 ring-pink-200 shadow-sm">
                    {initial}
                  </span>
                )
              ) : (
                // No account — show dashed add circle
                <span className="flex h-6 w-6 items-center justify-center rounded-full border-2 border-dashed border-gray-300 bg-gray-50 text-gray-400 group-hover:border-pink-400 group-hover:text-pink-400 transition-colors">
                  <Plus className="h-3.5 w-3.5" />
                </span>
              )}
            </span>

            <span
              className={`relative text-[10px] font-semibold transition-colors duration-150 ${
                accountMenuOpen ? "text-pink-500" : "text-gray-400"
              }`}
            >
              {hasAccount ? "Account" : "Add"}
            </span>
          </button>
        </div>

        {/* Safe area for iPhone home indicator */}
        <div className="h-safe-area-inset-bottom bg-white" />
      </nav>
    </>
  );
}
