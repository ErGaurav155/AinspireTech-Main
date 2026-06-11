import Link from "next/link";
import { Check, MessageCircle } from "lucide-react";
import { Button } from "@rocketreplai/ui";

const plans = [
  {
    name: "Launch",
    price: "INR 1,999",
    limit: "10k business-initiated messages",
    features: [
      "1 WhatsApp Business number",
      "2 inbox seats",
      "2 AI agents",
      "Templates and broadcast tracker",
      "Basic analytics",
    ],
  },
  {
    name: "Growth",
    price: "INR 4,999",
    limit: "50k business-initiated messages",
    features: [
      "3 WhatsApp Business numbers",
      "8 inbox seats",
      "5 AI agents",
      "Segments and drip journeys",
      "Priority support",
    ],
  },
  {
    name: "Scale",
    price: "INR 12,999",
    limit: "200k business-initiated messages",
    features: [
      "10 WhatsApp Business numbers",
      "Unlimited inbox seats",
      "20 AI agents",
      "CRM and webhook integrations",
      "SLA monitoring",
    ],
  },
];

export default function WhatsAppPricingPage() {
  return (
    <main className="min-h-screen bg-[#061411] px-4 py-20 text-white md:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="mx-auto max-w-3xl text-center">
          <div className="mx-auto mb-5 inline-flex items-center gap-2 rounded-full border border-emerald-300/20 bg-emerald-300/10 px-3 py-1 text-xs font-bold uppercase tracking-[0.18em] text-emerald-200">
            <MessageCircle className="h-3.5 w-3.5" />
            WhatsApp Automation Pricing
          </div>
          <h1 className="text-4xl font-black tracking-tight md:text-5xl">
            Pricing for serious WhatsApp operations
          </h1>
          <p className="mt-4 text-sm leading-6 text-white/60">
            Platform pricing below excludes Meta WhatsApp Business Platform
            pass-through charges. Meta message cost depends on country and
            template category.
          </p>
        </div>

        <div className="mt-12 grid gap-5 lg:grid-cols-3">
          {plans.map((plan) => (
            <div key={plan.name} className="rounded-3xl border border-white/10 bg-white/[0.05] p-6">
              <h2 className="text-2xl font-black">{plan.name}</h2>
              <div className="mt-5 flex items-end gap-1">
                <span className="text-4xl font-black">{plan.price}</span>
                <span className="pb-1 text-white/50">/month</span>
              </div>
              <p className="mt-3 rounded-xl bg-emerald-300/10 px-3 py-2 text-sm font-bold text-emerald-200">
                {plan.limit}
              </p>
              <ul className="mt-6 space-y-3">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex gap-3 text-sm text-white/70">
                    <Check className="mt-0.5 h-4 w-4 flex-shrink-0 text-emerald-300" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
              <Button asChild className="mt-8 w-full rounded-xl bg-emerald-500 py-6 font-bold text-white hover:bg-emerald-600">
                <Link href="https://app.rocketreplai.com/whatsapp">
                  Configure {plan.name}
                </Link>
              </Button>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
