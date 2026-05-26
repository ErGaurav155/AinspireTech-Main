"use client";

import { useState, useEffect, Suspense, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { SignedIn, SignedOut, useAuth } from "@clerk/nextjs";
import {
  Bot,
  Check,
  Zap,
  CreditCard,
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
  toast,
  useThemeStyles,
} from "@rocketreplai/ui";
import { productSubscriptionDetails } from "@rocketreplai/shared";
import {
  getChatbots,
  getSubscriptions,
  updateWebChatbot,
} from "@/lib/services/web-actions.api";
import { useApi } from "@/lib/useApi";
import { Checkout } from "@/components/web/Checkout";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { cancelRazorPaySubscription } from "@/lib/services/insta-actions.api";
import { verifyRazorpayPayment } from "@/lib/services/subscription-actions.api";

// Types
interface Subscription {
  chatbotType: string;
  clerkId: string;
  status: string;
  billingCycle: string;
  subscriptionId?: string;
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
type PlanType = "chatbot";

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
  const [isLoading, setIsLoading] = useState(false);
  const [billingMode, setBillingMode] = useState<BillingMode>("monthly");
  const [activeTab, setActiveTab] = useState<PlanType>("chatbot");
  const [error, setError] = useState<string | null>(null);
  const [userChatbots, setUserChatbots] = useState<any[]>([]);
  const [isCancelling, setIsCancelling] = useState(false);
  const [subscriptionToManage, setSubscriptionToManage] =
    useState<Subscription | null>(null);
  const [subscriptionToCancel, setSubscriptionToCancel] =
    useState<Subscription | null>(null);
  const [subscriptionChangeTarget, setSubscriptionChangeTarget] = useState<{
    product: Product;
    billingCycle: BillingMode;
    amount: number;
    chatbotCreated: boolean;
  } | null>(null);
  const isAccountDataLoading = !isLoaded || isLoading;
  const products = useMemo(() => Object.values(productSubscriptionDetails), []);
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
            subscriptionId: sub.subscriptionId,
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

  const getProductSubscription = (productId: string) => {
    return subscriptions.find(
      (sub) => sub.chatbotType === productId && sub.status === "active",
    );
  };

  const getSwitchTarget = (product: Product, subscription: Subscription) => {
    const targetBillingCycle: BillingMode =
      subscription.billingCycle === "yearly" ? "monthly" : "yearly";

    return {
      product,
      billingCycle: targetBillingCycle,
      amount:
        targetBillingCycle === "monthly" ? product.mprice : product.yprice,
      chatbotCreated: true,
    };
  };

  const handleCancelSubscription = async () => {
    if (!subscriptionToCancel?.subscriptionId) {
      toast({
        title: "Failed!",
        description: "No active subscription selected for cancellation",
        variant: "destructive",
      });
      return;
    }

    setIsCancelling(true);
    try {
      await cancelRazorPaySubscription(apiRequest, {
        subscriptionId: subscriptionToCancel.subscriptionId,
        subscriptionType: "web",
        reason: "User requested cancellation",
        mode: "Immediate",
      });

      setSubscriptions((current) =>
        current.filter(
          (sub) => sub.subscriptionId !== subscriptionToCancel.subscriptionId,
        ),
      );
      setSubscriptionToCancel(null);
      setSubscriptionToManage(null);
      toast({
        title: "Success!",
        description: "Subscription cancelled successfully",
      });
    } catch (cancelError: any) {
      console.error("Error cancelling subscription:", cancelError);
      toast({
        title: "Failed!",
        description:
          cancelError.message || "Failed to cancel subscription. Try again.",
        variant: "destructive",
      });
    } finally {
      setIsCancelling(false);
    }
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
  useEffect(() => {
    const processRazorpayRedirectCallback = async () => {
      if (!userId) return;

      const isRazorpayCallback = searchParams.get("razorpay_checkout") === "1";

      if (!isRazorpayCallback) return;
      if (isRazorpayCallback && searchParams.get("checkoutKind") !== "web") {
        return;
      }

      const subscriptionId = searchParams.get("subscription_id");
      const productId = searchParams.get("productId") || "";
      const callbackBillingCycle = searchParams.get("billingCycle") as
        | "monthly"
        | "yearly"
        | null;

      if (!subscriptionId) return;

      setIsLoading(true);

      try {
        if (
          !searchParams.get("razorpay_payment_id") ||
          !searchParams.get("razorpay_signature")
        ) {
          throw new Error("Payment was not completed");
        }

        const verifyResponse = await verifyRazorpayPayment(apiRequest, {
          subscription_id: subscriptionId,
          razorpay_payment_id: searchParams.get("razorpay_payment_id"),
          razorpay_signature: searchParams.get("razorpay_signature"),
          chatbotType: productId,
          subscriptionKind: "web",
          subscriptionType: productId || "web",
          productId,
          billingCycle: callbackBillingCycle || "monthly",
          previousSubscriptionId:
            searchParams.get("previousSubscriptionId") || undefined,
          previousSubscriptionType:
            searchParams.get("previousSubscriptionType") || undefined,
        });

        if (!verifyResponse.success) {
          throw new Error(verifyResponse.message || "Payment verification failed");
        }

        const chatbotId = searchParams.get("chatbotId");
        if (chatbotId) {
          await updateWebChatbot(apiRequest, chatbotId, {
            subscriptionId,
            isActive: true,
          });
        }

        toast({
          title: "Payment Successful!",
          description: "Subscription activated successfully",
        });
        router.replace("/web");
        router.refresh();
      } catch (error: any) {
        console.error("Razorpay redirect callback error:", error);
        toast({
          title: "Failed!",
          description: error.message || "Payment could not be completed.",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
        if (typeof window !== "undefined" && isRazorpayCallback) {
          const params = new URLSearchParams(window.location.search);
          [
            "razorpay_checkout",
            "checkoutKind",
            "subscription_id",
            "razorpay_payment_id",
            "razorpay_signature",
            "productId",
            "billingCycle",
            "chatbotId",
            "previousSubscriptionId",
            "previousSubscriptionType",
          ].forEach((param) => params.delete(param));
          const nextUrl = params.toString()
            ? `${window.location.pathname}?${params.toString()}`
            : window.location.pathname;
          router.replace(nextUrl, { scroll: false });
        }
      }
    };

    void processRazorpayRedirectCallback();
  }, [apiRequest, router, searchParams, userId]);

  const TAB_LABELS: Record<
    PlanType,
    { label: string; label2: string; icon: React.ElementType }
  > = {
    chatbot: {
      label: "chatbot",
      label2: "Subscriptions",
      icon: Bot,
    },
  };
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
            Choose the best chatbot subscription for your business and get
            Unlimited tokens per chatbot per cycle.
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
                  Save 50%
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
                {products.map((product) => {
                  const Icon = iconMapping[product.icon] || Bot;
                  const { displayPrice, originalPrice, isYearly } =
                    getProductPrice(product);
                  const isSubscribed = isProductSubscribed(product.productId);
                  const activeSubscription = getProductSubscription(
                    product.productId,
                  );
                  const isSameBillingCycle =
                    activeSubscription?.billingCycle === billingMode;
                  const hasCreated = isAccountDataLoading
                    ? false
                    : hasChatbotCreated(product.productId);
                  const isMostPopular =
                    product.productId === "chatbot-lead-generation";

                  const gradient =
                    product.productId === "chatbot-lead-generation"
                      ? "from-purple-500 to-pink-500"
                      : "from-cyan-500 to-blue-500";

                  // Build card classes
                  let cardClasses = `${styles.card} p-6 relative group rounded-2xl border transition-all duration-300 overflow-visible`;
                  if (isSubscribed && isSameBillingCycle) {
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
                      {(isMostPopular ||
                        (isSubscribed && isSameBillingCycle)) && (
                        <div className="absolute -top-3 left-0 right-0 flex justify-center">
                          <Badge
                            className={`${
                              isSubscribed && isSameBillingCycle
                                ? "bg-gradient-to-r from-green-500 to-emerald-500 text-white border-0 px-4 py-1"
                                : "bg-gradient-to-r from-pink-500 to-rose-500 text-white border-0 px-4 py-1"
                            }`}
                          >
                            {isSubscribed && isSameBillingCycle ? (
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
                          <div className="flex items-center justify-center gap-2">
                            <span
                              className={`text-3xl font-bold ${styles.text.primary}`}
                            >
                              {billingMode === "monthly"
                                ? `₹${displayPrice.toFixed(0)}`
                                : `₹${(displayPrice / 12).toFixed(0)}`}
                            </span>
                            <span
                              className={`text-sm line-through ${styles.text.muted}`}
                            >
                              {billingMode === "monthly"
                                ? `₹${originalPrice.toFixed(0)}`
                                : `₹${(originalPrice / 12).toFixed(0)}`}
                            </span>
                          </div>
                          <p className={`text-sm ${styles.text.muted}`}>
                            per month
                          </p>
                        </div>

                        <p
                          className={`text-sm ${styles.badge.green} inline-flex items-center gap-1 px-3 py-2 mb-4 rounded-md`}
                        >
                          <Calendar className="h-4 w-4" />
                          Includes Unlimited tokens per{" "}
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
                          {isAccountDataLoading ? (
                            <Button
                              disabled
                              className="w-full py-3 rounded-xl font-medium bg-gradient-to-r from-pink-500 to-rose-500 text-white opacity-70 cursor-not-allowed"
                            >
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                              Checking subscription...
                            </Button>
                          ) : isSubscribed && isSameBillingCycle ? (
                            <div className="space-y-2">
                              <Button
                                disabled
                                className="w-full bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-xl opacity-70 cursor-not-allowed"
                              >
                                <BadgeCheck className="h-4 w-4 mr-2" />
                                Current Subscription
                              </Button>
                              <Button
                                variant="outline"
                                disabled={isCancelling}
                                onClick={() => {
                                  if (activeSubscription) {
                                    setSubscriptionChangeTarget(
                                      getSwitchTarget(
                                        product,
                                        activeSubscription,
                                      ),
                                    );
                                    setSubscriptionToManage(activeSubscription);
                                  }
                                }}
                                className={
                                  isDark
                                    ? "w-full border-red-500/30 text-red-400 hover:bg-red-500/10 rounded-xl"
                                    : "w-full border-red-200 text-red-600 hover:bg-red-50 rounded-xl"
                                }
                              >
                                {isCancelling ? (
                                  <>
                                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                    Cancelling...
                                  </>
                                ) : (
                                  "Change Subscription"
                                )}
                              </Button>
                            </div>
                          ) : isSubscribed && activeSubscription ? (
                            <Button
                              onClick={() => {
                                setSubscriptionChangeTarget({
                                  product,
                                  billingCycle: billingMode,
                                  amount: displayPrice,
                                  chatbotCreated: true,
                                });
                                setSubscriptionToManage(activeSubscription);
                              }}
                              className="w-full py-3 rounded-xl font-medium hover:opacity-90 transition-opacity bg-gradient-to-r from-pink-500 to-rose-500 text-white"
                            >
                              <Crown className="h-4 w-4 mr-2" />
                              Upgrade Subscription
                            </Button>
                          ) : (
                            <Checkout
                              userId={userId!}
                              productId={product.productId}
                              billingCycle={billingMode}
                              amount={displayPrice}
                              chatbotCreated={hasCreated}
                            />
                          )}
                        </SignedIn>
                      </div>
                    </div>
                  );
                })}
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
                        subscription: "Unlimited/month",
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
      {subscriptionToManage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div
            className={`w-full max-w-lg rounded-2xl p-6 shadow-xl ${
              isDark
                ? "border border-white/[0.08] bg-[#1A1A1E]"
                : "border border-gray-100 bg-white"
            }`}
          >
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <h2
                  className={`text-xl font-bold ${
                    isDark ? "text-white" : "text-gray-900"
                  }`}
                >
                  Change Subscription
                </h2>
                <p className={`mt-1 text-sm ${styles.text.secondary}`}>
                  Choose what you want to do with this chatbot plan.
                </p>
              </div>
              <button
                onClick={() => {
                  setSubscriptionToManage(null);
                  setSubscriptionChangeTarget(null);
                }}
                className={
                  isDark
                    ? "rounded-lg p-1.5 text-white/40 transition-colors hover:bg-white/[0.06]"
                    : "rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-100"
                }
                aria-label="Close subscription options"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-3">
              <div className={`${styles.innerCard} p-4`}>
                <div className="flex items-start gap-3">
                  <RefreshCw
                    className={`mt-0.5 h-5 w-5 ${
                      isDark ? "text-pink-400" : "text-pink-500"
                    }`}
                  />
                  <div>
                    <h3 className={`font-semibold ${styles.text.primary}`}>
                      Keep current plan
                    </h3>
                    <p className={`text-sm ${styles.text.secondary}`}>
                      Stay on unlimited chatbot access and keep all plan
                      benefits.
                    </p>
                  </div>
                </div>
                <Button
                  onClick={() => {
                    setSubscriptionToManage(null);
                    setSubscriptionChangeTarget(null);
                  }}
                  className="mt-3 w-full rounded-xl bg-gradient-to-r from-pink-500 to-rose-500 text-white hover:from-pink-600 hover:to-rose-600"
                >
                  Keep My Plan
                </Button>
              </div>

              <div className={`${styles.innerCard} p-4`}>
                <div className="flex items-start gap-3">
                  <CreditCard
                    className={`mt-0.5 h-5 w-5 ${
                      isDark ? "text-pink-400" : "text-pink-500"
                    }`}
                  />
                  <div>
                    <h3 className={`font-semibold ${styles.text.primary}`}>
                      Switch plan
                    </h3>
                    <p className={`text-sm ${styles.text.secondary}`}>
                      {subscriptionChangeTarget
                        ? `Move this subscription to ${subscriptionChangeTarget.billingCycle} billing.`
                        : "Compare monthly and yearly billing before making a change."}
                    </p>
                  </div>
                </div>
                <div className="mt-3">
                  {subscriptionChangeTarget ? (
                    <Checkout
                      userId={userId!}
                      productId={subscriptionChangeTarget.product.productId}
                      billingCycle={subscriptionChangeTarget.billingCycle}
                      amount={subscriptionChangeTarget.amount}
                      chatbotCreated={subscriptionChangeTarget.chatbotCreated}
                      previousSubscriptionId={
                        subscriptionToManage.subscriptionId
                      }
                      previousSubscriptionType="web"
                      buttonText="Switch Plan"
                    />
                  ) : (
                    <Button
                      variant="outline"
                      onClick={() => setSubscriptionToManage(null)}
                      className="w-full rounded-xl"
                    >
                      Review Plans
                    </Button>
                  )}
                </div>
              </div>

              <div
                className={`rounded-xl border p-4 ${
                  isDark
                    ? "border-red-500/20 bg-red-500/10"
                    : "border-red-100 bg-red-50"
                }`}
              >
                <h3
                  className={`font-semibold ${
                    isDark ? "text-red-300" : "text-red-700"
                  }`}
                >
                  Downgrade to Free
                </h3>
                <p
                  className={`mt-1 text-sm ${
                    isDark ? "text-red-200/80" : "text-red-700/80"
                  }`}
                >
                  This downgrades the active chatbot plan and removes its
                  features and unlimited token access.
                </p>
                <Button
                  variant="outline"
                  disabled={isCancelling}
                  onClick={() => {
                    setSubscriptionToCancel(subscriptionToManage);
                    setSubscriptionToManage(null);
                    setSubscriptionChangeTarget(null);
                  }}
                  className={
                    isDark
                      ? "mt-3 w-full rounded-xl border-red-500/30 text-red-300 hover:bg-red-500/10"
                      : "mt-3 w-full rounded-xl border-red-200 text-red-700 hover:bg-red-100"
                  }
                >
                  Downgrade to Free
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
      <ConfirmDialog
        open={!!subscriptionToCancel}
        onOpenChange={(open) => {
          if (!open) setSubscriptionToCancel(null);
        }}
        onConfirm={handleCancelSubscription}
        title="Confirm Cancellation"
        description="Are you sure you want to cancel this chatbot subscription? Access for this plan will be removed."
        confirmText="Yes, Cancel Subscription"
        isDestructive={true}
        isLoading={isCancelling}
      />
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
