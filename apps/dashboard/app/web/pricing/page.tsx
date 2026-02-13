"use client";

import { useState, useEffect, useMemo, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { SignedIn, SignedOut, useAuth } from "@clerk/nextjs";
import { useTheme } from "next-themes";
import {
  HeadsetIcon,
  AmbulanceIcon,
  BotIcon,
  GraduationCapIcon,
  ShoppingCartIcon,
  Building2Icon,
  Bot,
  Check,
  Zap,
  LucideIcon,
  CreditCard,
  Infinity as InfiniteIcon,
} from "lucide-react";

import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@rocketreplai/ui/components/radix/tabs";
import { Switch } from "@rocketreplai/ui/components/radix/switch";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@rocketreplai/ui/components/radix/card";
import { Button } from "@rocketreplai/ui/components/radix/button";
import { Checkout } from "@/components/web/Checkout";
import { Badge } from "@rocketreplai/ui/components/radix/badge";
import { BreadcrumbsDefault } from "@rocketreplai/ui/components/shared/breadcrumbs";
import {
  calculateCustomTokenPrice,
  productSubscriptionDetails,
  tokenPlans,
} from "@rocketreplai/shared";
import { getChatbots, getSubscriptions } from "@/lib/services/web-actions.api";

// Types
interface Subscription {
  chatbotType: string;
  clerkId: string;
  status: string;
  billingCycle: string;
}

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
type PlanType = "chatbot" | "tokens";

// Icon mapping with proper typing
const iconMapping: Record<string, LucideIcon> = {
  HeadsetIcon,
  AmbulanceIcon,
  BotIcon,
  Bot,
  GraduationCapIcon,
  ShoppingCartIcon,
  Building2Icon,
};

// Constants
const ALL_FEATURES = [
  "24/7 Availability",
  "Live Chat Interface",
  "Multi-language Support",
  "Dashboard Availability",
  "Automated Responses",
  "CRM Integration",
  "Advanced Analytics",
  "Custom Workflows",
  "Lead qualification",
  "Email Notifications",
  "Priority Support",
  "User Data Collection",
  "Personalized learning",
  "Interactive quizzes",
];

const PricingContent = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { userId, isLoaded } = useAuth();
  const { theme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // State
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [billingMode, setBillingMode] = useState<BillingMode>("monthly");
  const [activeTab, setActiveTab] = useState<PlanType>("chatbot");
  const [customTokens, setCustomTokens] = useState<number>(100000);
  const [showCustom, setShowCustom] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Add state for user chatbots to check if chatbot is already created
  const [userChatbots, setUserChatbots] = useState<any[]>([]);

  // Derived state
  const currentTheme = resolvedTheme || theme || "light";

  // Theme-based styles (exactly like the first component)
  const themeStyles = useMemo(() => {
    const isDark = currentTheme === "dark";
    return {
      textPrimary: isDark ? "text-white" : "text-gray-900",
      textSecondary: isDark ? "text-gray-300" : "text-gray-600",
      textMuted: isDark ? "text-gray-400" : "text-gray-500",
      containerBg: isDark ? "bg-transparent" : "bg-gray-50",
      cardBg: isDark ? "bg-transparent" : "bg-white/80",
      cardBorder: isDark ? "border-white/10" : "border-gray-200",
      ctaCardBg: isDark
        ? "bg-gradient-to-br from-[#0a0a0a] to-[#1a1a1a]/90"
        : "bg-gradient-to-br from-white to-gray-100/90",
      ctaCardBorder: isDark ? "border-white/10" : "border-gray-300",
      iconBg: isDark
        ? "bg-gradient-to-br from-white/10 to-white/5"
        : "bg-gradient-to-br from-gray-100 to-gray-200",
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
      tableHeaderBg: isDark
        ? "bg-gradient-to-r from-[#1a1a1a] to-[#2a0b45]"
        : "bg-gradient-to-r from-gray-100 to-gray-200",
      tableBorder: isDark ? "border-[#B026FF]/30" : "border-gray-300",
      tableRowHover: isDark ? "hover:bg-[#1a1a1a]/50" : "hover:bg-gray-100/50",
      saveBadgeBg: isDark
        ? "bg-green-900/20 text-green-400 border-green-400/30"
        : "bg-green-100 text-green-600 border-green-300",
      inputBg: isDark ? "bg-gray-900/50" : "bg-white",
      inputBorder: isDark ? "border-gray-700" : "border-gray-200",
    };
  }, [currentTheme]);

  // Color classes for features (like the first component)
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

  // Fetch subscriptions and user chatbots
  useEffect(() => {
    const fetchUserData = async () => {
      if (!isLoaded) return;

      try {
        setIsLoading(true);
        setError(null);

        if (!userId) {
          setSubscriptions([]);
          setUserChatbots([]);
          return;
        }

        // Fetch subscriptions
        const subscriptionsResponse = await getSubscriptions();

        if (!subscriptionsResponse || !Array.isArray(subscriptionsResponse)) {
          throw new Error("Invalid subscriptions response format");
        }

        const formattedSubscriptions: Subscription[] =
          subscriptionsResponse.map((sub: any) => ({
            chatbotType: sub.chatbotType || "",
            clerkId: sub.clerkId || "",
            status: sub.status || "inactive",
            billingCycle: sub.billingCycle || "monthly",
          }));

        setSubscriptions(formattedSubscriptions);

        // Fetch user chatbots to check if chatbot is already created
        try {
          const chatbotsResponse = await getChatbots();
          setUserChatbots(chatbotsResponse.chatbots || []);
        } catch (chatbotError) {
          console.warn("Failed to fetch user chatbots:", chatbotError);
          // Continue without chatbot data
        }
      } catch (err) {
        console.error("Error fetching user data:", err);
        setError("Failed to load subscription data. Please try again.");
        setSubscriptions([]);
        setUserChatbots([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchUserData();
  }, [userId, isLoaded]);

  if (!mounted) {
    return (
      <div className="min-h-screen bg-transparent flex items-center justify-center h-full w-full">
        <div className="w-5 h-5 border-2 border-t-transparent border-blue-600 rounded-full animate-spin" />
      </div>
    );
  }

  // Helper functions
  const getProductPrice = (product: Product) => {
    const price = billingMode === "monthly" ? product.mprice : product.yprice;
    const originalPrice =
      billingMode === "monthly" ? product.original / 12 : product.original;

    return {
      displayPrice: price,
      originalPrice,
      isYearly: billingMode === "yearly",
    };
  };

  const isProductSubscribed = (productId: string) => {
    return subscriptions.some(
      (sub) => sub.chatbotType === productId && sub.status === "active",
    );
  };

  const hasChatbotCreated = (productId: string) => {
    // Check if user has already created a chatbot of this type
    const existingChatbot = userChatbots.find(
      (chatbot: any) => chatbot.type === productId,
    );
    return !!existingChatbot;
  };

  const getCardStyles = (productId: string) => {
    const isActive = productId === activeProductId;
    const isDark = currentTheme === "dark";

    if (isActive) {
      return "scale-105 z-10 border-[#2d8246]/30 hover:border-[#2d8246] bg-[#34e468]/5";
    }

    return isDark
      ? "border-[#FF2E9F]/20 hover:border-[#FF2E9F]"
      : "border-gray-300 hover:border-[#FF2E9F]";
  };

  const getCardStylesForToken = (Id: string) => {
    const isActive = Id === activeProductId;
    const isDark = currentTheme === "dark";

    if (isActive) {
      return "scale-105 z-10 border-[#2d8246]/30 hover:border-[#2d8246] bg-[#34e468]/5";
    }

    return isDark
      ? "border-[#FF2E9F]/20 hover:border-[#FF2E9F]"
      : "border-gray-300 hover:border-[#FF2E9F]";
  };

  const getGradientBg = (productId: string) => {
    const isDark = currentTheme === "dark";
    const opacity = isDark ? "10" : "5";

    if (productId === "chatbot-lead-generation") {
      return `from-[#B026FF]/${opacity}`;
    }
    if (productId === "chatbot-education") {
      return `from-[#00F0FF]/${opacity}`;
    }
    return `from-[#FF2E9F]/${opacity}`;
  };

  const getGradientBgForToken = (Id: string) => {
    const isDark = currentTheme === "dark";
    const opacity = isDark ? "10" : "5";

    if (Id === "pro") {
      return `from-[#B026FF]/${opacity}`;
    }
    if (Id === "basic") {
      return `from-[#00F0FF]/${opacity}`;
    }
    return `from-[#FF2E9F]/${opacity}`;
  };

  // Loading state
  if (!isLoaded || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-t-transparent border-blue-600 rounded-full animate-spin mx-auto" />
          <p className={`mt-4 ${themeStyles.textPrimary}`}>
            Loading pricing information...
          </p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center max-w-md p-6 bg-red-50 dark:bg-red-900/20 rounded-lg">
          <p className="text-red-600 dark:text-red-400 font-medium">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  const activeProductId = searchParams.get("id");

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
          Choose between monthly chatbot subscriptions or one-time token
          purchases
        </p>

        {/* Tabs for Chatbot vs Token Plans */}
        <div className="mb-8">
          <Tabs
            defaultValue="chatbot"
            value={activeTab}
            onValueChange={(value) => setActiveTab(value as PlanType)}
            className="w-full"
          >
            <TabsList
              className={`grid grid-cols-2 w-full max-w-md mx-auto border-2 ${themeStyles.cardBorder} `}
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
                Chatbot &nbsp;
                <span className="hidden md:flex"> Subscriptions</span>
              </TabsTrigger>
              <TabsTrigger
                className="
    data-[state=active]:bg-blue-600
    data-[state=active]:text-white
    data-[state=active]:shadow
    transition-all
  "
                value="tokens"
              >
                Token &nbsp;<span className="hidden md:flex">Packs</span>
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
                  Save 16%
                </div>
              </div>
            </TabsContent>

            <TabsContent value="tokens" className="mt-6">
              <p className={`${themeStyles.textSecondary} font-montserrat`}>
                One-time purchase. Tokens never expire.
              </p>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </section>
  );

  // Free Tier Card
  const renderFreeTierCard = () => (
    <Card
      className={`mb-12 relative group h-full flex flex-col items-center justify-between rounded-lg backdrop-blur-sm border transition-all duration-300 p-5 ${themeStyles.cardBg} ${themeStyles.cardBorder} scale-105 z-10 border-[#2d8246]/30 hover:border-[#2d8246] hover:bg-[#34e468]/5`}
    >
      <div
        className={`absolute inset-0 bg-gradient-to-br opacity-0 group-hover:opacity-100 transition-opacity from-[#B026FF]/5 to-transparent`}
      />
      <CardContent className="p-8">
        <div className="flex flex-col md:flex-row items-center justify-between">
          <div className="mb-6 md:mb-0 md:mr-8">
            <h3
              className={`text-2xl font-bold ${themeStyles.textPrimary} mb-2`}
            >
              Free Tier
            </h3>
            <p
              className={`${themeStyles.textSecondary} mb-4 font-montserrat font-medium text-lg`}
            >
              Get started with 10,000 free tokens
            </p>
            <ul
              className={`space-y-2 font-montserrat ${themeStyles.textSecondary}`}
            >
              <li className="flex items-center">
                <Check className="h-5 w-5 text-green-500 mr-2" />
                <span>10,000 free tokens monthly</span>
              </li>
              <li className="flex items-center">
                <Check className="h-5 w-5 text-green-500 mr-2" />
                <span>Access to all chatbots</span>
              </li>
              <li className="flex items-center">
                <Check className="h-5 w-5 text-green-500 mr-2" />
                <span>Website scraping required</span>
              </li>
              <li className="flex items-center">
                <Check className="h-5 w-5 text-green-500 mr-2" />
                <span>Basic support</span>
              </li>
            </ul>
          </div>
          <div className="text-center">
            <div className="text-4xl font-bold text-green-600 mb-2">10,000</div>
            <div className={`${themeStyles.textMuted} mb-4`}>
              Free Tokens/Month
            </div>
            {!userId ? (
              <SignedOut>
                <Button
                  onClick={() => router.push("/sign-up")}
                  className=" bg-gradient-to-r from-green-500 to-emerald-600 hover:opacity-90 text-white relative"
                >
                  Get Started Free
                </Button>
              </SignedOut>
            ) : (
              <SignedIn>
                {!subscriptions || subscriptions.length === 0 ? (
                  <button
                    className="w-full py-2 rounded-full font-bold bg-gradient-to-r from-green-500 to-green-700 text-white cursor-not-allowed"
                    disabled
                  >
                    Subscribed
                  </button>
                ) : (
                  <Checkout
                    userId={userId}
                    productId="free-tier"
                    billingCycle="monthly"
                    amount={0}
                    planType="chatbot"
                  />
                )}
              </SignedIn>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );

  // Chatbot Pricing Cards
  const renderChatbotPricingCard = (product: Product) => {
    const Icon = iconMapping[product.icon];
    const { displayPrice, originalPrice, isYearly } = getProductPrice(product);
    const isSubscribed = isProductSubscribed(product.productId);
    const isMostPopular = product.productId === "chatbot-lead-generation";
    const hasCreated = hasChatbotCreated(product.productId);

    return (
      <div
        key={product.productId}
        className={`relative group h-full flex flex-col items-center justify-between rounded-lg backdrop-blur-sm border transition-all duration-300 p-5 ${
          themeStyles.cardBg
        } ${themeStyles.cardBorder} ${getCardStyles(product.productId)}`}
      >
        {/* Popular Badge */}
        {isMostPopular && (
          <div className="absolute -top-3 left-0 right-0 text-center">
            <span className="bg-gradient-to-r from-[#B026FF] to-[#FF2E9F] text-white text-sm font-bold py-1 px-4 rounded-full">
              Most Popular
            </span>
          </div>
        )}

        {/* Gradient Background */}
        <div
          className={`absolute inset-0 bg-gradient-to-br opacity-0 group-hover:opacity-100 transition-opacity ${getGradientBg(
            product.productId,
          )} to-transparent`}
        />

        <div className="flex flex-col items-center gap-3 w-full z-10">
          {Icon && (
            <div
              className={`h-12 w-12 rounded-full ${themeStyles.iconBg} flex items-center justify-center mb-6`}
            >
              <Icon className={`h-8 w-8 ${themeStyles.textPrimary}`} />
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
              ${originalPrice.toFixed(0)}
            </p>
            <p className="text-3xl font-bold text-[#B026FF]">
              ${displayPrice.toFixed(0)}
              <span className={`text-lg font-medium ${themeStyles.textMuted}`}>
                /{billingMode === "monthly" ? "mo" : "yr"}
              </span>
            </p>
          </div>

          {isYearly && (
            <p className="text-center text-green-400 mt-2 font-medium">
              Save ${(originalPrice - displayPrice).toFixed(0)} annually
            </p>
          )}

          <p
            className={`text-sm ${themeStyles.textMuted} mb-5 font-montserrat`}
          >
            Includes 1,000,000 tokens per{" "}
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
                    ? "bg-gradient-to-r from-[#00F0FF] to-[#B026FF] text-white"
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
          {!userId ? (
            <SignedOut>
              <button
                onClick={() => router.push("/sign-in")}
                className="w-full py-3 rounded-full font-bold bg-gradient-to-r from-[#00F0FF] to-[#B026FF] text-white hover:opacity-90 transition-opacity"
              >
                Get Started
              </button>
            </SignedOut>
          ) : (
            <SignedIn>
              {isSubscribed ? (
                <button
                  className="w-full py-2 rounded-full font-bold bg-gradient-to-r from-green-500 to-green-700 text-white cursor-not-allowed"
                  disabled
                >
                  Subscribed
                </button>
              ) : (
                <Checkout
                  userId={userId}
                  productId={product.productId}
                  billingCycle={billingMode}
                  amount={displayPrice}
                  planType="chatbot"
                  chatbotCreated={hasCreated}
                  tokens={1000000}
                />
              )}
            </SignedIn>
          )}
        </div>
      </div>
    );
  };

  // Token Pricing Cards
  const renderTokenPricingCard = (plan: any) => (
    <Card
      key={plan.id}
      className={`relative group h-full w-full flex flex-col items-center justify-between rounded-lg backdrop-blur-sm border transition-all duration-300  ${
        themeStyles.cardBg
      } ${themeStyles.cardBorder} ${getCardStylesForToken(plan.id)}`}
    >
      {/* Gradient Background */}
      <div
        className={`absolute inset-0 bg-gradient-to-br opacity-0 group-hover:opacity-100 transition-opacity ${getGradientBgForToken(
          plan.id,
        )} to-transparent`}
      />
      <CardHeader className="">
        <CardTitle
          className={`flex items-center justify-between ${themeStyles.textPrimary}`}
        >
          {plan.name}
          {plan.id === "pro" && (
            <Badge className={`${themeStyles.badgeBg} ml-2 border`}>
              Most Popular
            </Badge>
          )}
        </CardTitle>
        <CardDescription
          className={`font-montserrat text-center ${themeStyles.textSecondary}`}
        >
          {plan.tokens.toLocaleString()} tokens
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col flex-grow w-full">
        <div className="mb-4">
          <p
            className={`text-3xl font-bold  text-center ${themeStyles.textPrimary} text-[#a020eb]`}
          >
            ₹{plan.price.toLocaleString()}
          </p>
          <p
            className={`text-sm ${themeStyles.textMuted} text-center font-montserrat`}
          >
            ₹{plan.perTokenPrice.toFixed(4)} per token
          </p>
        </div>

        <ul
          className={`w-full space-y-2 mb-4 flex-grow font-montserrat ${themeStyles.textSecondary}`}
        >
          {plan.features.map((feature: string, idx: number) => (
            <li key={idx} className="flex items-center justify-start text-sm">
              <span
                className={`flex-shrink-0 w-5 h-5 mt-1 mr-2 rounded-full flex items-center justify-center bg-gradient-to-r from-[#00F0FF] to-[#B026FF] text-white`}
              >
                <Check className="w-3 h-3" />
              </span>
              {feature}
            </li>
          ))}
        </ul>

        <div className="w-full relative">
          {!userId ? (
            <SignedOut>
              <Button
                onClick={() => router.push("/sign-in")}
                className="w-full py-3 rounded-full font-bold bg-gradient-to-r from-[#00F0FF] to-[#B026FF] text-white hover:opacity-90 transition-opacity"
              >
                <CreditCard className="h-4 w-4 mr-2" />
                Get Started
              </Button>
            </SignedOut>
          ) : (
            <SignedIn>
              <Checkout
                userId={userId}
                productId={plan.id}
                billingCycle="one-time"
                amount={plan.price}
                planType="tokens"
                tokens={plan.tokens}
              />
            </SignedIn>
          )}
        </div>
      </CardContent>
    </Card>
  );

  // Custom Token Card
  const renderCustomTokenCard = () => (
    <Card className={`${themeStyles.cardBg} ${themeStyles.cardBorder}`}>
      <CardHeader>
        <CardTitle
          className={`flex items-center justify-between flex-wrap gap-2 ${themeStyles.textPrimary}`}
        >
          <div className="flex items-center">
            <InfiniteIcon className="h-5 w-5 mr-2" />
            Custom Token Pack
          </div>
          {showCustom && (
            <Badge className={`${themeStyles.badgeBg} border`}>Selected</Badge>
          )}
        </CardTitle>
        <CardDescription
          className={`font-montserrat ${themeStyles.textSecondary}`}
        >
          Choose your own token amount (Min: 10,000 tokens)
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          <div>
            <div className="flex items-center justify-between mb-2">
              <label
                className={`text-sm font-medium ${themeStyles.textPrimary}`}
              >
                Tokens: {customTokens.toLocaleString()}
              </label>
              <span className={`text-sm font-bold ${themeStyles.textPrimary}`}>
                ₹{calculateCustomTokenPrice(customTokens).toLocaleString()}
              </span>
            </div>

            <div className="space-y-4">
              <input
                type="range"
                min="10000"
                max="5000000"
                step="10000"
                value={customTokens}
                onChange={(e) => setCustomTokens(parseInt(e.target.value))}
                className={`w-full h-2 ${
                  currentTheme === "dark" ? "bg-gray-700" : "bg-gray-200"
                } rounded-lg appearance-none cursor-pointer`}
              />

              <div className="grid grid-cols-3 lg:grid-cols-5 gap-2">
                {[50000, 100000, 250000, 500000, 1000000].map((amount) => (
                  <Button
                    key={amount}
                    variant="outline"
                    size="sm"
                    onClick={() => setCustomTokens(amount)}
                    className={`${
                      customTokens === amount
                        ? "border-blue-500"
                        : themeStyles.cardBorder
                    }`}
                  >
                    {amount >= 1000000
                      ? `${amount / 1000000}M`
                      : amount >= 1000
                        ? `${amount / 1000}K`
                        : amount}
                  </Button>
                ))}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div
              className={`text-center p-4 ${
                currentTheme === "dark" ? "bg-gray-900" : "bg-gray-50"
              } rounded-lg`}
            >
              <p className={`text-sm ${themeStyles.textMuted} font-montserrat`}>
                Price per token
              </p>
              <p
                className={`text-sm sm:text-base md:text-xl md:font-bold ${themeStyles.textPrimary}`}
              >
                ₹
                {(
                  calculateCustomTokenPrice(customTokens) / customTokens
                ).toFixed(4)}
              </p>
            </div>
            <div
              className={`text-center p-4 ${
                currentTheme === "dark" ? "bg-gray-900" : "bg-gray-50"
              } rounded-lg`}
            >
              <p className={`text-sm ${themeStyles.textMuted} font-montserrat`}>
                Total tokens
              </p>
              <p
                className={`text-sm sm:text-base md:text-xl md:font-bold ${themeStyles.textPrimary}`}
              >
                {customTokens.toLocaleString()}
              </p>
            </div>
          </div>

          <ul
            className={`space-y-2 font-montserrat ${themeStyles.textSecondary}`}
          >
            {[
              "Custom token amount",
              "No expiration",
              "Use across all chatbots",
              "Bulk discounts available",
            ].map((feature, idx) => (
              <li key={idx} className="flex items-center text-sm">
                <Check className="h-4 w-4 text-green-500 mr-2" />
                {feature}
              </li>
            ))}
          </ul>

          <div className="flex gap-4 flex-wrap">
            <SignedOut>
              <Button
                variant={showCustom ? "default" : "outline"}
                className={`flex-1 rounded-full ${
                  showCustom ? "" : themeStyles.cardBorder
                }`}
                onClick={() => router.push("/sign-in")}
              >
                {showCustom ? "Custom Pack Selected" : "Select Custom Pack"}
              </Button>
            </SignedOut>
            <SignedIn>
              <Button
                variant={showCustom ? "default" : "outline"}
                className={`flex-1 rounded-full ${
                  showCustom ? "" : themeStyles.cardBorder
                }`}
                onClick={() => setShowCustom(true)}
              >
                {showCustom ? "Custom Pack Selected" : "Select Custom Pack"}
              </Button>
            </SignedIn>

            {showCustom && userId && (
              <SignedIn>
                <Checkout
                  userId={userId}
                  productId="custom-tokens"
                  billingCycle="one-time"
                  amount={calculateCustomTokenPrice(customTokens)}
                  planType="tokens"
                  tokens={customTokens}
                />
              </SignedIn>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );

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
                  Token Packs
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
                  tokens: "50K - 1M+",
                  subscription: "1M/month",
                },
                {
                  feature: "Expiration",
                  free: "30 days",
                  tokens: "Never",
                  subscription: "Monthly/Yearly",
                },
                {
                  feature: "All Chatbots Access",
                  free: "✓",
                  tokens: "✓",
                  subscription: "✓",
                },
                {
                  feature: "Website Scraping",
                  free: "Required",
                  tokens: "Optional",
                  subscription: "Included",
                },
                {
                  feature: "Priority Support",
                  free: "",
                  tokens: "✓",
                  subscription: "✓",
                },
                {
                  feature: "Advanced Analytics",
                  free: "",
                  tokens: "✓",
                  subscription: "✓",
                },
                {
                  feature: "Custom Integrations",
                  free: "",
                  tokens: "",
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
                      {row.tokens}
                    </span>
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
      className={`flex flex-col items-center min-h-screen relative z-10 max-w-7xl md:px-4 mx-auto ${themeStyles.containerBg} ${themeStyles.textPrimary}`}
    >
      <BreadcrumbsDefault />

      <div className="w-full px-4 py-8 relative z-10">
        {renderHeader()}
        {renderFreeTierCard()}

        {/* Dynamic Content based on Tab */}
        <Tabs
          value={activeTab}
          onValueChange={(value) => setActiveTab(value as PlanType)}
          className="w-full"
        >
          <div className={`hidden`}>
            <TabsList>
              <TabsTrigger value="chatbot">Chatbots</TabsTrigger>
              <TabsTrigger value="tokens">Tokens</TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="chatbot" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
              {Object.values(productSubscriptionDetails).map(
                renderChatbotPricingCard,
              )}
            </div>
          </TabsContent>

          <TabsContent value="tokens" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 w-full">
              {Object.values(tokenPlans).map(renderTokenPricingCard)}
            </div>

            <div className="max-w-4xl mx-auto">{renderCustomTokenCard()}</div>
          </TabsContent>
        </Tabs>

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
