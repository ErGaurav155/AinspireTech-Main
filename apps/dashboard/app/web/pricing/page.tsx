"use client";

import { useState, useEffect, useMemo, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { SignedIn, SignedOut, useAuth } from "@clerk/nextjs";
import Link from "next/link";
import {
  Bot,
  Check,
  Zap,
  CreditCard,
  Infinity,
  Sparkles,
  Crown,
  Shield,
  TrendingUp,
  Calendar,
  X,
  Loader2,
  GraduationCap,
  Target,
  MessageCircle,
  Coins,
  BadgeCheck,
  RefreshCw,
  AlertTriangle,
} from "lucide-react";

import {
  Badge,
  Button,
  Orbs,
  Spinner,
  Switch,
  Tabs,
  TabsContent,
  useThemeStyles,
} from "@rocketreplai/ui";
import {
  calculateCustomTokenPrice,
  productSubscriptionDetails,
  tokenPlans,
} from "@rocketreplai/shared";
import { getChatbots, getSubscriptions } from "@/lib/services/web-actions.api";
import { useApi } from "@/lib/useApi";
import { Checkout } from "@/components/web/Checkout";

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

// Icon mapping
const iconMapping: Record<string, any> = {
  BotIcon: Bot,
  GraduationCapIcon: GraduationCap,
  Target: Target,
  MessageCircle: MessageCircle,
};

const PricingContent = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { userId, isLoaded } = useAuth();
  const { apiRequest } = useApi();
  const { styles, isDark } = useThemeStyles();

  // State
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [billingMode, setBillingMode] = useState<BillingMode>("monthly");
  const [activeTab, setActiveTab] = useState<PlanType>("chatbot");
  const [customTokens, setCustomTokens] = useState<number>(100000);
  const [showCustom, setShowCustom] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [userChatbots, setUserChatbots] = useState<any[]>([]);
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
          setIsLoading(false);
          return;
        }

        // Fetch subscriptions
        const subscriptionsResponse = await getSubscriptions(apiRequest);

        if (!subscriptionsResponse || !Array.isArray(subscriptionsResponse)) {
          throw new Error("Invalid subscriptions response format");
        }

        const formattedSubscriptions: Subscription[] = subscriptionsResponse
          .filter((sub: any) => sub.status === "active")
          .map((sub: any) => ({
            chatbotType: sub.chatbotType || "",
            clerkId: sub.clerkId || "",
            status: sub.status || "inactive",
            billingCycle: sub.billingCycle || "monthly",
          }));

        setSubscriptions(formattedSubscriptions);

        // Fetch user chatbots
        try {
          const chatbotsResponse = await getChatbots(apiRequest);
          setUserChatbots(chatbotsResponse.chatbots || []);
        } catch (chatbotError) {
          console.warn("Failed to fetch user chatbots:", chatbotError);
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
  }, [userId, isLoaded, apiRequest]);

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
    const existingChatbot = userChatbots.find(
      (chatbot: any) => chatbot.type === productId,
    );
    return !!existingChatbot;
  };

  const getCardStyles = (productId: string) => {
    const isActive = productId === activeProductId;
    if (isActive) {
      return isDark
        ? "scale-105 z-10 border-pink-500 ring-2 ring-pink-500/30"
        : "scale-105 z-10 border-pink-500 ring-2 ring-pink-200";
    }
    return "";
  };

  const activeProductId = searchParams.get("id");
  const TAB_LABELS: Record<
    PlanType,
    { label: string; label2: string; icon: React.ElementType }
  > = {
    chatbot: {
      label: "chatbot",
      label2: "Subscriptions",
      icon: Bot,
    },
    tokens: {
      label: `Tokens`,
      label2: `Packs`,
      icon: Coins,
    },
  };
  // Loading state
  if (!isLoaded || isLoading) {
    return <Spinner label="Loading pricing information..." />;
  }

  // Error state
  if (error) {
    return (
      <div
        className={`min-h-screen flex items-center justify-center ${isDark ? "bg-[#0F0F11]" : "bg-[#F8F9FA]"}`}
      >
        <div
          className={`text-center max-w-md p-6 rounded-2xl ${isDark ? "bg-red-500/10 border border-red-500/20" : "bg-red-50 border border-red-200"}`}
        >
          <AlertTriangle
            className={`h-12 w-12 mx-auto mb-4 ${isDark ? "text-red-400" : "text-red-500"}`}
          />
          <p
            className={`font-medium mb-4 ${isDark ? "text-red-400" : "text-red-600"}`}
          >
            {error}
          </p>
          <button
            onClick={() => window.location.reload()}
            className={`px-4 py-2 bg-gradient-to-r from-pink-500 to-rose-500 text-white rounded-xl hover:opacity-90 transition-opacity`}
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      {isDark && <Orbs />}
      <div className={styles.container}>
        {/* Header Section */}
        <section className="text-center mb-12">
          <div
            className={`inline-flex items-center bg-pink-500/10 border border-pink-500/20 rounded-full px-4 py-1 mb-4 ${isDark ? "" : "bg-pink-50 border-pink-200"}`}
          >
            <Zap
              className={`h-4 w-4 mr-1 ${isDark ? "text-pink-400" : "text-pink-600"}`}
            />
            <span
              className={`text-sm font-medium ${isDark ? "text-pink-400" : "text-pink-600"}`}
            >
              AI-Powered Automation Solutions
            </span>
          </div>

          <h1
            className={`text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-pink-400 to-pink-200 bg-clip-text text-transparent ${isDark ? "" : "from-pink-500 to-pink-100"}`}
          >
            Transform Your Business with AI
          </h1>

          <p className={`text-lg max-w-2xl mx-auto ${styles.text.secondary}`}>
            Choose between monthly chatbot subscriptions or one-time token
            purchases
          </p>

          {/* Tabs */}
          <Tabs
            value={activeTab}
            onValueChange={(value) => setActiveTab(value as PlanType)}
            className={`mt-8`}
          >
            <div className={` flex items-center justify-center`}>
              <nav
                className={`flex gap-6 overflow-x-auto ${styles.innerCard} rounded-xl p-2 `}
              >
                {(Object.keys(TAB_LABELS) as PlanType[]).map((tab) => {
                  const Icon = TAB_LABELS[tab].icon;
                  return (
                    <button
                      key={tab}
                      onClick={() => setActiveTab(tab)}
                      className={`flex items-center gap-2 pb-1 px-2 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${
                        activeTab === tab
                          ? styles.tab.active
                          : styles.tab.inactive
                      }`}
                    >
                      <Icon
                        className={`h-4 w-4 ${
                          activeTab === tab ? "text-blue-500" : "text-gray-400"
                        }`}
                      />
                      {TAB_LABELS[tab].label}
                      <span className="hidden md:flex">
                        {TAB_LABELS[tab].label2}
                      </span>
                    </button>
                  );
                })}
              </nav>
            </div>
            {/* Free Tier Card - Outside tabs but after Tabs */}
            <div className="mt-8">
              <div className={`${styles.card} p-6 max-w-5xl mx-auto`}>
                <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-3">
                      <div
                        className={`w-10 h-10 rounded-xl ${styles.icon.green} flex items-center justify-center`}
                      >
                        <Sparkles
                          className={`h-5 w-5 ${isDark ? "text-green-400" : "text-green-600"}`}
                        />
                      </div>
                      <h3
                        className={`text-2xl font-bold ${styles.text.primary}`}
                      >
                        Free Tier
                      </h3>
                    </div>
                    <p className={`${styles.text.secondary} mb-4`}>
                      Get started with 10,000 free tokens monthly
                    </p>
                    <ul className="space-y-2">
                      <li className="flex items-center gap-2">
                        <div className="w-5 h-5 rounded-full bg-green-500/20 flex items-center justify-center">
                          <Check
                            className={`h-3 w-3 ${isDark ? "text-green-400" : "text-green-600"}`}
                          />
                        </div>
                        <span className={styles.text.secondary}>
                          10,000 free tokens monthly
                        </span>
                      </li>
                      <li className="flex items-center gap-2">
                        <div className="w-5 h-5 rounded-full bg-green-500/20 flex items-center justify-center">
                          <Check
                            className={`h-3 w-3 ${isDark ? "text-green-400" : "text-green-600"}`}
                          />
                        </div>
                        <span className={styles.text.secondary}>
                          Access to all chatbots
                        </span>
                      </li>
                      <li className="flex items-center gap-2">
                        <div className="w-5 h-5 rounded-full bg-green-500/20 flex items-center justify-center">
                          <Check
                            className={`h-3 w-3 ${isDark ? "text-green-400" : "text-green-600"}`}
                          />
                        </div>
                        <span className={styles.text.secondary}>
                          Basic support
                        </span>
                      </li>
                    </ul>
                  </div>
                  <div className="text-center md:text-right">
                    <div
                      className={`text-4xl font-bold ${styles.statusText} mb-2`}
                    >
                      10,000
                    </div>
                    <div className={`text-sm ${styles.text.muted} mb-4`}>
                      Free Tokens/Month
                    </div>
                    <SignedOut>
                      <Button
                        onClick={() => router.push("/sign-up")}
                        className="bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white rounded-xl px-8"
                      >
                        Get Started Free
                      </Button>
                    </SignedOut>
                    <SignedIn>
                      <Button
                        disabled
                        className="bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white rounded-xl px-8 opacity-50 cursor-not-allowed"
                      >
                        Current Plan
                      </Button>
                    </SignedIn>
                  </div>
                </div>
              </div>
            </div>

            {/* Chatbot Plans Tab Content */}
            <TabsContent value="chatbot" className="mt-8">
              <div className={`flex items-center justify-center gap-4 mb-8`}>
                <span
                  className={`text-sm font-medium ${billingMode === "monthly" ? styles.text.primary : styles.text.muted}`}
                >
                  Monthly
                </span>
                <Switch
                  checked={billingMode === "yearly"}
                  onCheckedChange={(checked) =>
                    setBillingMode(checked ? "yearly" : "monthly")
                  }
                  className={
                    isDark
                      ? "data-[state=checked]:bg-gradient-to-r data-[state=checked]:from-pink-500 data-[state=checked]:to-rose-500"
                      : "data-[state=checked]:bg-gradient-to-r data-[state=checked]:from-pink-500 data-[state=checked]:to-rose-500"
                  }
                />
                <span
                  className={`text-sm font-medium ${billingMode === "yearly" ? styles.text.primary : styles.text.muted}`}
                >
                  Yearly
                </span>
                <span
                  className={`inline-flex px-2.5 py-1 rounded-lg text-xs font-medium ${styles.badge.green} ml-2`}
                >
                  Save 16%
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
                {Object.values(productSubscriptionDetails).map((product) => {
                  const Icon = iconMapping[product.icon] || Bot;
                  const { displayPrice, originalPrice, isYearly } =
                    getProductPrice(product);
                  const isSubscribed = isProductSubscribed(product.productId);
                  const hasCreated = hasChatbotCreated(product.productId);
                  const isMostPopular =
                    product.productId === "chatbot-lead-generation";

                  const gradient =
                    product.productId === "chatbot-lead-generation"
                      ? "from-purple-500 to-pink-500"
                      : "from-cyan-500 to-blue-500";

                  // Build card classes
                  let cardClasses = `${styles.card} p-6 relative group rounded-2xl border transition-all duration-300 overflow-visible`;
                  if (isSubscribed) {
                    cardClasses += isDark
                      ? " ring-2 ring-green-500/30"
                      : " ring-2 ring-green-200";
                  } else if (isMostPopular) {
                    cardClasses += isDark
                      ? " ring-2 ring-pink-500/30"
                      : " ring-2 ring-pink-200";
                  }
                  if (product.productId === activeProductId) {
                    cardClasses += isDark
                      ? " scale-105 z-10 border-pink-500 ring-2 ring-pink-500/30"
                      : " scale-105 z-10 border-pink-500 ring-2 ring-pink-200";
                  }

                  return (
                    <div key={product.productId} className={cardClasses}>
                      {(isMostPopular || isSubscribed) && (
                        <div className="absolute -top-3 left-0 right-0 flex justify-center">
                          <Badge
                            className={`${
                              isSubscribed
                                ? "bg-gradient-to-r from-green-500 to-emerald-500 text-white border-0 px-4 py-1"
                                : "bg-gradient-to-r from-pink-500 to-rose-500 text-white border-0 px-4 py-1"
                            }`}
                          >
                            {isSubscribed ? (
                              <>
                                <BadgeCheck className="h-3 w-3 mr-1" />
                                Current Plan
                              </>
                            ) : (
                              <>
                                <Sparkles className="h-3 w-3 mr-1" />
                                Most Popular
                              </>
                            )}
                          </Badge>
                        </div>
                      )}

                      <div className="relative z-10">
                        <div className="flex items-center gap-3 mb-4">
                          <div
                            className={`w-12 h-12 rounded-xl bg-gradient-to-br ${gradient} flex items-center justify-center ${isDark ? "opacity-90" : ""}`}
                          >
                            <Icon className="h-6 w-6 text-white" />
                          </div>
                          <h3
                            className={`text-xl font-bold ${styles.text.primary}`}
                          >
                            {product.name}
                          </h3>
                        </div>

                        <div className="mb-4">
                          <div className="flex items-center gap-2">
                            <span
                              className={`text-3xl font-bold ${styles.text.primary}`}
                            >
                              ${displayPrice}
                            </span>
                            <span
                              className={`text-sm line-through ${styles.text.muted}`}
                            >
                              ${originalPrice.toFixed(0)}
                            </span>
                          </div>
                          <p className={`text-sm ${styles.text.muted}`}>
                            per {billingMode === "monthly" ? "month" : "year"}
                          </p>
                        </div>

                        <p
                          className={`text-sm ${styles.badge.green} inline-flex items-center gap-1 px-3 py-2 mb-4`}
                        >
                          <Calendar className="h-4 w-4" />
                          Includes 1,000,000 tokens per{" "}
                          {billingMode === "monthly" ? "month" : "year"}
                        </p>

                        <ul className="space-y-2 mb-6">
                          {product.inclusions
                            .slice(0, 6)
                            .map((inclusion, idx) => (
                              <li key={idx} className="flex items-start gap-2">
                                <div
                                  className={`w-5 h-5 rounded-full ${
                                    inclusion.isIncluded
                                      ? isDark
                                        ? "bg-pink-500/20"
                                        : "bg-pink-100"
                                      : isDark
                                        ? "bg-white/[0.06]"
                                        : "bg-gray-100"
                                  } flex items-center justify-center flex-shrink-0 mt-0.5`}
                                >
                                  {inclusion.isIncluded ? (
                                    <Check
                                      className={`h-3 w-3 ${isDark ? "text-pink-400" : "text-pink-600"}`}
                                    />
                                  ) : (
                                    <X
                                      className={`h-3 w-3 ${isDark ? "text-white/40" : "text-gray-400"}`}
                                    />
                                  )}
                                </div>
                                <span
                                  className={`text-sm ${inclusion.isIncluded ? styles.text.secondary : styles.text.muted}`}
                                >
                                  {inclusion.label}
                                </span>
                              </li>
                            ))}
                          {product.inclusions.length > 6 && (
                            <li className={`text-xs pl-7 ${styles.text.muted}`}>
                              +{product.inclusions.length - 6} more features
                            </li>
                          )}
                        </ul>

                        <SignedOut>
                          <Button
                            onClick={() => router.push("/sign-in")}
                            className="w-full bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600 text-white rounded-xl"
                          >
                            Get Started
                          </Button>
                        </SignedOut>
                        <SignedIn>
                          {isSubscribed ? (
                            <Button
                              disabled
                              className="w-full bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-xl opacity-70 cursor-not-allowed"
                            >
                              <BadgeCheck className="h-4 w-4 mr-2" />
                              Current Plan
                            </Button>
                          ) : (
                            <Checkout
                              userId={userId!}
                              productId={product.productId}
                              billingCycle={billingMode}
                              amount={displayPrice}
                              planType="chatbot"
                              chatbotCreated={hasCreated}
                              tokens={1000000}
                            />
                          )}
                        </SignedIn>
                      </div>
                    </div>
                  );
                })}
              </div>
            </TabsContent>

            {/* Token Plans Tab Content */}
            <TabsContent value="tokens" className="mt-8">
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {Object.values(tokenPlans).map((plan) => {
                  const gradient =
                    plan.id === "basic"
                      ? "from-cyan-500 to-blue-500"
                      : plan.id === "pro"
                        ? "from-purple-500 to-pink-500"
                        : "from-amber-500 to-orange-500";

                  const isPro = plan.id === "pro";

                  let cardClasses = `${styles.card} p-6 relative rounded-2xl border transition-all duration-300 flex flex-col justify-between overflow-visible`;
                  if (isPro) {
                    cardClasses += isDark
                      ? " ring-2 ring-pink-500/30"
                      : " ring-2 ring-pink-200";
                  }

                  return (
                    <div key={plan.id} className={cardClasses}>
                      {isPro && (
                        <div className="absolute -top-3 left-0 right-0 flex justify-center">
                          <Badge className="bg-gradient-to-r from-pink-500 to-rose-500 text-white border-0 px-4 py-1">
                            <Sparkles className="h-3 w-3 mr-1" />
                            Most Popular
                          </Badge>
                        </div>
                      )}

                      <div>
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-2">
                            <div
                              className={`w-10 h-10 rounded-xl bg-gradient-to-br ${gradient} flex items-center justify-center ${isDark ? "opacity-90" : ""}`}
                            >
                              <Coins className="h-5 w-5 text-white" />
                            </div>
                            <h3
                              className={`text-lg font-bold ${styles.text.primary}`}
                            >
                              {plan.name}
                            </h3>
                          </div>
                        </div>
                        <p className={`text-sm ${styles.text.secondary} mt-1`}>
                          {plan.tokens.toLocaleString()} tokens
                        </p>
                        <div className="mb-4">
                          <p
                            className={`text-3xl font-bold ${styles.text.primary}`}
                          >
                            ₹{plan.price.toLocaleString()}
                          </p>
                          <p className={`text-xs ${styles.text.muted}`}>
                            ₹{plan.perTokenPrice.toFixed(4)} per token
                          </p>
                        </div>

                        <ul className="space-y-2 mb-6">
                          {plan.features.map((feature, idx) => (
                            <li key={idx} className="flex items-start gap-2">
                              <div className="w-5 h-5 rounded-full bg-pink-500/20 flex items-center justify-center flex-shrink-0">
                                <Check
                                  className={`h-3 w-3 ${isDark ? "text-pink-400" : "text-pink-600"}`}
                                />
                              </div>
                              <span className={styles.text.secondary}>
                                {feature}
                              </span>
                            </li>
                          ))}
                        </ul>
                      </div>

                      <SignedOut>
                        <Button
                          onClick={() => router.push("/sign-in")}
                          className="w-full bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600 text-white rounded-xl"
                        >
                          Get Started
                        </Button>
                      </SignedOut>
                      <SignedIn>
                        <Checkout
                          userId={userId!}
                          productId={plan.id}
                          billingCycle="one-time"
                          amount={plan.price}
                          planType="tokens"
                          tokens={plan.tokens}
                        />
                      </SignedIn>
                    </div>
                  );
                })}
              </div>

              {/* Custom Token Pack */}
              <div className={`${styles.card} p-6 mt-6`}>
                <div className="mb-4">
                  <div className="flex items-center gap-2">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                      <Infinity className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <h3
                        className={`text-lg font-bold ${styles.text.primary}`}
                      >
                        Custom Token Pack
                      </h3>
                      <p className={`text-sm ${styles.text.secondary}`}>
                        Choose your own token amount (Min: 10,000 tokens)
                      </p>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span
                        className={`text-sm font-medium ${styles.text.primary}`}
                      >
                        Tokens: {customTokens.toLocaleString()}
                      </span>
                      <span
                        className={`text-lg font-bold ${styles.text.primary}`}
                      >
                        ₹
                        {calculateCustomTokenPrice(
                          customTokens,
                        ).toLocaleString()}
                      </span>
                    </div>

                    <input
                      type="range"
                      min="10000"
                      max="5000000"
                      step="10000"
                      value={customTokens}
                      onChange={(e) =>
                        setCustomTokens(parseInt(e.target.value))
                      }
                      className={`w-full h-2 ${isDark ? "bg-white/10" : "bg-gray-200"} rounded-lg appearance-none cursor-pointer accent-pink-500`}
                    />

                    <div className="grid grid-cols-3 md:grid-cols-5 gap-2 mt-4">
                      {[50000, 100000, 250000, 500000, 1000000].map(
                        (amount) => (
                          <button
                            key={amount}
                            onClick={() => setCustomTokens(amount)}
                            className={`px-3 py-1.5 rounded-lg text-xs transition-colors ${
                              customTokens === amount
                                ? isDark
                                  ? "border border-pink-500 bg-pink-500/20 text-pink-400"
                                  : "border border-pink-500 bg-pink-50 text-pink-600"
                                : isDark
                                  ? "border border-white/[0.08] text-white/40 hover:border-pink-500/50"
                                  : "border border-gray-200 text-gray-600 hover:border-pink-300"
                            }`}
                          >
                            {amount >= 1000000
                              ? `${amount / 1000000}M`
                              : amount >= 1000
                                ? `${amount / 1000}K`
                                : amount}
                          </button>
                        ),
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className={`${styles.innerCard} p-4 text-center`}>
                      <p className={`text-xs mb-1 ${styles.text.muted}`}>
                        Price per token
                      </p>
                      <p className={`text-lg font-bold ${styles.text.primary}`}>
                        ₹
                        {(
                          calculateCustomTokenPrice(customTokens) / customTokens
                        ).toFixed(4)}
                      </p>
                    </div>
                    <div className={`${styles.innerCard} p-4 text-center`}>
                      <p className={`text-xs mb-1 ${styles.text.muted}`}>
                        Total tokens
                      </p>
                      <p className={`text-lg font-bold ${styles.text.primary}`}>
                        {customTokens.toLocaleString()}
                      </p>
                    </div>
                  </div>

                  <ul className="space-y-2">
                    {[
                      "Custom token amount",
                      "No expiration",
                      "Use across all chatbots",
                      "Bulk discounts available",
                    ].map((feature, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <div className="w-5 h-5 rounded-full bg-pink-500/20 flex items-center justify-center flex-shrink-0">
                          <Check
                            className={`h-3 w-3 ${isDark ? "text-pink-400" : "text-pink-600"}`}
                          />
                        </div>
                        <span className={styles.text.secondary}>{feature}</span>
                      </li>
                    ))}
                  </ul>

                  <SignedOut>
                    <Button
                      onClick={() => router.push("/sign-in")}
                      className="w-full bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600 text-white rounded-xl"
                    >
                      Sign in to Purchase
                    </Button>
                  </SignedOut>
                  <SignedIn>
                    <Checkout
                      userId={userId!}
                      productId="custom-tokens"
                      billingCycle="one-time"
                      amount={calculateCustomTokenPrice(customTokens)}
                      planType="tokens"
                      tokens={customTokens}
                    />
                  </SignedIn>
                </div>
              </div>
            </TabsContent>
          </Tabs>

          {/* Comparison Table - Outside Tabs */}
          <section className="mt-16">
            <div className="text-center mb-8">
              <h2
                className={`text-3xl font-bold bg-gradient-to-r from-pink-400 to-rose-400 bg-clip-text text-transparent mb-2 ${isDark ? "" : "from-pink-500 to-rose-500"}`}
              >
                Plan Comparison
              </h2>
              <p className={styles.text.secondary}>
                Find the perfect plan for your needs
              </p>
            </div>

            <div className={`${styles.card} overflow-hidden`}>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className={isDark ? "bg-white/[0.04]" : "bg-gray-50"}>
                    <tr>
                      <th className="text-left py-4 px-6 font-semibold text-gray-700 dark:text-white">
                        Features
                      </th>
                      <th
                        className={`text-center py-4 px-6 font-semibold ${isDark ? "text-green-400" : "text-green-600"}`}
                      >
                        Free Tier
                      </th>
                      <th
                        className={`text-center py-4 px-6 font-semibold ${isDark ? "text-purple-400" : "text-purple-600"}`}
                      >
                        Token Packs
                      </th>
                      <th
                        className={`text-center py-4 px-6 font-semibold ${isDark ? "text-pink-400" : "text-pink-600"}`}
                      >
                        Chatbot Subscriptions
                      </th>
                    </tr>
                  </thead>
                  <tbody
                    className={
                      isDark
                        ? "divide-y divide-white/[0.06]"
                        : "divide-y divide-gray-100"
                    }
                  >
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
                      <tr
                        key={index}
                        className={`hover:bg-gray-50 dark:hover:bg-white/[0.03] transition-colors`}
                      >
                        <td
                          className={`py-4 px-6 font-medium ${styles.text.primary}`}
                        >
                          {row.feature}
                        </td>
                        <td className="py-4 px-6 text-center">
                          {row.free === "✓" ? (
                            <Check
                              className={`h-5 w-5 ${isDark ? "text-green-400" : "text-green-500"} mx-auto`}
                            />
                          ) : row.free === "" ? (
                            <X
                              className={`h-5 w-5 ${isDark ? "text-white/20" : "text-gray-300"} mx-auto`}
                            />
                          ) : (
                            <span className={styles.text.secondary}>
                              {row.free}
                            </span>
                          )}
                        </td>
                        <td className="py-4 px-6 text-center">
                          {row.tokens === "✓" ? (
                            <Check
                              className={`h-5 w-5 ${isDark ? "text-green-400" : "text-green-500"} mx-auto`}
                            />
                          ) : row.tokens === "" ? (
                            <X
                              className={`h-5 w-5 ${isDark ? "text-white/20" : "text-gray-300"} mx-auto`}
                            />
                          ) : (
                            <span className={styles.text.secondary}>
                              {row.tokens}
                            </span>
                          )}
                        </td>
                        <td className="py-4 px-6 text-center">
                          {row.subscription === "✓" ? (
                            <Check
                              className={`h-5 w-5 ${isDark ? "text-green-400" : "text-green-500"} mx-auto`}
                            />
                          ) : row.subscription === "" ? (
                            <X
                              className={`h-5 w-5 ${isDark ? "text-white/20" : "text-gray-300"} mx-auto`}
                            />
                          ) : (
                            <span className={styles.text.secondary}>
                              {row.subscription}
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Trust Badges */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-8">
              <div className={`${styles.innerCard} p-4 text-center`}>
                <Shield
                  className={`h-8 w-8 mx-auto mb-2 ${isDark ? "text-pink-400" : "text-pink-500"}`}
                />
                <h4 className={`font-semibold mb-1 ${styles.text.primary}`}>
                  Secure Payments
                </h4>
                <p className={`text-xs ${styles.text.muted}`}>
                  256-bit encrypted transactions
                </p>
              </div>
              <div className={`${styles.innerCard} p-4 text-center`}>
                <TrendingUp
                  className={`h-8 w-8 mx-auto mb-2 ${isDark ? "text-pink-400" : "text-pink-500"}`}
                />
                <h4 className={`font-semibold mb-1 ${styles.text.primary}`}>
                  No Hidden Fees
                </h4>
                <p className={`text-xs ${styles.text.muted}`}>
                  Cancel anytime, no questions asked
                </p>
              </div>
              <div className={`${styles.innerCard} p-4 text-center`}>
                <CreditCard
                  className={`h-8 w-8 mx-auto mb-2 ${isDark ? "text-pink-400" : "text-pink-500"}`}
                />
                <h4 className={`font-semibold mb-1 ${styles.text.primary}`}>
                  Multiple Payment Modes
                </h4>
                <p className={`text-xs ${styles.text.muted}`}>
                  Cards, UPI, NetBanking, Wallets
                </p>
              </div>
            </div>
          </section>
        </section>
      </div>
    </div>
  );
};

export default function Pricing() {
  return (
    <Suspense fallback={<Spinner label="Loading pricing information..." />}>
      <PricingContent />
    </Suspense>
  );
}
