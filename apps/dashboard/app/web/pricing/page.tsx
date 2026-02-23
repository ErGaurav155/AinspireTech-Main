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
import { Badge } from "@rocketreplai/ui/components/radix/badge";
import { Checkout } from "@/components/web/Checkout";
import { BreadcrumbsDefault } from "@rocketreplai/ui/components/shared/breadcrumbs";
import {
  calculateCustomTokenPrice,
  productSubscriptionDetails,
  tokenPlans,
} from "@rocketreplai/shared";
import { getChatbots, getSubscriptions } from "@/lib/services/web-actions.api";
import { useApi } from "@/lib/useApi";

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

  // State
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [billingMode, setBillingMode] = useState<BillingMode>("monthly");
  const [activeTab, setActiveTab] = useState<PlanType>("chatbot");
  const [customTokens, setCustomTokens] = useState<number>(100000);
  const [showCustom, setShowCustom] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [userChatbots, setUserChatbots] = useState<any[]>([]);

  // Theme-based styles (matching Instagram pricing)
  const themeStyles = {
    containerBg: "bg-[#F8F9FC]",
    textPrimary: "text-gray-900",
    textSecondary: "text-gray-500",
    textMuted: "text-gray-400",
    cardBg: "bg-white",
    cardBorder: "border-gray-100",
    cardBorderHover: "hover:border-pink-300",
    badgeBg: "bg-pink-50 text-pink-600 border-pink-200",
    saveBadgeBg: "bg-green-100 text-green-600 border-green-200",
    iconBg: "bg-gray-100",
    tableHeaderBg: "bg-gray-50",
    tableBorder: "border-gray-200",
    tableRowHover: "hover:bg-gray-50",
    inputBg: "bg-gray-50",
    inputBorder: "border-gray-200",
    inputText: "text-gray-900",
    gradientPrimary: "from-pink-500 to-rose-500",
    gradientSecondary: "from-purple-500 to-pink-500",
    gradientGold: "from-amber-500 to-orange-500",
    gradientCyan: "from-cyan-500 to-blue-500",
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
      return "scale-105 z-10 border-pink-500 ring-2 ring-pink-200";
    }
    return "border-gray-100 hover:border-pink-300";
  };

  const activeProductId = searchParams.get("id");

  // Loading state
  if (!isLoaded || isLoading) {
    return (
      <div className="min-h-screen bg-[#F8F9FA] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-3 border-pink-200 border-t-pink-500 rounded-full animate-spin" />
          <p className="text-sm text-gray-400">
            Loading pricing information...
          </p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen bg-[#F8F9FA] flex items-center justify-center">
        <div className="text-center max-w-md p-6 bg-red-50 rounded-2xl">
          <p className="text-red-600 font-medium">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 px-4 py-2 bg-gradient-to-r from-pink-500 to-rose-500 text-white rounded-xl hover:opacity-90 transition-opacity"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${themeStyles.containerBg}`}>
      <div className="max-w-7xl mx-auto px-4 md:px-6 py-8">
        {/* Header Section */}
        <section className="text-center mb-12">
          <div className="inline-flex items-center bg-pink-50 border border-pink-200 rounded-full px-4 py-1 mb-4">
            <Zap className="h-4 w-4 text-pink-500 mr-1" />
            <span className="text-sm font-medium text-pink-600">
              AI-Powered Automation Solutions
            </span>
          </div>

          <h1 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-pink-500 to-pink-100 bg-clip-text text-transparent">
            Transform Your Business with AI
          </h1>

          <p className="text-lg text-gray-500 mb-6 max-w-2xl mx-auto">
            Choose between monthly chatbot subscriptions or one-time token
            purchases
          </p>

          {/* Tabs */}
          <Tabs
            value={activeTab}
            onValueChange={(value) => setActiveTab(value as PlanType)}
          >
            <TabsList className="bg-gray-100 p-1 rounded-xl inline-flex">
              <TabsTrigger
                value="chatbot"
                className="flex items-center gap-2 px-6 py-2.5 data-[state=active]:bg-white data-[state=active]:shadow-sm"
              >
                <Bot className="h-4 w-4" />
                Chatbot <span className="hidden md:flex">Subscriptions</span>
              </TabsTrigger>
              <TabsTrigger
                value="tokens"
                className="flex items-center gap-2 px-6 py-2.5 data-[state=active]:bg-white data-[state=active]:shadow-sm"
              >
                <Coins className="h-4 w-4" />
                Token <span className="hidden md:flex">Packs</span>
              </TabsTrigger>
            </TabsList>

            {/* Free Tier Card - Outside tabs but after Tabs */}
            <div className="mt-8">
              <Card
                className={`${themeStyles.cardBg} border ${themeStyles.cardBorder} rounded-2xl p-6 hover:border-pink-300 transition-all max-w-5xl mx-auto`}
              >
                <CardContent className="p-0">
                  <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-3">
                        <div className="w-10 h-10 rounded-xl bg-green-100 flex items-center justify-center">
                          <Sparkles className="h-5 w-5 text-green-600" />
                        </div>
                        <h3 className="text-2xl font-bold text-gray-800">
                          Free Tier
                        </h3>
                      </div>
                      <p className="text-gray-500 mb-4">
                        Get started with 10,000 free tokens monthly
                      </p>
                      <ul className="space-y-2">
                        <li className="flex items-center gap-2 text-sm text-gray-600">
                          <div className="w-5 h-5 rounded-full bg-green-100 flex items-center justify-center">
                            <Check className="h-3 w-3 text-green-600" />
                          </div>
                          10,000 free tokens monthly
                        </li>
                        <li className="flex items-center gap-2 text-sm text-gray-600">
                          <div className="w-5 h-5 rounded-full bg-green-100 flex items-center justify-center">
                            <Check className="h-3 w-3 text-green-600" />
                          </div>
                          Access to all chatbots
                        </li>
                        <li className="flex items-center gap-2 text-sm text-gray-600">
                          <div className="w-5 h-5 rounded-full bg-green-100 flex items-center justify-center">
                            <Check className="h-3 w-3 text-green-600" />
                          </div>
                          Basic support
                        </li>
                      </ul>
                    </div>
                    <div className="text-center md:text-right">
                      <div className="text-4xl font-bold text-green-600 mb-2">
                        10,000
                      </div>
                      <div className="text-sm text-gray-400 mb-4">
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
                          className="bg-gradient-to-r from-gray-400 to-gray-300 rounded-xl px-8 opacity-70  text-gray-800 cursor-not-allowed"
                        >
                          Current Plan
                        </Button>
                      </SignedIn>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Chatbot Plans Tab Content */}
            <TabsContent value="chatbot" className="mt-8">
              <div className="flex items-center justify-center gap-4 mb-8">
                <span
                  className={`text-sm font-medium ${billingMode === "monthly" ? "text-gray-900" : "text-gray-400"}`}
                >
                  Monthly
                </span>
                <Switch
                  checked={billingMode === "yearly"}
                  onCheckedChange={(checked) =>
                    setBillingMode(checked ? "yearly" : "monthly")
                  }
                  className="data-[state=checked]:bg-gradient-to-r data-[state=checked]:from-pink-500 data-[state=checked]:to-rose-500"
                />
                <span
                  className={`text-sm font-medium ${billingMode === "yearly" ? "text-gray-900" : "text-gray-400"}`}
                >
                  Yearly
                </span>
                <Badge className="bg-green-100 text-green-600 border-green-200 ml-2">
                  Save 16%
                </Badge>
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

                  return (
                    <div
                      key={product.productId}
                      className={`relative group rounded-2xl border transition-all duration-300 ${themeStyles.cardBg} ${themeStyles.cardBorder} ${getCardStyles(product.productId)} ${isMostPopular ? "ring-2 ring-pink-200" : ""} p-6`}
                    >
                      {isMostPopular && !isSubscribed && (
                        <div className="absolute -top-3 left-0 right-0 flex justify-center">
                          <Badge className="bg-gradient-to-r from-pink-500 to-rose-500 text-white border-0 px-4 py-1">
                            <Sparkles className="h-3 w-3 mr-1" />
                            Most Popular
                          </Badge>
                        </div>
                      )}

                      {isSubscribed && (
                        <div className="absolute -top-3 left-0 right-0 flex justify-center">
                          <Badge className="bg-gradient-to-r from-green-500 to-emerald-500 text-white border-0 px-4 py-1">
                            <BadgeCheck className="h-3 w-3 mr-1" />
                            Current Plan
                          </Badge>
                        </div>
                      )}

                      <div className="relative z-10">
                        <div className="flex items-center gap-3 mb-4">
                          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-pink-500 to-rose-500 flex items-center justify-center">
                            <Icon className="h-6 w-6 text-white" />
                          </div>
                          <h3 className="text-xl font-bold text-gray-800">
                            {product.name}
                          </h3>
                        </div>

                        <div className="mb-4">
                          <div className="flex items-center gap-2">
                            <span className="text-3xl font-bold text-gray-800">
                              ${displayPrice}
                            </span>
                            <span className="text-sm text-gray-400 line-through">
                              ${originalPrice.toFixed(0)}
                            </span>
                          </div>
                          <p className="text-sm text-gray-400">
                            per {billingMode === "monthly" ? "month" : "year"}
                          </p>
                        </div>

                        <p className="text-sm text-green-600 bg-green-50 border border-green-200 rounded-lg px-3 py-2 mb-4">
                          <Calendar className="h-4 w-4 inline mr-1" />
                          Includes 1,000,000 tokens per{" "}
                          {billingMode === "monthly" ? "month" : "year"}
                        </p>

                        <ul className="space-y-2 mb-6">
                          {product.inclusions
                            .slice(0, 6)
                            .map((inclusion, idx) => (
                              <li key={idx} className="flex items-start gap-2">
                                <div
                                  className={`w-5 h-5 rounded-full ${inclusion.isIncluded ? "bg-pink-100" : "bg-gray-100"} flex items-center justify-center flex-shrink-0 mt-0.5`}
                                >
                                  {inclusion.isIncluded ? (
                                    <Check className="h-3 w-3 text-pink-600" />
                                  ) : (
                                    <X className="h-3 w-3 text-gray-400" />
                                  )}
                                </div>
                                <span
                                  className={`text-sm ${inclusion.isIncluded ? "text-gray-700" : "text-gray-400"}`}
                                >
                                  {inclusion.label}
                                </span>
                              </li>
                            ))}
                          {product.inclusions.length > 6 && (
                            <li className="text-xs text-gray-400 pl-7">
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
                {Object.values(tokenPlans).map((plan) => (
                  <Card
                    key={plan.id}
                    className={`${themeStyles.cardBg} border ${themeStyles.cardBorder} rounded-2xl p-6 hover:border-pink-300 transition-all relative ${plan.id === "pro" ? "ring-2 ring-pink-200" : ""} flex flex-col justify-between`}
                  >
                    {plan.id === "pro" && (
                      <div className="absolute -top-3 left-0 right-0 flex justify-center">
                        <Badge className="bg-gradient-to-r from-pink-500 to-rose-500 text-white border-0 px-4 py-1">
                          <Sparkles className="h-3 w-3 mr-1" />
                          Most Popular
                        </Badge>
                      </div>
                    )}

                    <CardContent className="p-0 flex flex-col justify-start">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-2">
                          <div
                            className={`w-10 h-10 rounded-xl bg-gradient-to-br ${
                              plan.id === "basic"
                                ? "from-cyan-500 to-blue-500"
                                : plan.id === "pro"
                                  ? "from-purple-500 to-pink-500"
                                  : "from-amber-500 to-orange-500"
                            } flex items-center justify-center`}
                          >
                            <Coins className="h-5 w-5 text-white" />
                          </div>
                          <CardTitle className="text-lg font-bold text-gray-800">
                            {plan.name}
                          </CardTitle>
                        </div>
                      </div>
                      <CardDescription className="text-sm text-gray-400 mt-1">
                        {plan.tokens.toLocaleString()} tokens
                      </CardDescription>
                      <div className="mb-4">
                        <p className="text-3xl font-bold text-gray-800">
                          ₹{plan.price.toLocaleString()}
                        </p>
                        <p className="text-xs text-gray-400">
                          ₹{plan.perTokenPrice.toFixed(4)} per token
                        </p>
                      </div>

                      <ul className="space-y-2 mb-6">
                        {plan.features.map((feature, idx) => (
                          <li key={idx} className="flex items-start gap-2">
                            <div className="w-5 h-5 rounded-full bg-pink-100 flex items-center justify-center flex-shrink-0">
                              <Check className="h-3 w-3 text-pink-600" />
                            </div>
                            <span className="text-sm text-gray-600">
                              {feature}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </CardContent>
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
                  </Card>
                ))}
              </div>

              {/* Custom Token Pack */}
              <Card
                className={`${themeStyles.cardBg} border ${themeStyles.cardBorder} rounded-2xl p-6 mt-6 hover:border-pink-300 transition-all`}
              >
                <CardHeader className="p-0 mb-4">
                  <div className="flex items-center gap-2">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                      <Infinity className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <CardTitle className="text-lg font-bold text-gray-800">
                        Custom Token Pack
                      </CardTitle>
                      <CardDescription className="text-sm text-gray-400">
                        Choose your own token amount (Min: 10,000 tokens)
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="p-0">
                  <div className="space-y-4">
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-gray-700">
                          Tokens: {customTokens.toLocaleString()}
                        </span>
                        <span className="text-lg font-bold text-gray-800">
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
                        className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-pink-500"
                      />

                      <div className="grid grid-cols-3 md:grid-cols-5 gap-2 mt-4">
                        {[50000, 100000, 250000, 500000, 1000000].map(
                          (amount) => (
                            <button
                              key={amount}
                              onClick={() => setCustomTokens(amount)}
                              className={`px-3 py-1.5 border rounded-lg text-xs transition-colors ${
                                customTokens === amount
                                  ? "border-pink-500 bg-pink-50 text-pink-600"
                                  : "border-gray-200 text-gray-600 hover:border-pink-300"
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
                      <div className="bg-gray-50 rounded-xl p-4 text-center">
                        <p className="text-xs text-gray-400 mb-1">
                          Price per token
                        </p>
                        <p className="text-lg font-bold text-gray-800">
                          ₹
                          {(
                            calculateCustomTokenPrice(customTokens) /
                            customTokens
                          ).toFixed(4)}
                        </p>
                      </div>
                      <div className="bg-gray-50 rounded-xl p-4 text-center">
                        <p className="text-xs text-gray-400 mb-1">
                          Total tokens
                        </p>
                        <p className="text-lg font-bold text-gray-800">
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
                          <div className="w-5 h-5 rounded-full bg-pink-100 flex items-center justify-center flex-shrink-0">
                            <Check className="h-3 w-3 text-pink-600" />
                          </div>
                          <span className="text-sm text-gray-600">
                            {feature}
                          </span>
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
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          {/* Comparison Table - Outside Tabs */}
          <section className="mt-16">
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold bg-gradient-to-r from-pink-500 to-rose-500 bg-clip-text text-transparent mb-2">
                Plan Comparison
              </h2>
              <p className="text-gray-500">
                Find the perfect plan for your needs
              </p>
            </div>

            <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="text-left py-4 px-6 font-semibold text-gray-700">
                        Features
                      </th>
                      <th className="text-center py-4 px-6 font-semibold text-green-600">
                        Free Tier
                      </th>
                      <th className="text-center py-4 px-6 font-semibold text-purple-600">
                        Token Packs
                      </th>
                      <th className="text-center py-4 px-6 font-semibold text-pink-600">
                        Chatbot Subscriptions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
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
                        className="hover:bg-gray-50 transition-colors"
                      >
                        <td className="py-4 px-6 font-medium text-gray-700">
                          {row.feature}
                        </td>
                        <td className="py-4 px-6 text-center">
                          {row.free === "✓" ? (
                            <Check className="h-5 w-5 text-green-500 mx-auto" />
                          ) : row.free === "" ? (
                            <X className="h-5 w-5 text-gray-300 mx-auto" />
                          ) : (
                            <span className="text-gray-600">{row.free}</span>
                          )}
                        </td>
                        <td className="py-4 px-6 text-center">
                          {row.tokens === "✓" ? (
                            <Check className="h-5 w-5 text-green-500 mx-auto" />
                          ) : row.tokens === "" ? (
                            <X className="h-5 w-5 text-gray-300 mx-auto" />
                          ) : (
                            <span className="text-gray-600">{row.tokens}</span>
                          )}
                        </td>
                        <td className="py-4 px-6 text-center">
                          {row.subscription === "✓" ? (
                            <Check className="h-5 w-5 text-green-500 mx-auto" />
                          ) : row.subscription === "" ? (
                            <X className="h-5 w-5 text-gray-300 mx-auto" />
                          ) : (
                            <span className="text-gray-600">
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
              <div className="bg-white border border-gray-100 rounded-xl p-4 text-center">
                <Shield className="h-8 w-8 text-pink-500 mx-auto mb-2" />
                <h4 className="font-semibold text-gray-800 mb-1">
                  Secure Payments
                </h4>
                <p className="text-xs text-gray-400">
                  256-bit encrypted transactions
                </p>
              </div>
              <div className="bg-white border border-gray-100 rounded-xl p-4 text-center">
                <TrendingUp className="h-8 w-8 text-pink-500 mx-auto mb-2" />
                <h4 className="font-semibold text-gray-800 mb-1">
                  No Hidden Fees
                </h4>
                <p className="text-xs text-gray-400">
                  Cancel anytime, no questions asked
                </p>
              </div>
              <div className="bg-white border border-gray-100 rounded-xl p-4 text-center">
                <CreditCard className="h-8 w-8 text-pink-500 mx-auto mb-2" />
                <h4 className="font-semibold text-gray-800 mb-1">
                  Multiple Payment Modes
                </h4>
                <p className="text-xs text-gray-400">
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
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#F8F9FA] flex items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <div className="w-8 h-8 border-3 border-pink-200 border-t-pink-500 rounded-full animate-spin" />
            <p className="text-sm text-gray-400">
              Loading pricing information...
            </p>
          </div>
        </div>
      }
    >
      <PricingContent />
    </Suspense>
  );
}
