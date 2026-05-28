"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  CreditCard,
  GitBranch,
  Headphones,
  LayoutDashboard,
  Settings,
} from "lucide-react";
import { useThemeStyles } from "@rocketreplai/ui";

const ITEMS = [
  { label: "Home", href: "/call", icon: LayoutDashboard },
  { label: "Calls", href: "/call/calls", icon: Headphones },
  { label: "Flows", href: "/call/flows", icon: GitBranch },
  { label: "Billing", href: "/call/billing", icon: CreditCard },
  { label: "Settings", href: "/call/settings", icon: Settings },
] as const;

export default function CallBottomNavbar() {
  const pathname = usePathname();
  const { isDark } = useThemeStyles();

  return (
    <nav
      className={`fixed bottom-0 left-0 right-0 z-[45] md:hidden ${
        isDark
          ? "bg-[rgba(10,10,16,0.85)] backdrop-blur-[32px] border-t border-white/[0.06]"
          : "bg-white/90 backdrop-blur-[12px] border-t border-gray-100"
      }`}
    >
      <div className="flex items-center justify-around h-16 px-1">
        {ITEMS.map((item) => {
          const active =
            pathname === item.href ||
            (item.href !== "/call" && pathname.startsWith(item.href));
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className="flex flex-col items-center justify-center gap-1 flex-1 py-2 relative"
            >
              {active && (
                <span
                  className={`absolute inset-x-1 top-1 bottom-1 rounded-xl ${
                    isDark ? "bg-cyan-500/10" : "bg-cyan-50"
                  }`}
                />
              )}
              <Icon
                className={`relative h-5 w-5 ${
                  active
                    ? isDark
                      ? "text-cyan-300"
                      : "text-cyan-700"
                    : isDark
                      ? "text-white/50"
                      : "text-gray-500"
                }`}
              />
              <span
                className={`relative text-[10px] font-semibold ${
                  active
                    ? isDark
                      ? "text-cyan-300"
                      : "text-cyan-700"
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
      </div>
    </nav>
  );
}
