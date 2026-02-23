"use client";

import { useState } from "react";
import Script from "next/script";
import { useRouter } from "next/navigation";
import { useAuth } from "@clerk/nextjs";
import Link from "next/link";
import {
  Zap,
  Check,
  CreditCard,
  TrendingUp,
  Shield,
  Infinity,
  Loader2,
  Sparkles,
  Gem,
  Crown,
  BadgeCheck,
  ArrowRight,
} from "lucide-react";
import { useApi } from "@/lib/useApi";
import { useTheme } from "next-themes";
import { useMemo } from "react";
import { calculateCustomTokenPrice, tokenPlans } from "@rocketreplai/shared";
import { toast } from "@rocketreplai/ui/components/radix/use-toast";
import { Button } from "@rocketreplai/ui/components/radix/button";
import { Badge } from "@rocketreplai/ui/components/radix/badge";
import { Slider } from "@rocketreplai/ui/components/radix/slider";
import {
  purchaseTokens,
  verifyPurchaseTokens,
} from "@/lib/services/web-actions.api";

interface TokenPurchaseProps {
  onSuccess?: () => void;
  currentBalance?: number;
}

export const TokenPurchase = ({
  onSuccess,
  currentBalance = 0,
}: TokenPurchaseProps) => {
  const router = useRouter();
  const { userId, isLoaded } = useAuth();
  const { theme, resolvedTheme } = useTheme();
  const currentTheme = resolvedTheme || theme || "light";
  const { apiRequest } = useApi();

  const [selectedPlan, setSelectedPlan] = useState<string>("pro");
  const [customTokens, setCustomTokens] = useState<number>(100000);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showCustom, setShowCustom] = useState(false);

  const plans = Object.values(tokenPlans);

  const themeStyles = useMemo(() => {
    const isDark = currentTheme === "dark";
    return {
      cardBg: isDark
        ? "bg-[#1A1A1E] border-gray-800"
        : "bg-white border-gray-100",
      titleText: isDark ? "text-white" : "text-gray-900",
      descriptionText: isDark ? "text-gray-400" : "text-gray-500",
      mutedText: isDark ? "text-gray-500" : "text-gray-400",
      border: isDark ? "border-gray-800" : "border-gray-200",
      hoverBorder: isDark
        ? "hover:border-purple-500/50"
        : "hover:border-purple-300",
      activeBorder: isDark ? "border-purple-500" : "border-purple-500",
      sliderBg: isDark ? "bg-gray-800" : "bg-gray-200",
      featureCardBg: isDark ? "bg-[#252529]" : "bg-gray-50",
    };
  }, [currentTheme]);

  const planIcons = {
    basic: Sparkles,
    pro: Gem,
    enterprise: Crown,
    custom: Infinity,
  };

  const handlePurchase = async (
    planId: string,
    tokens: number,
    amount: number,
  ) => {
    if (!userId || !isLoaded) {
      router.push("/sign-in");
      return;
    }

    setIsProcessing(true);

    try {
      const data = await purchaseTokens(apiRequest, { tokens, amount, planId });

      const options = {
        key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID!,
        amount: data.amount,
        currency: data.currency,
        name: "AI Chatbot Tokens",
        description: `Purchase ${tokens.toLocaleString()} tokens`,
        order_id: data.orderId,
        handler: async (response: any) => {
          const verificationData = {
            razorpay_payment_id: response.razorpay_payment_id,
            razorpay_order_id: response.razorpay_order_id,
            razorpay_signature: response.razorpay_signature,
            tokens,
            amount,
            currency: data.currency,
          };
          const verifyData = await verifyPurchaseTokens(
            apiRequest,
            verificationData,
          );

          if (verifyData.success) {
            toast({
              title: "Success!",
              description: `${tokens.toLocaleString()} tokens added to your account`,
              duration: 3000,
            });

            if (onSuccess) onSuccess();
          } else {
            throw new Error(verifyData.error || "Payment verification failed");
          }
        },
        prefill: {
          name: "Customer",
          email: "customer@example.com",
        },
        theme: {
          color: "#8B5CF6",
        },
      };

      const razorpay = new (window as any).Razorpay(options);
      razorpay.open();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to process purchase",
        variant: "destructive",
        duration: 3000,
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCustomPurchase = () => {
    const amount = calculateCustomTokenPrice(customTokens);
    handlePurchase("custom", customTokens, amount);
  };

  return (
    <>
      <Script
        id="razorpay-checkout-js"
        src="https://checkout.razorpay.com/v1/checkout.js"
      />

      <div className="space-y-6">
        {/* Current Balance */}
        {currentBalance > 0 && (
          <div
            className={`${themeStyles.cardBg} border ${themeStyles.border} rounded-2xl p-5`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 flex items-center justify-center">
                  <Zap className="h-5 w-5 text-white" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Current Balance</p>
                  <p className="text-2xl font-bold text-gray-800">
                    {currentBalance.toLocaleString()} tokens
                  </p>
                </div>
              </div>
              <Badge className="bg-purple-100 text-purple-600 border-purple-200">
                Active
              </Badge>
            </div>
          </div>
        )}

        {/* Plan Selection */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {plans.map((plan) => {
            const PlanIcon = planIcons[plan.id as keyof typeof planIcons];
            const isSelected = selectedPlan === plan.id && !showCustom;

            return (
              <div
                key={plan.id}
                onClick={() => {
                  setSelectedPlan(plan.id);
                  setShowCustom(false);
                }}
                className={`${themeStyles.cardBg} border rounded-2xl p-5 cursor-pointer transition-all ${
                  isSelected
                    ? `border-purple-500 ring-2 ring-purple-200`
                    : `${themeStyles.border} hover:border-purple-300`
                }`}
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-10 h-10 rounded-xl ${
                        isSelected
                          ? "bg-gradient-to-r from-purple-500 to-pink-500"
                          : "bg-gray-100"
                      } flex items-center justify-center`}
                    >
                      <PlanIcon
                        className={`h-5 w-5 ${
                          isSelected ? "text-white" : "text-purple-500"
                        }`}
                      />
                    </div>
                    <h3 className={`font-semibold ${themeStyles.titleText}`}>
                      {plan.name}
                    </h3>
                  </div>
                  {isSelected && (
                    <Badge className="bg-gradient-to-r from-purple-500 to-pink-500 text-white border-0">
                      Selected
                    </Badge>
                  )}
                </div>

                <p className={`text-sm ${themeStyles.descriptionText} mb-3`}>
                  {plan.tokens.toLocaleString()} tokens
                </p>

                <div className="mb-4">
                  <p className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                    ₹{plan.price.toLocaleString()}
                  </p>
                  <p className={`text-xs ${themeStyles.mutedText}`}>
                    ₹{plan.perTokenPrice.toFixed(4)} per token
                  </p>
                </div>

                <ul className="space-y-2 mb-4">
                  {plan.features.slice(0, 3).map((feature, idx) => (
                    <li key={idx} className="flex items-center gap-2 text-sm">
                      <div className="w-4 h-4 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                        <Check className="h-2.5 w-2.5 text-green-600" />
                      </div>
                      <span className={themeStyles.descriptionText}>
                        {feature}
                      </span>
                    </li>
                  ))}
                </ul>

                <Button
                  className={`w-full ${
                    isSelected
                      ? "bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white"
                      : "bg-gray-900 text-white hover:bg-gray-800"
                  } rounded-xl`}
                  onClick={(e) => {
                    e.stopPropagation();
                    handlePurchase(plan.id, plan.tokens, plan.price);
                  }}
                  disabled={isProcessing}
                >
                  {isProcessing && isSelected ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <CreditCard className="h-4 w-4 mr-2" />
                  )}
                  Purchase Now
                </Button>
              </div>
            );
          })}
        </div>

        {/* Custom Token Pack */}
        <div
          className={`${themeStyles.cardBg} border rounded-2xl p-5 cursor-pointer transition-all ${
            showCustom
              ? `border-purple-500 ring-2 ring-purple-200`
              : `${themeStyles.border} hover:border-purple-300`
          }`}
          onClick={() => setShowCustom(true)}
        >
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div
                className={`w-10 h-10 rounded-xl ${
                  showCustom
                    ? "bg-gradient-to-r from-purple-500 to-pink-500"
                    : "bg-gray-100"
                } flex items-center justify-center`}
              >
                <Infinity
                  className={`h-5 w-5 ${
                    showCustom ? "text-white" : "text-purple-500"
                  }`}
                />
              </div>
              <div>
                <h3 className={`font-semibold ${themeStyles.titleText}`}>
                  Custom Token Pack
                </h3>
                <p className={`text-sm ${themeStyles.descriptionText}`}>
                  Choose your own token amount
                </p>
              </div>
            </div>
            {showCustom && (
              <Badge className="bg-gradient-to-r from-purple-500 to-pink-500 text-white border-0">
                Selected
              </Badge>
            )}
          </div>

          {showCustom && (
            <div className="mt-6 space-y-6">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <label
                      className={`text-sm font-medium ${themeStyles.titleText}`}
                    >
                      Custom Tokens
                    </label>
                    <p className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                      {customTokens.toLocaleString()}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-gray-500">Total Price</p>
                    <p className="text-2xl font-bold text-gray-800">
                      ₹
                      {calculateCustomTokenPrice(customTokens).toLocaleString()}
                    </p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className={`${themeStyles.sliderBg} rounded-full p-1`}>
                    <Slider
                      value={[customTokens]}
                      min={10000}
                      max={5000000}
                      step={10000}
                      onValueChange={([value]) => setCustomTokens(value)}
                      className="w-full"
                    />
                  </div>

                  <div className="grid grid-cols-5 gap-2">
                    {[50000, 100000, 250000, 500000, 1000000].map((amount) => (
                      <button
                        key={amount}
                        onClick={() => setCustomTokens(amount)}
                        className={`px-3 py-1.5 border rounded-lg text-xs transition-colors ${
                          customTokens === amount
                            ? "border-purple-500 bg-purple-50 text-purple-600"
                            : `${themeStyles.border} ${themeStyles.descriptionText} hover:border-purple-300`
                        }`}
                      >
                        {amount >= 1000000
                          ? `${amount / 1000000}M`
                          : amount >= 1000
                            ? `${amount / 1000}K`
                            : amount}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div
                  className={`text-center p-4 rounded-xl ${themeStyles.featureCardBg}`}
                >
                  <p className="text-xs text-gray-500 mb-1">Price per token</p>
                  <p className="text-lg font-bold text-green-600">
                    ₹
                    {(
                      calculateCustomTokenPrice(customTokens) / customTokens
                    ).toFixed(4)}
                  </p>
                </div>
                <div
                  className={`text-center p-4 rounded-xl ${themeStyles.featureCardBg}`}
                >
                  <p className="text-xs text-gray-500 mb-1">Total tokens</p>
                  <p className="text-lg font-bold text-purple-600">
                    {customTokens.toLocaleString()}
                  </p>
                </div>
              </div>

              <Button
                className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white rounded-xl"
                onClick={handleCustomPurchase}
                disabled={isProcessing}
              >
                {isProcessing ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <CreditCard className="h-4 w-4 mr-2" />
                )}
                Purchase {customTokens.toLocaleString()} tokens
              </Button>
            </div>
          )}
        </div>

        {/* Features */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div
            className={`text-center  rounded-xl ${themeStyles.featureCardBg} p-4 md:p-6 lg:p-8`}
          >
            <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-3">
              <Shield className="h-6 w-6 text-green-600" />
            </div>
            <h3 className={`font-semibold ${themeStyles.titleText} mb-2`}>
              No Expiration
            </h3>
            <p className={`text-sm ${themeStyles.descriptionText}`}>
              Purchased tokens never expire. Use them whenever you need.
            </p>
          </div>

          <div
            className={`text-center p-4 md:p-6 lg:p-8 rounded-xl ${themeStyles.featureCardBg}`}
          >
            <div className="w-12 h-12 rounded-full bg-purple-100 flex items-center justify-center mx-auto mb-3">
              <Zap className="h-6 w-6 text-purple-600" />
            </div>
            <h3 className={`font-semibold ${themeStyles.titleText} mb-2`}>
              Use Across All Chatbots
            </h3>
            <p className={`text-sm ${themeStyles.descriptionText}`}>
              Tokens work with all your chatbots. No restrictions.
            </p>
          </div>

          <div
            className={`text-center p-4 md:p-6 lg:p-8 rounded-xl ${themeStyles.featureCardBg}`}
          >
            <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center mx-auto mb-3">
              <TrendingUp className="h-6 w-6 text-blue-600" />
            </div>
            <h3 className={`font-semibold ${themeStyles.titleText} mb-2`}>
              Bulk Discounts
            </h3>
            <p className={`text-sm ${themeStyles.descriptionText}`}>
              The more tokens you buy, the less you pay per token.
            </p>
          </div>
        </div>
      </div>
    </>
  );
};
