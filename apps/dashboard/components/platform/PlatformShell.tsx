"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Building2, CreditCard, LayoutDashboard, Settings, Users } from "lucide-react";

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
  const links = [
    { href: `/agency/${agencyId}`, label: "Overview", icon: LayoutDashboard },
    { href: `/agency/${agencyId}/clients`, label: "Clients", icon: Building2 },
    { href: `/agency/${agencyId}/team`, label: "Team", icon: Users },
    { href: `/agency/${agencyId}/billing`, label: "Billing", icon: CreditCard },
    { href: `/agency/${agencyId}/settings`, label: "Settings", icon: Settings },
  ];
  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <aside className="fixed inset-y-0 left-0 hidden w-72 border-r border-white/10 bg-slate-950/95 p-6 md:block">
        <Link href="/select-workspace" className="text-xl font-bold tracking-tight">
          RocketReplAI
        </Link>
        <div className="mt-8 rounded-2xl border border-white/10 bg-white/5 p-4">
          <p className="text-xs uppercase tracking-widest text-slate-500">Agency</p>
          <p className="mt-1 truncate font-semibold">{agencyName || "Agency workspace"}</p>
        </div>
        <nav className="mt-8 space-y-2">
          {links.map(({ href, label, icon: Icon }) => {
            const active = pathname === href || (href.endsWith("/clients") && pathname.startsWith(`${href}/`));
            return (
              <Link
                key={href}
                href={href}
                className={`flex items-center gap-3 rounded-xl px-4 py-3 text-sm transition ${
                  active ? "bg-violet-500 text-white" : "text-slate-400 hover:bg-white/5 hover:text-white"
                }`}
              >
                <Icon className="h-4 w-4" /> {label}
              </Link>
            );
          })}
        </nav>
      </aside>
      <main className="min-h-screen md:ml-72">
        <header className="flex min-h-16 items-center justify-between border-b border-white/10 px-5 md:px-8">
          <span className="font-semibold md:hidden">RocketReplAI</span>
          <Link href="/select-workspace" className="ml-auto text-sm text-slate-400 hover:text-white">
            Switch workspace
          </Link>
        </header>
        <div className="p-5 md:p-8">{children}</div>
      </main>
    </div>
  );
}
