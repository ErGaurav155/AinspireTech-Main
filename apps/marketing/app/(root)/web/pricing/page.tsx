"use client";

import { useState, useEffect, useMemo, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { useTheme } from "next-themes";
import {
  HeadsetIcon,
  AmbulanceIcon,
  BotIcon,
  ShoppingCartIcon,
  Building2Icon,
  Bot,
  Check,
  Zap,
  LucideIcon,
  CreditCard,
} from "lucide-react";

import { productSubscriptionDetails } from "@rocketreplai/shared";
import {
  Badge,
  BreadcrumbsDefault,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Switch,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@rocketreplai/ui";
import { SocialWhatsAppPackagePromo } from "@/components/shared/SocialWhatsAppPackagePromo";

// Components

// Types
interface Product {
  productId: string;
  name: string;
  icon: string;
  mprice: number;
  yprice: number;
  original: number;
  inclusions: Array<{
    label: string;
    isIncluded: boolean;
  }>;
}

type BillingMode = "monthly" | "yearly";
type PlanType = "chatbot";
const MONTHLY_FIRST_MONTH_PRICE = 499;

// Icon mapping with proper typing
const iconMapping: Record<string, LucideIcon> = {
  HeadsetIcon,
  AmbulanceIcon,
  BotIcon,
  Bot,
  ShoppingCartIcon,
  Building2Icon,
};

const PricingContent = () => {
  const searchParams = useSearchParams();
  const { theme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // State
  const [billingMode, setBillingMode] = useState<BillingMode>("monthly");
  const [activeTab, setActiveTab] = useState<PlanType>("chatbot");

  // Derived state
  const currentTheme = resolvedTheme || theme || "light";

  // Theme-based styles
  const themeStyles = useMemo(() => {
    const isDark = currentTheme === "dark";
    return {
      textPrimary: isDark ? "text-white" : "text-gray-900",
      textSecondary: isDark ? "text-gray-300" : "text-gray-600",
      textMuted: isDark ? "text-gray-400" : "text-gray-500",
      containerBg: "bg-transparent",
      cardBg: isDark ? "bg-white/[0.04]" : "bg-white",
      cardBorder: isDark ? "border-white/10" : "border-slate-200",
      ctaCardBg: isDark
        ? "bg-gradient-to-br from-[#0a0a0a] to-[#1a1a1a]/90"
        : "bg-gradient-to-br from-white to-gray-100/90",
      ctaCardBorder: isDark ? "border-white/10" : "border-gray-300",
      iconBg: isDark ? "bg-blue-500/10" : "bg-blue-50",
      outlineButtonBorder: isDark
        ? "border-[#B026FF]/30"
        : "border-[#B026FF]/50",
      outlineButtonText: isDark ? "text-[#B026FF]" : "text-[#B026FF]",
      outlineButtonHover: isDark
        ? "hover:bg-[#B026FF]/10"
        : "hover:bg-[#B026FF]/10",
      badgeBg: isDark
        ? "bg-blue-100/10 text-blue-400 border-blue-400/30"
        : "bg-blue-100 text-blue-600 border-blue-300",
      tableHeaderBg: isDark ? "bg-white/[0.06]" : "bg-slate-50",
      tableBorder: isDark ? "border-white/10" : "border-slate-200",
      tableRowHover: isDark ? "hover:bg-white/[0.04]" : "hover:bg-blue-50/60",
      saveBadgeBg: isDark
        ? "bg-green-900/20 text-green-400 border-green-400/30"
        : "bg-green-100 text-green-600 border-green-300",
      inputBg: isDark ? "bg-gray-900/50" : "bg-white",
      inputBorder: isDark ? "border-gray-700" : "border-gray-200",
    };
  }, [currentTheme]);

  // Color classes for features
  const colorClasses = {
    cyan:
      currentTheme === "dark"
        ? "from-[#00F0FF]/10 to-[#00F0FF]/5 border-[#00F0FF]/20 hover:border-[#00F0FF]/40"
        : "from-[#00F0FF]/20 to-[#00F0FF]/10 border-[#00F0FF]/30 hover:border-[#00F0FF]/60",
    purple:
      currentTheme === "dark"
        ? "from-[#B026FF]/20 to-[#B026FF]/5 border-[#B026FF]/20 hover:border-[#B026FF]/40"
        : "from-[#B026FF]/20 to-[#B026FF]/10 border-[#B026FF]/30 hover:border-[#B026FF]/60",
    pink:
      currentTheme === "dark"
        ? "from-[#FF2E9F]/20 to-[#FF2E9F]/5 border-[#FF2E9F]/20 hover:border-[#FF2E9F]/40"
        : "from-[#FF2E9F]/20 to-[#FF2E9F]/10 border-[#FF2E9F]/30 hover:border-[#FF2E9F]/60",
  };

  const iconColors = {
    cyan: "text-[#00F0FF]",
    purple: "text-[#B026FF]",
    pink: "text-[#FF2E9F]",
  };

  if (!mounted) {
    return (
      <div className="min-h-screen bg-transparent flex items-center justify-center h-full w-full">
        <div className="w-5 h-5 border-2 border-t-transparent border-blue-600 rounded-full animate-spin" />
      </div>
    );
  }

  // Helper functions
  const getProductPrice = (product: Product) => {
    const price =
      billingMode === "monthly" ? product.mprice : product.yprice / 12;
    const originalPrice =
      billingMode === "monthly" ? product.original / 12 : product.original / 12;

    return {
      displayPrice: price,
      originalPrice,
      isYearly: billingMode === "yearly",
    };
  };

  const getCardStyles = (productId: string) => {
    const isDark = currentTheme === "dark";
    return isDark
      ? "border-white/10 hover:border-blue-400/40"
      : "border-slate-200 hover:border-blue-300";
  };

  const getGradientBg = (productId: string) => {
    const isDark = currentTheme === "dark";
    const opacity = isDark ? "10" : "5";

    if (productId === "chatbot-lead-generation") {
      return `from-[#B026FF]/${opacity}`;
    }
    return `from-[#FF2E9F]/${opacity}`;
  };

  const activeProductId = searchParams.get("id");

  // Handle Get Started/Start Automating click
  const handleStartAutomation = () => {
    // Redirect to external sign-in page
    window.location.href = "https://app.rocketreplai.com/sign-in";
  };

  // Render functions
  const renderHeader = () => (
    <section className="py-16 px-4 sm:px-6 lg:px-8 backdrop-blur-sm">
      <div className="max-w-4xl mx-auto text-center">
        <div
          className={`inline-flex items-center ${themeStyles.badgeBg} border rounded-full px-4 py-1 mb-4`}
        >
          <Zap className="h-4 w-4 mr-1" />
          <span className="text-sm font-medium">
            AI-Powered Automation Solutions
          </span>
        </div>

        <h1 className="text-4xl md:text-5xl font-bold mb-6 bg-clip-text text-transparent bg-gradient-to-r from-[#00F0FF] to-[#FF2E9F]">
          Transform Your Business with AI
        </h1>

        <p
          className={`text-xl ${themeStyles.textSecondary} font-montserrat mb-8 max-w-2xl mx-auto`}
        >
          Start with 10,000 free tokens on account creation, then upgrade to
          chatbot subscriptions for higher usage.
        </p>

        {/* Chatbot subscription settings */}
        <div className="mb-8">
          <Tabs
            defaultValue="chatbot"
            value={activeTab}
            onValueChange={(value) => setActiveTab(value as PlanType)}
            className="w-full"
          >
            <TabsList
              className={`grid grid-cols-1 w-full max-w-md mx-auto border-2 ${themeStyles.cardBorder} `}
            >
              <TabsTrigger
                className="
    data-[state=active]:bg-blue-600
    data-[state=active]:text-white
    data-[state=active]:shadow
    transition-all
  "
                value="chatbot"
              >
                Chatbot Subscriptions
              </TabsTrigger>
            </TabsList>

            <TabsContent value="chatbot" className="mt-6">
              <div className="flex items-center justify-center gap-4">
                <span
                  className={`text-sm font-medium ${
                    billingMode === "monthly"
                      ? themeStyles.textPrimary
                      : themeStyles.textMuted
                  }`}
                >
                  Monthly
                </span>
                <Switch
                  checked={billingMode === "yearly"}
                  onCheckedChange={(checked) =>
                    setBillingMode(checked ? "yearly" : "monthly")
                  }
                  className="data-[state=checked]:bg-gradient-to-r data-[state=checked]:from-[#00F0FF] data-[state=checked]:to-[#FF2E9F]"
                />
                <span
                  className={`text-sm font-medium ${
                    billingMode === "yearly"
                      ? themeStyles.textPrimary
                      : themeStyles.textMuted
                  }`}
                >
                  Yearly
                </span>
                <div
                  className={`${themeStyles.saveBadgeBg} text-nowrap text-xs border rounded-full px-3 py-1 md:ml-2`}
                >
                  Save 10%
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </section>
  );

  // Free Tier Card
  const renderFreeTierCard = () => (
    <Card
      className={`relative group h-full overflow-hidden rounded-3xl border p-0 shadow-sm backdrop-blur-sm transition-all duration-300 ${themeStyles.cardBg} ${themeStyles.cardBorder} hover:-translate-y-1 hover:border-emerald-400/60 hover:shadow-2xl hover:shadow-emerald-950/10`}
    >
      <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-emerald-400 via-teal-400 to-cyan-400" />
      <div className="relative border-b border-emerald-200/70 bg-gradient-to-br from-emerald-50 via-teal-50/80 to-cyan-50 px-6 pb-7 pt-8 dark:border-emerald-300/15 dark:from-emerald-500/15 dark:via-teal-500/10 dark:to-cyan-500/10">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-500 text-white shadow-lg shadow-emerald-500/20">
              <Bot className="h-6 w-6" />
            </span>
            <div>
              <span className="inline-flex rounded-full border border-emerald-300 bg-white/80 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider text-emerald-700 dark:border-emerald-300/25 dark:bg-white/10 dark:text-emerald-200">
                No card required
              </span>
              <h3 className={`mt-2 text-2xl font-black ${themeStyles.textPrimary}`}>
                Free
              </h3>
            </div>
          </div>
          <div className="text-right">
            <p className="text-4xl font-black text-emerald-600 dark:text-emerald-300">₹0</p>
            <p className={`text-xs font-semibold ${themeStyles.textMuted}`}>per month</p>
          </div>
        </div>
        <div className="mt-6 rounded-2xl border border-emerald-200 bg-white/75 p-4 dark:border-emerald-300/15 dark:bg-black/10">
          <div className="flex items-end justify-between gap-3">
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-emerald-700 dark:text-emerald-200">Monthly AI allowance</p>
              <p className={`mt-1 text-sm ${themeStyles.textSecondary}`}>Enough to build and test your first customer workflow.</p>
            </div>
            <p className="shrink-0 text-2xl font-black text-emerald-600 dark:text-emerald-300">10,000</p>
          </div>
        </div>
      </div>

      <CardContent className="flex h-full flex-col p-6">
        <p className={`text-sm font-semibold ${themeStyles.textSecondary}`}>
          Launch one lead-generation chatbot and upgrade only when your usage grows.
        </p>
        <ul className={`mt-6 flex-grow space-y-4 font-montserrat ${themeStyles.textSecondary}`}>
          {[
            "10,000 AI tokens refilled monthly",
            "One lead-generation website chatbot",
            "Answers based on your website or business information",
            "Lead and customer-detail capture",
            "Basic conversation and usage visibility",
          ].map((feature) => (
            <li key={feature} className="flex items-start gap-3">
              <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-white">
                <Check className="h-3 w-3" />
              </span>
              <span className="text-sm leading-6">{feature}</span>
            </li>
          ))}
        </ul>
        <Button
          onClick={handleStartAutomation}
          className="relative mt-7 w-full rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 py-3 font-bold text-white shadow-lg shadow-emerald-500/15 hover:opacity-90"
        >
          Start free
        </Button>
        <p className={`mt-3 text-center text-xs ${themeStyles.textMuted}`}>
          Set up now. Upgrade later without rebuilding your chatbot.
        </p>
      </CardContent>
    </Card>
  );

  // Chatbot Pricing Cards
  const renderChatbotPricingCard = (product: Product) => {
    const Icon = iconMapping[product.icon];
    const { displayPrice, originalPrice, isYearly } = getProductPrice(product);
    const shownPrice =
      billingMode === "monthly" ? MONTHLY_FIRST_MONTH_PRICE : displayPrice;
    const isMostPopular = product.productId === "chatbot-lead-generation";

    return (
      <div
        key={product.productId}
        className={`relative group h-full flex flex-col items-center justify-between rounded-2xl backdrop-blur-sm border shadow-sm transition-all duration-300 p-5 hover:-translate-y-1 hover:shadow-xl hover:shadow-blue-950/10 ${
          themeStyles.cardBg
        } ${themeStyles.cardBorder} ${getCardStyles(product.productId)}`}
      >
        {/* Popular Badge */}
        {isMostPopular && (
          <div className="absolute -top-3 left-0 right-0 text-center">
            <span className="bg-blue-700 text-white text-sm font-bold py-1 px-4 rounded-full shadow-sm shadow-blue-700/20">
              Most Popular
            </span>
          </div>
        )}

        {/* Gradient Background */}
        <div className="absolute inset-x-0 top-0 h-1 bg-blue-700 opacity-0 group-hover:opacity-100 transition-opacity" />

        <div className="flex flex-col items-center gap-3 w-full z-10">
          {Icon && (
            <div
              className={`h-12 w-12 rounded-full ${themeStyles.iconBg} flex items-center justify-center mb-6`}
            >
              <Icon className="h-8 w-8 text-blue-700 dark:text-blue-200" />
            </div>
          )}

          <h3 className={`text-2xl font-bold ${themeStyles.textPrimary}`}>
            {product.name}
          </h3>
        </div>

        <div className="w-full text-center z-10">
          <div className="flex items-center py-5 justify-center gap-3">
            <p
              className={`text-xl font-bold ${themeStyles.textMuted} line-through`}
            >
              ₹{originalPrice.toFixed(0)}
            </p>
            <p className="text-3xl font-bold text-blue-700 dark:text-blue-300">
              ₹{shownPrice.toFixed(0)}
              <span className={`text-lg font-medium ${themeStyles.textMuted}`}>
                /{billingMode === "monthly" ? "mo" : "yr"}
              </span>
            </p>
          </div>

          {billingMode === "monthly" && (
            <p className="text-center text-gray-500 mt-2 font-medium">
              First month ₹499, then ₹{displayPrice.toFixed(0)}/month
            </p>
          )}

          {isYearly && (
            <p className="text-center text-green-400 mt-2 font-medium">
              Save ₹{(originalPrice - displayPrice).toFixed(0)} annually every
              month
            </p>
          )}

          <p
            className={`text-sm ${themeStyles.textMuted} mb-5 font-montserrat`}
          >
            Includes 2,000,000 tokens per{" "}
            {billingMode === "monthly" ? "month" : "year"}
          </p>
        </div>

        <ul className="w-full space-y-4 z-10 flex-grow">
          {product.inclusions.map((inclusion, index) => (
            <li
              key={index}
              className={`flex items-start gap-3 ${
                inclusion.isIncluded
                  ? themeStyles.textPrimary
                  : themeStyles.textMuted
              }`}
            >
              <span
                className={`flex-shrink-0 w-5 h-5 mt-1 rounded-full flex items-center justify-center ${
                  inclusion.isIncluded
                    ? "bg-blue-700 text-white"
                    : currentTheme === "dark"
                      ? "bg-gray-700"
                      : "bg-gray-400"
                }`}
              >
                {inclusion.isIncluded && <Check className="w-3 h-3" />}
              </span>
              <span className="flex-1 font-montserrat text-sm">
                {inclusion.label}
              </span>
            </li>
          ))}
        </ul>

        <div className="w-full mt-3 z-10">
          <Button
            onClick={handleStartAutomation}
            className="w-full py-3 rounded-xl font-bold bg-blue-700 text-white hover:bg-blue-800 transition-colors"
          >
            Start Automating
          </Button>
        </div>
      </div>
    );
  };

  const renderComparisonTable = () => (
    <section className="py-16 px-4 sm:px-6 lg:px-8">
      <div className="mx-auto">
        <div className="text-center mb-12">
          <h2 className={`text-3xl font-bold ${themeStyles.textPrimary} mb-4`}>
            Plan Comparison
          </h2>
          <p className={`text-xl ${themeStyles.textSecondary}`}>
            Find the perfect plan for your needs
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className={themeStyles.tableHeaderBg}>
                <th
                  className={`text-left py-4 px-6 font-semibold ${themeStyles.textPrimary} border-b ${themeStyles.tableBorder}`}
                >
                  Features
                </th>
                <th
                  className={`text-center py-4 px-6 font-semibold ${themeStyles.textPrimary} border-b ${themeStyles.tableBorder}`}
                >
                  Free Tier
                </th>
                <th
                  className={`text-center py-4 px-6 font-semibold ${themeStyles.textPrimary} border-b ${themeStyles.tableBorder}`}
                >
                  Chatbot Subscriptions
                </th>
              </tr>
            </thead>
            <tbody className={`divide-y ${themeStyles.tableBorder}`}>
              {[
                {
                  feature: "Tokens Included",
                  free: "10,000/month",
                  subscription: "2M/month",
                },
                {
                  feature: "Expiration",
                  free: "30 days",
                  subscription: "Monthly/Yearly",
                },
                {
                  feature: "All Chatbots Access",
                  free: "✓",
                  subscription: "✓",
                },
                {
                  feature: "Website Scraping",
                  free: "Required",
                  subscription: "Included",
                },
                {
                  feature: "Priority Support",
                  free: "",
                  subscription: "✓",
                },
                {
                  feature: "Advanced Analytics",
                  free: "",
                  subscription: "✓",
                },
                {
                  feature: "Custom Integrations",
                  free: "",
                  subscription: "✓",
                },
              ].map((row, index) => (
                <tr key={index} className={themeStyles.tableRowHover}>
                  <td
                    className={`py-4 px-6 font-medium ${themeStyles.textSecondary}`}
                  >
                    {row.feature}
                  </td>
                  <td className="py-4 px-6 text-center">
                    <span className={themeStyles.textPrimary}>{row.free}</span>
                  </td>
                  <td className="py-4 px-6 text-center">
                    <span className={themeStyles.textPrimary}>
                      {row.subscription}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );

  return (
    <div
      className={` min-h-screen relative z-10 max-w-7xl md:px-4 mx-auto ${themeStyles.containerBg} ${themeStyles.textPrimary}`}
    >
      <BreadcrumbsDefault />

      <div className="w-full px-4 py-8 relative z-10">
        {renderHeader()}

        {/* Dynamic Content based on Tab */}
        <Tabs
          value={activeTab}
          onValueChange={(value) => setActiveTab(value as PlanType)}
          className="w-full"
        >
          <TabsContent value="chatbot" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2  gap-8 max-w-6xl mx-auto">
              {renderFreeTierCard()}
              {Object.values(productSubscriptionDetails).map(
                renderChatbotPricingCard,
              )}
            </div>
          </TabsContent>
        </Tabs>

        <SocialWhatsAppPackagePromo className="mt-12" />

        {renderComparisonTable()}
      </div>
    </div>
  );
};

// Main component with Suspense boundary
export default function Pricing() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-transparent flex items-center justify-center h-full w-full">
          <div className="w-5 h-5 border-2 border-t-transparent border-blue-600 rounded-full animate-spin" />
        </div>
      }
    >
      <PricingContent />
    </Suspense>
  );
}
