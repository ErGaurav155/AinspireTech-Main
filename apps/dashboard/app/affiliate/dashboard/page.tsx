"use client";
import { useState, useEffect, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import Logo from "public/assets/img/logo.png";
import { useTheme } from "next-themes";
import { useAuth } from "@clerk/nextjs";
import { useApi } from "@/lib/useApi";

import {
  Copy,
  Users,
  DollarSign,
  Clock,
  TrendingUp,
  ChevronRight,
  BarChart3,
  Gift,
  Shield,
  CheckCircle2,
  AlertCircle,
  Link as LinkIcon,
  Share2,
  RefreshCw,
  Download,
  Eye,
  Filter,
  Search,
  Calendar,
  CreditCard,
  Building,
  Smartphone,
  Sparkles,
  Target,
  Zap,
  ArrowUpRight,
  MoreVertical,
  ExternalLink,
} from "lucide-react";

import Link from "next/link";
import Image from "next/image";
import { ThemeToggle } from "@rocketreplai/ui/components/shared/theme-toggle";
import { Button } from "@rocketreplai/ui/components/radix/button";
import { CardContent } from "@rocketreplai/ui/components/radix/card";
import { getAffiliateDashInfo } from "@/lib/services/affiliate-actions.api";

interface DashboardData {
  isAffiliate: boolean;
  affiliate: any;
  stats: any;
  referrals: any[];
  monthlyCommissions: any[];
  payoutHistory: any[];
  affiliateLink: string;
}

export default function AffiliateDashboard() {
  const router = useRouter();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<
    "overview" | "referrals" | "earnings" | "payouts"
  >("overview");
  const { userId, isLoaded } = useAuth();
  const { apiRequest } = useApi();

  const [copied, setCopied] = useState(false);
  const { theme, resolvedTheme } = useTheme();
  const currentTheme = resolvedTheme || theme || "light";

  // Theme-based styles
  const themeStyles = useMemo(() => {
    const isDark = currentTheme === "dark";
    return {
      containerBg: isDark
        ? "bg-[#0a0a0a]"
        : "bg-gradient-to-b from-gray-200 to-gray-50",
      headerBg: isDark ? "bg-[#0a0a0a]/95" : "bg-white/95",
      badgeBorder: isDark ? "border-[#00F0FF]/30" : "border-blue-700/30",
      titleText: isDark ? "text-white" : "text-gray-900",
      descriptionText: isDark ? "text-gray-300" : "text-gray-600",
      cardBg: isDark
        ? "bg-[#1a1a1a]/60 border-white/10"
        : "bg-white border-gray-200",
      gradientBg: isDark
        ? "from-[#00F0FF]/10 via-[#B026FF]/5 to-transparent"
        : "from-blue-50 via-purple-50 to-transparent",
      ctaGradient: isDark
        ? "from-[#00F0FF] via-[#B026FF] to-[#FF2E9F]"
        : "from-blue-600 via-purple-600 to-pink-600",
    };
  }, [currentTheme]);
  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        duration: 0.8,
        staggerChildren: 0.2,
      },
    },
  };

  const cardVariants = {
    hidden: {
      opacity: 0,
      y: 60,
      scale: 0.9,
      rotateX: -10,
    },
    visible: {
      opacity: 1,
      y: 0,
      scale: 1,
      rotateX: 0,
      transition: {
        duration: 0.6,
        ease: "easeOut",
      },
    },
    hover: {
      y: -8,
      scale: 1.02,
      borderColor:
        theme === "dark" ? "rgba(0, 240, 255, 0.4)" : "rgba(59, 130, 246, 0.4)",
      transition: {
        duration: 0.3,
        ease: "easeOut",
      },
    },
  };

  const titleVariants = {
    hidden: { opacity: 0, y: 30 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.6,
        ease: "easeOut",
      },
    },
  };

  const fetchDashboardData = useCallback(async () => {
    try {
      const result = await getAffiliateDashInfo(apiRequest);
      if (!result.isAffiliate) {
        setData(null);
        router.push("/affiliate/register");
        return;
      }
      setData(result);
    } catch (error) {
      console.error("Error fetching dashboard:", error);
    } finally {
      setLoading(false);
    }
  }, [router, apiRequest]);

  useEffect(() => {
    if (!userId) {
      router.push("/sign-in");
      return;
    }
    if (!isLoaded) {
      return;
    }
    fetchDashboardData();
  }, [fetchDashboardData, userId, router, isLoaded]);

  const copyAffiliateLink = async () => {
    if (data?.affiliateLink) {
      await navigator.clipboard.writeText(data.affiliateLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const getProductIcon = (productType: string) => {
    switch (productType) {
      case "web-chatbot":
        return "💬";
      case "insta-automation":
        return "📱";
      default:
        return "📦";
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
    }).format(amount);
  };

  const stats = [
    {
      icon: Users,
      label: "Total Referrals",
      value: data?.stats?.totalReferrals || 0,
      gradient: "from-blue-400 to-cyan-500",
      change: "+12%",
    },
    {
      icon: DollarSign,
      label: "Total Earnings",
      value: formatCurrency(data?.stats?.totalEarnings || 0),
      gradient: "from-green-400 to-emerald-500",
      change: "+24%",
    },
    {
      icon: Clock,
      label: "Pending Payout",
      value: formatCurrency(data?.stats?.pendingEarnings || 0),
      gradient: "from-purple-400 to-pink-500",
      change: "Ready",
    },
    {
      icon: TrendingUp,
      label: "This Month",
      value: formatCurrency(data?.stats?.monthlyEarnings || 0),
      gradient: "from-orange-400 to-red-500",
      change: "+18%",
    },
  ];

  if (loading || !isLoaded) {
    return (
      <div className="min-h-screen bg-transparent  flex items-center justify-center h-full w-full">
        <div className="w-5 h-5 border-2 border-t-transparent border-blue-600 rounded-full animate-spin" />
      </div>
    );
  }

  if (!data) return null;

  return (
    <div
      className={`min-h-screen ${themeStyles.containerBg} transition-colors duration-300 relative bg-transparent  z-10`}
    >
      <motion.header
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        transition={{ duration: 0.5 }}
        className={` w-full z-50 transition-all duration-300 backdrop-blur-lg shadow-lg
        `}
      >
        <div className=" wrapper2 w-full mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-3">
              <Link href="/" className="flex items-center">
                <div className="relative h-7 w-7 md:w-10 md:h-10 mr-1 md:mr-3">
                  <div className="absolute inset-0 rounded-full bg-gradient-to-r from-[#00F0FF] to-[#B026FF] animate-pulse"></div>
                  <div className="absolute inset-1 rounded-full bg-background flex items-center justify-center">
                    <Image
                      alt="Logo"
                      src={Logo}
                      width={24}
                      height={24}
                      className="object-contain"
                    />
                  </div>
                </div>
                <h1 className="text-lg lg:text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-[#00F0FF] to-[#FF2E9F]">
                  Ainpire<span className="text-[#B026FF]">Tech</span>
                </h1>
              </Link>
            </div>
            <div className="flex items-center space-x-6">
              <ThemeToggle />
              <motion.div
                variants={cardVariants}
                initial="hidden"
                animate="visible"
                className="mt-6 md:mt-0 hidden lg:flex"
              >
                <Button
                  onClick={copyAffiliateLink}
                  className="rounded-full bg-gradient-to-r from-[#00F0FF] to-[#B026FF] hover:from-[#00F0FF] hover:to-[#00F0FF]/90 text-white px-6"
                >
                  {copied ? (
                    <>
                      <CheckCircle2 className="w-4 h-4 mr-2" />
                      Copied!
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4 mr-2" />
                      Copy Affiliate Link
                    </>
                  )}
                </Button>
              </motion.div>
            </div>
          </div>
        </div>
      </motion.header>
      {/* Header */}
      <div
        className={`mt-2 ${
          theme === "dark"
            ? "bg-gradient-to-r from-[#0a0a0a] via-[#1a1a1a] to-[#0a0a0a]"
            : "bg-gradient-to-r from-blue-600/10 via-purple-600/10 to-pink-600/10"
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col md:flex-row md:items-center justify-between"
          >
            <div>
              <motion.div
                variants={titleVariants}
                initial="hidden"
                animate="visible"
                className="flex items-center text-blue-700 mb-2"
              >
                <span
                  className={`text-sm font-medium uppercase tracking-widest border ${themeStyles.badgeBorder} rounded-full px-4 py-1`}
                >
                  Affiliate Dashboard
                </span>
              </motion.div>
              <h1
                className={`text-3xl md:text-4xl font-bold ${themeStyles.titleText}`}
              >
                Welcome back,{" "}
                <span className="bg-gradient-to-r from-[#00F0FF] to-[#B026FF] bg-clip-text text-transparent">
                  {data.affiliate?.user?.firstName}
                </span>
              </h1>
              <p
                className={`text-lg mt-2 font-montserrat ${themeStyles.descriptionText}`}
              >
                Track your referrals and earnings in real-time
              </p>
            </div>
            <motion.div
              variants={cardVariants}
              initial="hidden"
              animate="visible"
              className="mt-6 md:mt-0 flex lg:hidden"
            >
              <Button
                onClick={copyAffiliateLink}
                className="rounded-full bg-gradient-to-r from-[#00F0FF] to-[#B026FF] hover:from-[#00F0FF] hover:to-[#00F0FF]/90 text-white px-6"
              >
                {copied ? (
                  <>
                    <CheckCircle2 className="w-4 h-4 mr-2" />
                    Copied!
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4 mr-2" />
                    Copy Affiliate Link
                  </>
                )}
              </Button>
            </motion.div>
          </motion.div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="max-w-7xl mx-auto px-2 sm:px-6 lg:px-8 mt-8">
        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: false, margin: "-100px" }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"
        >
          {stats?.map((stat, index) => (
            <motion.div
              key={stat.label}
              variants={cardVariants}
              whileHover="hover"
              className={`rounded-2xl backdrop-blur-sm ${themeStyles.cardBg}`}
            >
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div
                    className={`w-14 h-14 rounded-xl bg-gradient-to-br ${stat.gradient} flex items-center justify-center mb-4`}
                  >
                    <stat.icon className="w-6 h-6 text-white" />
                  </div>
                  <span
                    className={`text-sm px-2 py-1 rounded-full ${
                      stat.change.includes("+")
                        ? "bg-green-400/20 text-green-400"
                        : "bg-blue-400/20 text-blue-400"
                    }`}
                  >
                    {stat.change}
                  </span>
                </div>
                <p
                  className={`text-2xl font-bold mb-2 ${themeStyles.titleText}`}
                >
                  {stat.value}
                </p>
                <p className={themeStyles.descriptionText}>{stat.label}</p>
              </CardContent>
            </motion.div>
          ))}
        </motion.div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-2 sm:px-6 lg:px-8 py-8">
        <motion.div
          variants={cardVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: false }}
          className={`rounded-3xl backdrop-blur-sm ${themeStyles.cardBg} overflow-hidden`}
        >
          {/* Tabs */}
          <div
            className={`border-b ${
              theme === "dark" ? "border-white/10" : "border-gray-200"
            }`}
          >
            <nav className="flex -mb-px">
              {[
                { id: "overview", label: "Overview", icon: BarChart3 },
                {
                  id: "referrals",
                  label: "Referrals",
                  icon: Users,
                  count: data?.referrals?.length,
                },
                { id: "earnings", label: "Earnings", icon: DollarSign },
                { id: "payouts", label: "Payouts", icon: CreditCard },
              ].map((tab) => (
                <motion.button
                  key={tab.id}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex items-center py-2 px-0  md:py-4 md:px-6 font-light md:font-medium text-xs md:text-sm border-b-2 gap-1 w-full transition-all ${
                    activeTab === tab.id
                      ? "border-[#00F0FF] text-[#00F0FF]"
                      : `border-transparent ${themeStyles.descriptionText} hover:text-[#00F0FF]`
                  }`}
                >
                  <tab.icon className="w-4 h-4 mr-1 hidden md:mr-2" />
                  {tab.label}
                  {tab.count && (
                    <span className="hidden md:flex ml-1 md:ml-2 px-1 md:px-2 py-0.5 text-xs rounded-full bg-[#00F0FF]/20 text-[#00F0FF]">
                      {tab.count}
                    </span>
                  )}
                </motion.button>
              ))}
            </nav>
          </div>

          {/* Tab Content */}
          <div className="p-2 md:p-6">
            {/* Overview Tab */}
            {activeTab === "overview" && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-8"
              >
                {/* Affiliate Link Section */}
                <div>
                  <div className="flex flex-col sm:flex-row  items-center justify-between mb-4">
                    <h3
                      className={`text-lg font-semibold ${themeStyles.titleText} pb-2 sm:pb-0`}
                    >
                      Your Affiliate Link
                    </h3>
                    <div className="flex gap-2 ">
                      <Button
                        size="sm"
                        variant="outline"
                        className="rounded-full"
                        onClick={copyAffiliateLink}
                      >
                        <Copy className="w-4 h-4 mr-2" />
                        {copied ? "Copied!" : "Copy"}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="rounded-full"
                      >
                        <Share2 className="w-4 h-4 mr-2" />
                        Share
                      </Button>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div
                      className={`flex-1 p-3 rounded-xl ${
                        theme === "dark" ? "bg-[#2a2a2a]" : "bg-gray-100"
                      } font-mono text-sm break-all`}
                    >
                      {data.affiliateLink}
                    </div>
                  </div>
                  <p
                    className={`text-sm mt-2 ${themeStyles.descriptionText} font-montserrat`}
                  >
                    Share this link on social media, websites, or with friends
                    to earn commissions!
                  </p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  {/* Top Referrals */}
                  <motion.div
                    variants={cardVariants}
                    whileHover="hover"
                    className={`rounded-2xl backdrop-blur-sm ${themeStyles.cardBg}`}
                  >
                    <CardContent className="p-2 md:p-6">
                      <div className="flex items-center justify-between mb-6">
                        <h3
                          className={`font-semibold ${themeStyles.titleText}`}
                        >
                          Top Performing Referrals
                        </h3>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-[#00F0FF]"
                        >
                          View All <ChevronRight className="w-4 h-4 ml-1" />
                        </Button>
                      </div>
                      <div className="space-y-4">
                        {data?.referrals?.slice(0, 5).map((referral) => (
                          <div
                            key={referral._id}
                            className="flex items-center justify-between p-3 rounded-lg hover:bg-white/5 transition-colors"
                          >
                            <div className="flex items-center">
                              <div className="w-10 h-10 rounded-lg bg-gradient-to-r from-blue-400 to-cyan-500 flex items-center justify-center mr-3">
                                <span className="text-lg">
                                  {getProductIcon(referral.productType)}
                                </span>
                              </div>
                              <div>
                                <p
                                  className={`font-medium ${themeStyles.titleText}`}
                                >
                                  {referral.referredUserId?.firstName}{" "}
                                  {referral.referredUserId?.lastName}
                                </p>
                                <p
                                  className={`text-xs ${themeStyles.descriptionText}`}
                                >
                                  {referral.referredUserId?.email}
                                </p>
                              </div>
                            </div>
                            <div className="text-right">
                              <p
                                className={`font-bold ${themeStyles.titleText}`}
                              >
                                {formatCurrency(referral.totalCommissionEarned)}
                              </p>
                              <span
                                className={`text-xs ${themeStyles.descriptionText}`}
                              >
                                {referral.subscriptionType}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </motion.div>

                  {/* Recent Commissions */}
                  <motion.div
                    variants={cardVariants}
                    whileHover="hover"
                    className={`rounded-2xl backdrop-blur-sm ${themeStyles.cardBg}`}
                  >
                    <CardContent className="p-2 md:p-6">
                      <div className="flex items-center justify-between mb-6">
                        <h3
                          className={`font-semibold ${themeStyles.titleText}`}
                        >
                          Recent Commissions
                        </h3>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-[#00F0FF]"
                        >
                          View All <ChevronRight className="w-4 h-4 ml-1" />
                        </Button>
                      </div>
                      {data?.monthlyCommissions && (
                        <div className="space-y-4">
                          {data?.monthlyCommissions
                            .slice(0, 5)
                            .map((commission) => (
                              <div
                                key={commission._id}
                                className="flex items-center justify-between p-3 rounded-lg hover:bg-white/5 transition-colors"
                              >
                                <div className="flex items-center">
                                  <div
                                    className={`w-10 h-10 rounded-lg flex items-center justify-center mr-3 ${
                                      commission.status === "paid"
                                        ? "bg-gradient-to-r from-green-400 to-emerald-500"
                                        : "bg-gradient-to-r from-yellow-400 to-amber-500"
                                    }`}
                                  >
                                    <span className="text-lg">
                                      {commission.productType === "web-chatbot"
                                        ? "💬"
                                        : "📱"}
                                    </span>
                                  </div>
                                  <div>
                                    <p
                                      className={`font-medium ${themeStyles.titleText}`}
                                    >
                                      {commission.productName}
                                    </p>
                                    <div className="flex items-center gap-2 text-xs">
                                      <span
                                        className={themeStyles.descriptionText}
                                      >
                                        {commission.period}
                                      </span>
                                      <span className="text-gray-400">•</span>
                                      <span
                                        className={`capitalize ${
                                          commission.status === "paid"
                                            ? "text-green-400"
                                            : "text-yellow-400"
                                        }`}
                                      >
                                        {commission.status}
                                      </span>
                                    </div>
                                  </div>
                                </div>
                                <p
                                  className={`font-bold text-lg ${themeStyles.titleText}`}
                                >
                                  {formatCurrency(commission.amount)}
                                </p>
                              </div>
                            ))}
                        </div>
                      )}
                    </CardContent>
                  </motion.div>
                </div>

                {/* How It Works */}
                <motion.div
                  variants={cardVariants}
                  whileHover="hover"
                  className={`rounded-2xl backdrop-blur-sm ${themeStyles.cardBg}`}
                >
                  <CardContent className="p-2 md:p-6">
                    <h3
                      className={`font-semibold mb-6 ${themeStyles.titleText}`}
                    >
                      How It Works
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      {[
                        {
                          step: "1",
                          title: "Share Your Link",
                          desc: "Share your unique affiliate link",
                          icon: Share2,
                          gradient: "from-blue-400 to-cyan-500",
                        },
                        {
                          step: "2",
                          title: "Get Referrals",
                          desc: "Users sign up through your link",
                          icon: Users,
                          gradient: "from-purple-400 to-pink-500",
                        },
                        {
                          step: "3",
                          title: "Earn Commission",
                          desc: "Get 30% of their subscription fees",
                          icon: DollarSign,
                          gradient: "from-green-400 to-emerald-500",
                        },
                      ].map((item) => (
                        <motion.div
                          key={item.step}
                          whileHover={{ y: -4 }}
                          className="text-center"
                        >
                          <div
                            className={`w-16 h-16 bg-gradient-to-br ${item.gradient} rounded-full flex items-center justify-center mx-auto mb-4`}
                          >
                            <item.icon className="w-6 h-6 text-white" />
                          </div>
                          <h4
                            className={`font-medium mb-2 ${themeStyles.titleText}`}
                          >
                            {item.title}
                          </h4>
                          <p
                            className={`text-sm ${themeStyles.descriptionText} font-montserrat`}
                          >
                            {item.desc}
                          </p>
                        </motion.div>
                      ))}
                    </div>
                  </CardContent>
                </motion.div>
              </motion.div>
            )}

            {/* Referrals Tab */}
            {activeTab === "referrals" && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 w-full">
                  <div>
                    <h3
                      className={`text-lg font-semibold ${themeStyles.titleText}`}
                    >
                      All Referrals
                    </h3>
                    <p className={`text-sm ${themeStyles.descriptionText}`}>
                      Showing {data?.referrals?.length} referrals
                    </p>
                  </div>
                  <div className="flex items-center justify-between gap-3 mt-4 md:mt-0 w-full">
                    <div
                      className={`flex items-center justify-start px-3 py-2 max-w-max md:max-w-full w-full rounded-lg ${
                        theme === "dark" ? "bg-[#2a2a2a]" : "bg-gray-100"
                      }`}
                    >
                      <Search className="w-4 h-4 text-gray-400 mr-2" />
                      <input
                        type="text"
                        placeholder="Search referrals..."
                        className={`bg-transparent border-none outline-none text-sm ${themeStyles.titleText} max-w-max md:max-w-full w-full`}
                      />
                    </div>
                    <Button variant="outline" className="rounded-lg">
                      <Filter className="w-4 h-4 mr-2" />
                      Filter
                    </Button>
                  </div>
                </div>

                <div className="overflow-x-scroll w-full rounded-xl border border-white/10">
                  <table className="min-w-full divide-y divide-white/10">
                    <thead>
                      <tr
                        className={
                          theme === "dark" ? "bg-[#1a1a1a] " : "bg-gray-50 "
                        }
                      >
                        {[
                          "User",
                          "Product",
                          "Plan",
                          "Status",
                          "Earnings",
                          "Remaining",
                        ].map((header) => (
                          <th
                            key={header}
                            className=" px-2 md:px-6 py-3 text-left text-xs font-normal md:font-medium uppercase tracking-wider "
                          >
                            <span className={themeStyles.descriptionText}>
                              {header}
                            </span>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/10 font-montserrat">
                      {data?.referrals?.map((referral) => (
                        <tr
                          key={referral._id}
                          className="hover:bg-white/5 transition-colors"
                        >
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <div
                                className={`w-10 h-10 rounded-lg flex items-center justify-center mr-3 ${
                                  referral.status === "active"
                                    ? "bg-gradient-to-r from-green-400 to-emerald-500"
                                    : "bg-gradient-to-r from-gray-400 to-gray-500"
                                }`}
                              >
                                <span className="text-lg">
                                  {getProductIcon(referral.productType)}
                                </span>
                              </div>
                              <div>
                                <div
                                  className={`font-medium ${themeStyles.titleText}`}
                                >
                                  {referral.referredUserId?.firstName}{" "}
                                  {referral.referredUserId?.lastName}
                                </div>
                                <div className="text-sm text-gray-500">
                                  {referral.referredUserId?.email}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className={themeStyles.titleText}>
                              {referral.productType === "web-chatbot"
                                ? `Web Chatbot`
                                : `Instagram Automation`}
                            </div>
                            <div
                              className={`text-sm ${themeStyles.descriptionText}`}
                            >
                              {referral.productType === "web-chatbot"
                                ? referral.chatbotType
                                : referral.instaPlan}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className={themeStyles.titleText}>
                              {formatCurrency(referral.subscriptionPrice)}
                            </div>
                            <div
                              className={`text-sm ${themeStyles.descriptionText}`}
                            >
                              per {referral.subscriptionType}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span
                              className={`px-3 py-1 rounded-full text-xs font-medium ${
                                referral.status === "active"
                                  ? "bg-green-400/20 text-green-400"
                                  : "bg-gray-400/20 text-gray-400"
                              }`}
                            >
                              {referral.status}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div
                              className={`font-bold ${themeStyles.titleText}`}
                            >
                              {formatCurrency(referral.totalCommissionEarned)}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div
                              className={`text-sm ${themeStyles.descriptionText}`}
                            >
                              {referral.subscriptionType === "monthly"
                                ? `${referral.monthsRemaining} months`
                                : `${referral.yearsRemaining} years`}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </motion.div>
            )}

            {/* Earnings Tab */}
            {activeTab === "earnings" && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
                  {[
                    {
                      title: "Total Earnings",
                      value: formatCurrency(data?.stats?.totalEarnings),
                      gradient: "from-green-400 to-emerald-500",
                      icon: DollarSign,
                      description: "Lifetime earnings",
                    },
                    {
                      title: "Pending Payout",
                      value: formatCurrency(data?.stats?.pendingEarnings),
                      gradient: "from-yellow-400 to-amber-500",
                      icon: Clock,
                      description: "Available for payout",
                    },
                    {
                      title: "This Month",
                      value: formatCurrency(data?.stats?.monthlyEarnings),
                      gradient: "from-blue-400 to-cyan-500",
                      icon: TrendingUp,
                      description: "Current month earnings",
                    },
                  ]?.map((stat) => (
                    <motion.div
                      key={stat.title}
                      variants={cardVariants}
                      whileHover="hover"
                      className={`rounded-2xl backdrop-blur-sm ${themeStyles.cardBg}`}
                    >
                      <CardContent className="p-6">
                        <div className="flex items-start justify-between">
                          <div
                            className={`w-12 h-12 rounded-xl bg-gradient-to-br ${stat.gradient} flex items-center justify-center mb-4`}
                          >
                            <stat.icon className="w-6 h-6 text-white" />
                          </div>
                        </div>
                        <p
                          className={`text-2xl font-bold mb-2 ${themeStyles.titleText}`}
                        >
                          {stat.value}
                        </p>
                        <p className="font-medium">{stat.title}</p>
                        <p
                          className={`text-sm mt-2 font-montserrat ${themeStyles.descriptionText}`}
                        >
                          {stat.description}
                        </p>
                      </CardContent>
                    </motion.div>
                  ))}
                </div>

                <h3
                  className={`text-lg font-semibold mb-4 ${themeStyles.titleText}`}
                >
                  Commission History
                </h3>
                <div className="space-y-4">
                  {data?.monthlyCommissions?.map((commission) => (
                    <motion.div
                      key={commission._id}
                      variants={cardVariants}
                      whileHover="hover"
                      className={`rounded-xl backdrop-blur-sm ${themeStyles.cardBg}`}
                    >
                      <div className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center">
                            <div
                              className={`w-12 h-12 rounded-lg flex items-center justify-center mr-4 ${
                                commission.status === "paid"
                                  ? "bg-gradient-to-r from-green-400 to-emerald-500"
                                  : "bg-gradient-to-r from-yellow-400 to-amber-500"
                              }`}
                            >
                              <span className="text-xl">
                                {commission.productType === "web-chatbot"
                                  ? "💬"
                                  : "📱"}
                              </span>
                            </div>
                            <div>
                              <p
                                className={`font-medium ${themeStyles.titleText}`}
                              >
                                {commission.productName}
                              </p>
                              <div className="flex items-center gap-2 text-sm">
                                <span className={themeStyles.descriptionText}>
                                  Period: {commission.period}
                                </span>
                                <span className="text-gray-400">•</span>
                                <span className={themeStyles.descriptionText}>
                                  Type: {commission.subscriptionType}
                                </span>
                              </div>
                            </div>
                          </div>
                          <div className="text-right">
                            <p
                              className={`font-bold text-xl ${themeStyles.titleText}`}
                            >
                              {formatCurrency(commission.amount)}
                            </p>
                            <span
                              className={`text-sm ${
                                commission.status === "paid"
                                  ? "text-green-400"
                                  : "text-yellow-400"
                              }`}
                            >
                              {commission.status === "paid"
                                ? "Paid"
                                : "Pending"}
                            </span>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            )}

            {/* Payouts Tab */}
            {activeTab === "payouts" && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <div className="flex flex-col md:flex-row md:items-center justify-between mb-6">
                  <div>
                    <h3
                      className={`text-lg font-semibold ${themeStyles.titleText}`}
                    >
                      Payout History
                    </h3>
                    <p
                      className={`text-sm ${themeStyles.descriptionText} font-montserrat`}
                    >
                      Track your payout requests and status
                    </p>
                  </div>
                  <Button className="mt-4 md:mt-0 rounded-full bg-gradient-to-r from-[#00F0FF] to-[#B026FF] hover:from-[#00F0FF] hover:to-[#00F0FF]/90 text-white">
                    Request Payout
                  </Button>
                </div>

                {!data || data?.payoutHistory?.length === 0 ? (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`rounded-2xl backdrop-blur-sm ${themeStyles.cardBg} text-center py-12`}
                  >
                    <div className="w-16 h-16 bg-gradient-to-r from-[#00F0FF]/20 to-[#B026FF]/20 rounded-full flex items-center justify-center mx-auto mb-4">
                      <DollarSign className="w-8 h-8 text-[#00F0FF]" />
                    </div>
                    <h4
                      className={`text-lg font-semibold mb-2 ${themeStyles.titleText}`}
                    >
                      No Payouts Yet
                    </h4>
                    <p
                      className={`max-w-md mx-auto ${themeStyles.descriptionText}`}
                    >
                      Your pending earnings will be automatically paid at the
                      end of each month
                    </p>
                  </motion.div>
                ) : (
                  <div className="space-y-4">
                    {data?.payoutHistory?.map((payout) => (
                      <motion.div
                        key={payout._id}
                        variants={cardVariants}
                        whileHover="hover"
                        className={`rounded-xl backdrop-blur-sm ${themeStyles.cardBg}`}
                      >
                        <div className="p-6">
                          <div className="flex flex-col md:flex-row md:items-start justify-between">
                            <div>
                              <div className="flex items-center gap-4 mb-3">
                                <span
                                  className={`px-3 py-1 rounded-full text-sm font-medium ${
                                    payout.status === "completed"
                                      ? "bg-green-400/20 text-green-400"
                                      : payout.status === "processing"
                                        ? "bg-yellow-400/20 text-yellow-400"
                                        : "bg-red-400/20 text-red-400"
                                  }`}
                                >
                                  {payout.status}
                                </span>
                                <span
                                  className={`text-sm ${themeStyles.descriptionText}`}
                                >
                                  Period: {payout.period}
                                </span>
                              </div>
                              <p
                                className={`font-bold text-2xl mb-2 ${themeStyles.titleText}`}
                              >
                                {formatCurrency(payout.amount)}
                              </p>
                              <div className="flex items-center gap-4 text-sm">
                                <span className={themeStyles.descriptionText}>
                                  Method: {payout.paymentMethod}
                                </span>
                                <span className="text-gray-400">•</span>
                                <span className={themeStyles.descriptionText}>
                                  Date:{" "}
                                  {new Date(
                                    payout.createdAt,
                                  ).toLocaleDateString()}
                                </span>
                              </div>
                            </div>
                            {payout.transactionId && (
                              <div className="mt-4 md:mt-0 text-left md:text-right">
                                <p
                                  className={`text-sm ${themeStyles.descriptionText}`}
                                >
                                  Transaction ID
                                </p>
                                <p
                                  className={`font-mono text-sm ${themeStyles.titleText}`}
                                >
                                  {payout.transactionId}
                                </p>
                              </div>
                            )}
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}

                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`rounded-2xl backdrop-blur-sm ${themeStyles.cardBg} mt-8`}
                >
                  <CardContent className="p-6">
                    <h4
                      className={`font-semibold mb-4 ${themeStyles.titleText}`}
                    >
                      Payout Information
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <p
                          className={`text-sm mb-2 ${themeStyles.descriptionText}`}
                        >
                          Payment Method
                        </p>
                        <div className="flex items-center">
                          <div
                            className={`w-10 h-10 rounded-lg flex items-center justify-center mr-3 ${
                              data?.affiliate?.paymentDetails?.method === "bank"
                                ? "bg-gradient-to-r from-blue-400 to-cyan-500"
                                : data?.affiliate?.paymentDetails?.method ===
                                    "upi"
                                  ? "bg-gradient-to-r from-purple-400 to-pink-500"
                                  : "bg-gradient-to-r from-yellow-400 to-amber-500"
                            }`}
                          >
                            {data?.affiliate?.paymentDetails?.method ===
                            "bank" ? (
                              <Building className="w-5 h-5 text-white" />
                            ) : data?.affiliate?.paymentDetails?.method ===
                              "upi" ? (
                              <Smartphone className="w-5 h-5 text-white" />
                            ) : (
                              <CreditCard className="w-5 h-5 text-white" />
                            )}
                          </div>
                          <div>
                            <p
                              className={`font-medium ${themeStyles.titleText}`}
                            >
                              {data?.affiliate?.paymentDetails?.method.toUpperCase()}
                            </p>
                            {data?.affiliate?.paymentDetails?.method ===
                              "bank" && (
                              <p
                                className={`text-sm ${themeStyles.descriptionText}`}
                              >
                                {data?.affiliate?.paymentDetails?.bankName}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                      <div>
                        <p
                          className={`text-sm mb-2 ${themeStyles.descriptionText}`}
                        >
                          Next Payout Date
                        </p>
                        <div className="flex items-center">
                          <div className="w-10 h-10 rounded-lg bg-gradient-to-r from-[#00F0FF] to-[#B026FF] flex items-center justify-center mr-3">
                            <Calendar className="w-5 h-5 text-white" />
                          </div>
                          <div>
                            <p
                              className={`font-medium ${themeStyles.titleText}`}
                            >
                              {new Date().getDate() <= 25
                                ? `25th ${new Date().toLocaleString("default", {
                                    month: "long",
                                  })}`
                                : `25th ${new Date(
                                    new Date().setMonth(
                                      new Date().getMonth() + 1,
                                    ),
                                  ).toLocaleString("default", {
                                    month: "long",
                                  })}`}
                            </p>
                            <p
                              className={`text-sm ${themeStyles.descriptionText}`}
                            >
                              Minimum payout: ₹1000
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </motion.div>
              </motion.div>
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
