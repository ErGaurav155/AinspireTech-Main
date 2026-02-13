"use client";

import { useState } from "react";
import Script from "next/script";
import { useRouter } from "next/navigation";
import { useAuth } from "@clerk/nextjs";
import {
  Zap,
  Check,
  CreditCard,
  TrendingUp,
  Shield,
  Infinity as InfiniteIcon,
  Loader2,
  Sparkles,
  Gem,
  Crown,
  BadgeCheck,
} from "lucide-react";

import { motion } from "framer-motion";
import { useTheme } from "next-themes";
import { useMemo } from "react";
import { calculateCustomTokenPrice, tokenPlans } from "@rocketreplai/shared";
import { toast } from "@rocketreplai/ui/components/radix/use-toast";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@rocketreplai/ui/components/radix/card";
import { Badge } from "@rocketreplai/ui/components/radix/badge";
import { Button } from "@rocketreplai/ui/components/radix/button";
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

  const [selectedPlan, setSelectedPlan] = useState<string>("pro");
  const [customTokens, setCustomTokens] = useState<number>(100000);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showCustom, setShowCustom] = useState(false);

  const plans = Object.values(tokenPlans);

  // Theme-based styles - simplified to prevent blinking
  const themeStyles = useMemo(() => {
    const isDark = currentTheme === "dark";
    return {
      // Backgrounds
      containerBg: isDark ? "bg-[#0a0a0a]/10 backdrop-blur-sm" : "bg-gray-50",
      cardBg: isDark
        ? "bg-transparent backdrop-blur-sm"
        : "bg-gradient-to-br from-white/90 to-gray-50/90 backdrop-blur-sm",
      featureCardBg: isDark
        ? "bg-gradient-to-br from-gray-900/40 to-gray-800/20"
        : "bg-gradient-to-br from-white to-gray-50/80",

      // Text
      titleText: isDark ? "text-white" : "text-gray-900",
      descriptionText: isDark ? "text-gray-300" : "text-gray-600",
      mutedText: isDark ? "text-gray-400" : "text-gray-500",

      // Borders
      border: isDark ? "border-gray-800" : "border-gray-200",
      hoverBorder: isDark ? "border-gray-700" : "border-gray-300",
      activeBorder: isDark ? "border-blue-500" : "border-blue-500",

      // Sliders
      sliderBg: isDark ? "bg-gray-800" : "bg-gray-200",
    };
  }, [currentTheme]);

  // Static styles that don't depend on theme
  const staticStyles = {
    sliderTrack: "bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500",
    selectedGradient:
      "bg-gradient-to-r from-blue-500/10 via-purple-500/10 to-pink-500/10",
    hoverGradient:
      "bg-gradient-to-r from-blue-500/5 via-purple-500/5 to-pink-500/5",
  };

  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        duration: 0.8,
        staggerChildren: 0.1,
      },
    },
  };

  const cardVariants = {
    hidden: {
      opacity: 0,
      y: 40,
    },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.5,
        ease: "easeOut",
      },
    },
    hover: {
      y: -4,
      transition: {
        duration: 0.2,
        ease: "easeOut",
      },
    },
  };

  const featureVariants = {
    hidden: { opacity: 0, scale: 0.9 },
    visible: {
      opacity: 1,
      scale: 1,
      transition: {
        duration: 0.4,
        ease: "easeOut",
      },
    },
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
      const data = await purchaseTokens({ tokens, amount, planId });

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
          const verifyData = await verifyPurchaseTokens(verificationData);

          if (verifyData.success) {
            toast({
              title: "Success!",
              description: `${tokens.toLocaleString()} tokens added to your account`,
              duration: 3000,
            });

            if (onSuccess) onSuccess();
            router.refresh();
          } else {
            throw new Error(verifyData.error || "Payment verification failed");
          }
        },
        prefill: {
          name: "Customer",
          email: "customer@example.com",
        },
        theme: {
          color: "#3B82F6",
        },
      };
      console.log("key:", options.key);
      const razorpay = new (window as any).Razorpay(options);
      razorpay.open();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to process purchase",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCustomPurchase = () => {
    const amount = calculateCustomTokenPrice(customTokens);
    handlePurchase("custom", customTokens, amount);
  };

  const getSelectedPlan = () => {
    if (showCustom) {
      return {
        id: "custom",
        name: "Custom Token Pack",
        tokens: customTokens,
        price: calculateCustomTokenPrice(customTokens),
        perTokenPrice: calculateCustomTokenPrice(customTokens) / customTokens,
        features: [
          "Custom token amount",
          "No expiration",
          "Use across all chatbots",
          "Bulk discounts available",
        ],
      };
    }
    return tokenPlans[selectedPlan as keyof typeof tokenPlans];
  };

  const selectedPlanData = getSelectedPlan();

  const planIcons = {
    basic: Sparkles,
    pro: Gem,
    enterprise: Crown,
    custom: InfiniteIcon,
  };

  return (
    <>
      <Script
        id="razorpay-checkout-js"
        src="https://checkout.razorpay.com/v1/checkout.js"
      />

      <motion.div
        className={`space-y-8 p-1 ${themeStyles.containerBg} rounded-2xl`}
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {/* Current Balance */}
        {currentBalance > 0 && (
          <motion.div variants={cardVariants}>
            <Card
              className={`${themeStyles.cardBg} border ${themeStyles.border} hover:shadow-xl transition-all duration-300 overflow-hidden relative`}
            >
              <div className="absolute inset-0 bg-gradient-to-r from-blue-500/5 via-purple-500/5 to-pink-500/5" />
              <CardContent className="pt-6 relative z-10">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <Zap className="h-5 w-5 text-yellow-500" />
                      <p className="text-sm font-medium text-blue-600 dark:text-blue-400">
                        Current Balance
                      </p>
                    </div>
                    <p className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                      {currentBalance.toLocaleString()} tokens
                    </p>
                  </div>
                  <motion.div
                    animate={{ rotate: [0, 10, -10, 0] }}
                    transition={{ repeat: Infinity, duration: 3 }}
                  >
                    <Zap className="h-12 w-12 text-yellow-500" />
                  </motion.div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Plan Selection */}
        <motion.div
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 items-stretch"
          variants={containerVariants}
        >
          {plans.map((plan) => {
            const PlanIcon = planIcons[plan.id as keyof typeof planIcons];
            const isSelected = selectedPlan === plan.id && !showCustom;

            return (
              <motion.div
                key={plan.id}
                variants={cardVariants}
                whileHover="hover"
                className="h-full"
              >
                <Card
                  className={`h-full flex flex-col justify-between  transition-all duration-300 overflow-hidden outline-none relative ${
                    themeStyles.cardBg
                  } border ${
                    isSelected
                      ? `${themeStyles.activeBorder} ring-1 ring-blue-500/30`
                      : themeStyles.border
                  }`}
                  onClick={() => {
                    setSelectedPlan(plan.id);
                    setShowCustom(false);
                  }}
                >
                  {/* Static gradient overlay - won't cause blinking */}
                  <div
                    className={`absolute inset-0 transition-opacity duration-300 ${
                      isSelected
                        ? "opacity-100 bg-gradient-to-br from-blue-500/10 via-purple-500/10 to-pink-500/10"
                        : "opacity-0 group-hover:opacity-100 bg-gradient-to-br from-blue-500/5 via-purple-500/5 to-pink-500/5"
                    }`}
                  />

                  <CardHeader className="relative z-10 p-3 md:p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div
                          className={`p-2 rounded-lg transition-colors duration-300 ${
                            isSelected
                              ? "bg-gradient-to-br from-blue-500 to-purple-500"
                              : "bg-gray-100 dark:bg-gray-800"
                          }`}
                        >
                          <PlanIcon
                            className={`h-5 w-5 transition-colors duration-300 ${
                              isSelected ? "text-white" : "text-blue-500"
                            }`}
                          />
                        </div>
                        <CardTitle className={themeStyles.titleText}>
                          {plan.name}
                        </CardTitle>
                      </div>
                      {isSelected && (
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          transition={{ type: "spring" }}
                        >
                          <Badge className="bg-gradient-to-r from-blue-500 to-purple-500 text-white border-0">
                            Selected
                          </Badge>
                        </motion.div>
                      )}
                    </div>
                    <CardDescription
                      className={`${themeStyles.descriptionText} font-montserrat`}
                    >
                      {plan.tokens.toLocaleString()} tokens
                    </CardDescription>
                  </CardHeader>

                  <CardContent className=" relative z-10 p-3 md:p-4">
                    <div className="mb-6">
                      <p className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                        ₹{plan.price.toLocaleString()}
                      </p>
                      <p
                        className={`text-sm ${themeStyles.mutedText} font-montserrat`}
                      >
                        ₹{plan.perTokenPrice.toFixed(4)} per token
                      </p>
                    </div>

                    <ul className="space-y-3 mb-6">
                      {plan.features.map((feature, idx) => (
                        <motion.li
                          key={idx}
                          className="flex items-center text-sm font-montserrat"
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: idx * 0.1 }}
                        >
                          <div className="p-1 rounded-full bg-green-500/10 mr-3">
                            <Check className="h-3 w-3 text-green-500" />
                          </div>
                          <span className={themeStyles.descriptionText}>
                            {feature}
                          </span>
                        </motion.li>
                      ))}
                    </ul>
                  </CardContent>
                  <CardFooter>
                    <Button
                      className={`w-full transition-all duration-300 ${
                        isSelected
                          ? "bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                          : "bg-gray-900 dark:bg-gray-800 hover:bg-gray-800 dark:hover:bg-gray-700"
                      } text-white`}
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
                  </CardFooter>
                </Card>
              </motion.div>
            );
          })}
        </motion.div>

        {/* Custom Token Pack */}
        <motion.div variants={cardVariants}>
          <Card
            className={`transition-all duration-300 overflow-hidden relative ${
              themeStyles.cardBg
            } border ${
              showCustom
                ? `${themeStyles.activeBorder} ring-2 ring-blue-500/30`
                : themeStyles.border
            }`}
          >
            {/* Static gradient overlay */}
            <div
              className={`absolute inset-0 transition-opacity duration-300 ${
                showCustom
                  ? "opacity-100 bg-gradient-to-br from-blue-500/10 via-purple-500/10 to-pink-500/10"
                  : "opacity-0"
              }`}
            />

            <CardHeader className="relative z-10 p-3 md:p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className={`p-2 rounded-lg transition-colors duration-300 ${
                      showCustom
                        ? "bg-gradient-to-br from-blue-500 to-purple-500"
                        : "bg-gray-100 dark:bg-gray-800"
                    }`}
                  >
                    <InfiniteIcon
                      className={`h-5 w-5 transition-colors duration-300 ${
                        showCustom ? "text-white" : "text-blue-500"
                      }`}
                    />
                  </div>
                  <CardTitle className={themeStyles.titleText}>
                    Custom Token Pack
                  </CardTitle>
                </div>
                {showCustom && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring" }}
                  >
                    <Badge className="bg-gradient-to-r from-blue-500 to-purple-500 text-white border-0">
                      Selected
                    </Badge>
                  </motion.div>
                )}
              </div>
              <CardDescription
                className={`${themeStyles.descriptionText} font-montserrat`}
              >
                Choose your own token amount (Min: 10,000 tokens)
              </CardDescription>
            </CardHeader>

            <CardContent className="relative z-10 space-y-8 p-3 md:p-4">
              <div className="space-y-6">
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <label
                        className={`text-sm font-medium ${themeStyles.titleText}`}
                      >
                        Custom Tokens
                      </label>
                      <p className=" text-xl md:text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                        {customTokens.toLocaleString()}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                        Total Price
                      </p>
                      <p className="text-xl md:text-2xl font-bold">
                        ₹
                        {calculateCustomTokenPrice(
                          customTokens,
                        ).toLocaleString()}
                      </p>
                    </div>
                  </div>

                  <div className="space-y-6">
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

                    <div className="grid  grid-cols-3 md:grid-cols-5 gap-3">
                      {[50000, 100000, 250000, 500000, 1000000].map(
                        (amount) => (
                          <Button
                            key={amount}
                            variant="outline"
                            size="sm"
                            onClick={() => setCustomTokens(amount)}
                            className={`transition-all duration-200 ${
                              customTokens === amount
                                ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20"
                                : themeStyles.border
                            }`}
                          >
                            {amount >= 1000000
                              ? `${amount / 1000000}M`
                              : amount >= 1000
                                ? `${amount / 1000}K`
                                : amount}
                          </Button>
                        ),
                      )}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <motion.div
                    className={`text-center p-6 rounded-xl ${themeStyles.featureCardBg} ${themeStyles.border}`}
                    variants={featureVariants}
                  >
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                      Price per token
                    </p>
                    <p className="text-2xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
                      ₹
                      {(
                        calculateCustomTokenPrice(customTokens) / customTokens
                      ).toFixed(4)}
                    </p>
                  </motion.div>

                  <motion.div
                    className={`text-center p-6 rounded-xl ${themeStyles.featureCardBg} ${themeStyles.border}`}
                    variants={featureVariants}
                    transition={{ delay: 0.1 }}
                  >
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                      Total tokens
                    </p>
                    <p className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                      {customTokens.toLocaleString()}
                    </p>
                  </motion.div>
                </div>

                <ul className="space-y-3 font-montserrat">
                  {[
                    "Custom token amount",
                    "No expiration",
                    "Use across all chatbots",
                    "Bulk discounts available",
                  ].map((feature, idx) => (
                    <motion.li
                      key={idx}
                      className="flex items-center text-sm"
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.1 }}
                    >
                      <div className="p-1 rounded-full bg-green-500/10 mr-3">
                        <Check className="h-3 w-3 text-green-500" />
                      </div>
                      <span className={themeStyles.descriptionText}>
                        {feature}
                      </span>
                    </motion.li>
                  ))}
                </ul>

                <div className="flex flex-col sm:flex-row gap-4">
                  <Button
                    variant={showCustom ? "default" : "outline"}
                    className={`flex-1 transition-all duration-300 ${
                      showCustom
                        ? "bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white"
                        : `border ${themeStyles.border}`
                    }`}
                    onClick={() => setShowCustom(true)}
                  >
                    {showCustom ? (
                      <>
                        <BadgeCheck className="h-4 w-4 mr-2" />
                        Custom Pack Selected
                      </>
                    ) : (
                      "Select Custom Pack"
                    )}
                  </Button>

                  {showCustom && (
                    <Button
                      className="flex-1 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white transition-all duration-300"
                      onClick={handleCustomPurchase}
                      disabled={isProcessing}
                    >
                      {isProcessing ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Processing...
                        </>
                      ) : (
                        <>
                          <CreditCard className="h-4 w-4 mr-2" />
                          Purchase {customTokens.toLocaleString()} tokens
                        </>
                      )}
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Features */}
        <motion.div
          className="grid grid-cols-1 md:grid-cols-3 gap-6"
          variants={containerVariants}
        >
          <motion.div
            variants={featureVariants}
            className={`text-center p-6 md:p-8 rounded-xl ${themeStyles.featureCardBg} ${themeStyles.border} hover:shadow-lg transition-all duration-300`}
          >
            <div className="inline-flex p-4 rounded-full bg-green-500/10 mb-4">
              <Shield className="h-8 w-8 text-green-500" />
            </div>
            <h3 className={`font-semibold mb-3 ${themeStyles.titleText}`}>
              No Expiration
            </h3>
            <p
              className={`text-sm ${themeStyles.descriptionText} font-montserrat`}
            >
              Purchased tokens never expire. Use them whenever you need.
            </p>
          </motion.div>

          <motion.div
            variants={featureVariants}
            transition={{ delay: 0.1 }}
            className={`text-center p-8 rounded-xl ${themeStyles.featureCardBg} ${themeStyles.border} hover:shadow-lg transition-all duration-300`}
          >
            <div className="inline-flex p-4 rounded-full bg-yellow-500/10 mb-4">
              <Zap className="h-8 w-8 text-yellow-500" />
            </div>
            <h3 className={`font-semibold mb-3 ${themeStyles.titleText}`}>
              Use Across All Chatbots
            </h3>
            <p
              className={`text-sm ${themeStyles.descriptionText} font-montserrat`}
            >
              Tokens work with all your chatbots. No restrictions.
            </p>
          </motion.div>

          <motion.div
            variants={featureVariants}
            transition={{ delay: 0.2 }}
            className={`text-center p-8 rounded-xl ${themeStyles.featureCardBg} ${themeStyles.border} hover:shadow-lg transition-all duration-300`}
          >
            <div className="inline-flex p-4 rounded-full bg-blue-500/10 mb-4">
              <TrendingUp className="h-8 w-8 text-blue-500" />
            </div>
            <h3 className={`font-semibold mb-3 ${themeStyles.titleText}`}>
              Bulk Discounts
            </h3>
            <p
              className={`text-sm ${themeStyles.descriptionText} font-montserrat`}
            >
              The more tokens you buy, the less you pay per token.
            </p>
          </motion.div>
        </motion.div>
      </motion.div>
    </>
  );
};
