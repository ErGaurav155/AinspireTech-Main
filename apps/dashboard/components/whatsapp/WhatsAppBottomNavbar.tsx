"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  CalendarCheck,
  CircleHelp,
  Settings,
  Workflow,
} from "lucide-react";
import { useThemeStyles } from "@rocketreplai/ui";

const ITEMS = [
  { label: "Home", href: "/whatsapp", icon: LayoutDashboard },
  { label: "Automate", href: "/whatsapp/automations", icon: Workflow },
  { label: "Booking", href: "/whatsapp/appointments", icon: CalendarCheck },
  { label: "FAQs", href: "/whatsapp/faqs", icon: CircleHelp },
  { label: "Settings", href: "/whatsapp/settings", icon: Settings },
] as const;

export default function WhatsAppBottomNavbar() {
  const pathname = usePathname();
  const { isDark } = useThemeStyles();

  return (
    <nav
      className={`fixed inset-x-0 bottom-0 z-[45] border-t px-1 pt-2 pb-[calc(0.5rem+env(safe-area-inset-bottom))] backdrop-blur-xl transition-colors md:hidden ${
        isDark
          ? "border-white/[0.08] bg-[#101114]/95"
          : "border-gray-200 bg-white/95 shadow-[0_-4px_16px_rgba(15,23,42,0.06)]"
      }`}
    >
      <div className="grid grid-cols-5 gap-0.5">
        {ITEMS.map((item) => {
          const active =
            pathname === item.href ||
            (item.href !== "/whatsapp" && pathname.startsWith(item.href));
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center gap-1 rounded-xl px-1 py-1.5 text-[10px] font-semibold transition-colors ${
                active
                  ? isDark
                    ? "bg-emerald-400/10 text-emerald-300"
                    : "bg-emerald-50 text-emerald-700"
                  : isDark
                    ? "text-white/45 hover:bg-white/[0.04] hover:text-white/70"
                    : "text-gray-500 hover:bg-gray-50 hover:text-gray-700"
              }`}
            >
              <Icon className="h-4 w-4" />
              <span className="w-full truncate text-center">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
