"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { useAuth } from "@clerk/nextjs";
import { useApi } from "@/lib/useApi";
import {
  Copy,
  Share2,
  Link as LinkIcon,
  Users,
  CreditCard,
  TrendingUp,
  CheckCircle2,
  ArrowRight,
  Instagram,
  Globe,
} from "lucide-react";

import { getAffiliateDashInfo } from "@/lib/services/affiliate-actions.api";
import {
  Button,
  EmptyState,
  Orbs,
  Spinner,
  toast,
  useThemeStyles,
} from "@rocketreplai/ui";
interface ReferEarnPageProps {
  dashboardType: "insta" | "web";
}

// Illustration component
const ReferralIllustration = ({ isDark }: { isDark: boolean }) => (
  <div className="relative w-full h-64 flex items-center justify-center">
    <div className="relative">
      <div
        className={`w-48 h-48 bg-gradient-to-br from-pink-400 to-pink-600 rounded-full flex items-center justify-center ${isDark ? "opacity-90" : ""}`}
      >
        <div className="text-white text-6xl">💰</div>
      </div>

      <motion.div
        animate={{ y: [-10, 10, -10] }}
        transition={{ duration: 2, repeat: Infinity }}
        className={`absolute -top-4 -right-4 w-16 h-16 bg-gradient-to-br from-yellow-400 to-yellow-600 rounded-full flex items-center justify-center text-2xl ${isDark ? "opacity-90" : ""}`}
      >
        💵
      </motion.div>

      <motion.div
        animate={{ y: [10, -10, 10] }}
        transition={{ duration: 2.5, repeat: Infinity }}
        className={`absolute -bottom-4 -left-4 w-16 h-16 bg-gradient-to-br from-green-400 to-green-600 rounded-full flex items-center justify-center text-2xl ${isDark ? "opacity-90" : ""}`}
      >
        💸
      </motion.div>

      <motion.div
        animate={{ y: [-5, 15, -5] }}
        transition={{ duration: 3, repeat: Infinity }}
        className={`absolute top-8 -right-12 w-12 h-12 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full flex items-center justify-center text-xl ${isDark ? "opacity-90" : ""}`}
      >
        💳
      </motion.div>
    </div>
  </div>
);

