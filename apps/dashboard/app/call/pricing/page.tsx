"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { SignedIn, SignedOut, useAuth } from "@clerk/nextjs";
import { motion } from "framer-motion";
import {
  BadgeCheck,
  Check,
  CreditCard,
  Headphones,
  Phone,
  Rocket,
  Sparkles,
  X,
} from "lucide-react";
import {
  Button,
  Orbs,
  Spinner,
  Switch,
  Tabs,
  TabsContent,
  toast,
  useThemeStyles,
} from "@rocketreplai/ui";
import { useApi } from "@/lib/useApi";
import { getCallSubscriptions } from "@/lib/services/call-actions.api";
import { CallCheckout } from "@/components/call/CallCheckout";

type BillingMode = "monthly" | "yearly";

const CALL_PLANS = [
  {
    id: "call-starter",
    name: "Starter",
    monthly: 2999,
    yearly: 29990,
    originalMonthly: 3999,
    minutesLimit: 1000,
    numberLimit: 1,
    agentLimit: 3,
    overageRate: 5,
    popular: false,
    features: [
      "AI receptionist",
      "Lead capture from calls",
      "WhatsApp and email alerts",
      "Basic AI flow editor",
      "Call logs and summaries",
    ],
  },
  {
    id: "call-growth",
    name: "Growth",
    monthly: 7999,
    yearly: 79990,
    originalMonthly: 9999,
    minutesLimit: 3000,
    numberLimit: 3,
    agentLimit: 10,
    overageRate: 4,
    popular: true,
    features: [
      "Everything in Starter",
      "Call transcripts and recordings",
      "Advanced AI flow editor",
      "Permanent number search",
      "Priority support",
    ],
  },
  {
    id: "call-enterprise",
    name: "Enterprise",
    monthly: 19999,
    yearly: 199990,
    originalMonthly: 24999,
    minutesLimit: 10000,
    numberLimit: 10,
    agentLimit: 30,
    overageRate: 3,
    popular: false,
    features: [
      "Everything in Growth",
      "High-volume call operations",
      "Larger permanent number pool",
      "Dedicated onboarding",
      "SLA support",
    ],
  },
] as const;

const comparison = [
  ["Included minutes", "1,000", "3,000", "10,000"],
  ["Permanent numbers", "1", "3", "10"],
  ["Dashboard access", "Owner only", "Owner only", "Owner only"],
  ["Overage", "₹5/min", "₹4/min", "₹3/min"],
  ["Call transcripts", "Basic", "Advanced", "Advanced"],
  ["Number search", "✓", "✓", "✓"],
  ["Priority support", "", "✓", "✓"],
];

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.55, ease: "easeOut" },
  },
};

