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
  Tabs,
  TabsContent,
  toast,
  useThemeStyles,
} from "@rocketreplai/ui";
import { useApi } from "@/lib/useApi";
import { getCallSubscriptions } from "@/lib/services/call-actions.api";
import { CallCheckout } from "@/components/call/CallCheckout";
import { PackageSubscriptionNotice } from "@/components/packages/PackageSubscriptionNotice";

const CALL_PLANS = [
  {
    id: "free",
    name: "Free",
    monthly: 0,
    originalMonthly: 0,
    firstMonth: 0,
    minutesLimit: 10,
    concurrentCallLimit: 1,
    agentLimit: 1,
    overageRate: 0,
    popular: false,
    features: [
      "10 inbound call minutes",
      "1 concurrent inbound call",
      "AI receptionist flow",
      "Lead capture from calls",
      "Owner dashboard access",
    ],
  },
  {
    id: "call-business",
    name: "Business",
    monthly: 5000,
    originalMonthly: 5000,
    firstMonth: 2500,
    minutesLimit: 200,
    concurrentCallLimit: 3,
    agentLimit: 1,
    overageRate: 5,
    popular: true,
    features: [
      "200 inbound call minutes",
      "3 concurrent inbound calls",
      "Call transcripts and summaries",
      "WhatsApp and email alerts",
      "Priority support",
    ],
  },
] as const;

const comparison = [
  ["Included minutes", "10", "200"],
  ["Concurrent inbound calls", "1", "3"],
  ["Inbound calls", "✓", "✓"],
  ["Outbound calls", "", ""],
  ["Dashboard access", "Owner only", "Owner only"],
  ["Priority support", "", "✓"],
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
        <PackageSubscriptionNotice />
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
              Free starts with 10 inbound minutes. Business gives 200 inbound
              minutes and handles up to 3 calls at the same time.
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
                <div className="flex items-center justify-center gap-3">
                  <span
                    className={`rounded-full px-4 py-2 text-sm font-bold ${
                      isDark
                        ? "bg-white/[0.06] text-white"
                        : "bg-gray-100 text-gray-800"
                    }`}
                  >
                    Monthly billing only
                  </span>
                  <span className="rounded-full bg-green-500/10 px-3 py-1 text-xs font-bold text-green-500">
                    50% off first month
                  </span>
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </motion.section>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {CALL_PLANS.map((plan, index) => {
            const price = plan.monthly;
            const originalPrice = plan.originalMonthly;
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
                    {originalPrice > price && (
                      <p
                        className={`text-xl font-bold line-through ${styles.text.muted}`}
                      >
                        ₹{originalPrice.toLocaleString("en-IN")}
                      </p>
                    )}
                    <p className={`text-4xl font-black ${gradientText}`}>
                      ₹{price.toLocaleString("en-IN")}
                    </p>
                  </div>
                  <p className={`font-montserrat text-sm ${styles.text.muted}`}>
                    /month + GST
                  </p>
                  {plan.firstMonth > 0 && (
                    <p className="mt-2 rounded-full bg-green-500/10 px-3 py-1 text-xs font-bold text-green-500">
                      First month ₹{plan.firstMonth.toLocaleString("en-IN")} with launch offer, then ₹{plan.monthly.toLocaleString("en-IN")}/month.
                    </p>
                  )}
                </div>

                <div className="mt-5 grid grid-cols-2 gap-3">
                  {[
                    `${plan.concurrentCallLimit} concurrent`,
                    "Owner-only access",
                    plan.overageRate ? `₹${plan.overageRate}/min` : "No overage",
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
                    {plan.id === "free" ? (
                      <Button
                        disabled
                        className="w-full rounded-xl bg-gradient-to-r from-gray-500 to-gray-600 text-white opacity-80"
                      >
                        Included by default
                      </Button>
                    ) : isCurrent ? (
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
                        billingCycle="monthly"
                        amount={price}
                        minutesLimit={plan.minutesLimit}
                        concurrentCallLimit={plan.concurrentCallLimit}
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
              Compare inbound minutes, concurrent calls, and dashboard access.
            </p>
          </div>

          <div className={`${styles.card} overflow-hidden`}>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className={isDark ? "bg-white/[0.04]" : "bg-gray-50"}>
                  <tr>
                    {["Feature", "Free", "Business"].map(
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
              ["Call-ready setup", "Connect inbound routing, tune the flow, and capture leads"],
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
