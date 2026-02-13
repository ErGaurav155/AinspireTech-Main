"use client";
import React, { useState, useMemo, useEffect } from "react";
import { Check, Zap, BadgeCheck, X } from "lucide-react";
import { useTheme } from "next-themes";
import { BreadcrumbsDefault } from "@rocketreplai/ui/components/shared/breadcrumbs";
import { Switch } from "@rocketreplai/ui/components/radix/switch";
import { Button } from "@rocketreplai/ui/components/radix/button";
import { PricingPlan } from "@rocketreplai/shared";
import { useRouter } from "next/navigation";

interface ThemeStyles {
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  cardBg: string;
  cardBorder: string;
  dialogBg: string;
}

// Single Pro Plan Configuration
const instagramPricingPlans: PricingPlan[] = [
  {
    id: "Insta-Automation-Pro",
    name: "Pro Unlimited",
    description: "For growing creators",
    monthlyPrice: 500,
    yearlyPrice: 5000,
    account: 3,
    limit: 50000000,
    features: [
      "3 Instagram Accounts",
      "Unlimited Automations",
      "Unlimited DMs",
      "Ask Follow before DM",
      "Basic keyword triggers",
      "Priority Support (WhatsApp & Email)",
      "Instagram API compliance",
      "Spam detection",
    ],
    popular: true,
  },
];

// Free Plan Features
const freePlanFeatures = [
  "1 Instagram Account",
  "Unlimited Automations",
  "100 DMs / hour",
  "Ask Follow before DM",
  "Priority Support (WhatsApp and E-mail)",
];

// Comparison Table Data
const comparisonFeatures = [
  { feature: "Pricing", free: "₹0 / Month", pro: "₹500 / Month" },
  { feature: "Automations", free: "Unlimited", pro: "Unlimited" },
  { feature: "DM Send Limit", free: "2000 / Month", pro: "Unlimited" },
  { feature: "Instagram Account", free: "1", pro: "3" },
  {
    feature: "Support",
    free: "Priority(WA & E-mail)",
    pro: "Priority(WA & E-mail)",
  },
  { feature: "Next post automation", free: "✗", pro: "✓" },
  { feature: "Follow-Up Flow", free: "✗", pro: "✓" },
  { feature: "Email Collection", free: "✗", pro: "✓" },
  { feature: "Replay Delay", free: "✗", pro: "✓" },
  { feature: "Ask For Follow", free: "✓", pro: "✓" },
  { feature: "Post And Reel Automation", free: "✗", pro: "✓" },
  { feature: "Story Automations", free: "✗", pro: "✓" },
  { feature: "Inbox Automations", free: "✗", pro: "✓" },
  { feature: "Remove App Branding", free: "✗", pro: "✓" },
  { feature: "Excess DM Queue", free: "✗", pro: "✓" },
  { feature: "Welcome Openers", free: "✗", pro: "✓" },
];
const FREE_PLAN = {
  id: "Insta-Automation-Free",
  name: "Free",
  description: "Default plan for new users",
  monthlyPrice: 0,
  yearlyPrice: 0,
  account: 1,
  limit: 500,
  features: [
    "Comments Automation Unlimited",
    "100 DMs Automation Daily",
    "3 reply templates",
    "Basic keyword triggers",
    "Email support",
    "Instagram API compliance",
    "Spam detection",
  ],
  popular: false,
};

