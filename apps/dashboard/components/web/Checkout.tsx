"use client";

import { useState, useRef, useCallback } from "react";
import { useApi } from "@/lib/useApi";
import { useRouter } from "next/navigation";
import Script from "next/script";
import { motion } from "framer-motion";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { XMarkIcon } from "@heroicons/react/24/outline";
import {
  Loader2,
  Zap,
  CreditCard,
  Bot,
  Check,
  Sparkles,
  Crown,
  Coins,
} from "lucide-react";
import { Button } from "@rocketreplai/ui/components/radix/button";
import { Badge } from "@rocketreplai/ui/components/radix/badge";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogTitle,
} from "@rocketreplai/ui/components/radix/alert-dialog";
import { toast } from "@rocketreplai/ui/components/radix/use-toast";

import {
  createRazorpaySubscription,
  getRazerpayPlanInfo,
  verifyRazorpayPayment,
} from "@/lib/services/subscription-actions.api";
import {
  sendSubscriptionEmailToOwner,
  sendSubscriptionEmailToUser,
} from "@/lib/services/misc-actions.api";
import {
  checkAndPrepareScrape,
  getUserById,
} from "@/lib/services/user-actions.api";
import {
  createWebChatbot,
  processScrapedData,
  purchaseTokens,
  scrapeWebsite,
  updateWebChatbot,
  verifyPurchaseTokens,
} from "@/lib/services/web-actions.api";

interface CheckoutProps {
  userId: string;
  amount: number;
  productId: string;
  billingCycle: "monthly" | "yearly" | "one-time";
  planType: "chatbot" | "tokens";
  tokens?: number;
  chatbotCreated?: boolean;
}

type CheckoutStep =
  | "weblink"
  | "chatbot-create"
  | "scraping"
  | "payment"
  | "subscription-activate";

// Define schema based on chatbot type
const createWebsiteFormSchema = (isEducationChatbot: boolean) => {
  if (isEducationChatbot) {
    return z.object({
      chatbotName: z.string().min(1, "Chatbot name is required"),
      websiteUrl: z.string().optional(),
    });
  } else {
    return z.object({
      chatbotName: z.string().min(1, "Chatbot name is required"),
      websiteUrl: z
        .string()
        .min(1, "Website URL is required")
        .url("Please enter a valid URL"),
    });
  }
};

type WebsiteFormData = z.infer<ReturnType<typeof createWebsiteFormSchema>>;

const RAZORPAY_SCRIPT_ID = "razorpay-checkout-js";
const RAZORPAY_SCRIPT_SRC = "https://checkout.razorpay.com/v1/checkout.js";

