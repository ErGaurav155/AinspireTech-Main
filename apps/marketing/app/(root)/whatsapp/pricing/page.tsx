import Link from "next/link";
import { Check, MessageCircle } from "lucide-react";
import { Button } from "@rocketreplai/ui";

const plan = {
  name: "WhatsApp Automation",
  price: "INR 1,999",
  limit: "10k business-initiated messages",
  features: [
    "1 connected WhatsApp number",
    "1 team inbox",
    "3 AI agents",
    "Templates and broadcast tracker",
    "Contacts, appointment booking, and basic analytics",
  ],
};

const limits = [
  ["WhatsApp number", "1"],
  ["Team inbox", "1"],
  ["AI agents", "3"],
  ["Included messages", "10k/mo"],
];

export default function WhatsAppPricingPage() {
  return (
    <main className="min-h-screen  px-4 py-20 text-slate-950 md:px-8 dark:bg-transparent dark:text-white">
      <div className="mx-auto max-w-7xl">
        <div className="mx-auto max-w-3xl text-center">
          <div className="mx-auto mb-5 inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-bold uppercase tracking-[0.18em] text-emerald-700 dark:border-emerald-300/20 dark:bg-emerald-300/10 dark:text-emerald-200">
            <MessageCircle className="h-3.5 w-3.5" />
            WhatsApp Automation Pricing
          </div>
          <h1 className="text-4xl font-black tracking-tight md:text-5xl">
            One simple WhatsApp automation plan
          </h1>
          <p className="mt-4 text-sm leading-6 text-slate-600 dark:text-white/60">
            Get the core WhatsApp automation stack for INR 1,999/month. Meta
            WhatsApp Business Platform pass-through message charges are billed
            separately based on country and template category.
          </p>
        </div>

        <div className="mx-auto mt-12 grid max-w-5xl gap-5 lg:grid-cols-[1fr_0.55fr]">
          <div className="rounded-3xl border border-emerald-200 bg-white p-6 shadow-sm shadow-emerald-950/5 ring-2 ring-emerald-400/30 dark:border-white/10 dark:bg-white/[0.05] dark:shadow-none">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <h2 className="text-2xl font-black">{plan.name}</h2>
                <span className="w-fit rounded-full bg-emerald-500 px-3 py-1 text-xs font-black uppercase tracking-[0.16em] text-white">
                  Simple plan
                </span>
              </div>
              <div className="mt-5 flex items-end gap-1">
                <span className="text-4xl font-black">{plan.price}</span>
                <span className="pb-1 text-slate-500 dark:text-white/50">
                  /month
                </span>
              </div>
              <p className="mt-3 rounded-xl bg-emerald-50 px-3 py-2 text-sm font-bold text-emerald-700 dark:bg-emerald-300/10 dark:text-emerald-200">
                {plan.limit}
              </p>
              <ul className="mt-6 space-y-3">
                {plan.features.map((feature) => (
                  <li
                    key={feature}
                    className="flex gap-3 text-sm text-slate-700 dark:text-white/70"
                  >
                    <Check className="mt-0.5 h-4 w-4 flex-shrink-0 text-emerald-600 dark:text-emerald-300" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
              <Button
                asChild
                className="mt-8 w-full rounded-xl bg-emerald-500 py-6 font-bold text-white hover:bg-emerald-600"
              >
                <Link href="https://app.rocketreplai.com/whatsapp">
                  Configure WhatsApp
                </Link>
              </Button>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-slate-50 p-6 dark:border-white/10 dark:bg-white/[0.04]">
            <h2 className="text-xl font-black">Included limits</h2>
            <div className="mt-5 space-y-3">
              {limits.map(([label, value]) => (
                <div
                  key={label}
                  className="flex items-center justify-between rounded-2xl bg-white px-4 py-3 text-sm shadow-sm dark:bg-white/[0.05]"
                >
                  <span className="font-semibold text-slate-600 dark:text-white/60">
                    {label}
                  </span>
                  <span className="text-lg font-black text-emerald-600 dark:text-emerald-300">
                    {value}
                  </span>
                </div>
              ))}
            </div>
            <p className="mt-5 text-sm leading-6 text-slate-600 dark:text-white/60">
              Need higher message volume later? Keep the same platform plan and
              pass through Meta message charges separately.
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
