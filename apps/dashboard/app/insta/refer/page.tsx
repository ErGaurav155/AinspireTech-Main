"use client";

import { useState, useEffect, useCallback } from "react";
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
} from "lucide-react";
import { Button } from "@rocketreplai/ui/components/radix/button";
import { toast } from "@rocketreplai/ui/components/radix/use-toast";
import { getAffiliateDashInfo } from "@/lib/services/affiliate-actions.api";

// Illustration component
const ReferralIllustration = () => (
  <div className="relative w-full h-64 flex items-center justify-center">
    <div className="relative">
      <div className="w-48 h-48 bg-gradient-to-br from-pink-400 to-pink-600 rounded-full flex items-center justify-center">
        <div className="text-white text-6xl">💰</div>
      </div>

      <motion.div
        animate={{ y: [-10, 10, -10] }}
        transition={{ duration: 2, repeat: Infinity }}
        className="absolute -top-4 -right-4 w-16 h-16 bg-gradient-to-br from-yellow-400 to-yellow-600 rounded-full flex items-center justify-center text-2xl"
      >
        💵
      </motion.div>

      <motion.div
        animate={{ y: [10, -10, 10] }}
        transition={{ duration: 2.5, repeat: Infinity }}
        className="absolute -bottom-4 -left-4 w-16 h-16 bg-gradient-to-br from-green-400 to-green-600 rounded-full flex items-center justify-center text-2xl"
      >
        💸
      </motion.div>

      <motion.div
        animate={{ y: [-5, 15, -5] }}
        transition={{ duration: 3, repeat: Infinity }}
        className="absolute top-8 -right-12 w-12 h-12 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full flex items-center justify-center text-xl"
      >
        💳
      </motion.div>
    </div>
  </div>
);

