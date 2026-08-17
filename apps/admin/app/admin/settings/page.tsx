"use client";

import Link from "next/link";
import { useUser, useClerk } from "@clerk/nextjs";
import { useTheme } from "next-themes";
import {
  Activity,
  ArrowUpRight,
  Bot,
  CheckCircle2,
  Database,
  ExternalLink,
  EyeOff,
  KeyRound,
  LogOut,
  Moon,
  ServerCog,
  Settings,
  ShieldCheck,
  Sun,
  Users,
} from "lucide-react";
import { Button, Orbs, useThemeStyles } from "@rocketreplai/ui";

const MODULES = [
  {
    label: "Customer access",
    description: "Limits, products and entitlements",
    href: "/admin/customers",
    icon: Users,
  },
  {
    label: "Billing registry",
    description: "Subscriptions across all products",
    href: "/admin/subscriptions",
    icon: Database,
  },
  {
    label: "Rate limits",
    description: "Usage windows and queue pressure",
    href: "/admin/rate-limits",
    icon: Activity,
  },
  {
    label: "Product operations",
    description: "Web, social, messaging and voice",
    href: "/admin",
    icon: Bot,
  },
] as const;

export default function AdminSettingsPage() {
  const { user } = useUser();
  const { signOut } = useClerk();
  const { setTheme, resolvedTheme } = useTheme();
  const { styles, isDark } = useThemeStyles();

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "Not configured";
  const ownerEmail = user?.primaryEmailAddress?.emailAddress || "Owner account";

  return (
    <div className={styles.page}>
      {isDark && <Orbs />}
      <div className={styles.container}>
        <div>
          <div
            className={`mb-3 inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs ${styles.badge.gray}`}
          >
            <Settings className="h-3.5 w-3.5" />
            Console settings
          </div>
          <h1 className={`text-2xl font-bold md:text-3xl ${styles.text.primary}`}>
            Settings & access
          </h1>
          <p className={`mt-2 max-w-2xl text-sm ${styles.text.secondary}`}>
            Configure the admin experience and review the security boundary for
            this owner-only console.
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <section className={`rounded-2xl p-5 md:p-6 ${styles.card}`}>
            <div className="relative z-10 flex items-start gap-3">
              <div
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${styles.icon.purple}`}
              >
                {isDark ? (
                  <Moon className="h-5 w-5 text-violet-500" />
                ) : (
                  <Sun className="h-5 w-5 text-amber-500" />
                )}
              </div>
              <div>
                <h2 className={`text-sm font-semibold ${styles.text.primary}`}>
                  Appearance
                </h2>
                <p className={`mt-1 text-xs ${styles.text.muted}`}>
                  Theme changes apply immediately across the admin console.
                </p>
              </div>
            </div>

            <div className="relative z-10 mt-6 grid grid-cols-2 gap-3">
              <button
                onClick={() => setTheme("dark")}
                className={`rounded-2xl border p-4 text-left transition-all ${
                  resolvedTheme === "dark"
                    ? "border-violet-500 bg-violet-500/10"
                    : styles.innerCard
                }`}
              >
                <div className="flex items-center justify-between">
                  <Moon className="h-5 w-5 text-violet-500" />
                  {resolvedTheme === "dark" && (
                    <CheckCircle2 className="h-4 w-4 text-violet-500" />
                  )}
                </div>
                <p className={`mt-4 text-sm font-semibold ${styles.text.primary}`}>
                  Dark
                </p>
                <p className={`mt-1 text-[11px] ${styles.text.muted}`}>
                  Focused low-light workspace
                </p>
              </button>
              <button
                onClick={() => setTheme("light")}
                className={`rounded-2xl border p-4 text-left transition-all ${
                  resolvedTheme === "light"
                    ? "border-amber-500 bg-amber-500/10"
                    : styles.innerCard
                }`}
              >
                <div className="flex items-center justify-between">
                  <Sun className="h-5 w-5 text-amber-500" />
                  {resolvedTheme === "light" && (
                    <CheckCircle2 className="h-4 w-4 text-amber-500" />
                  )}
                </div>
                <p className={`mt-4 text-sm font-semibold ${styles.text.primary}`}>
                  Light
                </p>
                <p className={`mt-1 text-[11px] ${styles.text.muted}`}>
                  High-contrast daytime view
                </p>
              </button>
            </div>
          </section>

          <section className={`rounded-2xl p-5 md:p-6 ${styles.card}`}>
            <div className="relative z-10 flex items-start gap-3">
              <div
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${styles.icon.green}`}
              >
                <ShieldCheck className="h-5 w-5 text-emerald-500" />
              </div>
              <div>
                <h2 className={`text-sm font-semibold ${styles.text.primary}`}>
                  Owner session
                </h2>
                <p className={`mt-1 text-xs ${styles.text.muted}`}>
                  Access is verified by the API before admin pages render.
                </p>
              </div>
            </div>

            <div className={`relative z-10 mt-6 rounded-2xl p-4 ${styles.innerCard}`}>
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-br from-emerald-500 to-cyan-500 text-sm font-bold text-white">
                  {(user?.firstName?.[0] || ownerEmail[0] || "A").toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <p className={`truncate text-sm font-semibold ${styles.text.primary}`}>
                    {user?.fullName || "RocketReplai Owner"}
                  </p>
                  <p className={`mt-0.5 truncate text-xs ${styles.text.muted}`}>
                    {ownerEmail}
                  </p>
                </div>
                <span
                  className={`rounded-full px-2.5 py-1 text-[10px] font-semibold ${styles.badge.green}`}
                >
                  Verified
                </span>
              </div>
            </div>

            <div className="relative z-10 mt-4 flex flex-col gap-2 sm:flex-row">
              <Button
                variant="outline"
                className={`flex-1 gap-2 ${styles.pill}`}
                onClick={() => void signOut({ redirectUrl: "/sign-in" })}
              >
                <LogOut className="h-4 w-4" />
                Sign out
              </Button>
              <Button asChild variant="outline" className={`flex-1 gap-2 ${styles.pill}`}>
                <Link href="/admin">
                  <ExternalLink className="h-4 w-4" />
                  Command center
                </Link>
              </Button>
            </div>
          </section>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1.2fr_1fr]">
          <section className={`rounded-2xl p-5 md:p-6 ${styles.card}`}>
            <div className="relative z-10 flex items-start gap-3">
              <div
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${styles.icon.blue}`}
              >
                <ServerCog className="h-5 w-5 text-blue-500" />
              </div>
              <div>
                <h2 className={`text-sm font-semibold ${styles.text.primary}`}>
                  Console environment
                </h2>
                <p className={`mt-1 text-xs ${styles.text.muted}`}>
                  Runtime endpoints and current protection model.
                </p>
              </div>
            </div>

            <div className="relative z-10 mt-5 space-y-2">
              {[
                ["Admin authorization", "Clerk session + API owner guard", KeyRound],
                ["API endpoint", apiUrl, ServerCog],
                ["Sensitive credentials", "Excluded from admin API projections", EyeOff],
                ["Mutation history", "Reasoned overrides are audit logged", Database],
              ].map(([label, value, Icon]) => {
                const ItemIcon = Icon as typeof KeyRound;
                return (
                  <div
                    key={String(label)}
                    className={`flex items-center gap-3 rounded-xl p-3 ${styles.innerCard}`}
                  >
                    <ItemIcon className={`h-4 w-4 shrink-0 ${styles.text.muted}`} />
                    <div className="min-w-0 flex-1">
                      <p className={`text-[10px] uppercase tracking-wide ${styles.text.muted}`}>
                        {String(label)}
                      </p>
                      <p className={`mt-1 truncate text-xs font-medium ${styles.text.primary}`}>
                        {String(value)}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          <section className={`rounded-2xl p-5 md:p-6 ${styles.card}`}>
            <div className="relative z-10">
              <h2 className={`text-sm font-semibold ${styles.text.primary}`}>
                Management modules
              </h2>
              <p className={`mt-1 text-xs ${styles.text.muted}`}>
                Jump directly to a common owner workflow.
              </p>
            </div>
            <div className="relative z-10 mt-4 space-y-2">
              {MODULES.map((module) => {
                const Icon = module.icon;
                return (
                  <Link
                    key={module.href + module.label}
                    href={module.href}
                    className={`group flex items-center gap-3 rounded-xl p-3 transition-colors ${styles.innerCard} ${styles.rowHover}`}
                  >
                    <div
                      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${styles.icon.blue}`}
                    >
                      <Icon className="h-4 w-4 text-blue-500" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className={`text-xs font-semibold ${styles.text.primary}`}>
                        {module.label}
                      </p>
                      <p className={`mt-0.5 truncate text-[10px] ${styles.text.muted}`}>
                        {module.description}
                      </p>
                    </div>
                    <ArrowUpRight
                      className={`h-4 w-4 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5 ${styles.text.muted}`}
                    />
                  </Link>
                );
              })}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
