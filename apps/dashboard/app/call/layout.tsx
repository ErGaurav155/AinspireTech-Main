"use client";

import Link from "next/link";
import { Clock3, Phone, Sparkles } from "lucide-react";
import { Button, Orbs, useThemeStyles } from "@rocketreplai/ui";

export default function CallLayout({ children: _children }: { children: React.ReactNode }) {
  const { styles, isDark } = useThemeStyles();

  return (
    <main className={`min-h-screen ${styles.page} flex items-center justify-center px-6`}>
      {isDark && <Orbs />}
      <section className={`${styles.card} relative z-10 w-full max-w-2xl rounded-3xl p-8 text-center md:p-12`}>
        <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-3xl bg-gradient-to-br from-cyan-500 to-blue-600 shadow-xl shadow-cyan-500/20">
          <Phone className="h-10 w-10 text-white" />
        </div>
        <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-cyan-500/20 bg-cyan-500/10 px-4 py-2 text-sm font-semibold text-cyan-500">
          <Clock3 className="h-4 w-4" /> Coming soon
        </div>
        <h1 className={`mb-4 text-3xl font-bold md:text-4xl ${styles.text.primary}`}>
          AI Call Assistant is being prepared
        </h1>
        <p className={`mx-auto mb-8 max-w-xl leading-7 ${styles.text.secondary}`}>
          The service is visible in your RocketReplAI workspace, but onboarding and dashboard access are disabled until the production launch is ready.
        </p>
        <div className={`${styles.innerCard} mb-8 rounded-2xl p-5 text-left`}>
          <div className="flex items-start gap-3">
            <Sparkles className="mt-0.5 h-5 w-5 shrink-0 text-cyan-500" />
            <p className={`text-sm leading-6 ${styles.text.secondary}`}>
              Your current plan will not consume Call Assistant capacity or usage while the module is unavailable.
            </p>
          </div>
        </div>
        <Button asChild className={styles.button.primary}>
          <Link href="/">Return to RocketReplAI</Link>
        </Button>
      </section>
    </main>
  );
}