export default function CallPricingPage() {
  const { userId, isLoaded } = useAuth();
  const { apiRequest } = useApi();
  const { styles, isDark } = useThemeStyles();
  const [billingMode, setBillingMode] = useState<BillingMode>("yearly");
  const [subscriptions, setSubscriptions] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchSubscriptions = useCallback(async () => {
    if (!isLoaded || !userId) {
      setIsLoading(false);
      return;
    }

    try {
      const data = await getCallSubscriptions(apiRequest);
      setSubscriptions(data?.subscriptions || []);
    } catch (error) {
      console.error(error);
      toast({
        title: "Could not load call subscriptions",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [apiRequest, isLoaded, userId]);

  useEffect(() => {
    fetchSubscriptions();
  }, [fetchSubscriptions]);

  const activeSubscription = useMemo(
    () => subscriptions.find((sub) => sub.status === "active"),
    [subscriptions],
  );

  if (!isLoaded || isLoading) {
    return <Spinner label="Loading call pricing..." />;
  }

  const gradientText =
    "bg-gradient-to-r from-pink-400 to-rose-400 bg-clip-text text-transparent";

  return (
    <div className={styles.page}>
      {isDark && <Orbs />}
      <div className={styles.container}>
        <motion.section
          initial="hidden"
          animate="visible"
          variants={fadeUp}
          className={`${styles.card} relative overflow-hidden p-6 md:p-10 text-center mb-10 group`}
        >
          <div className="absolute inset-0 bg-gradient-to-br from-pink-500/10 via-rose-500/5 to-orange-400/10 pointer-events-none" />
          <div className="absolute inset-0 bg-gradient-to-br from-pink-500/5 to-rose-500/5 opacity-0 group-hover:opacity-100 transition-opacity" />
          <div className="absolute top-0 left-0 h-1 w-full bg-gradient-to-r from-transparent via-pink-400 to-transparent" />
          <div className="relative z-10">
            <div
              className={`inline-flex items-center rounded-full px-4 py-2 mb-4 ${
                isDark
                  ? "bg-pink-500/10 border border-pink-500/20"
                  : "bg-pink-50 border border-pink-200"
              }`}
            >
              <Sparkles className="h-4 w-4 mr-2 text-pink-400" />
              <span className="text-xs font-bold uppercase tracking-widest text-pink-400">
                AI Call Assistant Pricing
              </span>
            </div>

            <h1 className={`text-3xl md:text-5xl font-bold mb-4 leading-tight ${gradientText}`}>
              Pick the call plan that matches your volume
            </h1>

            <p
              className={`font-montserrat text-sm md:text-lg max-w-2xl mx-auto ${styles.text.secondary}`}
            >
              Starter, Growth, and Enterprise include receptionist minutes,
              owner-only dashboard access, permanent numbers, and clear overage rates.
            </p>

            <Tabs value="call" className="mt-8">
              <div className="flex items-center justify-center">
                <nav
                  className={`flex items-center gap-3 ${styles.innerCard} rounded-xl p-2`}
                >
                  <Headphones className="h-4 w-4 text-pink-400" />
                  <span className={`text-sm font-medium ${styles.text.primary}`}>
                    Call Subscriptions
                  </span>
                </nav>
              </div>
              <TabsContent value="call" className="mt-8">
                <div className="flex items-center justify-center gap-4">
                  <span
                    className={`text-sm font-medium ${
                      billingMode === "monthly"
                        ? styles.text.primary
                        : styles.text.muted
                    }`}
                  >
                    Monthly
                  </span>
                  <Switch
                    checked={billingMode === "yearly"}
                    onCheckedChange={(checked) =>
                      setBillingMode(checked ? "yearly" : "monthly")
                    }
                  />
                  <span
                    className={`text-sm font-medium ${
                      billingMode === "yearly"
                        ? styles.text.primary
                        : styles.text.muted
                    }`}
                  >
                    Yearly
                  </span>
                  <span className="rounded-full bg-green-500/10 px-3 py-1 text-xs font-bold text-green-500">
                    Save 16%
                  </span>
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </motion.section>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {CALL_PLANS.map((plan, index) => {
            const price =
              billingMode === "monthly" ? plan.monthly : plan.yearly;
            const originalPrice =
              billingMode === "monthly"
                ? plan.originalMonthly
                : plan.originalMonthly * 12;
            const isCurrent = activeSubscription?.planType === plan.id;

            return (
              <motion.div
                key={plan.id}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.55, delay: index * 0.08 }}
                whileHover={{ y: -6, scale: 1.01 }}
                className={`relative overflow-visible ${styles.card} p-6 ${
                  plan.popular
                    ? isDark
                      ? "border-pink-500/50 shadow-lg shadow-pink-500/10"
                      : "border-pink-300 shadow-lg"
                    : ""
                }`}
              >
                {plan.popular && (
                  <div className="absolute -top-3 left-0 right-0 text-center">
                    <span className="rounded-full bg-gradient-to-r from-pink-500 to-rose-500 px-4 py-1 text-xs font-bold text-white">
                      Most Popular
                    </span>
                  </div>
                )}

                <div className="flex items-center justify-between">
                  <div>
                    <h3 className={`text-2xl font-bold ${styles.text.primary}`}>
                      {plan.name}
                    </h3>
                    <p
                      className={`font-montserrat text-sm ${styles.text.muted}`}
                    >
                      {plan.minutesLimit.toLocaleString()} min included
                    </p>
                  </div>
                  <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-pink-500 to-rose-500 flex items-center justify-center shadow-lg shadow-pink-500/20">
                    <Phone className="h-6 w-6 text-white" />
                  </div>
                </div>

                <div className="mt-6">
                  <div className="flex flex-wrap items-end gap-3">
                    <p
                      className={`text-xl font-bold line-through ${styles.text.muted}`}
                    >
                      ₹{originalPrice.toLocaleString("en-IN")}
                    </p>
                    <p className={`text-4xl font-black ${gradientText}`}>
                      ₹{price.toLocaleString("en-IN")}
                    </p>
                  </div>
                  <p className={`font-montserrat text-sm ${styles.text.muted}`}>
                    /{billingMode === "monthly" ? "month" : "year"} + GST
                  </p>
                </div>

                <div className="mt-5 grid grid-cols-2 gap-3">
                  {[
                    `${plan.numberLimit} numbers`,
                    "Owner-only access",
                    `₹${plan.overageRate}/min`,
                    "Razorpay billing",
                  ].map((item) => (
                    <div
                      key={item}
                      className={`${styles.innerCard} p-3 text-sm font-montserrat`}
                    >
                      {item}
                    </div>
                  ))}
                </div>

                <ul className="mt-6 space-y-3">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-3">
                      <div className="mt-0.5 h-5 w-5 rounded-full bg-pink-500/10 flex items-center justify-center">
                        <Check className="h-3 w-3 text-pink-400" />
                      </div>
                      <span
                        className={`font-montserrat text-sm ${styles.text.secondary}`}
                      >
                        {feature}
                      </span>
                    </li>
                  ))}
                </ul>

                <div className="mt-6">
                  <SignedOut>
                    <Button
                      onClick={() => (window.location.href = "/sign-in")}
                      className="w-full rounded-xl bg-gradient-to-r from-pink-500 to-rose-500 text-white hover:from-pink-600 hover:to-rose-600"
                    >
                      <Rocket className="h-4 w-4 mr-2" />
                      Get Started
                    </Button>
                  </SignedOut>
                  <SignedIn>
                    {isCurrent ? (
                      <Button
                        disabled
                        className="w-full rounded-xl bg-gradient-to-r from-green-500 to-emerald-500 text-white opacity-80"
                      >
                        <BadgeCheck className="h-4 w-4 mr-2" />
                        Current Subscription
                      </Button>
                    ) : (
                      <CallCheckout
                        userId={userId!}
                        productId={plan.id}
                        billingCycle={billingMode}
                        amount={price}
                        minutesLimit={plan.minutesLimit}
                        numberLimit={plan.numberLimit}
                        agentLimit={plan.agentLimit}
                        overageRate={plan.overageRate}
                        previousSubscriptionId={
                          activeSubscription?.subscriptionId
                        }
                        buttonText={
                          activeSubscription ? "Switch Plan" : "Subscribe"
                        }
                      />
                    )}
                  </SignedIn>
                </div>
              </motion.div>
            );
          })}
        </div>

        <motion.section
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mt-16"
        >
          <div className="text-center mb-8">
            <h2 className={`text-3xl font-bold ${gradientText}`}>
              Plan Comparison
            </h2>
            <p className={`font-montserrat ${styles.text.secondary}`}>
              Compare call minutes, permanent numbers, dashboard access, and support level.
            </p>
          </div>

          <div className={`${styles.card} overflow-hidden`}>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className={isDark ? "bg-white/[0.04]" : "bg-gray-50"}>
                  <tr>
                    {["Feature", "Starter", "Growth", "Enterprise"].map(
                      (heading) => (
                        <th
                          key={heading}
                          className={`text-left py-4 px-6 font-semibold ${styles.text.primary}`}
                        >
                          {heading}
                        </th>
                      ),
                    )}
                  </tr>
                </thead>
                <tbody
                  className={
                    isDark
                      ? "divide-y divide-white/[0.06]"
                      : "divide-y divide-gray-100"
                  }
                >
                  {comparison.map((row) => (
                    <tr key={row[0]} className={styles.rowHover}>
                      {row.map((cell, index) => (
                        <td
                          key={`${row[0]}-${index}`}
                          className={`py-4 px-6 font-montserrat ${
                            index === 0
                              ? styles.text.primary
                              : styles.text.secondary
                          }`}
                        >
                          {cell === "✓" ? (
                            <Check className="h-5 w-5 text-green-500" />
                          ) : cell === "" ? (
                            <X className="h-5 w-5 text-gray-300" />
                          ) : (
                            cell
                          )}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-8">
            {[
              ["Secure payments", "Razorpay subscriptions with UPI and cards"],
              ["Clear overage", "Know extra-minute costs before you scale"],
              ["Call-ready setup", "Select a number, tune the flow, and capture leads"],
            ].map(([title, body]) => (
              <motion.div
                key={title}
                whileHover={{ y: -4 }}
                className={`${styles.innerCard} p-4 text-center`}
              >
                <CreditCard className="h-8 w-8 mx-auto mb-2 text-pink-400" />
                <h4 className={`font-semibold mb-1 ${styles.text.primary}`}>
                  {title}
                </h4>
                <p className={`font-montserrat text-xs ${styles.text.muted}`}>
                  {body}
                </p>
              </motion.div>
            ))}
          </div>
        </motion.section>
      </div>
    </div>
  );
}