export const Checkout = ({
  userId,
  amount,
  productId,
  billingCycle,
  planType = "chatbot",
  tokens,
  chatbotCreated = false,
}: CheckoutProps) => {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentStep, setCurrentStep] = useState<CheckoutStep>("weblink");
  const [showModal, setShowModal] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [scrapingStatus, setScrapingStatus] = useState("");
  const [scrapingComplete, setScrapingComplete] = useState(false);
  const [chatbotCreationComplete, setChatbotCreationComplete] = useState(false);
  const [createdChatbotId, setCreatedChatbotId] = useState<string | null>(null);
  const { apiRequest } = useApi();

  const chatbotNameRef = useRef<string>("");
  const websiteUrlRef = useRef<string>("");
  const razorpayPlanRef = useRef<{ monthly: string; yearly: string } | null>(
    null,
  );
  const userEmailRef = useRef<string>("");

  // Check if this is an education chatbot
  const isEducationChatbot = productId === "chatbot-education";

  // Create form schema based on chatbot type
  const websiteFormSchema = createWebsiteFormSchema(isEducationChatbot);

  const {
    handleSubmit: handleWebsiteSubmit,
    register: registerWebsite,
    formState: { errors: websiteErrors },
  } = useForm<WebsiteFormData>({
    resolver: zodResolver(websiteFormSchema),
    defaultValues: { websiteUrl: "", chatbotName: "" },
  });

  const redirectToSignIn = useCallback(() => {
    router.push("/sign-in");
  }, [router]);

  const showSuccessToast = (message: string) => {
    toast({
      title: "Success!",
      description: message,
      duration: 3000,
    });
  };

  const showErrorToast = (message: string) => {
    toast({
      title: "Error",
      description: message,
      duration: 3000,
      variant: "destructive",
    });
  };

  const fetchRequiredData = async (): Promise<boolean> => {
    try {
      // For chatbot subscriptions, fetch plan info
      if (planType === "chatbot") {
        const planInfo = await getRazerpayPlanInfo(apiRequest, productId);

        if (!planInfo.razorpaymonthlyplanId || !planInfo.razorpayyearlyplanId) {
          router.push("/");
          throw new Error("Plan information not found");
        }

        razorpayPlanRef.current = {
          monthly: planInfo.razorpaymonthlyplanId,
          yearly: planInfo.razorpayyearlyplanId,
        };
      }

      // Fetch user info
      if (!userId) {
        redirectToSignIn();
        return false;
      }

      const user = await getUserById(apiRequest, userId);

      if (!user) {
        redirectToSignIn();
        throw new Error("User not found");
      }

      // Store user info for later use
      userEmailRef.current = user.email || "";
      return true;
    } catch (error) {
      console.error("Error fetching required data:", error);
      showErrorToast(
        error instanceof Error ? error.message : "An error occurred",
      );
      return false;
    }
  };

  const processScraping = async (websiteUrl: string, chatbotId: string) => {
    try {
      setScrapingStatus("Checking if website is already scraped...");

      const checkWebsiteScraped = await checkAndPrepareScrape(apiRequest, {
        userId: userId,
        url: websiteUrl,
        chatbotId: chatbotId,
      });

      if (checkWebsiteScraped.alreadyScrapped) {
        setScrapingStatus("Website already scraped, skipping...");
        return true;
      }
      if (checkWebsiteScraped.success) {
        setScrapingStatus("Scraping website...");

        const scrapeResult = await scrapeWebsite(
          apiRequest,
          websiteUrl,
          chatbotId,
        );
        if (scrapeResult.alreadyScrapped) {
          setScrapingStatus("Website already scraped, skipping...");
          return true;
        }

        if (scrapeResult.success) {
          setScrapingStatus("Processing scraped data...");

          const processResult = await processScrapedData(
            apiRequest,
            scrapeResult.data,
          );

          if (processResult.success) {
            setScrapingStatus("Scraping complete!");
            return true;
          }
        }
      }

      throw new Error("Scraping failed");
    } catch (error) {
      console.error("Error during scraping:", error);
      showErrorToast(
        "Scraping failed, but you can still use the chatbot with limited knowledge",
      );
      return false;
    }
  };

  const createChatbot = async (data: WebsiteFormData) => {
    try {
      setScrapingStatus("Creating chatbot...");

      const result = await createWebChatbot(apiRequest, {
        name: data.chatbotName,
        type: productId,
        websiteUrl: data.websiteUrl,
      });
      return result.chatbot;
    } catch (error) {
      console.error("Error creating chatbot:", error);
      throw error;
    }
  };

  const updateChatbotWithSubscription = async (
    chatbotId: string,
    subscriptionId: string,
  ) => {
    try {
      const result = await updateWebChatbot(apiRequest, chatbotId, {
        subscriptionId,
        isActive: true,
      });

      return result;
    } catch (error) {
      console.error("Error updating chatbot:", error);
      throw error;
    }
  };

  const handleWebsiteFormSubmit = async (data: WebsiteFormData) => {
    chatbotNameRef.current = data.chatbotName;
    websiteUrlRef.current = data.websiteUrl || "";

    if (planType === "tokens") {
      // For tokens, go directly to payment
      setCurrentStep("payment");
      await processTokenPayment();
    } else if (chatbotCreated) {
      // If chatbot is already created, skip creation and go directly to payment
      setShowModal(false);
      setCurrentStep("payment");
      await processChatbotPayment();
    } else {
      // For new chatbot, start chatbot creation process
      setCurrentStep("chatbot-create");
      await processChatbotCreation(data);
    }
  };

  const handleCheckout = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!userId) {
      redirectToSignIn();
      return;
    }

    if (planType === "tokens") {
      // For token purchases, go directly to payment
      await processTokenPayment();
    } else if (chatbotCreated) {
      // If chatbot is already created, go directly to payment without showing modal
      setCurrentStep("payment");
      await processChatbotPayment();
    } else if (isEducationChatbot) {
      // For education chatbot, show modal with just chatbot name field
      setShowModal(true);
      setCurrentStep("weblink");
    } else {
      // For new non-education chatbot purchases, show the modal with weblink form
      setShowModal(true);
      setCurrentStep("weblink");
    }
  };

  const processChatbotCreation = async (data: WebsiteFormData) => {
    try {
      setIsSubmitting(true);
      setProcessing(true);

      // Step 1: Create chatbot first
      setScrapingStatus("Creating your chatbot...");

      const chatbot = await createChatbot(data);

      if (chatbot) {
        setCreatedChatbotId(chatbot.id);
        setChatbotCreationComplete(true);

        if (isEducationChatbot) {
          // For education chatbot, no scraping needed
          setScrapingStatus("Education chatbot created successfully!");
          setScrapingComplete(true);
        } else {
          // For non-education chatbots, proceed with scraping
          setScrapingStatus(
            "Chatbot created successfully! Preparing for scraping...",
          );

          // Step 2: Process scraping (only for non-education chatbots)
          if (data.websiteUrl) {
            await processScraping(data.websiteUrl, chatbot.id);
          }

          setScrapingComplete(true);
          setScrapingStatus("Chatbot setup complete! Proceeding to payment...");
        }

        // Step 3: After successful creation, proceed to payment
        setTimeout(() => {
          setShowModal(false);
          processChatbotPayment();
        }, 1500);
      }
    } catch (error) {
      console.error("Error in chatbot creation process:", error);
      showErrorToast("Failed to create chatbot. Please try again.");
      setCurrentStep("weblink");
      setProcessing(false);
      setIsSubmitting(false);
    }
  };

  const processChatbotPayment = async () => {
    try {
      // Fetch required data before proceeding
      const isDataReady = await fetchRequiredData();
      if (!isDataReady) {
        return;
      }

      const referralCode = localStorage.getItem("referral_code");
      const razorpayPlanId =
        billingCycle === "monthly"
          ? razorpayPlanRef.current?.monthly
          : razorpayPlanRef.current?.yearly;

      if (!razorpayPlanId) {
        throw new Error("Razorpay plan ID not found");
      }

      const result = await createRazorpaySubscription(apiRequest, {
        amount: amount,
        razorpayplanId: razorpayPlanId,
        buyerId: userId,
        referralCode: referralCode || null,
        metadata: {
          productId: productId,
          subscriptionType: "web",
          billingCycle: billingCycle,
        },
      });

      const paymentOptions = {
        key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID!,
        amount: amount * 100,
        currency: "INR",
        name: "AI Chatbot Subscription",
        description: `${productId} - ${billingCycle}`,
        subscription_id: result.subscriptionId,
        prefill: {
          email: userEmailRef.current || "",
        },
        notes: {
          productId,
          buyerId: userId,
          amount,
          chatbotName: chatbotNameRef.current,
          websiteUrl: websiteUrlRef.current,
          chatbotId: createdChatbotId,
          referralCode: referralCode || "",
        },
        handler: async (response: any) => {
          await handleChatbotPaymentSuccess(
            response,
            result.subscriptionId,
            tokens,
          );
        },
        theme: { color: "#EC4899" },
      };

      const razorpay = new (window as any).Razorpay(paymentOptions);

      razorpay.on("payment.failed", (response: any) => {
        showErrorToast(response.error?.description || "Payment failed");
      });

      razorpay.open();
    } catch (error) {
      console.error("Chatbot payment processing error:", error);
      showErrorToast(error instanceof Error ? error.message : "Payment failed");
    } finally {
      setIsSubmitting(false);
      setProcessing(false);
    }
  };

  const handleChatbotPaymentSuccess = async (
    razorpayResponse: any,
    subscriptionId: string,
    tokens?: number,
  ) => {
    try {
      const verificationData = {
        subscription_id: subscriptionId,
        razorpay_payment_id: razorpayResponse.razorpay_payment_id,
        razorpay_signature: razorpayResponse.razorpay_signature,
        tokens,
        amount,
        currency: "INR",
      };

      const verifyResponse = await verifyRazorpayPayment(
        apiRequest,
        verificationData,
      );

      if (verifyResponse.success) {
        const referralCode = localStorage.getItem("referral_code");
        if (referralCode) {
          localStorage.removeItem("referral_code");
        }

        // Update chatbot with subscription ID if it was newly created
        if (createdChatbotId && !chatbotCreated) {
          await updateChatbotWithSubscription(createdChatbotId, subscriptionId);
        }

        setCurrentStep("subscription-activate");
        setShowModal(true);
        setScrapingStatus("Activating your subscription...");

        // Send subscription email
        await sendSubscriptionEmailToOwner(apiRequest, {
          email: userEmailRef.current,
          userId: userId,
          subscriptionId,
        });
        await sendSubscriptionEmailToUser(apiRequest, {
          email: userEmailRef.current,
          userId: userId,
          agentId: productId,
          subscriptionId,
        });

        showSuccessToast("Subscription activated successfully!");

        setTimeout(() => {
          setShowModal(false);
          router.push("/web/dashboard");
        }, 2000);
      } else {
        showErrorToast(verifyResponse.message || "Verification failed");
      }
    } catch (error) {
      console.error("Chatbot payment verification error:", error);
      showErrorToast("Payment verification failed");
    }
  };

  const processTokenPayment = async () => {
    if (!tokens) {
      showErrorToast("Token amount is required");
      return;
    }

    try {
      // Fetch required data before proceeding
      const isDataReady = await fetchRequiredData();
      if (!isDataReady) {
        return;
      }

      const orderData = await purchaseTokens(apiRequest, {
        tokens,
        amount,
        planId: productId,
        buyerId: userId,
      });

      if (!orderData.success) {
        throw new Error("Failed to create token purchase order");
      }

      const paymentOptions = {
        key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID!,
        amount: amount * 100,
        currency: "INR",
        name: "AI Chatbot Tokens",
        description: `${tokens.toLocaleString()} tokens purchase`,
        order_id: orderData.orderId,
        prefill: {
          email: userEmailRef.current || "",
        },
        notes: {
          userId: userId,
          tokens,
          planId: productId,
          type: "token_purchase",
        },
        handler: async (response: any) => {
          await handleTokenPaymentSuccess(response, orderData.orderId, tokens);
        },
        theme: { color: "#EC4899" },
      };

      const razorpay = new (window as any).Razorpay(paymentOptions);
      razorpay.open();
    } catch (error) {
      console.error("Token payment processing error:", error);
      showErrorToast(error instanceof Error ? error.message : "Payment failed");
    }
  };

  const handleTokenPaymentSuccess = async (
    razorpayResponse: any,
    orderId: string,
    tokens: number,
  ) => {
    try {
      const verificationData = {
        razorpay_payment_id: razorpayResponse.razorpay_payment_id,
        razorpay_order_id: razorpayResponse.razorpay_order_id,
        razorpay_signature: razorpayResponse.razorpay_signature,
        tokens,
        amount,
        currency: "INR",
      };

      const verificationResult = await verifyPurchaseTokens(
        apiRequest,
        verificationData,
      );

      if (verificationResult.success) {
        showSuccessToast(
          `${tokens.toLocaleString()} tokens added to your account!`,
        );
        router.push("/web/tokens");
      } else {
        showErrorToast(verificationResult.message || "Verification failed");
      }
    } catch (error) {
      console.error("Token payment verification error:", error);
      showErrorToast("Payment verification failed");
    }
  };

  const getButtonText = () => {
    if (planType === "tokens") {
      return tokens ? `Buy ${tokens.toLocaleString()} Tokens` : "Buy Tokens";
    }
    if (chatbotCreated) {
      return "Activate Subscription";
    }
    if (productId === "free-tier") {
      return "Free Tier";
    }
    return "Create & Subscribe";
  };

  const getButtonGradient = () => {
    if (planType === "tokens") {
      return "bg-gradient-to-r from-purple-500 to-pink-500";
    }
    switch (productId) {
      case "chatbot-lead-generation":
        return "bg-gradient-to-r from-purple-500 to-pink-500";
      case "chatbot-education":
        return "bg-gradient-to-r from-cyan-500 to-blue-500";
      default:
        return "bg-gradient-to-r from-pink-500 to-rose-500";
    }
  };

  const getButtonIcon = () => {
    if (planType === "tokens") {
      return <Coins className="h-4 w-4 mr-2" />;
    }
    if (chatbotCreated) {
      return <Crown className="h-4 w-4 mr-2" />;
    }
    return <Bot className="h-4 w-4 mr-2" />;
  };

  const getModalTitle = () => {
    if (isEducationChatbot) {
      return "Create Your MCQ Education Chatbot";
    }
    switch (currentStep) {
      case "weblink":
        return "Create Your Chatbot";
      case "chatbot-create":
        return "Setting Up Your Chatbot";
      case "scraping":
        return "Training Your Chatbot";
      case "subscription-activate":
        return "Activating Subscription";
      default:
        return "Processing Payment";
    }
  };

  const getModalDescription = () => {
    if (isEducationChatbot) {
      return "Configure your MCQ education chatbot details";
    }
    switch (currentStep) {
      case "weblink":
        return "Configure your chatbot details";
      case "chatbot-create":
        return "We're creating your chatbot";
      case "scraping":
        return "Training chatbot with your website data";
      case "subscription-activate":
        return "Finalizing your subscription";
      default:
        return "Complete your purchase";
    }
  };

  const getStepTitle = () => {
    if (isEducationChatbot) {
      return "CONFIGURE YOUR MCQ CHATBOT";
    }
    switch (currentStep) {
      case "weblink":
        return "CONFIGURE YOUR CHATBOT";
      case "chatbot-create":
        return "CREATING YOUR CHATBOT";
      case "scraping":
        return "TRAINING YOUR CHATBOT";
      case "subscription-activate":
        return "ACTIVATING YOUR SUBSCRIPTION";
      default:
        return "SECURE PAYMENT PROCESSING";
    }
  };

  const getStepDescription = () => {
    if (isEducationChatbot) {
      return "Enter your MCQ chatbot details";
    }
    switch (currentStep) {
      case "weblink":
        return "Enter your website and chatbot details";
      case "chatbot-create":
        return "We're setting up your chatbot instance";
      case "scraping":
        return "Training chatbot with your website data";
      case "subscription-activate":
        return "Finalizing your subscription activation";
      default:
        return "Complete your purchase";
    }
  };

  const getStatusMessage = () => {
    if (isEducationChatbot) {
      return "Education chatbot created successfully!";
    }
    return scrapingStatus || "Initializing...";
  };

  const getFooterText = () => {
    if (isEducationChatbot) {
      return "MCQ EDUCATION CHATBOT CONFIGURATION";
    }
    switch (currentStep) {
      case "weblink":
        return "CUSTOM CHATBOT CONFIGURATION";
      case "chatbot-create":
        return "CHATBOT CREATION IN PROGRESS";
      case "scraping":
        return "AUTOMATED TRAINING IN PROGRESS";
      case "subscription-activate":
        return "SUBSCRIPTION ACTIVATION";
      default:
        return "SECURE PAYMENT PROCESSING";
    }
  };

  const renderWebsiteModal = () => (
    <AlertDialog open={showModal} onOpenChange={setShowModal}>
      <AlertDialogContent className="bg-white border border-gray-100 rounded-2xl max-w-md p-0 overflow-hidden shadow-xl">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3, ease: "easeOut" }}
          className="relative"
        >
          {/* Header with gradient */}
          <div className="bg-gradient-to-r from-pink-500 to-rose-500 p-6">
            <div className="flex justify-between items-center">
              <div>
                <AlertDialogTitle className="text-white text-xl font-bold">
                  {getModalTitle()}
                </AlertDialogTitle>
                <p className="text-pink-100 text-sm mt-1">
                  {getModalDescription()}
                </p>
              </div>
              {currentStep !== "chatbot-create" &&
                currentStep !== "scraping" &&
                currentStep !== "subscription-activate" && (
                  <AlertDialogCancel className="border-0 p-2 hover:bg-white/10 rounded-xl transition-all bg-transparent">
                    <XMarkIcon className="h-5 w-5 text-white" />
                  </AlertDialogCancel>
                )}
            </div>
          </div>

          {currentStep === "weblink" ? (
            <form
              onSubmit={handleWebsiteSubmit(handleWebsiteFormSubmit)}
              className="p-6 space-y-6"
            >
              <div className="text-center">
                <h3 className="text-lg font-bold text-gray-800">
                  {getStepTitle()}
                </h3>
                <p className="text-sm text-gray-400 mt-1">
                  {getStepDescription()}
                </p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Chatbot Name
                  </label>
                  <input
                    {...registerWebsite("chatbotName")}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-pink-200"
                    placeholder={
                      isEducationChatbot
                        ? "My MCQ Education Chatbot"
                        : "My Support Chatbot"
                    }
                    disabled={isSubmitting || processing}
                  />
                  {websiteErrors.chatbotName && (
                    <p className="text-red-500 text-sm mt-1">
                      {websiteErrors.chatbotName.message}
                    </p>
                  )}
                </div>

                {!isEducationChatbot && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Website URL
                    </label>
                    <input
                      {...registerWebsite("websiteUrl")}
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-pink-200"
                      placeholder="https://example.com"
                      disabled={isSubmitting || processing}
                    />
                    {websiteErrors.websiteUrl && (
                      <p className="text-red-500 text-sm mt-1">
                        {websiteErrors.websiteUrl.message}
                      </p>
                    )}
                  </div>
                )}

                <div className="bg-pink-50 border border-pink-200 rounded-xl p-3">
                  <p className="text-pink-600 text-sm flex items-center">
                    <Bot className="h-4 w-4 mr-2" />
                    {isEducationChatbot
                      ? "Education chatbot is designed for MCQ-based learning and doesn't require website scraping"
                      : "Each chatbot type can only be created once per account"}
                  </p>
                </div>
              </div>

              <Button
                type="submit"
                disabled={isSubmitting || processing}
                className="w-full py-3 bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600 text-white rounded-xl font-medium"
              >
                {processing ? (
                  <div className="flex items-center justify-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Processing...
                  </div>
                ) : isSubmitting ? (
                  <div className="flex items-center justify-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Processing...
                  </div>
                ) : (
                  "Create & Proceed to Payment"
                )}
              </Button>
            </form>
          ) : currentStep === "chatbot-create" || currentStep === "scraping" ? (
            <div className="p-6 space-y-6">
              <div className="text-center">
                <h3 className="text-lg font-bold text-gray-800">
                  {getStepTitle()}
                </h3>
                <p className="text-sm text-gray-400 mt-1">
                  {getStepDescription()}
                </p>
              </div>

              <div className="space-y-4">
                <div className="bg-gray-50 rounded-xl p-4">
                  <div className="flex items-center space-x-3">
                    <div className="flex-shrink-0">
                      {scrapingComplete && chatbotCreationComplete ? (
                        <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
                          <Check className="w-4 h-4 text-white" />
                        </div>
                      ) : (
                        <Loader2 className="w-6 h-6 text-pink-500 animate-spin" />
                      )}
                    </div>
                    <div className="flex-1">
                      <p className="text-gray-800 font-medium">
                        {scrapingComplete && chatbotCreationComplete
                          ? "Setup Complete"
                          : "Processing"}
                      </p>
                      <p className="text-gray-400 text-sm mt-1">
                        {getStatusMessage()}
                      </p>
                    </div>
                  </div>
                </div>

                {scrapingComplete && chatbotCreationComplete && (
                  <div className="bg-green-50 border border-green-200 rounded-xl p-4">
                    <p className="text-green-600 text-sm flex items-center">
                      <Check className="h-4 w-4 mr-2" />
                      Your chatbot is ready! Redirecting to payment...
                    </p>
                  </div>
                )}
              </div>
            </div>
          ) : currentStep === "subscription-activate" ? (
            <div className="p-6 space-y-6">
              <div className="text-center">
                <h3 className="text-lg font-bold text-gray-800">
                  {getStepTitle()}
                </h3>
                <p className="text-sm text-gray-400 mt-1">
                  {getStepDescription()}
                </p>
              </div>

              <div className="space-y-4">
                <div className="bg-gray-50 rounded-xl p-4">
                  <div className="flex items-center space-x-3">
                    <div className="flex-shrink-0">
                      <Loader2 className="w-6 h-6 text-pink-500 animate-spin" />
                    </div>
                    <div className="flex-1">
                      <p className="text-gray-800 font-medium">
                        Activating Subscription
                      </p>
                      <p className="text-gray-400 text-sm mt-1">
                        {scrapingStatus || "Finalizing setup..."}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="bg-green-50 border border-green-200 rounded-xl p-4">
                  <p className="text-green-600 text-sm flex items-center">
                    <Check className="h-4 w-4 mr-2" />
                    Payment successful! Activating your subscription...
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="p-12 text-center">
              <div className="flex flex-col items-center justify-center space-y-4">
                <Loader2 className="w-8 h-8 text-pink-500 animate-spin" />
                <p className="text-gray-600">Redirecting to payment...</p>
              </div>
            </div>
          )}

          <div className="p-4 text-center border-t border-gray-100">
            <AlertDialogDescription className="text-xs text-gray-400">
              {getFooterText()}
            </AlertDialogDescription>
          </div>
        </motion.div>
      </AlertDialogContent>
    </AlertDialog>
  );

  return (
    <>
      <form onSubmit={handleCheckout} className="w-full ">
        <Button
          type="submit"
          disabled={isSubmitting || processing || productId === "free-tier"}
          className={`w-full py-3 rounded-xl  font-medium hover:opacity-90 transition-opacity ${getButtonGradient()} text-white`}
        >
          {getButtonIcon()}
          {getButtonText()}
        </Button>
      </form>

      {showModal && renderWebsiteModal()}

      {(planType === "chatbot" || planType === "tokens") && (
        <Script id={RAZORPAY_SCRIPT_ID} src={RAZORPAY_SCRIPT_SRC} />
      )}
    </>
  );
};
