import Link from "next/link";
import {
  ArrowRight,
  Bot,
  CheckCircle2,
  Instagram,
  MessageCircle,
  PackageCheck,
} from "lucide-react";
import { Button } from "@rocketreplai/ui";

const packageFeatures = [
  {
    icon: Bot,
    label: "Website chatbot and appointment booking",
  },
  {
    icon: Instagram,
    label: "Instagram DM automation",
  },
  {
    icon: MessageCircle,
    label: "WhatsApp automation with unlimited response messages",
  },
];

interface SocialWhatsAppPackagePromoProps {
  className?: string;
}

export function SocialWhatsAppPackagePromo({
  className = "",
}: SocialWhatsAppPackagePromoProps) {
  return (
    <section
      aria-labelledby="social-whatsapp-package-title"
      className={`mx-auto w-full max-w-6xl ${className}`}
    >
      <div className="relative overflow-hidden rounded-3xl border border-violet-200 bg-gradient-to-br from-violet-50 via-white to-emerald-50 p-6 shadow-xl shadow-violet-950/5 sm:p-8 dark:border-white/10 dark:from-violet-500/10 dark:via-white/[0.04] dark:to-emerald-500/10 dark:shadow-none">
        <div className="pointer-events-none absolute -right-20 -top-24 h-64 w-64 rounded-full bg-emerald-300/20 blur-3xl dark:bg-emerald-400/10" />
        <div className="pointer-events-none absolute -bottom-28 -left-16 h-64 w-64 rounded-full bg-violet-300/25 blur-3xl dark:bg-violet-400/10" />

        <div className="relative grid gap-8 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-violet-200 bg-white/80 px-3 py-1 text-xs font-black uppercase tracking-[0.16em] text-violet-700 dark:border-violet-300/20 dark:bg-violet-300/10 dark:text-violet-200">
              <PackageCheck className="h-3.5 w-3.5" />
              Best combined value
            </div>
            <h2
              id="social-whatsapp-package-title"
              className="mt-4 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl dark:text-white"
            >
              Social + WhatsApp
            </h2>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600 sm:text-base dark:text-white/60">
              Run your website, Instagram, and WhatsApp automations together in
              one simple monthly package.
            </p>

            <ul className="mt-6 grid gap-3 sm:grid-cols-3">
              {packageFeatures.map(({ icon: Icon, label }) => (
                <li
                  key={label}
                  className="flex items-start gap-2.5 text-sm font-semibold text-slate-700 dark:text-white/70"
                >
                  <span className="mt-0.5 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-300/10 dark:text-emerald-200">
                    <Icon className="h-3.5 w-3.5" />
                  </span>
                  <span>{label}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="min-w-[240px] rounded-2xl border border-white/80 bg-white/80 p-5 shadow-sm backdrop-blur dark:border-white/10 dark:bg-black/20">
            <div className="flex items-center gap-2 text-sm font-bold text-emerald-700 dark:text-emerald-200">
              <CheckCircle2 className="h-4 w-4" />
              One combined subscription
            </div>
            <div className="mt-3 flex items-end gap-1 text-slate-950 dark:text-white">
              <span className="text-3xl font-black">INR 2,999</span>
              <span className="pb-1 text-sm text-slate-500 dark:text-white/50">
                /month
              </span>
            </div>
            <Button
              asChild
              className="mt-5 w-full rounded-xl bg-gradient-to-r from-violet-600 to-emerald-500 py-6 font-bold text-white hover:opacity-90"
            >
              <Link href="https://app.rocketreplai.com/packages">
                View package
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
