"use client";

import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  Bot,
  Crown,
  KeyRound,
  MessageSquareText,
} from "lucide-react";
import { Orbs, Spinner, useThemeStyles } from "@rocketreplai/ui";
import { useInstaAccount } from "@/context/Instaaccountcontext ";

const responseModes = [
  {
    id: "keyword",
    href: "/insta/automations/add/dms",
    title: "Keyword-triggered automation",
    description:
      "Start an existing DM flow only when the incoming message matches the keywords you define.",
    icon: KeyRound,
    iconClass: "bg-pink-50 text-pink-600 dark:bg-pink-400/10 dark:text-pink-300",
    badge: null,
  },
  {
    id: "ai",
    href: "/insta/automations/add/ai-dms",
    title: "AI replies for other DMs",
    description:
      "Answer messages that do not match a keyword flow using your shared business knowledge.",
    icon: Bot,
    iconClass:
      "bg-emerald-50 text-emerald-600 dark:bg-emerald-400/10 dark:text-emerald-300",
    badge: "Pro",
  },
] as const;

export default function InstagramDmOptionsPage() {
  const { styles, isDark } = useThemeStyles();
  const { selectedAccount, isAccLoading } = useInstaAccount();

  if (isAccLoading) return <Spinner label="Loading Instagram account..." />;

  return (
    <div className={isDark ? "relative min-h-screen overflow-hidden" : "min-h-screen"}>
      {isDark && <Orbs />}
      <div className="relative z-10 mx-auto max-w-4xl p-4 md:p-6 lg:p-8">
        <Link
          href="/insta/automations/add"
          className={`inline-flex items-center gap-2 text-sm font-medium ${styles.text.secondary} transition hover:text-pink-500`}
        >
          <ArrowLeft className="h-4 w-4" />
          Automation types
        </Link>

        <div className="mt-5 flex flex-col gap-4 border-b border-gray-200 pb-5 dark:border-white/[0.08] sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <MessageSquareText className="h-5 w-5 text-pink-500" />
              <h1 className={`text-2xl font-semibold ${styles.text.primary}`}>
                Respond to DMs
              </h1>
            </div>
            <p className={`mt-2 text-sm leading-6 ${styles.text.secondary}`}>
              Select how incoming Instagram messages should be handled.
            </p>
          </div>
          {selectedAccount && (
            <span className="max-w-full truncate rounded-md border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 dark:border-white/[0.09] dark:text-white/60">
              @{selectedAccount.username}
            </span>
          )}
        </div>

        {!selectedAccount ? (
          <section className={`mt-6 rounded-lg border p-5 ${styles.card}`}>
            <h2 className={`text-base font-semibold ${styles.text.primary}`}>
              Connect an Instagram account first
            </h2>
            <p className={`mt-1 text-sm ${styles.text.secondary}`}>
              A connected account is required before creating DM automation.
            </p>
            <Link
              href="/insta/accounts/add"
              className="mt-4 inline-flex min-h-10 items-center justify-center rounded-lg bg-pink-500 px-4 text-sm font-semibold text-white transition hover:bg-pink-600"
            >
              Connect Instagram
            </Link>
          </section>
        ) : (
          <div className="mt-6 grid gap-4 md:grid-cols-2">
            {responseModes.map((mode) => {
              const Icon = mode.icon;
              return (
                <Link
                  key={mode.id}
                  href={mode.href}
                  className={`group min-w-0 rounded-lg border p-5 transition hover:border-pink-300 hover:shadow-sm dark:hover:border-pink-400/30 ${styles.card}`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <span
                      className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${mode.iconClass}`}
                    >
                      <Icon className="h-5 w-5" />
                    </span>
                    {mode.badge && (
                      <span className="inline-flex items-center gap-1 rounded-md bg-amber-50 px-2 py-1 text-xs font-semibold text-amber-700 dark:bg-amber-400/10 dark:text-amber-300">
                        <Crown className="h-3.5 w-3.5" /> {mode.badge}
                      </span>
                    )}
                  </div>
                  <h2 className={`mt-5 text-base font-semibold ${styles.text.primary}`}>
                    {mode.title}
                  </h2>
                  <p className={`mt-2 min-h-12 text-sm leading-6 ${styles.text.secondary}`}>
                    {mode.description}
                  </p>
                  <span className="mt-5 inline-flex items-center gap-1.5 text-sm font-semibold text-pink-500">
                    Configure
                    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                  </span>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
