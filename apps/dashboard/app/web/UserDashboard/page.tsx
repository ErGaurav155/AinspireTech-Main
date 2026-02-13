"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import { SignedIn, SignedOut, useAuth } from "@clerk/nextjs";
import { useTheme } from "next-themes";
import { motion, AnimatePresence } from "framer-motion";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Bot,
  MessageCircle,
  Calendar,
  Users,
  TrendingUp,
  Settings,
  Code,
  Eye,
  Copy,
  CheckCircle,
  AlertCircle,
  Clock,
  Plus,
  BarChart3,
  X,
  CreditCard,
  Globe,
  Save,
  Upload,
  Trash2,
  Edit,
  Phone,
  Mail,
  User,
  ShoppingCart,
  GraduationCap,
  Target,
  Instagram,
  Zap,
  Star,
  Crown,
  Lock,
  Check,
  Loader2,
  LucideIcon,
  AlertTriangle,
  Coins,
  Sparkles,
  ExternalLink,
} from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { toast } from "@rocketreplai/ui/components/radix/use-toast";
import { countryCodes } from "@rocketreplai/shared";
import { Button } from "@rocketreplai/ui/components/radix/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@rocketreplai/ui/components/radix/card";
import { Badge } from "@rocketreplai/ui/components/radix/badge";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@rocketreplai/ui/components/radix/alert-dialog";
import { Input } from "@rocketreplai/ui/components/radix/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@rocketreplai/ui/components/radix/dialog";
import { TokenPurchase } from "@/components/web/TokenPurchase";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@rocketreplai/ui/components/radix/tabs";
import { Textarea } from "@rocketreplai/ui/components/radix/textarea";
import { Label } from "@rocketreplai/ui/components/radix/label";
import { BreadcrumbsDefault } from "@rocketreplai/ui/components/shared/breadcrumbs";
import OTPVerification from "@/components/web/OTPVerification";
import { XMarkIcon } from "@heroicons/react/24/solid";
import {
  createWebChatbot,
  getAnalytics,
  getAppointmentQuestions,
  getChatbots,
  getConversations,
  getFAQ,
  getSubscriptions,
  getTokenBalance,
  getTokenUsage,
  processScrapedData,
  saveAppointmentQuestions,
  saveFAQ,
  scrapeWebsite,
  sendOtp,
} from "@/lib/services/web-actions.api";

// Components

// Types
interface ScrapedPage {
  url: string;
  title: string;
  description: string;
  headings: {
    h1: string[];
    h2: string[];
    h3: string[];
  };
  content: string;
  level: number;
}

interface ScrapedData {
  fileName: string;
  domain: string;
  userId: string;
  totalPages: number;
  maxLevel: number;
  cloudinaryLink: string;
  pages: ScrapedPage[];
}

interface Subscription {
  chatbotType: string;
  clerkId: string;
  status: string;
  billingCycle: string;
  subscriptionId?: string;
  chatbotName?: string;
  chatbotMessage?: string;
}

interface Conversation {
  id?: string;
  customerName?: string;
  status: string;
  messages: Array<{
    id: string;
    type: string;
    content: string;
    timestamp: string;
  }>;
  formData?: Array<{
    question: string;
    answer: string;
  }>;
  createdAt: string;
}

interface FAQQuestion {
  id: string;
  question: string;
  answer: string;
  category: string;
}

interface AppointmentQuestion {
  id: number;
  question: string;
  type: string;
  required: boolean;
  options?: string[];
}

interface ChatbotType {
  id: string;
  name: string;
  icon: LucideIcon;
  description: string;
  category: string;
  color: string;
  gradient: string;
  features: string[];
}

interface TokenBalance {
  availableTokens: number;
  freeTokensRemaining: number;
  purchasedTokensRemaining: number;
  freeTokens: number;
  purchasedTokens: number;
  usedFreeTokens: number;
  usedPurchasedTokens: number;
  totalTokensUsed: number;
  lastResetAt: string;
  nextResetAt: string;
}

interface ChatbotStatus {
  id: string;
  name: string;
  type: string;
  isBuilt: boolean;
  websiteUrl?: string;
  scrappedFile?: string;
  chatbotName?: string;
  chatbotMessage?: string;
  analytics?: any;
  conversations?: Conversation[];
}

type BillingMode = "Immediate" | "End-of-term";
type OTPStep = "phone" | "otp" | "weblink";
type DashboardTab = "overview" | "conversations" | "integration" | "settings";

// Form Schema
const phoneFormSchema = z.object({
  MobileNumber: z
    .string()
    .min(10, "Phone number must be at least 10 digits")
    .regex(/^\d+$/, "Invalid phone number format"),
});

type PhoneFormData = z.infer<typeof phoneFormSchema>;

// Chatbot types configuration
const CHATBOT_TYPES: ChatbotType[] = [
  {
    id: "chatbot-lead-generation",
    name: "Lead Generation",
    icon: Target,
    description: "Convert visitors into qualified leads",
    category: "Website",
    color: "text-[#B026FF]",
    gradient: "from-[#B026FF] to-[#FF2E9F]",
    features: [
      "Lead qualification",
      "Contact forms",
      "CRM integration",
      "Follow-up automation",
    ],
  },
  {
    id: "chatbot-customer-support",
    name: "Customer Support",
    icon: MessageCircle,
    description: "24/7 automated customer service",
    category: "Website",
    color: "text-[#00F0FF]",
    gradient: "from-[#00F0FF] to-[#0080FF]",
    features: [
      "Instant responses",
      "Multi-language support",
      "Ticket routing",
      "FAQ automation",
    ],
  },
  {
    id: "chatbot-education",
    name: "Chatbot Education",
    icon: Instagram,
    description: "Automate Instagram engagement",
    category: "Social Media",
    color: "text-[#E4405F]",
    gradient: "from-[#E4405F] to-[#F56040]",
    features: [
      "Comment automation",
      "DM responses",
      "Story interactions",
      "Hashtag monitoring",
    ],
  },
];

