"use client";

import Link from "next/link";
import {
  ArrowLeft,
  Bot,
  CheckCircle2,
  Crown,
  Settings2,
} from "lucide-react";
import { Orbs, Spinner, useThemeStyles } from "@rocketreplai/ui";
import SharedBusinessKnowledgeForm from "@/components/shared/SharedBusinessKnowledgeForm";
import { useInstaAccount } from "@/context/Instaaccountcontext ";

export default function InstagramAiDmSetupPage() {
  const { styles, isDark } = useThemeStyles();
  const { selectedAccount, isAccLoading } = useInstaAccount();

  if (isAccLoading) return <Spinner label="Loading Instagram account..." />;

  return (
    <div className={isDark ? "relative min-h-screen overflow-hidden" : "min-h-screen"}>
      {isDark && <Orbs />}
      <div className="relative z-10 mx-auto max-w-5xl p-4 md:p-6 lg:p-8">
        <Link
          href="/insta/automations/add/dm-options"
          className={`inline-flex items-center gap-2 text-sm font-medium ${styles.text.secondary} transition hover:text-pink-500`}
        >
          <ArrowLeft className="h-4 w-4" />
          DM response options
        </Link>

        <div className="mt-5 flex flex-col gap-4 border-b border-gray-200 pb-5 dark:border-white/[0.08] sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <Bot className="h-5 w-5 text-emerald-500" />
              <h1 className={`text-2xl font-semibold ${styles.text.primary}`}>
                AI replies for unmatched DMs
              </h1>
              <span className="inline-flex items-center gap-1 rounded-md bg-amber-50 px-2 py-1 text-xs font-semibold text-amber-700 dark:bg-amber-400/10 dark:text-amber-300">
                <Crown className="h-3.5 w-3.5" /> Pro
              </span>
            </div>
            <p className={`mt-2 max-w-3xl text-sm leading-6 ${styles.text.secondary}`}>
              Keyword and quick-reply flows run first. AI answers only when no
              active trigger matches the incoming message.
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
              A connected account is required before AI can reply to DMs.
            </p>
            <Link
              href="/insta/accounts/add"
              className="mt-4 inline-flex min-h-10 items-center justify-center rounded-lg bg-pink-500 px-4 text-sm font-semibold text-white transition hover:bg-pink-600"
            >
              Connect Instagram
            </Link>
          </section>
        ) : (
          <div className="mt-6 space-y-4">
            <section className={`rounded-lg border p-4 ${styles.card}`}>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex min-w-0 items-start gap-3">
                  <CheckCircle2
                    className={`mt-0.5 h-5 w-5 shrink-0 ${
                      selectedAccount.autoDMEnabled
                        ? "text-emerald-500"
                        : "text-amber-500"
                    }`}
                  />
                  <div className="min-w-0">
                    <h2 className={`text-sm font-semibold ${styles.text.primary}`}>
                      {selectedAccount.autoDMEnabled
                        ? "DM automation is enabled"
                        : "DM automation is paused"}
                    </h2>
                    <p className={`mt-1 text-sm ${styles.text.secondary}`}>
                      {selectedAccount.autoDMEnabled
                        ? "Saving business knowledge makes unmatched-message AI replies ready for this account."
                        : "Enable DM automation in Settings before AI replies can be sent."}
                    </p>
                  </div>
                </div>
                <Link
                  href="/insta/settings"
                  className="inline-flex min-h-9 shrink-0 items-center justify-center gap-2 rounded-lg border border-gray-200 px-3 text-sm font-medium text-gray-700 transition hover:bg-gray-50 dark:border-white/[0.09] dark:text-white/70 dark:hover:bg-white/[0.05]"
                >
                  <Settings2 className="h-4 w-4" /> Settings
                </Link>
              </div>
            </section>

            <SharedBusinessKnowledgeForm />
          </div>
        )}
      </div>
    </div>
  );
}
