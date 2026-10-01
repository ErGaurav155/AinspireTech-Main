"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { UserButton } from "@clerk/nextjs";
import { ThemeToggle, useThemeStyles } from "@rocketreplai/ui";
import {
  Building2,
  CreditCard,
  LayoutDashboard,
  Menu,
  Settings,
  Users,
  X,
} from "lucide-react";
import { useSidebar } from "@/lib/useSidebar";

export default function PlatformShell({
  agencyId,
  agencyName,
  children,
}: {
  agencyId: string;
  agencyName?: string;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const { isOpen, toggle, close } = useSidebar(true);
  const { isDark } = useThemeStyles();
  const links = [
    { href: `/agency/${agencyId}`, label: "Overview", icon: LayoutDashboard },
    { href: `/agency/${agencyId}/clients`, label: "Clients", icon: Building2 },
    { href: `/agency/${agencyId}/team`, label: "Team", icon: Users },
    { href: `/agency/${agencyId}/billing`, label: "Billing", icon: CreditCard },
    { href: `/agency/${agencyId}/settings`, label: "Settings", icon: Settings },
  ];

  const sidebarClass = isDark
    ? "border-white/10 bg-slate-950/95 text-white shadow-2xl backdrop-blur-xl"
    : "border-slate-200 bg-white/95 text-slate-900 shadow-xl backdrop-blur-xl";
  const cardClass = isDark
    ? "border-white/10 bg-white/5"
    : "border-slate-200 bg-slate-50";

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 transition-colors dark:bg-slate-950 dark:text-white">
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-[min(18rem,calc(100vw-1rem))] border-r p-6 transition-transform duration-300 md:w-72 ${sidebarClass} ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
        aria-label="Agency navigation"
      >
        <button
          type="button"
          onClick={close}
          className={`absolute right-4 top-4 rounded-lg p-2 md:hidden ${
            isDark ? "text-white/60 hover:bg-white/10" : "text-slate-500 hover:bg-slate-100"
          }`}
          aria-label="Close agency navigation"
        >
          <X className="h-5 w-5" />
        </button>
        <Link href="/select-workspace" className="block pr-10 text-xl font-bold tracking-tight">
          RocketReplAI
        </Link>
        <div className={`mt-8 rounded-2xl border p-4 ${cardClass}`}>
          <p className="text-xs uppercase tracking-widest text-slate-500 dark:text-slate-400">Agency</p>
          <p className="mt-1 truncate font-semibold">{agencyName || "Agency workspace"}</p>
        </div>
        <nav className="mt-8 space-y-2">
          {links.map(({ href, label, icon: Icon }) => {
            const active = pathname === href || (href.endsWith("/clients") && pathname.startsWith(`${href}/`));
            return (
              <Link
                key={href}
                href={href}
                onClick={() => {
                  if (window.innerWidth < 768) close();
                }}
                className={`flex items-center gap-3 rounded-xl px-4 py-3 text-sm transition ${
                  active
                    ? "bg-violet-500 text-white shadow-sm"
                    : isDark
                      ? "text-slate-400 hover:bg-white/5 hover:text-white"
                      : "text-slate-600 hover:bg-slate-100 hover:text-slate-950"
                }`}
              >
                <Icon className="h-4 w-4" /> {label}
              </Link>
            );
          })}
        </nav>
      </aside>

      {isOpen && (
        <button
          type="button"
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm md:hidden"
          onClick={close}
          aria-label="Close agency navigation"
        />
      )}

      <main
        className={`min-h-screen transition-[margin] duration-300 ${
          isOpen ? "md:ml-72" : "md:ml-0"
        }`}
      >
        <header className="sticky top-0 z-30 flex min-h-16 items-center gap-3 border-b border-slate-200 bg-white/85 px-4 backdrop-blur-xl dark:border-white/10 dark:bg-slate-950/85 md:px-8">
          <button
            type="button"
            onClick={toggle}
            className="rounded-lg border border-slate-200 bg-white p-2 text-slate-600 transition hover:bg-slate-100 dark:border-white/10 dark:bg-white/5 dark:text-slate-300 dark:hover:bg-white/10"
            aria-label={isOpen ? "Close agency navigation" : "Open agency navigation"}
          >
            {isOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
          <span className="font-semibold md:hidden">RocketReplAI</span>
          <div className="ml-auto flex items-center gap-2">
            <Link
              href="/select-workspace"
              className="hidden text-sm text-slate-500 transition hover:text-slate-950 dark:text-slate-400 dark:hover:text-white sm:block"
            >
              Switch workspace
            </Link>
            <ThemeToggle />
            <UserButton />
          </div>
        </header>
        <div className="p-5 md:p-8">{children}</div>
      </main>
    </div>
  );
}
