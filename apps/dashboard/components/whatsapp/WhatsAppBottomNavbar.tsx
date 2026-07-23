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

const ITEMS = [
  { label: "Home", href: "/whatsapp", icon: LayoutDashboard },
  { label: "Automate", href: "/whatsapp/automations", icon: Workflow },
  { label: "Booking", href: "/whatsapp/appointments", icon: CalendarCheck },
  { label: "FAQs", href: "/whatsapp/faqs", icon: CircleHelp },
  { label: "Settings", href: "/whatsapp/settings", icon: Settings },
] as const;

export default function WhatsAppBottomNavbar() {
  const pathname = usePathname();

  return (
    <nav className="fixed inset-x-0 bottom-0 z-[45] border-t border-white/[0.08] bg-[#101114]/95 px-1 pt-2 pb-[calc(0.5rem+env(safe-area-inset-bottom))] backdrop-blur-xl md:hidden">
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
              className={`flex flex-col items-center gap-1 rounded-xl px-1 py-1.5 text-[10px] font-semibold ${
                active ? "text-emerald-300" : "text-white/45"
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