export default function Pricing() {
  const { theme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const currentTheme = resolvedTheme || theme || "light";
  const [billingCycle, setBillingCycle] = useState<"monthly" | "yearly">(
    "monthly",
  );

  const themeStyles = useMemo((): ThemeStyles => {
    const isDark = currentTheme === "dark";
    return {
      textPrimary: isDark ? "text-white" : "text-n-7",
      textSecondary: isDark ? "text-gray-300" : "text-n-5",
      textMuted: isDark ? "text-gray-400" : "text-n-5",
      cardBg: isDark ? "bg-[#0a0a0a]/60" : "bg-white/80",
      cardBorder: isDark ? "border-white/10" : "border-gray-200",
      dialogBg: isDark ? "bg-[#0a0a0a]/95" : "bg-white/95",
    };
  }, [currentTheme]);
  const router = useRouter();

  useEffect(() => {
    setMounted(true);
  }, []);
  const renderFeatureRow = (
    feature: string,
    starter: string,
    growth: string,
    pro: string,
  ) => {
    const renderCell = (value: string, color: string) => {
      if (value === "✓") {
        return <Check className={`h-5 w-5 ${color} mx-auto`} />;
      } else if (value === "✗") {
        return <span className={themeStyles.textMuted}>—</span>;
      }
      return <span className={themeStyles.textSecondary}>{value}</span>;
    };

    return (
      <tr
        className={`hover:${
          theme === "dark" ? "bg-[#1a1a1a]/50" : "bg-gray-100/50"
        } font-montserrat text-base`}
      >
        <td className={`py-4 px-6 font-medium ${themeStyles.textSecondary}`}>
          {feature}
        </td>
        <td className="py-4 px-6 text-center">
          {renderCell(starter, "text-[#00F0FF]")}
        </td>
        <td className="py-4 px-6 text-center">
          {renderCell(growth, "text-[#B026FF]")}
        </td>
        <td className="py-4 px-6 text-center">
          {renderCell(pro, "text-[#FF2E9F]")}
        </td>
      </tr>
    );
  };
  if (!mounted) {
    return (
      <div className="min-h-screen bg-transparent flex items-center justify-center h-full w-full">
        <div className="w-5 h-5 border-2 border-t-transparent border-blue-600 rounded-full animate-spin" />
      </div>
    );
  }
  return (
    <div className={`min-h-screen ${themeStyles.textPrimary} bg-transparent`}>
      <BreadcrumbsDefault />
      <section className="py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center">
          <div
            className={`inline-flex items-center ${
              theme === "dark"
                ? "bg-blue-100/10 text-blue-400 border-blue-400/30"
                : "bg-blue-100 text-blue-600 border-blue-300"
            } border rounded-full px-4 py-1 mb-4`}
          >
            <Zap className="h-4 w-4 mr-1" />
            <span className="text-sm font-medium">
              Never Miss a Customer Comment
            </span>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold mb-6 bg-clip-text text-transparent bg-gradient-to-r from-[#00F0FF] to-[#FF2E9F]">
            Instagram Comment Automation
          </h1>
          <p
            className={`text-xl ${themeStyles.textSecondary} mb-8 max-w-2xl mx-auto font-montserrat`}
          >
            Reply instantly to every comment. No setup fees. Cancel anytime.
          </p>

          <div className="flex items-center justify-center gap-4 mb-12">
            <span
              className={`text-sm font-medium ${
                billingCycle === "monthly"
                  ? themeStyles.textPrimary
                  : themeStyles.textMuted
              }`}
            >
              Monthly
            </span>
            <Switch
              checked={billingCycle === "yearly"}
              onCheckedChange={(checked) =>
                setBillingCycle(checked ? "yearly" : "monthly")
              }
              className="data-[state=checked]:bg-gradient-to-r data-[state=checked]:from-[#00F0FF] data-[state=checked]:to-[#FF2E9F]"
            />
            <span
              className={`text-sm font-medium ${
                billingCycle === "yearly"
                  ? themeStyles.textPrimary
                  : themeStyles.textMuted
              }`}
            >
              Yearly
            </span>
            <div
              className={`${
                theme === "dark"
                  ? "bg-green-900/20 text-green-400 border-green-400/30"
                  : "bg-green-100 text-green-600 border-green-300"
              } text-xs border rounded-full px-3 py-1 md:ml-2`}
            >
              Save 16%
            </div>
          </div>
        </div>
      </section>

      <section className="px-4 sm:px-6 lg:px-8 pb-16">
        <div className=" flex flex-wrap items-center justify-center gap-5 md:gap-10 w-full max-w-6xl mx-auto">
          {/* Free Plan Card */}
          <div
            className={` relative mb-10 group rounded-lg backdrop-blur-sm border transition-all duration-300 ${themeStyles.cardBorder} ${themeStyles.cardBg} hover:border-[#FF2E9F] bg-transparent`}
          >
            <div className="absolute inset-0 bg-gradient-to-br opacity-0 group-hover:opacity-100 transition-opacity from-[#FF2E9F]/10 to-transparent"></div>
            <div className="relative z-10 h-full flex flex-col items-center justify-between p-6">
              <div className=" flex flex-col justify-between items-center md:items-start">
                <h3
                  className={`text-xl font-bold mb-2 ${themeStyles.textPrimary}`}
                >
                  Free
                </h3>
                <p
                  className={`text-center md:text-start ${themeStyles.textMuted} mb-6 font-montserrat text-lg`}
                >
                  Default plan for new users
                </p>
              </div>

              <div className="flex-[20%] flex items-center justify-center text-center mb-6 text-3xl font-bold text-[#FF2E9F]">
                ₹ 0
              </div>

              <ul className="flex-[30%] space-y-3 mb-8 font-montserrat text-base">
                {freePlanFeatures.map((feature, idx) => (
                  <li key={idx} className="flex items-start">
                    <Check className="h-5 w-5 mt-1 mr-3 text-[#FF2E9F]" />
                    <span className={themeStyles.textSecondary}>{feature}</span>
                  </li>
                ))}
              </ul>
              <Button
                variant="outline"
                onClick={() =>
                  router.push("https://app.rocketreplai.com/signin")
                }
                className="flex-[20%] w-full py-3 rounded-full font-medium hover:opacity-90 transition-opacity whitespace-nowrap bg-gradient-to-r from-[#FF2E9F]/80 to-[#FF2E9F] text-black"
              >
                Get Started
              </Button>
            </div>
          </div>

          {/* Single Pro Plan Card */}
          <div className=" ">
            {instagramPricingPlans.map((plan) => {
              return (
                <div
                  key={plan.id}
                  className={`relative group rounded-lg backdrop-blur-sm border  transition-all duration-300 ${
                    themeStyles.cardBg
                  } ${
                    plan.popular
                      ? "scale-105 z-10 border-[#00F0FF]/30 hover:border-[#00F0FF]"
                      : "border-[#00F0FF]/50 hover:border-[#00F0FF]"
                  } bg-transparent ${"ring-1 ring-[#00F0FF] ring-opacity-80"}`}
                >
                  {plan.popular && (
                    <div className="absolute -top-3 left-0 right-0 text-center">
                      <span className="bg-gradient-to-r from-[#00F0FF] to-[#00F0FF]/70 text-black text-sm font-bold py-1 px-4 rounded-full">
                        Most Popular
                      </span>
                    </div>
                  )}

                  <div
                    className={`absolute inset-0 bg-gradient-to-br opacity-0 group-hover:opacity-100 transition-opacity from-[#00F0FF]/10 to-transparent`}
                  ></div>
                  <div className="relative z-10 h-full flex flex-col items-center justify-between p-6">
                    <div className="flex justify-between items-start">
                      <h3
                        className={`text-xl font-bold mb-2 ${themeStyles.textPrimary}`}
                      >
                        {plan.name}
                      </h3>
                    </div>
                    <p
                      className={`${themeStyles.textMuted} mb-6 font-montserrat text-lg`}
                    >
                      {plan.description}
                    </p>
                    <div className="flex items-end mb-6">
                      <span className={`text-3xl font-bold text-[#00F0FF]`}>
                        ₹{" "}
                        {billingCycle === "monthly"
                          ? plan.monthlyPrice.toFixed(0)
                          : plan.yearlyPrice.toFixed(0)}
                      </span>
                      <span className={themeStyles.textMuted}>
                        /{billingCycle === "monthly" ? "month" : "year"}
                      </span>
                    </div>

                    <p className="text-center text-wrap text-green-400 my-2 font-medium font-montserrat text-base">
                      Two Months Free On Yearly Plan.
                    </p>
                    <ul className="space-y-3 mb-8">
                      {plan.features.map((feature, idx) => (
                        <li key={idx} className="flex items-start">
                          <Check
                            className={`h-5 w-5 mt-1 mr-3 text-[#00F0FF]`}
                          />
                          <span
                            className={`${themeStyles.textSecondary} font-montserrat text-base`}
                          >
                            {feature}
                          </span>
                        </li>
                      ))}
                    </ul>
                    <Button
                      variant="outline"
                      onClick={() =>
                        router.push("https://app.rocketreplai.com/signin")
                      }
                      className={`w-full py-3 rounded-full font-medium hover:opacity-90 transition-opacity whitespace-nowrap bg-gradient-to-r from-[#00F0FF]/80 to-[#00F0FF] text-black`}
                    >
                      Get Started
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>
      {/* Feature Comparison Section */}
      <section className="py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-4xl md:text-5xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-[#00F0FF] to-[#FF2E9F] mb-4">
              Free vs Pro Comparison
            </h2>
            <p
              className={`text-xl ${themeStyles.textSecondary} font-montserrat`}
            >
              Everything you get with each plan
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr
                  className={`border-b-2 ${themeStyles.cardBg} ${
                    theme === "dark" ? "border-[#333]" : "border-gray-300"
                  }`}
                >
                  <th
                    className={`text-left py-4 px-6 font-semibold ${themeStyles.textPrimary}`}
                  >
                    Features
                  </th>
                  <th className="text-center py-4 px-6 font-semibold text-[#FF2E9F]">
                    Free
                  </th>
                  <th className="text-center py-4 px-6 font-semibold text-[#00F0FF]">
                    Pro Unlimited
                  </th>
                </tr>
              </thead>
              <tbody
                className={`divide-y ${themeStyles.cardBg} ${
                  theme === "dark" ? "divide-[#333]" : "divide-gray-300"
                }`}
              >
                {comparisonFeatures.map((row, index) => (
                  <tr
                    key={index}
                    className={`hover:${
                      theme === "dark" ? "bg-[#1a1a1a]/50" : "bg-gray-100/50"
                    } font-montserrat text-base`}
                  >
                    <td
                      className={`py-4 px-6 font-medium ${themeStyles.textSecondary}`}
                    >
                      {row.feature}
                    </td>
                    <td className="py-4 px-6 text-center">
                      {row.free === "✓" ? (
                        <Check className="h-5 w-5 text-green-500 mx-auto" />
                      ) : row.free === "✗" ? (
                        <X className="h-5 w-5 text-red-500 mx-auto" />
                      ) : (
                        <span
                          className={`${themeStyles.textSecondary} font-medium`}
                        >
                          {row.free}
                        </span>
                      )}
                    </td>
                    <td className="py-4 px-6 text-center">
                      {row.pro === "✓" ? (
                        <Check className="h-5 w-5 text-green-500 mx-auto" />
                      ) : row.pro === "✗" ? (
                        <X className="h-5 w-5 text-red-500 mx-auto" />
                      ) : (
                        <span
                          className={`${themeStyles.textSecondary} font-medium`}
                        >
                          {row.pro}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </div>
  );
}