export default function ReferEarnPage({ dashboardType }: ReferEarnPageProps) {
  const router = useRouter();
  const { userId, isLoaded } = useAuth();
  const { apiRequest } = useApi();
  const { styles, isDark } = useThemeStyles();

  const [affiliateData, setAffiliateData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [emailInput, setEmailInput] = useState("");

  const primaryColor = dashboardType === "insta" ? "pink" : "purple";
  const gradient =
    dashboardType === "insta"
      ? "from-pink-500 to-rose-500"
      : "from-purple-500 to-pink-500";
  const Icon = dashboardType === "insta" ? Instagram : Globe;
  const payoutRoute =
    dashboardType === "insta" ? "/insta/refer/payouts" : "/web/refer/payouts";

  useEffect(() => {
    if (!userId || !isLoaded) return;

    const fetchData = async () => {
      try {
        const data = await getAffiliateDashInfo(apiRequest);

        if (!data.isAffiliate) {
          console.error("User doesn't have affiliate record");
          toast({
            title: "Error loading referral data",
            description: "Please refresh the page",
            variant: "destructive",
            duration: 3000,
          });
        }

        setAffiliateData(data);
      } catch (error) {
        console.error("Error fetching affiliate data:", error);
        toast({
          title: "Error loading referral data",
          variant: "destructive",
          duration: 3000,
        });
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [userId, isLoaded, apiRequest]);

  const handleCopyLink = useCallback(async () => {
    if (affiliateData?.affiliateLink) {
      await navigator.clipboard.writeText(affiliateData.affiliateLink);
      setCopied(true);
      toast({
        title: "Copied!",
        description: "Referral link copied to clipboard",
        duration: 2000,
      });
      setTimeout(() => setCopied(false), 2000);
    }
  }, [affiliateData]);

  const handleShare = useCallback(async () => {
    if (affiliateData?.affiliateLink) {
      if (navigator.share) {
        try {
          await navigator.share({
            title: "Join RocketReplai",
            text: "Sign up for RocketReplai and get amazing AI tools!",
            url: affiliateData.affiliateLink,
          });
        } catch (error) {
          console.log("Share cancelled");
        }
      } else {
        handleCopyLink();
      }
    }
  }, [affiliateData, handleCopyLink]);

  const handleInvite = () => {
    if (!emailInput) {
      toast({
        title: "Email required",
        description: "Please enter an email address",
        variant: "destructive",
        duration: 3000,
      });
      return;
    }

    if (!/^\S+@\S+\.\S+$/.test(emailInput)) {
      toast({
        title: "Invalid email",
        description: "Please enter a valid email address",
        variant: "destructive",
        duration: 3000,
      });
      return;
    }

    toast({
      title: "Coming soon!",
      description: "Email invites will be available soon",
      duration: 3000,
    });
  };

  if (!isLoaded || loading) {
    return <Spinner label="Loading referral program…" />;
  }

  const stats = affiliateData?.stats || {};

  return (
    <div className={styles.page}>
      {isDark && <Orbs />}
      <div className={styles.container}>
        {/* Hero Section */}
        <div className={`${styles.card} p-6 md:p-8 mb-6`}>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center relative z-10">
            <div>
              <motion.h1
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className={`text-4xl md:text-5xl font-bold mb-4 ${styles.text.primary}`}
              >
                Invite friends.
                <br />
                <span
                  className={`bg-gradient-to-r ${gradient} bg-clip-text text-transparent`}
                >
                  Earn rewards.
                </span>
              </motion.h1>

              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className={`text-lg mb-8 ${styles.text.secondary}`}
              >
                Share RocketReplai with your friends and earn commission when
                they upgrade.
              </motion.p>

              <div className="flex items-center gap-2">
                <Icon
                  className={`h-5 w-5 ${
                    dashboardType === "insta"
                      ? isDark
                        ? "text-pink-400"
                        : "text-pink-500"
                      : isDark
                        ? "text-purple-400"
                        : "text-purple-500"
                  }`}
                />
                <span className={`text-sm ${styles.text.muted}`}>
                  {dashboardType === "insta"
                    ? "Instagram Automation"
                    : "Web Chatbots"}
                </span>
              </div>
            </div>

            <div className="hidden lg:block">
              <ReferralIllustration isDark={isDark} />
            </div>
          </div>
        </div>

        {/* Referral Link Section */}
        <div className={`${styles.card} p-6 md:p-8 mb-6`}>
          <h3 className={`text-lg font-semibold mb-4 ${styles.text.primary}`}>
            Your referral link
          </h3>

          <div className="flex flex-col sm:flex-row items-stretch gap-2 mb-4">
            <div
              className={`flex-1 rounded-xl px-4 py-3 text-sm font-mono overflow-x-auto whitespace-nowrap ${styles.innerCard}`}
            >
              {affiliateData?.affiliateLink || "Loading..."}
            </div>
            <div className="flex gap-2">
              <Button onClick={handleCopyLink} className={styles.pill}>
                {copied ? (
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
              <Button onClick={handleShare} className={styles.pill}>
                <Share2 className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* OR Divider */}
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className={`w-full border-t ${styles.divider}`}></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span
                className={`px-4 ${isDark ? "bg-[#0a0a16]" : "bg-white"} ${styles.text.muted}`}
              >
                OR
              </span>
            </div>
          </div>

          {/* Email Invite */}
          <div className="flex flex-col sm:flex-row items-stretch gap-2">
            <input
              type="email"
              value={emailInput}
              onChange={(e) => setEmailInput(e.target.value)}
              placeholder="friend@email.com"
              className={`flex-1 px-4 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-${primaryColor}-500 focus:border-transparent ${styles.input}`}
            />
            <Button
              onClick={handleInvite}
              className={`rounded-xl bg-gradient-to-r ${gradient} hover:opacity-90 text-white px-6`}
            >
              Invite
            </Button>
          </div>
        </div>

        {/* How It Works */}
        <div className={`${styles.card} p-6 md:p-8 mb-6`}>
          <h3 className={`text-lg font-semibold mb-2 ${styles.text.primary}`}>
            How the referral program works
          </h3>
          <p className={`text-sm mb-8 ${styles.text.secondary}`}>
            Earn commission by inviting friends to RocketReplai.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              {
                icon: LinkIcon,
                title: "Share your link",
                description: "Send your unique referral link to your friends.",
                color: "pink",
              },
              {
                icon: Users,
                title: "Friend signs up",
                description: "They create an account using your referral link.",
                color: "purple",
              },
              {
                icon: CreditCard,
                title: "They upgrade",
                description: "When they purchase a paid plan, you qualify.",
                color: "green",
              },
              {
                icon: TrendingUp,
                title: "You earn",
                description: "Earn 25% commission on every successful payment.",
                color: "blue",
              },
            ].map((step, index) => {
              const iconBgClass =
                styles.icon[step.color as keyof typeof styles.icon] ||
                styles.icon.blue;
              return (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="text-center"
                >
                  <div
                    className={`w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 ${iconBgClass}`}
                  >
                    <step.icon
                      className={`w-6 h-6 ${
                        isDark
                          ? `text-${step.color}-400`
                          : `text-${step.color}-600`
                      }`}
                    />
                  </div>
                  <h4 className={`font-semibold mb-2 ${styles.text.primary}`}>
                    {step.title}
                  </h4>
                  <p className={`text-sm ${styles.text.secondary}`}>
                    {step.description}
                  </p>
                </motion.div>
              );
            })}
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {[
            {
              label: "Signups",
              value: stats.totalReferrals || 0,
            },
            {
              label: "Paid Referrals",
              value: stats.activeReferrals || 0,
            },
            {
              label: "Total Earned",
              value: stats.totalEarnings
                ? `₹${stats.totalEarnings.toFixed(2)}`
                : "₹0.00",
            },
            {
              label: "Available Balance",
              value: stats.pendingEarnings
                ? `₹${stats.pendingEarnings.toFixed(2)}`
                : "₹0.00",
            },
          ].map((stat, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className={`${styles.card} p-6`}
            >
              <p className={`text-sm mb-2 ${styles.text.secondary}`}>
                {stat.label}
              </p>
              <p className={`text-2xl font-bold ${styles.text.primary}`}>
                {stat.value}
              </p>
            </motion.div>
          ))}
        </div>

        {/* Go to Payout Button */}
        <div className="mb-6">
          <button
            onClick={() => router.push(payoutRoute)}
            className={`inline-flex items-center gap-2 ${
              dashboardType === "insta"
                ? isDark
                  ? "text-pink-400"
                  : "text-pink-500"
                : isDark
                  ? "text-purple-400"
                  : "text-purple-500"
            } hover:opacity-80 font-medium transition-colors`}
          >
            Go to payout
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        {/* Referral Activity */}
        <div className={`${styles.card} p-6 md:p-8`}>
          <h3 className={`text-lg font-semibold mb-6 ${styles.text.primary}`}>
            Referral Activity
          </h3>

          {(!affiliateData?.referrals ||
            affiliateData.referrals.length === 0) && (
            <EmptyState
              icon={<Users className="h-8 w-8" />}
              label="Your referral journey starts here"
            />
          )}

          {affiliateData?.referrals && affiliateData.referrals.length > 0 && (
            <div className="space-y-4">
              {affiliateData.referrals.slice(0, 5).map((referral: any) => {
                const iconBgClass =
                  styles.icon[primaryColor as keyof typeof styles.icon] ||
                  styles.icon.purple;
                return (
                  <div
                    key={referral._id}
                    className={`flex items-center justify-between p-4 rounded-xl ${styles.innerCard} ${styles.rowHover}`}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-10 h-10 rounded-full flex items-center justify-center ${iconBgClass}`}
                      >
                        <span className="text-sm font-semibold">
                          {referral.referredUserId?.firstName?.[0] || "U"}
                        </span>
                      </div>
                      <div>
                        <p className={`font-medium ${styles.text.primary}`}>
                          {referral.referredUserId?.firstName}{" "}
                          {referral.referredUserId?.lastName}
                        </p>
                        <p className={`text-sm ${styles.text.secondary}`}>
                          {new Date(referral.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={`font-bold ${styles.text.primary}`}>
                        ₹{referral.totalCommissionEarned?.toFixed(2) || "0.00"}
                      </p>
                      <p
                        className={`text-sm capitalize ${styles.text.secondary}`}
                      >
                        {referral.status}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