export default function ReferEarnPage() {
  const router = useRouter();
  const { userId, isLoaded } = useAuth();
  const { apiRequest } = useApi();

  const [affiliateData, setAffiliateData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [emailInput, setEmailInput] = useState("");

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
            title: "Join Hypello",
            text: "Sign up for Hypello and get amazing AI tools!",
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

  if (!isLoaded || loading) {
    return (
      <div className="min-h-screen bg-[#F8F9FA] flex items-center justify-center">
        <div className="w-5 h-5 border-2 border-t-transparent border-pink-500 rounded-full animate-spin" />
      </div>
    );
  }

  const stats = affiliateData?.stats || {};

  return (
    <div className="min-h-screen bg-[#F8F9FA]">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Hero Section */}
        <div className="bg-white rounded-3xl p-6 md:p-8 mb-6 border border-gray-100">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
            <div>
              <motion.h1
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-4xl md:text-5xl font-bold text-gray-900 mb-4"
              >
                Invite friends.
                <br />
                <span className="text-pink-500">Earn rewards.</span>
              </motion.h1>

              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="text-lg text-gray-600 mb-8"
              >
                Share Hypello with your friends and earn commission when they
                upgrade.
              </motion.p>
            </div>

            <div className="hidden lg:block">
              <ReferralIllustration />
            </div>
          </div>
        </div>

        {/* Referral Link Section */}
        <div className="bg-white rounded-3xl p-6 md:p-8 mb-6 border border-gray-100">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Your referral link
          </h3>

          <div className="flex items-center gap-2 mb-4">
            <div className="flex-1 bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-700 font-mono overflow-x-auto whitespace-nowrap">
              {affiliateData?.affiliateLink || "Loading..."}
            </div>
            <Button
              onClick={handleCopyLink}
              variant="outline"
              className="flex-shrink-0 rounded-xl border-gray-300 hover:bg-gray-50"
            >
              {copied ? (
                <CheckCircle2 className="h-4 w-4 text-green-500" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
            </Button>
            <Button
              onClick={handleShare}
              variant="outline"
              className="flex-shrink-0 rounded-xl border-gray-300 hover:bg-gray-50"
            >
              <Share2 className="h-4 w-4" />
            </Button>
          </div>

          {/* OR Divider */}
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-200"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-4 bg-white text-gray-500">OR</span>
            </div>
          </div>

          {/* Email Invite */}
          <div className="flex flex-wrap items-center gap-2">
            <input
              type="email"
              value={emailInput}
              onChange={(e) => setEmailInput(e.target.value)}
              placeholder="friend@email.com"
              className="flex-1 px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent"
            />
            <Button
              onClick={() => {
                toast({
                  title: "Coming soon!",
                  description: "Email invites will be available soon",
                  duration: 3000,
                });
              }}
              className="rounded-xl bg-pink-500 hover:bg-pink-600 text-white px-6"
            >
              Invite
            </Button>
          </div>
        </div>

        {/* How It Works */}
        <div className="bg-white rounded-3xl p-6 md:p-8 mb-6 border border-gray-100">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            How the referral program works
          </h3>
          <p className="text-sm text-gray-600 mb-8">
            Earn commission by inviting friends to Hypello.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              {
                icon: LinkIcon,
                title: "Share your link",
                description: "Send your unique referral link to your friends.",
              },
              {
                icon: Users,
                title: "Friend signs up",
                description: "They create an account using your referral link.",
              },
              {
                icon: CreditCard,
                title: "They upgrade",
                description: "When they purchase a paid plan, you qualify.",
              },
              {
                icon: TrendingUp,
                title: "You earn",
                description: "Earn 25% commission on every successful payment.",
              },
            ].map((step, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="text-center"
              >
                <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <step.icon className="w-6 h-6 text-gray-700" />
                </div>
                <h4 className="font-semibold text-gray-900 mb-2">
                  {step.title}
                </h4>
                <p className="text-sm text-gray-600">{step.description}</p>
              </motion.div>
            ))}
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
                : "--",
            },
            {
              label: "Available Balance",
              value: stats.pendingEarnings
                ? `₹${stats.pendingEarnings.toFixed(2)}`
                : "--",
            },
          ].map((stat, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className="bg-white rounded-2xl p-6 border border-gray-100"
            >
              <p className="text-sm text-gray-600 mb-2">{stat.label}</p>
              <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
            </motion.div>
          ))}
        </div>

        {/* Go to Payout Button */}
        <div className="mb-6">
          <button
            onClick={() => router.push("/insta/refer/payouts")}
            className="inline-flex items-center gap-2 text-pink-500 hover:text-pink-600 font-medium transition-colors"
          >
            Go to payout
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        {/* Referral Activity */}
        <div className="bg-white rounded-3xl p-6 md:p-8 border border-gray-100">
          <h3 className="text-lg font-semibold text-gray-900 mb-6">
            Referral Activity
          </h3>

          {(!affiliateData?.referrals ||
            affiliateData.referrals.length === 0) && (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Users className="w-8 h-8 text-gray-400" />
              </div>
              <h4 className="text-lg font-semibold text-gray-900 mb-2">
                Your referral journey starts here
              </h4>
              <p className="text-gray-600 max-w-md mx-auto">
                You have not referred anyone yet. Share your referral link and
                start earning rewards.
              </p>
            </div>
          )}
          {affiliateData?.referrals && affiliateData.referrals.length > 0 && (
            <div className="space-y-4">
              {affiliateData.referrals.slice(0, 5).map((referral: any) => (
                <div
                  key={referral._id}
                  className="flex items-center justify-between p-4 bg-gray-50 rounded-xl"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-pink-400 to-pink-600 rounded-full flex items-center justify-center text-white font-semibold">
                      {referral.referredUserId?.firstName?.[0] || "U"}
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">
                        {referral.referredUserId?.firstName}{" "}
                        {referral.referredUserId?.lastName}
                      </p>
                      <p className="text-sm text-gray-600">
                        {new Date(referral.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-gray-900">
                      ₹{referral.totalCommissionEarned?.toFixed(2) || "0.00"}
                    </p>
                    <p className="text-sm text-gray-600 capitalize">
                      {referral.status}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
