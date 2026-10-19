"use client";

import Link from "next/link";
import { ArrowLeft, BookOpen, Bot, Instagram, MessageCircle } from "lucide-react";
import { Orbs, useThemeStyles } from "@rocketreplai/ui";
import SharedBusinessKnowledgeForm from "@/components/shared/SharedBusinessKnowledgeForm";

export default function BusinessKnowledgePage() {
  const { styles, isDark } = useThemeStyles();

  return (
    <main className={styles.page}>
      {isDark && <Orbs />}
      <div className={`${styles.container} relative z-10 mx-auto max-w-5xl py-10`}>
        <Link
          href="/"
          className={`inline-flex items-center gap-2 text-sm ${styles.text.secondary}`}
        >
          <ArrowLeft className="h-4 w-4" /> Back to products
        </Link>

        <section className={`${styles.card} mt-6 rounded-3xl p-6 md:p-9`}>
          <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full bg-violet-500/10 px-3 py-1 text-xs font-semibold text-violet-500">
                <BookOpen className="h-4 w-4" /> One business knowledge base
              </div>
              <h1 className={`mt-4 text-3xl font-bold ${styles.text.primary}`}>
                Shared business knowledge
              </h1>
              <p className={`mt-3 max-w-2xl ${styles.text.secondary}`}>
                Add your website, business facts and one reference file here.
                The same approved knowledge is used by every individual product
                you subscribe to, so you only maintain it once.
              </p>
            </div>
            <div className="flex gap-2">
              {[MessageCircle, Instagram, Bot].map((Icon, index) => (
                <span
                  key={index}
                  className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-500/10 text-violet-500"
                >
                  <Icon className="h-5 w-5" />
                </span>
              ))}
            </div>
          </div>

          <div className="mt-8">
            <SharedBusinessKnowledgeForm />
          </div>
        </section>
      </div>
    </main>
  );
}