// Component
export default function DashboardPage() {
  const router = useRouter();
  const { userId, isLoaded } = useAuth();
  const { theme, resolvedTheme } = useTheme();
  const hasLoadedRef = useRef(false);

  // State
  const [selectedChatbot, setSelectedChatbot] = useState<string>(
    "chatbot-customer-support",
  );
  const [copied, setCopied] = useState(false);
  const [subscriptions, setSubscriptions] = useState<
    Record<string, Subscription>
  >({});
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [analytics, setAnalytics] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>("");

  // Chatbot status tracking
  const [chatbotStatuses, setChatbotStatuses] = useState<ChatbotStatus[]>([
    {
      id: "chatbot-lead-generation",
      name: "Lead Generation",
      type: "chatbot-lead-generation",
      isBuilt: false,
    },
    {
      id: "chatbot-customer-support",
      name: "Customer Support",
      type: "chatbot-customer-support",
      isBuilt: false,
    },
    {
      id: "chatbot-education",
      name: "Chatbot Education",
      type: "chatbot-education",
      isBuilt: false,
    },
  ]);

  // Token states
  const [tokenBalance, setTokenBalance] = useState<TokenBalance | null>(null);
  const [showTokenPurchase, setShowTokenPurchase] = useState(false);
  const [tokenUsage, setTokenUsage] = useState<any>(null);
  const [showLowTokenAlert, setShowLowTokenAlert] = useState(false);

  // Website scraping states
  const [websiteUrl, setWebsiteUrl] = useState<string | null>(null);
  const [isWebScrapped, setIsWebScrapped] = useState(false);
  const [webError, setWebError] = useState<string | null>(null);
  const [webLoading, setWebLoading] = useState(false);
  const [scrapedData, setScrapedData] = useState<ScrapedData | null>(null);
  const [processing, setProcessing] = useState(false);

  // Phone verification states
  const [otpStep, setOtpStep] = useState<OTPStep>("weblink");
  const [phone, setPhone] = useState<string | null>(null);
  const [countryCode, setCountryCode] = useState("+1");
  const [isOtpSubmitting, setIsOtpSubmitting] = useState(false);

  // Chatbot settings states
  const [chatbotName, setChatbotName] = useState<string | null>(null);
  const [chatbotMessage, setChatbotMessage] = useState<string | null>(null);
  const [infoLoading, setInfoLoading] = useState(false);
  const [fileLink, setFileLink] = useState<string | undefined>();

  // FAQ states
  const [faqQuestions, setFaqQuestions] = useState<FAQQuestion[]>([
    {
      id: "1",
      question: "What are your business hours?",
      answer: "We are open from 9 AM to 6 PM, Monday to Friday.",
      category: "General",
    },
    {
      id: "2",
      question: "How can I contact support?",
      answer:
        "You can contact our support team via email at support@example.com or call us at (555) 123-4567.",
      category: "Support",
    },
  ]);

  // Appointment questions states
  const [appointmentQuestions, setAppointmentQuestions] = useState<
    AppointmentQuestion[]
  >([
    {
      id: 1,
      question: "What is your full name?",
      type: "text",
      required: true,
    },
    {
      id: 2,
      question: "What is your email address?",
      type: "email",
      required: true,
    },
    {
      id: 3,
      question: "What is your phone number?",
      type: "tel",
      required: true,
    },
    {
      id: 4,
      question: "What service are you interested in?",
      type: "select",
      options: ["Consultation", "Service A", "Service B"],
      required: true,
    },
    {
      id: 5,
      question: "Preferred appointment date?",
      type: "date",
      required: true,
    },
  ]);

  // Build chatbot dialog states
  const [showBuildDialog, setShowBuildDialog] = useState(false);
  const [buildWebsiteUrl, setBuildWebsiteUrl] = useState("");
  const [buildChatbotName, setBuildChatbotName] = useState("");
  const [buildStep, setBuildStep] = useState<
    "weblink" | "payment" | "scraping" | "chatbot-create"
  >("weblink");
  const [isBuilding, setIsBuilding] = useState(false);
  const [buildError, setBuildError] = useState<string | null>(null);

  // Derived state
  const currentTheme = resolvedTheme || theme || "light";
  const currentChatbot = CHATBOT_TYPES.find(
    (bot) => bot.id === selectedChatbot,
  );
  const currentChatbotStatus = chatbotStatuses.find(
    (status) => status.type === selectedChatbot,
  );
  const hasBuiltChatbot = currentChatbotStatus?.isBuilt || false;
  const isSubscribed = subscriptions[selectedChatbot]?.status === "active";
  const isTokenLow =
    tokenBalance?.availableTokens && tokenBalance.availableTokens < 1000;
  const isEducationChatbot = selectedChatbot === "chatbot-education";

  // Form handling
  const {
    handleSubmit: handlePhoneSubmit,
    register: registerPhone,
    formState: { errors: phoneErrors },
  } = useForm<PhoneFormData>({
    resolver: zodResolver(phoneFormSchema),
  });

  // Theme-based styles
  const themeStyles = useMemo(() => {
    const isDark = currentTheme === "dark";
    return {
      textPrimary: isDark ? "text-white" : "text-n-7",
      textSecondary: isDark ? "text-gray-300" : "text-n-5",
      textMuted: isDark ? "text-gray-400" : "text-n-5",
      containerBg: isDark ? "bg-transparent" : "bg-gray-50",
      cardBg: isDark ? "bg-gray-900/30" : "bg-white",
      cardBorder: isDark ? "border-gray-800/50" : "border-gray-200",
      hoverBorder: isDark
        ? "hover:border-gray-700/50"
        : "hover:border-gray-300",
      activeBorder: isDark ? "border-[#00F0FF]/50" : "border-[#00F0FF]",
      badgeActiveBg: isDark
        ? "bg-green-500/20 text-green-400 border-green-500/30"
        : "bg-green-100 text-green-600 border-green-300",
      badgeInactiveBg: isDark
        ? "bg-gray-700/50 text-gray-400"
        : "bg-gray-100 text-gray-600 border-gray-300",
      inputBg: isDark ? "bg-transparent" : "bg-white",
      inputBorder: isDark ? "border-gray-700" : "border-gray-300",
      dialogBg: isDark
        ? "bg-gray-900/95 backdrop-blur-md"
        : "bg-white backdrop-blur-md",
      alertBg: isDark
        ? "bg-gray-900/95 backdrop-blur-md"
        : "bg-white backdrop-blur-md",
    };
  }, [currentTheme]);

  // Helper functions
  const showSuccessToast = (title: string, description?: string) => {
    toast({
      title,
      description,
      duration: 3000,
      className: "success-toast",
    });
  };

  const showErrorToast = (title: string, description?: string) => {
    toast({
      title,
      description,
      duration: 3000,
      className: "error-toast",
      variant: "destructive",
    });
  };

  // Load chatbot data for a specific type
  const loadChatbotData = useCallback(
    async (chatbotType: string) => {
      try {
        // Load user chatbots from API
        const data = await getChatbots();
        const userChatbots = data.chatbots || [];
        // Find chatbot for the current type
        const chatbot = userChatbots.find((c: any) => c.type === chatbotType);

        if (chatbot) {
          // Update chatbot status without triggering re-render loops
          setChatbotStatuses((prev) => {
            const existing = prev.find((s) => s.type === chatbotType);
            if (existing?.isBuilt) return prev; // Don't update if already built

            return prev.map((status) =>
              status.type === chatbotType
                ? {
                    ...status,
                    isBuilt: true,
                    websiteUrl: chatbot.websiteUrl,
                    scrappedFile: chatbot.scrappedFile,
                    chatbotName: chatbot.name,
                    chatbotMessage: chatbot.settings?.welcomeMessage,
                  }
                : status,
            );
          });

          // Set current state for the selected chatbot
          if (selectedChatbot === chatbotType) {
            setIsWebScrapped(true);
            setWebsiteUrl(chatbot.websiteUrl);
            setFileLink(chatbot.scrappedFile);
            setChatbotName(chatbot.name);
            setChatbotMessage(chatbot.settings?.welcomeMessage);

            // Load analytics and conversations for built chatbots
            if (
              chatbotType === "chatbot-lead-generation" ||
              chatbotType === "chatbot-customer-support"
            ) {
              try {
                const analyticsData = await getAnalytics(chatbotType);
                setAnalytics(analyticsData.analytics);
              } catch (analyticsError) {
                console.warn("Failed to load analytics:", analyticsError);
              }

              try {
                const conversationsData = await getConversations(chatbotType);
                setConversations(conversationsData.conversations || []);
              } catch (conversationsError) {
                console.warn(
                  "Failed to load conversations:",
                  conversationsError,
                );
              }
            }
          }
        }
      } catch (error) {
        console.error(`Error loading chatbot data for ${chatbotType}:`, error);
      }
    },
    [selectedChatbot],
  ); // Only depends on selectedChatbot

  // Data loading
  const loadDashboardData = useCallback(async () => {
    if (!userId || hasLoadedRef.current) return; // Prevent re-running
    try {
      setLoading(true);
      setError("");
      hasLoadedRef.current = true; // Mark as loading started

      if (!userId) {
        router.push("/sign-in");
        return;
      }

      // Load token balance

      const tokenData = await getTokenBalance();
      setTokenBalance(tokenData);

      // Check for low token alert
      if (tokenData.availableTokens < 1000) {
        setShowLowTokenAlert(true);
      }

      // Load token usage
      const usageData = await getTokenUsage();
      setTokenUsage(usageData);

      // Load subscriptions
      const subscriptionsData = await getSubscriptions();

      if (!Array.isArray(subscriptionsData)) {
        throw new Error("Invalid subscriptions data format");
      }

      const subscriptionsMap = subscriptionsData.reduce(
        (acc: Record<string, Subscription>, sub: Subscription) => {
          acc[sub.chatbotType] = sub;
          return acc;
        },
        {},
      );

      setSubscriptions(subscriptionsMap);

      // Load data for all chatbots
      for (const chatbotType of [
        "chatbot-lead-generation",
        "chatbot-customer-support",
        "chatbot-education",
      ]) {
        await loadChatbotData(chatbotType);
      }

      // Set chatbot name and message for selected chatbot
      if (selectedChatbot) {
        const currentStatus = chatbotStatuses.find(
          (status) => status.type === selectedChatbot,
        );
        if (currentStatus?.isBuilt) {
          setChatbotName(currentStatus.chatbotName || null);
          setChatbotMessage(currentStatus.chatbotMessage || null);
        }
      }

      // Load FAQ questions for selected chatbot
      try {
        const faqResponse = await getFAQ(selectedChatbot);
        setFaqQuestions(faqResponse.faq?.questions || []);
      } catch (faqError) {
        console.warn("Failed to load FAQ:", faqError);
        // Keep default FAQ questions
      }

      // Load appointment questions for selected chatbot
      try {
        const questionsResponse =
          await getAppointmentQuestions(selectedChatbot);
        if (questionsResponse?.appointmentQuestions?.questions) {
          setAppointmentQuestions(
            questionsResponse.appointmentQuestions.questions,
          );
        }
      } catch (appointmentError) {
        console.warn("Failed to load appointment questions:", appointmentError);
      }
    } catch (err: any) {
      const errorMessage = err.message || "Failed to load dashboard data";
      setError(errorMessage);
      showErrorToast("Loading Error", errorMessage);
    } finally {
      setLoading(false);
    }
  }, [userId, selectedChatbot, router, chatbotStatuses, loadChatbotData]);

  // Effects
  useEffect(() => {
    if (!isLoaded) return;

    if (!userId) {
      router.push("/sign-in");
      return;
    }

    if (!hasLoadedRef.current) {
      loadDashboardData();
    }
    return () => {
      hasLoadedRef.current = false;
    };
  }, [userId, isLoaded, router, loadDashboardData]);

  useEffect(() => {
    if (userId && hasLoadedRef.current) {
      // When chatbot changes, load data for that specific chatbot
      loadChatbotData(selectedChatbot);

      // Also update token balance if needed
      refreshTokenBalance();
    }
  }, [selectedChatbot, userId, loadChatbotData]); // Only reload when selectedChatbot changes

  // Token-related functions
  const refreshTokenBalance = async () => {
    try {
      const tokenData = await getTokenBalance();

      setTokenBalance(tokenData);

      if (tokenData.availableTokens < 1000) {
        setShowLowTokenAlert(true);
      } else {
        setShowLowTokenAlert(false);
      }
    } catch (error) {
      console.error("Error refreshing token balance:", error);
    }
  };

  // Event handlers
  const handleCopyCode = () => {
    const currentStatus = chatbotStatuses.find(
      (status) => status.type === selectedChatbot,
    );
    if (!currentStatus?.isBuilt) {
      showErrorToast("Error", "Please build your chatbot first");
      return;
    }

    const code =
      selectedChatbot === "chatbot-education"
        ? `<script 
src="https://rocketreplai.com/mcqchatbotembed.js" 
data-mcq-chatbot='{
  "userId":"${userId}",
  "isAuthorized":true,
  "chatbotType":"${selectedChatbot}",
  "apiUrl":"https://rocketreplai.com",
  "primaryColor":"#00F0FF",
  "position":"bottom-right",
  "welcomeMessage":"${chatbotMessage || "Hi! How can I help you today?"}",
  "chatbotName":"${chatbotName || currentChatbot?.name}"
}'>
</script>`
        : `<script 
src="https://rocketreplai.com/chatbotembed.js" 
data-chatbot-config='{
  "userId":"${userId}",
  "isAuthorized":true,
  "filename":"${currentStatus.scrappedFile}",
  "chatbotType":"${selectedChatbot}",
  "apiUrl":"https://rocketreplai.com",
  "primaryColor":"#00F0FF",
  "position":"bottom-right",
  "welcomeMessage":"${chatbotMessage || "Hi! How can I help you today?"}",
  "chatbotName":"${chatbotName || currentChatbot?.name}"
}'>
</script>`;

    navigator.clipboard.writeText(code);
    setCopied(true);
    showSuccessToast(
      "Code copied!",
      "Universal widget code copied to clipboard",
    );

    setTimeout(() => setCopied(false), 3000);
  };

  const handleBuildChatbot = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!buildChatbotName.trim()) {
      setBuildError("Please enter a chatbot name");
      return;
    }

    // For education chatbot, skip URL validation
    if (!isEducationChatbot) {
      if (!buildWebsiteUrl.trim()) {
        setBuildError("Please enter a website URL");
        return;
      }

      // URL validation for non-education chatbots
      if (!/^https?:\/\//i.test(buildWebsiteUrl.trim())) {
        setBuildError("URL must start with http:// or https://");
        return;
      }

      try {
        new URL(buildWebsiteUrl.trim());
      } catch {
        setBuildError("Invalid URL format. Please enter a valid URL.");
        return;
      }
    }

    setIsBuilding(true);
    setBuildError(null);
    setBuildStep("payment");

    // For now, we'll simulate the payment step and move to next step
    setTimeout(() => {
      if (isEducationChatbot) {
        // For education chatbot, skip scraping and go directly to chatbot creation
        setBuildStep("chatbot-create");
        proceedWithChatbotCreation();
      } else {
        // For other chatbots, proceed with scraping
        setBuildStep("scraping");
        proceedWithScraping();
      }
    }, 2000);
  };

  const proceedWithScraping = async () => {
    try {
      // Create chatbot first
      setBuildStep("chatbot-create");

      const chatbotData = await createWebChatbot({
        name: buildChatbotName.trim(),
        type: selectedChatbot,
        websiteUrl: buildWebsiteUrl.trim(),
      });
      const chatbotId = chatbotData.chatbot.id;

      // Now scrape the website (only for non-education chatbots)

      const scrapeResult = await scrapeWebsite(
        buildWebsiteUrl.trim(),
        chatbotId,
      );
      if (scrapeResult.alreadyScrapped) {
        return true;
      }

      if (scrapeResult.success) {
        // Process scraped data

        const processResult = await processScrapedData({
          ...scrapeResult.data,
          chatbotId,
        });

        if (processResult.success) {
          // Update chatbot status
          setChatbotStatuses((prev) =>
            prev.map((status) =>
              status.type === selectedChatbot
                ? {
                    ...status,
                    isBuilt: true,
                    websiteUrl: buildWebsiteUrl.trim(),
                    scrappedFile: processResult.data.cloudinaryLink,
                    chatbotName: buildChatbotName.trim(),
                  }
                : status,
            ),
          );

          // Set current state
          setIsWebScrapped(true);
          setWebsiteUrl(buildWebsiteUrl.trim());
          setFileLink(processResult.data.cloudinaryLink);
          setChatbotName(buildChatbotName.trim());

          showSuccessToast(
            "Chatbot Built Successfully!",
            "Your chatbot is now ready to use with your website data.",
          );

          // Refresh dashboard data
          setTimeout(() => {
            loadChatbotData(selectedChatbot);
            setShowBuildDialog(false);
            setBuildStep("weblink");
            setBuildWebsiteUrl("");
            setBuildChatbotName("");
          }, 2000);
        } else {
          throw new Error("Data processing failed");
        }
      } else {
        throw new Error("Scraping failed");
      }
    } catch (err: any) {
      const errorMessage = err.message || "An unknown error occurred.";
      setBuildError("An unknown error occurred.");
      setBuildStep("weblink");
      showErrorToast("Build Error", errorMessage);
    } finally {
      setIsBuilding(false);
    }
  };

  const proceedWithChatbotCreation = async () => {
    try {
      // For education chatbot, create without website scraping

      const chatbotData = await createWebChatbot({
        name: buildChatbotName.trim(),
        type: selectedChatbot,
      });
      // Update chatbot status for education chatbot
      setChatbotStatuses((prev) =>
        prev.map((status) =>
          status.type === selectedChatbot
            ? {
                ...status,
                isBuilt: true,
                websiteUrl: undefined, // No website URL
                scrappedFile: undefined, // No scraped file
                chatbotName: buildChatbotName.trim(),
              }
            : status,
        ),
      );

      // Set current state
      setIsWebScrapped(true);
      setWebsiteUrl(null);
      setFileLink(undefined);
      setChatbotName(buildChatbotName.trim());

      showSuccessToast(
        "Education Chatbot Built Successfully!",
        "Your MCQ education chatbot is now ready to use.",
      );

      // Refresh dashboard data
      setTimeout(() => {
        loadChatbotData(selectedChatbot);
        setShowBuildDialog(false);
        setBuildStep("weblink");
        setBuildWebsiteUrl("");
        setBuildChatbotName("");
      }, 2000);
    } catch (err: any) {
      const errorMessage = err.message || "An unknown error occurred.";
      setBuildError("An unknown error occurred.");
      setBuildStep("weblink");
      showErrorToast("Build Error", errorMessage);
    } finally {
      setIsBuilding(false);
    }
  };

  const handleScrape = async () => {
    const currentStatus = chatbotStatuses.find(
      (status) => status.type === selectedChatbot,
    );
    if (!currentStatus?.websiteUrl || !userId || isEducationChatbot) {
      setWebError("Website scraping is not applicable for education chatbot");
      return;
    }

    const websiteUrlToScrape = currentStatus.websiteUrl;

    // URL validation
    if (!/^https?:\/\//i.test(websiteUrlToScrape.trim())) {
      setWebError("URL must start with http:// or https://");
      return;
    }

    try {
      new URL(websiteUrlToScrape);
    } catch {
      setWebError("Invalid URL format. Please enter a valid URL.");
      return;
    }

    setWebLoading(true);
    setWebError(null);
    setScrapedData(null);

    try {
      // We need the chatbot ID to rescrape
      // For now, we'll just show an error
      setWebError(
        "Rescraping requires chatbot ID. Please rebuild the chatbot if needed.",
      );
      showErrorToast(
        "Scraping Error",
        "Please rebuild the chatbot to update website data.",
      );
    } catch (err: any) {
      const errorMessage = err.message || "An unknown error occurred.";
      setWebError(errorMessage);
      showErrorToast("Scraping Error", errorMessage);
    } finally {
      setWebLoading(false);
    }
  };

  const handlePhoneSubmission = async (data: PhoneFormData) => {
    setIsOtpSubmitting(true);
    try {
      const fullPhoneNumber = `${countryCode}${data.MobileNumber}`;

      const res = await sendOtp(fullPhoneNumber);
      if (res.success) {
        setPhone(fullPhoneNumber);
        setOtpStep("otp");
        showSuccessToast(
          "OTP Sent",
          "Please check your phone for the verification code.",
        );
      } else {
        const errorText = await res.text();
        throw new Error(errorText || "Failed to send OTP");
      }
    } catch (error: any) {
      console.error("Error sending OTP:", error);
      showErrorToast("OTP Error", error.message || "Failed to send OTP");
    } finally {
      setIsOtpSubmitting(false);
    }
  };

  const handleChangedInfo = async () => {
    if (!userId || !selectedChatbot || !chatbotMessage || !chatbotName) {
      showErrorToast("Error", "Please fill in all required fields");
      return;
    }

    setInfoLoading(true);
    try {
      // Update chatbot status with new info
      setChatbotStatuses((prev) =>
        prev.map((status) =>
          status.type === selectedChatbot
            ? {
                ...status,
                chatbotName,
                chatbotMessage,
              }
            : status,
        ),
      );

      // Also save to localStorage for persistence
      localStorage.setItem(`${userId}-${selectedChatbot}-name`, chatbotName);
      localStorage.setItem(
        `${userId}-${selectedChatbot}-message`,
        chatbotMessage,
      );

      showSuccessToast(
        "Settings Updated",
        "Chatbot information updated successfully!",
      );
    } catch (error: any) {
      console.error("Error updating chatbotInfo:", error);
      showErrorToast(
        "Update Error",
        error.message || "Failed to update settings",
      );
    } finally {
      setInfoLoading(false);
    }
  };

  const saveFAQs = async () => {
    try {
      await saveFAQ(userId!, selectedChatbot, faqQuestions);
      showSuccessToast("FAQ Saved", "Your FAQ questions have been updated.");
    } catch (err: any) {
      showErrorToast("Save Error", err.message || "Failed to save FAQ");
    }
  };

  const savingAppointmentQuestions = async () => {
    try {
      await saveAppointmentQuestions(selectedChatbot, appointmentQuestions);
      showSuccessToast(
        "Questions Saved",
        "Appointment questions saved successfully!",
      );
    } catch (err: any) {
      showErrorToast(
        "Save Error",
        "Failed to save appointment questions: " + err.message,
      );
    }
  };

  const addFAQQuestion = () => {
    setFaqQuestions([
      ...faqQuestions,
      {
        id: Date.now().toString(),
        question: "",
        answer: "",
        category: "General",
      },
    ]);
  };

  const updateFAQQuestion = (id: string, field: string, value: any) => {
    setFaqQuestions(
      faqQuestions.map((q) => (q.id === id ? { ...q, [field]: value } : q)),
    );
  };

  const removeFAQQuestion = (id: string) => {
    setFaqQuestions(faqQuestions.filter((q) => q.id !== id));
  };

  const addAppointmentQuestion = () => {
    setAppointmentQuestions([
      ...appointmentQuestions,
      {
        id: Date.now(),
        question: "New question?",
        type: "text",
        required: false,
      },
    ]);
  };

  const updateAppointmentQuestion = (id: number, field: string, value: any) => {
    setAppointmentQuestions(
      appointmentQuestions.map((q) =>
        q.id === id ? { ...q, [field]: value } : q,
      ),
    );
  };

  const removeAppointmentQuestion = (id: number) => {
    setAppointmentQuestions(appointmentQuestions.filter((q) => q.id !== id));
  };

  // Helper functions for rendering
  const getStatsForChatbot = (chatbotId: string) => {
    if (!analytics) return [];

    const overview = analytics.overview;
    const statsMap: Record<
      string,
      Array<{
        title: string;
        value: string;
        icon: LucideIcon;
        color: string;
        change: string;
      }>
    > = {
      "chatbot-customer-support": [
        {
          title: "Support Tickets",
          value: overview.totalConversations?.toString() || "0",
          icon: MessageCircle,
          color: "text-[#00F0FF]",
          change: "+12%",
        },
        {
          title: "Resolved Issues",
          value: overview.resolvedIssues?.toString() || "0",
          icon: CheckCircle,
          color: "text-green-400",
          change: "+8%",
        },
        {
          title: "Avg Response Time",
          value: `${overview.averageResponseTime || 0}s`,
          icon: Clock,
          color: "text-[#B026FF]",
          change: "-15%",
        },
        {
          title: "Satisfaction Rate",
          value: `${overview.satisfactionScore || 0}%`,
          icon: TrendingUp,
          color: "text-[#FF2E9F]",
          change: "+2%",
        },
      ],
      "chatbot-lead-generation": [
        {
          title: "Leads Generated",
          value: overview.leadsGenerated?.toString() || "0",
          icon: Target,
          color: "text-[#B026FF]",
          change: "+22%",
        },
        {
          title: "Qualified Leads",
          value: overview.qualifiedLeads?.toString() || "0",
          icon: Users,
          color: "text-[#FF2E9F]",
          change: "+15%",
        },
        {
          title: "Conversion Rate",
          value: `${overview.conversionRate || 0}%`,
          icon: TrendingUp,
          color: "text-green-400",
          change: "+5%",
        },
        {
          title: "Form Completions",
          value: `${overview.formCompletions || 0}%`,
          icon: CheckCircle,
          color: "text-[#00F0FF]",
          change: "+7%",
        },
      ],
      "chatbot-education": [
        {
          title: "Comments Replied",
          value: overview.commentsReplied?.toString() || "0",
          icon: MessageCircle,
          color: "text-[#E4405F]",
          change: "+28%",
        },
        {
          title: "DMs Automated",
          value: overview.dmsAutomated?.toString() || "0",
          icon: Mail,
          color: "text-[#F56040]",
          change: "+35%",
        },
        {
          title: "Engagement Rate",
          value: `${overview.engagementRate || 0}%`,
          icon: TrendingUp,
          color: "text-green-400",
          change: "+12%",
        },
        {
          title: "Followers Growth",
          value: `+${overview.followersGrowth || 0}`,
          icon: Users,
          color: "text-[#B026FF]",
          change: "+18%",
        },
      ],
    };

    return statsMap[chatbotId] || statsMap["chatbot-customer-support"];
  };

  const getDefaultTab = () => {
    return selectedChatbot === "chatbot-education" ? "integration" : "overview";
  };

  // Render functions for different sections
  const renderErrorAlert = () => (
    <div className="mb-6 p-4 bg-red-900/20 border border-red-500/30 rounded-lg flex items-center">
      <AlertCircle className="h-5 w-5 text-red-400 mr-3" />
      <span className="text-red-400">{error}</span>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setError("")}
        className="ml-auto text-red-400 hover:text-red-300"
      >
        <X className="h-4 w-4" />
      </Button>
    </div>
  );

  const renderTokenBalanceCard = () => (
    <Card className={`${themeStyles.cardBg} ${themeStyles.cardBorder} mb-6`}>
      <CardContent className="p-3 md:p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center space-x-4">
            <div
              className={`hidden md:flex p-3 rounded-lg ${themeStyles.badgeActiveBg}`}
            >
              <Coins className="h-6 w-6 text-yellow-500" />
            </div>
            <div>
              <h3
                className={`text-lg font-semibold ${themeStyles.textPrimary}`}
              >
                Token Balance
              </h3>
              <div className="flex items-center space-x-4 mt-1">
                <p className="text-2xl font-bold bg-gradient-to-r from-[#00F0FF] to-[#B026FF] bg-clip-text text-transparent">
                  {tokenBalance?.availableTokens?.toLocaleString() || 0} tokens
                </p>
                <Badge
                  variant={isTokenLow ? "destructive" : "secondary"}
                  className="flex items-center"
                >
                  <Zap className="h-3 w-3 mr-1" />
                  {isTokenLow ? "Low Balance" : "Active"}
                </Badge>
              </div>
              <p className={`text-sm ${themeStyles.textSecondary} mt-1`}>
                Free: {tokenBalance?.freeTokensRemaining?.toLocaleString() || 0}{" "}
                | Purchased:{" "}
                {tokenBalance?.purchasedTokensRemaining?.toLocaleString() || 0}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-2 ">
            <Button
              onClick={() => setShowTokenPurchase(true)}
              className="bg-gradient-to-r from-[#00F0FF] to-[#0080FF] hover:opacity-90 text-white"
            >
              <CreditCard className="h-4 w-4 mr-2" />
              Buy Tokens
            </Button>
            <Button
              onClick={() => router.push("/web/TokenDashboard")}
              variant="outline"
              className={themeStyles.cardBorder}
            >
              <BarChart3 className="h-4 w-4 mr-2" />
              View Usage
            </Button>
          </div>
        </div>

        {showLowTokenAlert && (
          <div className="mt-4 p-3 bg-gradient-to-r from-yellow-500/10 to-orange-500/10 border border-yellow-500/30 rounded-lg flex items-center justify-between">
            <div className="flex items-center">
              <AlertTriangle className="h-5 w-5 text-yellow-500 mr-3" />
              <div>
                <p className={`font-medium ${themeStyles.textPrimary}`}>
                  Low Token Alert
                </p>
                <p
                  className={`text-sm ${themeStyles.textSecondary} font-montserrat`}
                >
                  You have only{" "}
                  {tokenBalance?.availableTokens?.toLocaleString()} tokens
                  remaining
                </p>
              </div>
            </div>
            <Button
              size="sm"
              onClick={() => setShowTokenPurchase(true)}
              className="bg-gradient-to-r from-yellow-500 to-orange-500 hover:opacity-90 text-white"
            >
              Buy More Tokens
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );

  const renderBuildDialog = () => (
    <AlertDialog open={showBuildDialog} onOpenChange={setShowBuildDialog}>
      <AlertDialogContent className="bg-gradient-to-br from-[#0a0a0a] via-[#1a1a1a] to-[#0a0a0a] backdrop-blur-2xl border border-white/10 rounded-2xl max-w-md p-0 overflow-hidden shadow-2xl">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="relative"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-[#00F0FF]/5 via-transparent to-[#B026FF]/5" />
          <div className="absolute top-0 left-0 w-20 h-20 bg-[#00F0FF]/10 rounded-full blur-xl -translate-x-1/2 -translate-y-1/2" />
          <div className="absolute bottom-0 right-0 w-20 h-20 bg-[#B026FF]/10 rounded-full blur-xl translate-x-1/2 translate-y-1/2" />
          <AlertDialogHeader className="relative p-6 border-b border-white/10">
            <AlertDialogTitle className="flex items-center">
              <Bot className="h-5 w-5 mr-2 text-[#00F0FF]" />
              Build Your {currentChatbot?.name} Chatbot
            </AlertDialogTitle>
            <AlertDialogDescription
              className={`${themeStyles.textSecondary} font-montserrat`}
            >
              {buildStep === "weblink"
                ? isEducationChatbot
                  ? "Configure your MCQ education chatbot"
                  : "Enter your website URL to train the chatbot with your business information."
                : buildStep === "payment"
                  ? "Processing payment for your chatbot subscription..."
                  : buildStep === "scraping"
                    ? "Scraping your website and training the AI chatbot. This may take 1-2 minutes."
                    : "Creating your chatbot..."}
            </AlertDialogDescription>
          </AlertDialogHeader>

          {buildStep === "weblink" ? (
            <form onSubmit={handleBuildChatbot} className="p-6 space-y-6">
              <div className="text-center">
                <h3 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-[#00F0FF] to-[#B026FF]">
                  CONFIGURE YOUR CHATBOT
                </h3>
                <p className="text-sm text-gray-400 mt-2 font-montserrat">
                  {isEducationChatbot
                    ? "Enter your chatbot details"
                    : "Enter your website and chatbot details"}
                </p>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Chatbot Name
                  </label>
                  <Input
                    id="buildChatbotName"
                    type="text"
                    value={buildChatbotName}
                    onChange={(e) => setBuildChatbotName(e.target.value)}
                    placeholder={
                      isEducationChatbot
                        ? "My Education Chatbot"
                        : "My Support Chatbot"
                    }
                    className="w-full bg-[#1a1a1a]/80 backdrop-blur-sm border-2 border-white/10 rounded-xl py-3 px-4 text-white font-montserrat placeholder:text-gray-500 focus:outline-none text-lg transition-all duration-300 focus:border-[#00F0FF] focus:shadow-[0_0_20px_rgba(0,240,255,0.2)]"
                    required
                  />
                </div>
                {!isEducationChatbot && (
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Website URL
                    </label>
                    <Input
                      id="buildWebsiteUrl"
                      type="url"
                      value={buildWebsiteUrl}
                      onChange={(e) => setBuildWebsiteUrl(e.target.value)}
                      placeholder="https://yourwebsite.com"
                      className="w-full bg-[#1a1a1a]/80 backdrop-blur-sm border-2 border-white/10 rounded-xl py-3 px-4 text-white font-montserrat placeholder:text-gray-500 focus:outline-none text-lg transition-all duration-300 focus:border-[#00F0FF] focus:shadow-[0_0_20px_rgba(0,240,255,0.2)]"
                      required
                    />
                  </div>
                )}
              </div>

              {buildError && (
                <div className="p-3 flex flex-wrap bg-red-500/10 border border-red-500/30 rounded-lg w-full">
                  <p className="text-red-400 text-sm text-wrap ">
                    {buildError}
                  </p>
                </div>
              )}

              <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3">
                <p className="text-blue-400 text-sm flex items-center font-montserrat">
                  <Bot className="h-4 w-4 mr-2" />
                  {isEducationChatbot
                    ? "Education chatbot is designed for MCQ-based learning and doesn't require website scraping"
                    : "Each chatbot type can only be created once per account"}
                </p>
              </div>

              <AlertDialogFooter>
                <AlertDialogCancel
                  onClick={() => {
                    setShowBuildDialog(false);
                    setBuildStep("weblink");
                    setBuildWebsiteUrl("");
                    setBuildChatbotName("");
                    setBuildError(null);
                  }}
                  className="relative"
                >
                  Cancel
                </AlertDialogCancel>
                <Button
                  type="submit"
                  disabled={
                    isBuilding ||
                    !buildChatbotName.trim() ||
                    (!isEducationChatbot && !buildWebsiteUrl.trim())
                  }
                  className="relative bg-gradient-to-r from-[#00F0FF] to-[#0080FF] hover:opacity-90 text-white"
                >
                  {isBuilding ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <Bot className="h-4 w-4 mr-2" />
                      Build Chatbot
                    </>
                  )}
                </Button>
              </AlertDialogFooter>
            </form>
          ) : buildStep === "payment" ? (
            <div className="space-y-4">
              <div className="flex flex-col items-center justify-center py-8">
                <Loader2 className="h-12 w-12 text-[#00F0FF] animate-spin mb-4" />
                <p className={themeStyles.textPrimary}>Processing payment...</p>
                <p
                  className={`text-sm ${themeStyles.textSecondary} mt-2 text-center font-montserrat`}
                >
                  Please wait while we process your payment.
                </p>
              </div>
            </div>
          ) : buildStep === "scraping" ? (
            <div className="space-y-4">
              <div className="flex flex-col items-center justify-center py-8">
                <Loader2 className="h-12 w-12 text-[#00F0FF] animate-spin mb-4" />
                <p className={themeStyles.textPrimary}>Scraping website...</p>
                <p
                  className={`text-sm ${themeStyles.textSecondary} mt-2 text-center font-montserrat`}
                >
                  Please do not close this window. This may take 1-2 minutes.
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex flex-col items-center justify-center py-8">
                <Loader2 className="h-12 w-12 text-[#00F0FF] animate-spin mb-4" />
                <p className={themeStyles.textPrimary}>
                  {isEducationChatbot
                    ? "Creating your education chatbot..."
                    : "Creating your chatbot..."}
                </p>
                <p
                  className={`text-sm ${themeStyles.textSecondary} mt-2 text-center font-montserrat`}
                >
                  {isEducationChatbot
                    ? "Setting up your MCQ education chatbot."
                    : "Finalizing your chatbot setup."}
                </p>
              </div>
            </div>
          )}
        </motion.div>
      </AlertDialogContent>
    </AlertDialog>
  );

  const renderTokenPurchaseDialog = () => (
    <Dialog open={showTokenPurchase} onOpenChange={setShowTokenPurchase}>
      <DialogContent
        className={`${themeStyles.dialogBg} max-w-4xl max-h-[90vh] overflow-y-auto`}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <Coins className="h-6 w-6 mr-2 text-yellow-500" />
            Purchase Tokens
          </DialogTitle>
          <DialogDescription
            className={`${themeStyles.textSecondary} font-montserrat`}
          >
            Tokens are used across all your chatbots. Purchase additional tokens
            to continue using your chatbots.
          </DialogDescription>
        </DialogHeader>

        <TokenPurchase
          currentBalance={tokenBalance?.availableTokens || 0}
          onSuccess={() => {
            refreshTokenBalance();
            setShowTokenPurchase(false);
            showSuccessToast(
              "Tokens Added",
              "Your tokens have been added successfully!",
            );
          }}
        />
      </DialogContent>
    </Dialog>
  );

  const renderChatbotSelection = () => (
    <div className="mb-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-6">
        <h2
          className={`text-2xl font-bold ${themeStyles.textPrimary} mb-4 md:mb-0`}
        >
          Your AI Chatbots
        </h2>

        {tokenBalance && (
          <div className="flex flex-wrap gap-2 items-center ">
            <div
              className={`px-3 py-2 rounded-md ${themeStyles.badgeActiveBg} flex items-center`}
            >
              <Zap className="h-3 w-3 mr-1" />
              <span className="text-sm text-nowrap ">
                {tokenBalance.availableTokens.toLocaleString()} tokens
              </span>
            </div>
            <Button
              onClick={() => setShowTokenPurchase(true)}
              size="sm"
              className="bg-gradient-to-r from-[#00F0FF] to-[#0080FF] hover:opacity-90 text-white"
            >
              <CreditCard className="h-3 w-3 mr-1" />
              Buy Tokens
            </Button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {CHATBOT_TYPES.map((chatbot) => {
          const isActive = selectedChatbot === chatbot.id;
          const chatbotStatus = chatbotStatuses.find(
            (s) => s.type === chatbot.id,
          );
          const hasBuilt = chatbotStatus?.isBuilt || false;

          return (
            <Card
              key={chatbot.id}
              className={`cursor-pointer transition-all duration-300 ${
                themeStyles.cardBg
              } ${themeStyles.cardBorder} ${
                isActive
                  ? `bg-gradient-to-br ${
                      currentTheme === "dark"
                        ? "from-gray-800/50 to-gray-900/50"
                        : "from-blue-50 to-purple-50"
                    } ${themeStyles.activeBorder}`
                  : `${themeStyles.hoverBorder}`
              }`}
              onClick={() => {
                setSelectedChatbot(chatbot.id);
                // Load saved chatbot info from localStorage
                const savedName = localStorage.getItem(
                  `${userId}-${chatbot.id}-name`,
                );
                const savedMessage = localStorage.getItem(
                  `${userId}-${chatbot.id}-message`,
                );
                setChatbotName(savedName || chatbotStatus?.chatbotName || null);
                setChatbotMessage(
                  savedMessage || chatbotStatus?.chatbotMessage || null,
                );
              }}
            >
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <chatbot.icon className={`h-8 w-8 ${chatbot.color}`} />
                  {hasBuilt ? (
                    <Badge className={themeStyles.badgeActiveBg}>
                      <Check className="h-3 w-3 mr-1" />
                      Built
                    </Badge>
                  ) : (
                    <Badge
                      variant="secondary"
                      className={themeStyles.badgeInactiveBg}
                    >
                      <Lock className="h-3 w-3 mr-1" />
                      Not Built
                    </Badge>
                  )}
                </div>
                <h3 className={`font-semibold ${themeStyles.textPrimary} mb-1`}>
                  {chatbot.name}
                </h3>
                <p
                  className={`text-xs ${themeStyles.textSecondary} mb-3 font-montserrat`}
                >
                  {chatbot.description}
                </p>

                {!hasBuilt ? (
                  <Button
                    size="sm"
                    className={`w-full bg-gradient-to-r ${chatbot.gradient} hover:opacity-90 text-black font-medium`}
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedChatbot(chatbot.id);
                      setShowBuildDialog(true);
                    }}
                  >
                    <Bot className="h-4 w-4 mr-2" />
                    Build Now
                  </Button>
                ) : (
                  <div className="space-y-2">
                    <Button
                      size="sm"
                      className={`w-full bg-gradient-to-r ${chatbot.gradient} hover:opacity-90 text-black font-medium`}
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedChatbot(chatbot.id);
                      }}
                    >
                      <Settings className="h-4 w-4 mr-2" />
                      Manage Chatbot
                    </Button>
                    {isTokenLow && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full border-yellow-500/50 text-yellow-500 hover:bg-yellow-500/10"
                        onClick={(e) => {
                          e.stopPropagation();
                          setShowTokenPurchase(true);
                        }}
                      >
                        <AlertTriangle className="h-3 w-3 mr-2" />
                        Low Tokens - Buy More
                      </Button>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );

  const renderStatsGrid = () => {
    if (
      !hasBuiltChatbot ||
      !analytics ||
      (selectedChatbot !== "chatbot-lead-generation" &&
        selectedChatbot !== "chatbot-customer-support")
    ) {
      return null;
    }

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {getStatsForChatbot(selectedChatbot).map((stat, index) => (
          <Card
            key={index}
            className={`${themeStyles.cardBg} backdrop-blur-sm ${themeStyles.cardBorder}`}
          >
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className={`text-sm ${themeStyles.textSecondary} mb-1`}>
                    {stat.title}
                  </p>
                  <p
                    className={`text-2xl font-bold ${themeStyles.textPrimary}`}
                  >
                    {stat.value}
                  </p>
                  <p className="text-xs text-green-400 mt-1">
                    {stat.change} from last week
                  </p>
                </div>
                <stat.icon className={`h-8 w-8 ${stat.color}`} />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  };

  const renderOverviewTab = () => (
    <TabsContent value="overview" className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Conversation Trends */}
        {analytics &&
          (selectedChatbot === "chatbot-lead-generation" ||
            selectedChatbot === "chatbot-customer-support") && (
            <Card
              className={`${themeStyles.cardBg} backdrop-blur-sm ${themeStyles.cardBorder}`}
            >
              <CardHeader className="p-3 md:p-4">
                <CardTitle className={themeStyles.textPrimary}>
                  Conversation Trends
                </CardTitle>
                <CardDescription
                  className={`${themeStyles.textSecondary} font-montserrat`}
                >
                  Daily conversation volume for {currentChatbot?.name}
                </CardDescription>
              </CardHeader>
              <CardContent className="p-3 md:p-4">
                <div className="h-64 overflow-x-auto">
                  <ResponsiveContainer width={1000} height="100%">
                    <LineChart data={analytics.trends || []}>
                      <CartesianGrid
                        strokeDasharray="3 3"
                        stroke={currentTheme === "dark" ? "#374151" : "#e5e7eb"}
                      />
                      <XAxis
                        dataKey="name"
                        stroke={themeStyles.textSecondary}
                        tick={{ fill: themeStyles.textSecondary }}
                      />
                      <YAxis
                        stroke={themeStyles.textSecondary}
                        tick={{ fill: themeStyles.textSecondary }}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor:
                            currentTheme === "dark" ? "#1F2937" : "#ffffff",
                          border:
                            currentTheme === "dark"
                              ? "1px solid #374151"
                              : "1px solid #e5e7eb",
                          borderRadius: "8px",
                          color:
                            currentTheme === "dark" ? "#F3F4F6" : "#1f2937",
                        }}
                      />
                      <Line
                        type="monotone"
                        dataKey="conversations"
                        stroke="#00F0FF"
                        strokeWidth={2}
                        activeDot={{ r: 6 }}
                      />
                      <Line
                        type="monotone"
                        dataKey="responses"
                        stroke="#FF2E9F"
                        strokeWidth={2}
                        activeDot={{ r: 6 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          )}

        {/* Response Time Distribution */}
        {analytics && selectedChatbot === "chatbot-lead-generation" && (
          <Card
            className={`${themeStyles.cardBg} backdrop-blur-sm ${themeStyles.cardBorder}`}
          >
            <CardHeader className="p-3 md:p-4">
              <CardTitle className={themeStyles.textPrimary}>
                Response Time Distribution
              </CardTitle>
              <CardDescription
                className={`${themeStyles.textSecondary} font-montserrat`}
              >
                How quickly your {currentChatbot?.name.toLowerCase()} responds
              </CardDescription>
            </CardHeader>
            <CardContent className="p-3 md:p-4">
              <div className="h-64 overflow-x-auto">
                <ResponsiveContainer width={1000} height="100%">
                  <BarChart data={analytics.responseTime || []}>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke={currentTheme === "dark" ? "#374151" : "#e5e7eb"}
                    />
                    <XAxis
                      dataKey="time"
                      stroke={themeStyles.textSecondary}
                      tick={{ fill: themeStyles.textSecondary }}
                    />
                    <YAxis
                      stroke={themeStyles.textSecondary}
                      tick={{ fill: themeStyles.textSecondary }}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor:
                          currentTheme === "dark" ? "#1F2937" : "#ffffff",
                        border:
                          currentTheme === "dark"
                            ? "1px solid #374151"
                            : "1px solid #e5e7eb",
                        borderRadius: "8px",
                        color: currentTheme === "dark" ? "#F3F4F6" : "#1f2937",
                      }}
                    />
                    <Bar dataKey="count" fill="#B026FF" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Customer Satisfaction */}
        {analytics && selectedChatbot === "chatbot-lead-generation" && (
          <Card
            className={`${themeStyles.cardBg} backdrop-blur-sm ${themeStyles.cardBorder}`}
          >
            <CardHeader className="p-3 md:p-4">
              <CardTitle className={themeStyles.textPrimary}>
                Customer Satisfaction
              </CardTitle>
              <CardDescription
                className={`${themeStyles.textSecondary} font-montserrat`}
              >
                Feedback ratings from {currentChatbot?.name.toLowerCase()} users
              </CardDescription>
            </CardHeader>
            <CardContent className="p-3 md:p-4">
              <div className="h-64 overflow-x-auto">
                <ResponsiveContainer width={500} height="100%">
                  <PieChart>
                    <Pie
                      data={analytics.satisfaction || []}
                      cx="50%"
                      cy="50%"
                      outerRadius={100}
                      dataKey="value"
                      label={({ name, value }) => `${name}: ${value}%`}
                    >
                      {(analytics.satisfaction || []).map(
                        (entry: any, index: number) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ),
                      )}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Recent Conversations */}
        {(selectedChatbot === "chatbot-lead-generation" ||
          selectedChatbot === "chatbot-customer-support") && (
          <Card
            className={`${themeStyles.cardBg} backdrop-blur-sm ${themeStyles.cardBorder}`}
          >
            <CardHeader className="p-3 md:p-4">
              <CardTitle className={themeStyles.textPrimary}>
                Recent Conversations
              </CardTitle>
              <CardDescription
                className={`${themeStyles.textSecondary} font-montserrat`}
              >
                Latest {currentChatbot?.name.toLowerCase()} interactions
              </CardDescription>
            </CardHeader>
            <CardContent className="p-3 md:p-4">
              <div className="space-y-4">
                {conversations.slice(0, 4).map((conversation, index) => (
                  <div
                    key={conversation.id || index}
                    className={`flex items-start space-x-3 p-3 rounded-lg ${
                      currentTheme === "dark"
                        ? "bg-[#5d1a6d]/10 hover:bg-[#5a1e92]/15"
                        : "bg-purple-50 hover:bg-purple-100"
                    } transition-colors`}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium">
                          {conversation.customerName || "Anonymous"}
                        </p>
                        <Badge
                          variant={
                            conversation.status === "answered"
                              ? "default"
                              : "secondary"
                          }
                        >
                          {conversation.status === "answered" ? (
                            <CheckCircle className="h-3 w-3 mr-1" />
                          ) : (
                            <Clock className="h-3 w-3 mr-1" />
                          )}
                          {conversation.status}
                        </Badge>
                      </div>
                      <p
                        className={`text-sm ${themeStyles.textSecondary} truncate font-montserrat`}
                      >
                        {conversation.messages[0]?.content || "No message"}
                      </p>
                      <p
                        className={`text-xs ${themeStyles.textMuted} mt-1 font-montserrat`}
                      >
                        {new Date(conversation.createdAt).toLocaleString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </TabsContent>
  );

  const renderConversationsTab = () => (
    <TabsContent value="conversations" className="space-y-6">
      <Card
        className={`${themeStyles.cardBg} backdrop-blur-sm ${themeStyles.cardBorder}`}
      >
        <CardHeader className="p-3 md:p-4">
          <CardTitle className={themeStyles.textPrimary}>
            All Conversations - {currentChatbot?.name}
          </CardTitle>
          <CardDescription
            className={`${themeStyles.textSecondary} font-montserrat`}
          >
            Manage and respond to {currentChatbot?.name.toLowerCase()}{" "}
            conversations
          </CardDescription>
        </CardHeader>
        <CardContent className="p-3 md:p-4">
          <div className="space-y-4">
            {conversations?.map((conversation, index) => (
              <div
                key={conversation.id || index}
                className={`flex items-start space-x-3 p-4 rounded-lg ${
                  currentTheme === "dark"
                    ? "bg-[#147679]/10 hover:bg-[#308285]/15"
                    : "bg-cyan-50 hover:bg-cyan-100"
                } transition-colors`}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-medium">
                      {conversation.customerName || "Anonymous"}
                    </p>
                    <div className="flex items-center space-x-2">
                      <Badge
                        variant={
                          conversation.status === "answered"
                            ? "default"
                            : "secondary"
                        }
                      >
                        {conversation.status === "answered" ? (
                          <CheckCircle className="h-3 w-3 mr-1" />
                        ) : (
                          <Clock className="h-3 w-3 mr-1" />
                        )}
                        {conversation.status}
                      </Badge>
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-xs"
                          >
                            <Eye className="h-3 w-3 mr-1" />
                            View
                          </Button>
                        </DialogTrigger>
                        <DialogContent
                          className={`${themeStyles.dialogBg} border-gray-800 max-w-2xl`}
                        >
                          <DialogHeader>
                            <DialogTitle>Conversation Details</DialogTitle>
                            <DialogDescription
                              className={`${themeStyles.textSecondary} font-montserrat`}
                            >
                              Customer:{" "}
                              {conversation.customerName || "Anonymous"} |
                              Chatbot: {currentChatbot?.name}
                            </DialogDescription>
                          </DialogHeader>
                          <div className="space-y-4">
                            <div>
                              <h4 className="font-medium mb-2">Message</h4>
                              <div className="space-y-2 max-h-64 overflow-y-auto font-montserrat">
                                {conversation.messages.map((message: any) => (
                                  <div
                                    key={message.id}
                                    className={`p-3 rounded ${
                                      message.type === "user"
                                        ? currentTheme === "dark"
                                          ? "bg-blue-900/20"
                                          : "bg-blue-100"
                                        : currentTheme === "dark"
                                          ? "bg-gray-800/50"
                                          : "bg-gray-100"
                                    }`}
                                  >
                                    <div className="flex items-center justify-between mb-1">
                                      <span className="text-xs font-medium">
                                        {message.type === "user"
                                          ? "Customer"
                                          : "Bot"}
                                      </span>
                                      <span
                                        className={`text-xs ${themeStyles.textMuted}`}
                                      >
                                        {new Date(
                                          message.timestamp,
                                        ).toLocaleTimeString()}
                                      </span>
                                    </div>
                                    <p
                                      className={`text-sm ${themeStyles.textSecondary}`}
                                    >
                                      {message.content}
                                    </p>
                                  </div>
                                ))}
                              </div>
                            </div>
                            {conversation.formData &&
                              conversation.formData.length > 0 && (
                                <div
                                  className={`bg-[#b71b86]/10 p-4 rounded ${themeStyles.textMuted} space-y-2`}
                                >
                                  <h4 className="font-medium mb-2">
                                    Form Data
                                  </h4>
                                  {conversation.formData.map((field: any) => {
                                    if (
                                      /name|full name|your name/i.test(
                                        field.question,
                                      )
                                    ) {
                                      return (
                                        <div
                                          key="name"
                                          className="flex items-center space-x-2 font-montserrat"
                                        >
                                          <User className="h-4 w-4 text-[#00F0FF]" />
                                          <span>Name: {field.answer}</span>
                                        </div>
                                      );
                                    }
                                    if (/email/i.test(field.question)) {
                                      return (
                                        <div
                                          key="email"
                                          className="flex items-center space-x-2 font-montserrat"
                                        >
                                          <Mail className="h-4 w-4 text-[#FF2E9F]" />
                                          <span>
                                            Email:{" "}
                                            <a
                                              href={`mailto:${field.answer}`}
                                              className="text-blue-400 hover:underline"
                                            >
                                              {field.answer}
                                            </a>
                                          </span>
                                        </div>
                                      );
                                    }
                                    if (
                                      /phone|mobile|contact number/i.test(
                                        field.question,
                                      )
                                    ) {
                                      return (
                                        <div
                                          key="phone"
                                          className="flex items-center space-x-2 font-montserrat"
                                        >
                                          <Phone className="h-4 w-4 text-[#B026FF]" />
                                          <span>
                                            Phone:{" "}
                                            <a
                                              href={`tel:${field.answer}`}
                                              className="text-blue-400 hover:underline"
                                            >
                                              {field.answer}
                                            </a>
                                          </span>
                                        </div>
                                      );
                                    }
                                    return null;
                                  })}
                                </div>
                              )}
                          </div>
                        </DialogContent>
                      </Dialog>
                    </div>
                  </div>
                  <p
                    className={`text-sm ${themeStyles.textSecondary} font-montserrat`}
                  >
                    {conversation.messages[0]?.content || "No message"}
                  </p>
                  <p
                    className={`text-xs ${themeStyles.textMuted} mt-1 font-montserrat`}
                  >
                    {new Date(conversation.createdAt).toLocaleString()}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </TabsContent>
  );

  const renderIntegrationTab = () => (
    <TabsContent value="integration" className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Widget Integration */}
        <Card
          className={`${themeStyles.cardBg} backdrop-blur-sm ${themeStyles.cardBorder}`}
        >
          <CardHeader className="p-3 md:p-4">
            <CardTitle
              className={`${themeStyles.textPrimary} flex items-center`}
            >
              <Code className="h-5 w-5 mr-2" />
              {currentChatbot?.name} Widget Integration
            </CardTitle>
            <CardDescription
              className={`${themeStyles.textSecondary} font-montserrat`}
            >
              Copy and paste the code below to integrate {currentChatbot?.name}{" "}
              into your website
            </CardDescription>
          </CardHeader>
          <CardContent className="p-3 md:p-4">
            <div className="space-y-4">
              <div className="flex items-start space-x-3">
                <AlertCircle className="h-5 w-5 text-blue-400 mt-0.5" />
                <div>
                  <h4 className="text-sm font-medium text-blue-400">
                    Universal Integration
                  </h4>
                  <p
                    className={`text-sm ${themeStyles.textSecondary} mt-1 font-montserrat`}
                  >
                    This code works on any website platform. Simply copy and
                    paste it before the closing &lt;/body&gt; tag.
                  </p>
                </div>
              </div>

              <div className="relative">
                <pre
                  className={`${
                    currentTheme === "dark" ? "bg-gray-900/80" : "bg-gray-100"
                  } p-4 rounded-lg text-sm ${
                    themeStyles.textSecondary
                  } overflow-x-auto`}
                >
                  <code className="block overflow-hidden text-wrap h-20">
                    {selectedChatbot === "chatbot-education"
                      ? `<script 
src="https://rocketreplai.com/mcqchatbotembed.js" 
data-mcq-chatbot='{
  "userId":"${userId}",
  "isAuthorized":${hasBuiltChatbot},
  "chatbotType":"${selectedChatbot}",
  "apiUrl":"https://rocketreplai.com",
  "primaryColor":"#00F0FF",
  "position":"bottom-right",
  "welcomeMessage":"${chatbotMessage || "Hi! How can I help you today?"}",
  "chatbotName":"${chatbotName || currentChatbot?.name}"
}'>
</script>`
                      : `<script 
src="https://rocketreplai.com/chatbotembed.js" 
data-chatbot-config='{
  "userId":"${userId}",
  "isAuthorized":${hasBuiltChatbot},
  "filename":"${fileLink}",
  "chatbotType":"${selectedChatbot}",
  "apiUrl":"https://rocketreplai.com",
  "primaryColor":"#00F0FF",
  "position":"bottom-right",
  "welcomeMessage":"${chatbotMessage || "Hi! How can I help you today?"}",
  "chatbotName":"${chatbotName || currentChatbot?.name}"
}'>
</script>`}
                  </code>
                </pre>

                <Button
                  size="sm"
                  className="absolute top-2 right-2 bg-green-600 hover:bg-green-700"
                  onClick={handleCopyCode}
                  disabled={copied || !hasBuiltChatbot}
                >
                  {copied ? (
                    <>
                      <Check className="h-4 w-4 mr-1" />
                      Copied!
                    </>
                  ) : (
                    <>
                      <Copy className="h-4 w-4 mr-1" />
                      Copy Code
                    </>
                  )}
                </Button>
              </div>
            </div>

            {!hasBuiltChatbot && (
              <div
                className={`mt-4 p-4 ${
                  currentTheme === "dark"
                    ? "bg-yellow-900/20 border-yellow-400/30"
                    : "bg-yellow-50 border-yellow-200"
                } border rounded-lg`}
              >
                <div className="flex items-start space-x-3">
                  <AlertTriangle className="h-5 w-5 text-yellow-400 mt-0.5" />
                  <div>
                    <h4 className="text-sm font-medium text-yellow-400">
                      Chatbot Not Built
                    </h4>
                    <p
                      className={`text-sm ${themeStyles.textSecondary} mt-1 font-montserrat`}
                    >
                      You need to build your chatbot first before you can
                      integrate it.
                    </p>
                    <Button
                      size="sm"
                      className="mt-2 bg-gradient-to-r from-[#00F0FF] to-[#0080FF] hover:opacity-90 text-white"
                      onClick={() => setShowBuildDialog(true)}
                    >
                      <Bot className="h-4 w-4 mr-2" />
                      Build Chatbot Now
                    </Button>
                  </div>
                </div>
              </div>
            )}

            <div
              className={`mt-6 p-4 ${
                currentTheme === "dark"
                  ? "bg-amber-900/20 border-amber-400/30"
                  : "bg-amber-50 border-amber-200"
              } border rounded-lg`}
            >
              <div className="flex items-start space-x-3">
                <AlertCircle className="h-5 w-5 text-amber-400 mt-0.5" />
                <div>
                  <h4 className="text-sm font-medium text-amber-400">
                    Important Notes
                  </h4>
                  <ul
                    className={`text-sm ${themeStyles.textSecondary} mt-1 list-disc list-inside space-y-1 font-montserrat`}
                  >
                    <li>
                      Works on WordPress, React, Angular, Vue, plain HTML - any
                      website
                    </li>
                    <li>
                      Just copy and paste the code anywhere in your website
                    </li>
                    <li>
                      The widget will automatically appear in the bottom-right
                      corner
                    </li>
                    <li>
                      Make sure you have enough tokens for chatbot to work
                      (isAuthorized: {hasBuiltChatbot.toString()})
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* FAQ Management */}
        <Card
          className={`${themeStyles.cardBg} backdrop-blur-sm ${themeStyles.cardBorder}`}
        >
          <CardHeader className="p-3 md:p-4">
            <CardTitle
              className={`${themeStyles.textPrimary} flex flex-wrap gap-2 items-center justify-between`}
            >
              <span className="flex items-center">
                <MessageCircle className="h-5 w-5 mr-2" />
                FAQ Questions for {currentChatbot?.name}
              </span>
              <Button
                size="sm"
                onClick={addFAQQuestion}
                className="bg-[#00F0FF] hover:bg-[#00F0FF]/80 text-black"
                disabled={!hasBuiltChatbot}
              >
                <Plus className="h-4 w-4 mr-1" />
                Add FAQ
              </Button>
            </CardTitle>
            <CardDescription
              className={`${themeStyles.textSecondary} font-montserrat`}
            >
              Add frequently asked questions and answers for your chatbot
            </CardDescription>
          </CardHeader>
          <CardContent className="p-3 md:p-4">
            {!hasBuiltChatbot ? (
              <div className="text-center py-8">
                <Bot className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className={`${themeStyles.textSecondary} font-montserrat`}>
                  Build your chatbot first to manage FAQ
                </p>
                <Button
                  className="mt-4 bg-gradient-to-r from-[#00F0FF] to-[#0080FF] hover:opacity-90 text-white"
                  onClick={() => setShowBuildDialog(true)}
                >
                  <Bot className="h-4 w-4 mr-2" />
                  Build Chatbot Now
                </Button>
              </div>
            ) : (
              <>
                <div className="space-y-4 max-h-96 overflow-y-auto font-montserrat">
                  {faqQuestions.map((faq) => (
                    <div
                      key={faq.id}
                      className={`p-4 rounded-lg ${
                        currentTheme === "dark"
                          ? "bg-[#1a4d7c]/10"
                          : "bg-blue-50"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex-1 mr-2">
                          <Input
                            value={faq.question}
                            onChange={(e) =>
                              updateFAQQuestion(
                                faq.id,
                                "question",
                                e.target.value,
                              )
                            }
                            className={`${themeStyles.inputBg} ${themeStyles.inputBorder} ${themeStyles.textPrimary} text-sm mb-2`}
                            placeholder="FAQ Question"
                          />
                          {!faq.question.trim() && (
                            <p className="text-red-500 text-xs mt-1">
                              Question cannot be empty
                            </p>
                          )}
                        </div>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => removeFAQQuestion(faq.id)}
                          className="text-red-400 hover:text-red-300"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>

                      <div className="flex items-center space-x-4 mb-3">
                        <select
                          value={faq.category}
                          onChange={(e) =>
                            updateFAQQuestion(
                              faq.id,
                              "category",
                              e.target.value,
                            )
                          }
                          className={`${
                            currentTheme === "dark"
                              ? "bg-[#2d5a8c]/40 border-gray-600"
                              : "bg-white border-gray-300"
                          } border rounded px-2 py-1 ${
                            themeStyles.textPrimary
                          } text-sm`}
                        >
                          <option value="General">General</option>
                          <option value="Support">Support</option>
                          <option value="Pricing">Pricing</option>
                          <option value="Technical">Technical</option>
                          <option value="Services">Services</option>
                        </select>
                      </div>

                      <div className="relative">
                        <Textarea
                          value={faq.answer}
                          onChange={(e) =>
                            updateFAQQuestion(faq.id, "answer", e.target.value)
                          }
                          className={`${themeStyles.inputBg} ${themeStyles.inputBorder} ${themeStyles.textPrimary} text-sm min-h-[80px]`}
                          placeholder="FAQ Answer"
                        />
                        {!faq.answer.trim() && (
                          <p className="text-red-500 text-xs mt-1">
                            Answer cannot be empty
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {faqQuestions.length === 0 && (
                  <div className="text-center py-8">
                    <MessageCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className={themeStyles.textSecondary}>
                      No FAQ questions added yet
                    </p>
                    <p
                      className={`text-sm ${themeStyles.textMuted} mt-1 font-montserrat`}
                    >
                      Add some frequently asked questions to help your users
                    </p>
                  </div>
                )}

                <div className="pt-4">
                  <Button
                    disabled={
                      faqQuestions.length === 0 ||
                      faqQuestions.some(
                        (faq) => !faq.question.trim() || !faq.answer.trim(),
                      )
                    }
                    onClick={() => saveFAQs}
                    className={`bg-gradient-to-r ${currentChatbot?.gradient} hover:opacity-90 text-black disabled:opacity-50 disabled:cursor-not-allowed`}
                  >
                    <Save className="h-4 w-4 mr-2" />
                    Save FAQ Questions
                  </Button>

                  {faqQuestions.length > 0 &&
                    faqQuestions.some(
                      (faq) => !faq.question.trim() || !faq.answer.trim(),
                    ) && (
                      <p className="text-red-500 text-sm mt-2 font-montserrat">
                        Please fill in all questions and answers before saving
                      </p>
                    )}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </TabsContent>
  );

  const renderSettingsTab = () => (
    <TabsContent value="settings" className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Chatbot Settings */}
        <Card
          className={`${themeStyles.cardBg} backdrop-blur-sm ${themeStyles.cardBorder}`}
        >
          <CardHeader className="p-3 md:p-4">
            <CardTitle className={themeStyles.textPrimary}>
              {currentChatbot?.name} Settings
            </CardTitle>
            <CardDescription
              className={`${themeStyles.textSecondary} font-montserrat`}
            >
              Configure your chatbot behavior and appearance
            </CardDescription>
          </CardHeader>
          <CardContent className="p-3 md:p-4">
            {!hasBuiltChatbot ? (
              <div className="text-center py-8">
                <Settings className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className={`${themeStyles.textSecondary} font-montserrat`}>
                  Build your chatbot first to configure settings
                </p>
                <Button
                  className="mt-4 bg-gradient-to-r from-[#00F0FF] to-[#0080FF] hover:opacity-90 text-white"
                  onClick={() => setShowBuildDialog(true)}
                >
                  <Bot className="h-4 w-4 mr-2" />
                  Build Chatbot Now
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label
                      htmlFor="chatbotName"
                      className={themeStyles.textSecondary}
                    >
                      Chatbot Name
                    </Label>
                    <Input
                      id="chatbotName"
                      value={chatbotName || currentChatbot?.name || ""}
                      onChange={(e) => setChatbotName(e.target.value)}
                      className={`mt-2 ${themeStyles.inputBg} ${themeStyles.inputBorder} ${themeStyles.textPrimary} font-montserrat`}
                      placeholder={currentChatbot?.name}
                    />
                  </div>
                  <div>
                    <Label
                      htmlFor="welcomeMessage"
                      className={themeStyles.textSecondary}
                    >
                      Welcome Message
                    </Label>
                    <Input
                      id="welcomeMessage"
                      value={chatbotMessage || "Hi! How can I help you today?"}
                      onChange={(e) => setChatbotMessage(e.target.value)}
                      className={`mt-2 ${themeStyles.inputBg} ${themeStyles.inputBorder} ${themeStyles.textPrimary} font-montserrat`}
                      placeholder="Hi! How can I help you today?"
                    />
                  </div>
                </div>

                <div className="pt-4">
                  <Button
                    onClick={handleChangedInfo}
                    disabled={infoLoading || !chatbotMessage || !chatbotName}
                    className={`bg-gradient-to-r ${currentChatbot?.gradient} hover:opacity-90 text-black`}
                  >
                    {infoLoading ? "Saving...." : "Save Changes"}
                  </Button>
                </div>

                {/* Website URL Section - Only for non-education chatbots */}
                {!isEducationChatbot && (
                  <div>
                    <Label
                      htmlFor="websiteUrl"
                      className={themeStyles.textSecondary}
                    >
                      Website URL
                    </Label>

                    <div className="flex flex-col sm:flex-row items-start space-y-2 sm:space-y-0 sm:space-x-2 mt-2">
                      {websiteUrl ? (
                        <p
                          className={`flex items-center justify-center border ${themeStyles.inputBorder} ${themeStyles.textPrimary} p-2 rounded-lg w-full font-montserrat`}
                        >
                          {websiteUrl}
                        </p>
                      ) : (
                        <Input
                          id="websiteUrl"
                          value={websiteUrl || ""}
                          onChange={(e) => setWebsiteUrl(e.target.value)}
                          className={`${themeStyles.inputBg} ${themeStyles.inputBorder} ${themeStyles.textPrimary} font-montserrat`}
                          placeholder="https://yourwebsite.com"
                        />
                      )}
                      {hasBuiltChatbot && websiteUrl && (
                        <Button
                          disabled={true}
                          onClick={handleScrape}
                          className={`hover:opacity-90 text-black bg-gradient-to-r from-[#00F0FF] to-[#0080FF]`}
                        >
                          <Upload className="h-4 w-4 mr-1" />
                          Rescrape (Soon)
                        </Button>
                      )}
                    </div>
                  </div>
                )}

                {/* WhatsApp Number Section */}
                {currentChatbot?.id === "chatbot-lead-generation" && (
                  <div className="pt-4">
                    <Label
                      htmlFor="whatsappNumber"
                      className={themeStyles.textSecondary}
                    >
                      WhatsApp Number
                    </Label>
                    <div className="flex flex-col sm:flex-row items-start space-y-2 sm:space-y-0 sm:space-x-2 mt-2">
                      {phone ? (
                        <p
                          className={`flex items-center justify-center border ${themeStyles.inputBorder} ${themeStyles.textPrimary} p-2 rounded-lg w-full font-montserrat`}
                        >
                          {phone}
                        </p>
                      ) : (
                        <p
                          className={`flex items-center justify-center border ${themeStyles.inputBorder} ${themeStyles.textPrimary} p-2 rounded-lg w-full font-montserrat`}
                        >
                          Please Add WhatsApp Number.
                        </p>
                      )}
                      <Button
                        onClick={() => setOtpStep("phone")}
                        disabled={true}
                        className="bg-gradient-to-r from-[#00F0FF] to-[#0080FF] hover:opacity-90 text-black"
                      >
                        <Save className="h-4 w-4 mr-2" />
                        Coming Soon...
                      </Button>
                    </div>
                    <span className="text-green-400 text-sm mt-1 font-montserrat">
                      * Add WhatsApp number to get appointment info immediately
                      on WhatsApp
                    </span>
                  </div>
                )}

                {/* Error and Status Messages */}
                {webError && (
                  <div className="border border-red-200 rounded-lg p-4 mt-8">
                    <p
                      className={`text-red-700 ${themeStyles.textPrimary} font-montserrat`}
                    >
                      {webError}
                    </p>
                  </div>
                )}

                {(webLoading || processing) && (
                  <div className="border border-green-200 rounded-lg p-4 mt-8 font-montserrat">
                    <p className={`text-green-700 ${themeStyles.textPrimary}`}>
                      This might take 1-2 min so please wait. Don&apos;t do
                      anything.
                    </p>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Appointment Form Questions - Only for lead generation */}
        {currentChatbot?.id === "chatbot-lead-generation" && (
          <Card
            className={`${themeStyles.cardBg} backdrop-blur-sm ${themeStyles.cardBorder}`}
          >
            <CardHeader className="p-3 md:p-4">
              <CardTitle
                className={`${themeStyles.textPrimary} flex flex-wrap gap-2 items-center justify-between`}
              >
                <span className="flex items-center">
                  <Calendar className="h-5 w-5 mr-2 " />
                  Appointment Form Questions
                </span>
                <Button
                  size="sm"
                  onClick={addAppointmentQuestion}
                  className="bg-[#00F0FF] hover:bg-[#00F0FF]/80 text-black"
                  disabled={!hasBuiltChatbot}
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Add Question
                </Button>
              </CardTitle>
              <CardDescription
                className={`${themeStyles.textSecondary} font-montserrat`}
              >
                Configure questions for appointment booking
              </CardDescription>
            </CardHeader>

            <CardContent className="p-3 md:p-4">
              {!hasBuiltChatbot ? (
                <div className="text-center py-8">
                  <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className={`${themeStyles.textSecondary} font-montserrat`}>
                    Build your chatbot first to configure appointment questions
                  </p>
                  <Button
                    className="mt-4 bg-gradient-to-r from-[#00F0FF] to-[#0080FF] hover:opacity-90 text-white"
                    onClick={() => setShowBuildDialog(true)}
                  >
                    <Bot className="h-4 w-4 mr-2" />
                    Build Chatbot Now
                  </Button>
                </div>
              ) : (
                <>
                  <div className="space-y-4 max-h-96 overflow-y-auto font-montserrat">
                    {appointmentQuestions.map((question) => (
                      <div
                        key={question.id}
                        className={`p-4 rounded-lg ${
                          currentTheme === "dark"
                            ? "bg-[#921a58]/10"
                            : "bg-pink-50"
                        }`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <Input
                            value={question.question}
                            onChange={(e) =>
                              updateAppointmentQuestion(
                                question.id,
                                "question",
                                e.target.value,
                              )
                            }
                            className={`${themeStyles.inputBg} ${themeStyles.inputBorder} ${themeStyles.textPrimary} text-sm`}
                          />
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() =>
                              removeAppointmentQuestion(question.id)
                            }
                            className="text-red-400 hover:text-red-300 ml-2"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>

                        <div className="flex items-center space-x-4">
                          <select
                            value={question.type}
                            onChange={(e) =>
                              updateAppointmentQuestion(
                                question.id,
                                "type",
                                e.target.value,
                              )
                            }
                            className={`${
                              currentTheme === "dark"
                                ? "bg-[#805283]/40 border-gray-600"
                                : "bg-white border-gray-300"
                            } border rounded px-2 py-1 ${
                              themeStyles.textPrimary
                            } text-sm`}
                          >
                            <option value="text">Text</option>
                            <option value="email">Email</option>
                            <option value="tel">Phone</option>
                            <option value="date">Date</option>
                            <option value="select">Select</option>
                          </select>

                          <label
                            className={`flex items-center text-sm ${themeStyles.textSecondary}`}
                          >
                            <input
                              type="checkbox"
                              checked={question.required}
                              onChange={(e) =>
                                updateAppointmentQuestion(
                                  question.id,
                                  "required",
                                  e.target.checked,
                                )
                              }
                              className="mr-2"
                            />
                            Required
                          </label>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="pt-4">
                    <Button
                      onClick={savingAppointmentQuestions}
                      className={`bg-gradient-to-r ${currentChatbot?.gradient} hover:opacity-90 text-black`}
                    >
                      <Save className="h-4 w-4 mr-2" />
                      Save Questions
                    </Button>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </TabsContent>
  );

  const renderPhoneVerification = () => (
    <AlertDialog defaultOpen>
      <AlertDialogContent className="bg-gradient-to-br from-[#0a0a0a] via-[#1a1a1a] to-[#0a0a0a] backdrop-blur-2xl border border-white/10 rounded-2xl max-w-md p-0 overflow-hidden shadow-2xl">
        <motion.div
          variants={{
            hidden: { opacity: 0, scale: 0.9 },
            visible: {
              opacity: 1,
              scale: 1,
              transition: {
                duration: 0.5,
                ease: "easeOut",
              },
            },
          }}
          initial="hidden"
          animate="visible"
          className="relative"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-[#00F0FF]/5 via-transparent to-[#B026FF]/5"></div>

          <div className="relative p-6 border-b border-white/10">
            <div className="flex justify-between items-center">
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 }}
              >
                <AlertDialogTitle className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-[#00F0FF] to-[#B026FF]">
                  OTP Verification
                </AlertDialogTitle>
                <p className="text-sm text-gray-400 mt-1">
                  Secure your account
                </p>
              </motion.div>

              <AlertDialogCancel
                onClick={() => router.push(`/web/pricing`)}
                className="border-0 p-2 hover:bg-white/10 rounded-xl transition-all duration-300 group bg-transparent"
              >
                <XMarkIcon className="h-6 w-6 text-gray-400 group-hover:text-white transition-colors" />
              </AlertDialogCancel>
            </div>
          </div>

          <form
            onSubmit={handlePhoneSubmit(handlePhoneSubmission)}
            className="p-6 space-y-6"
          >
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="text-center"
            >
              <h3 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-[#00F0FF] to-[#B026FF] font-montserrat">
                PLEASE ENTER YOUR MOBILE NUMBER
              </h3>
            </motion.div>

            <motion.div
              className="space-y-4"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
            >
              <label className="block text-sm font-medium text-gray-300">
                Enter Your Phone Number
              </label>

              <motion.div
                className="flex items-center w-full bg-[#1a1a1a]/80 backdrop-blur-sm border-2 border-white/10 rounded-xl overflow-hidden transition-all duration-300"
                whileFocus={{
                  borderColor: "#00F0FF",
                  boxShadow: "0 0 20px rgba(0, 240, 255, 0.2)",
                }}
                whileHover={{
                  borderColor: "#B026FF",
                  boxShadow: "0 0 15px rgba(176, 38, 255, 0.1)",
                }}
              >
                <select
                  value={countryCode}
                  onChange={(e) => setCountryCode(e.target.value)}
                  className="bg-[#1a1a1a] text-white p-4 border-r border-white/10 focus:outline-none focus:ring-2 focus:ring-[#00F0FF] no-scrollbar appearance-none cursor-pointer"
                >
                  {countryCodes.map((countryCode, index) => (
                    <option
                      key={index}
                      className="bg-[#1a1a1a] text-gray-300 py-2 font-montserrat"
                      value={countryCode.code}
                    >
                      {countryCode.code}
                    </option>
                  ))}
                </select>

                <input
                  id="MobileNumber"
                  type="text"
                  {...registerPhone("MobileNumber")}
                  className="w-full bg-transparent py-4 px-4 text-white placeholder:text-gray-500 focus:outline-none text-lg font-montserrat"
                  placeholder="Phone number"
                />
              </motion.div>

              <AnimatePresence>
                {phoneErrors.MobileNumber && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="text-center"
                  >
                    <p className="text-red-400 text-sm bg-red-400/10 py-2 rounded-lg border border-red-400/20 font-montserrat">
                      {phoneErrors.MobileNumber.message}
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>

            <motion.button
              type="submit"
              variants={{
                initial: {
                  background:
                    "linear-gradient(135deg, #00F0FF 0%, #B026FF 100%)",
                },
                hover: {
                  background:
                    "linear-gradient(135deg, #00F0FF 20%, #B026FF 80%)",
                  scale: 1.02,
                  boxShadow: "0 10px 30px rgba(0, 240, 255, 0.3)",
                  transition: {
                    duration: 0.3,
                    ease: "easeOut",
                  },
                },
                tap: {
                  scale: 0.98,
                },
                loading: {
                  background: "linear-gradient(135deg, #666 0%, #888 100%)",
                },
              }}
              initial="initial"
              whileHover={isOtpSubmitting ? "loading" : "hover"}
              whileTap="tap"
              animate={isOtpSubmitting ? "loading" : "initial"}
              className={`w-full py-4 relative z-30 rounded-xl font-bold text-lg text-white transition-all duration-300 ${
                isOtpSubmitting ? "cursor-not-allowed" : ""
              }`}
              disabled={isOtpSubmitting}
            >
              {isOtpSubmitting ? (
                <motion.div
                  className="flex items-center justify-center gap-3"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                >
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{
                      duration: 1,
                      repeat: Infinity,
                      ease: "linear",
                    }}
                    className="w-5 h-5 border-2 border-white border-t-transparent rounded-full"
                  />
                  Sending OTP...
                </motion.div>
              ) : (
                <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                  Send OTP
                </motion.span>
              )}
            </motion.button>
          </form>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
            className="p-4 text-center border-t border-white/10 bg-black/20"
          >
            <AlertDialogDescription className="text-sm">
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-[#00F0FF] to-[#B026FF] font-semibold font-montserrat">
                IT WILL HELP US TO PROVIDE BETTER SERVICES
              </span>
            </AlertDialogDescription>
          </motion.div>

          <div className="absolute top-0 left-0 w-20 h-20 bg-[#00F0FF]/10 rounded-full blur-xl -translate-x-1/2 -translate-y-1/2"></div>
          <div className="absolute bottom-0 right-0 w-20 h-20 bg-[#B026FF]/10 rounded-full blur-xl translate-x-1/2 translate-y-1/2"></div>
        </motion.div>
      </AlertDialogContent>
    </AlertDialog>
  );

  const renderBuildRequired = () => (
    <div className="text-center py-16">
      <Bot className="h-16 w-16 text-gray-600 mx-auto mb-4" />
      <h3 className={`text-xl font-semibold ${themeStyles.textSecondary} mb-2`}>
        Build Your Chatbot First
      </h3>
      <p className={`${themeStyles.textMuted} mb-6 font-montserrat`}>
        Build your {currentChatbot?.name} chatbot for free to access dashboard
        features
      </p>
      <Button
        onClick={() => setShowBuildDialog(true)}
        className={`bg-gradient-to-r ${currentChatbot?.gradient} hover:opacity-90 text-black font-semibold`}
      >
        <Bot className="h-4 w-4 mr-2" />
        Build {currentChatbot?.name} Chatbot
      </Button>
    </div>
  );

  // Loading state
  if ((loading || !isLoaded) && !hasLoadedRef.current) {
    return (
      <div className="min-h-screen bg-transparent flex items-center justify-center h-full w-full">
        <div className="w-5 h-5 border-2 border-t-transparent border-blue-600 rounded-full animate-spin" />
      </div>
    );
  }

  if (!userId) return null;

  return (
    <div
      className={`min-h-screen ${themeStyles.containerBg} ${themeStyles.textPrimary}`}
    >
      <BreadcrumbsDefault />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {error && renderErrorAlert()}

        {tokenBalance && renderTokenBalanceCard()}

        {renderChatbotSelection()}

        {hasBuiltChatbot && renderStatsGrid()}

        {hasBuiltChatbot ? (
          <Tabs defaultValue={getDefaultTab()} className="space-y-6">
            <TabsList
              className={`${
                currentTheme === "dark"
                  ? "bg-[#0a0a0a]/60 border-gray-800"
                  : "bg-gray-100 border-gray-300"
              } border min-h-max flex flex-wrap max-w-max gap-1 md:gap-3 ${
                themeStyles.textPrimary
              }`}
            >
              {(selectedChatbot === "chatbot-lead-generation" ||
                selectedChatbot === "chatbot-customer-support") && (
                <TabsTrigger
                  value="overview"
                  className={`${themeStyles.textSecondary} data-[state=active]:text-black data-[state=active]:bg-[#2d8a55]`}
                >
                  <BarChart3 className="h-4 w-4 mr-2" />
                  Overview
                </TabsTrigger>
              )}
              {(selectedChatbot === "chatbot-lead-generation" ||
                selectedChatbot === "chatbot-customer-support") && (
                <TabsTrigger
                  value="conversations"
                  className={`${themeStyles.textSecondary} data-[state=active]:text-black data-[state=active]:bg-[#2d8a55]`}
                >
                  <MessageCircle className="h-4 w-4 mr-2" />
                  Chatting
                </TabsTrigger>
              )}
              <TabsTrigger
                value="integration"
                className={`${themeStyles.textSecondary} data-[state=active]:text-black data-[state=active]:bg-[#2d8a55]`}
              >
                <Code className="h-4 w-4 mr-2" />
                Integration
              </TabsTrigger>
              <TabsTrigger
                value="settings"
                className={`${themeStyles.textSecondary} data-[state=active]:text-black data-[state=active]:bg-[#2d8a55]`}
              >
                <Settings className="h-4 w-4 mr-2" />
                Settings
              </TabsTrigger>
            </TabsList>

            {renderOverviewTab()}
            {renderConversationsTab()}
            {renderIntegrationTab()}
            {renderSettingsTab()}
          </Tabs>
        ) : (
          renderBuildRequired()
        )}
      </div>

      {renderBuildDialog()}
      {renderTokenPurchaseDialog()}

      {otpStep === "phone" && renderPhoneVerification()}
      {otpStep === "otp" && phone && (
        <OTPVerification
          phone={phone}
          onVerified={() => setOtpStep("weblink")}
          userId={userId}
        />
      )}
    </div>
  );
}
