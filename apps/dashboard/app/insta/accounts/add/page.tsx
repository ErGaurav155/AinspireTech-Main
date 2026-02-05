"use client";

import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@clerk/nextjs";
import { useEffect, useMemo, useState } from "react";

import { useTheme } from "next-themes";

import { BreadcrumbsDefault } from "@ainspiretech/ui/components/shared/breadcrumbs";
import { Button } from "@ainspiretech/ui/components/radix/button";
import { getUserById } from "@/lib/services/user-actions.api";
import AddAccount from "@/components/insta/AddAccount";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@ainspiretech/ui/components/radix/card";
import { AlertCircle, Shield, Zap } from "lucide-react";
import { Badge } from "@ainspiretech/ui/components/radix/badge";
import {
  getInstaAccount,
  getSubscriptioninfo,
} from "@/lib/services/insta-actions.api";

export default function AddAccountPage() {
  const { userId, isLoaded } = useAuth();
  const router = useRouter();
  const [accountLimit, setAccountLimit] = useState(1);
  const [totalAccounts, setTotalAccounts] = useState(0);
  const [userTier, setUserTier] = useState<"free" | "pro">("free");
  const [rateLimit, setRateLimit] = useState({ free: 100, pro: 999999 });
  const { theme, resolvedTheme } = useTheme();
  const currentTheme = resolvedTheme || theme || "light";

  // Theme-based styles
  const themeStyles = useMemo(() => {
    const isDark = currentTheme === "dark";
    return {
      containerBg: isDark ? "bg-[#0a0a0a]" : "bg-gray-50",
      textPrimary: isDark ? "text-white" : "text-n-7",
      cardBg: isDark ? "bg-[#0a0a0a]/60" : "bg-white/80",
      cardBorder: isDark ? "border-white/10" : "border-gray-200",
    };
  }, [currentTheme]);

  useEffect(() => {
    async function fetchSubscriptions() {
      if (!userId) {
        router.push("/sign-in");
        return;
      }

      try {
        const user = await getUserById(userId);
        if (!user) {
          router.push("/sign-in");
          return;
        }

        setAccountLimit(user.accountLimit || 1);

        // Determine user tier based on subscriptions
        const { subscriptions } = await getSubscriptioninfo();
        const hasProSubscription = subscriptions?.some(
          (sub: any) =>
            sub.chatbotType === "Insta-Automation-Pro" &&
            sub.status === "active" &&
            new Date(sub.expiresAt) > new Date(),
        );

        setUserTier(hasProSubscription ? "pro" : "free");

        const totalAccounts = await getInstaAccount();

        if (totalAccounts.accounts.length === 0) {
          setTotalAccounts(0);
        } else {
          setTotalAccounts(totalAccounts.accounts.length);
        }
      } catch (error: any) {
        console.error("Error fetching subscriptions:", error.message);
      }
    }
    if (!isLoaded) {
      return;
    }
    fetchSubscriptions();
  }, [userId, router, isLoaded]);

  if (!isLoaded) {
    return (
      <div className="min-h-screen bg-transparent flex items-center justify-center h-full w-full">
        <div className="w-5 h-5 border-2 border-t-transparent border-blue-600 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div
      className={`min-h-screen ${themeStyles.containerBg} ${themeStyles.textPrimary}`}
    >
      <BreadcrumbsDefault />
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Button
            variant="ghost"
            size="sm"
            asChild
            className={themeStyles.textPrimary}
          >
            <Link href="/insta/dashboard">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Link>
          </Button>
        </div>

        {/* Account Limits Info */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <Card className={`${themeStyles.cardBg} ${themeStyles.cardBorder}`}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-blue-500" />
                Account Limits
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className={themeStyles.textPrimary}>Current Tier</span>
                  <Badge
                    className={
                      userTier === "pro"
                        ? "bg-gradient-to-r from-purple-900/20 to-pink-900/20 text-purple-300 border-purple-500/30"
                        : "bg-gradient-to-r from-blue-900/20 to-cyan-900/20 text-blue-300 border-blue-500/30"
                    }
                  >
                    {userTier === "pro" ? "Pro Unlimited" : "Free Tier"}
                  </Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className={themeStyles.textPrimary}>
                    Accounts Connected
                  </span>
                  <span className="font-semibold">
                    {totalAccounts} / {accountLimit}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className={themeStyles.textPrimary}>
                    Hourly Rate Limit
                  </span>
                  <span className="font-semibold">
                    {userTier === "pro"
                      ? "Unlimited"
                      : `${rateLimit.free} calls`}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className={`${themeStyles.cardBg} ${themeStyles.cardBorder}`}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="h-5 w-5 text-yellow-500" />
                Benefits
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {userTier === "pro" ? (
                  <>
                    <li className="flex items-start gap-2">
                      <div className="h-2 w-2 rounded-full bg-green-500 mt-2" />
                      <span>Unlimited API calls per hour</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <div className="h-2 w-2 rounded-full bg-green-500 mt-2" />
                      <span>Multiple Instagram accounts</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <div className="h-2 w-2 rounded-full bg-green-500 mt-2" />
                      <span>Priority queue processing</span>
                    </li>
                  </>
                ) : (
                  <>
                    <li className="flex items-start gap-2">
                      <div className="h-2 w-2 rounded-full bg-blue-500 mt-2" />
                      <span>{rateLimit.free} calls per hour</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <div className="h-2 w-2 rounded-full bg-blue-500 mt-2" />
                      <span>Up to {accountLimit} Instagram account</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <div className="h-2 w-2 rounded-full bg-blue-500 mt-2" />
                      <span>Basic automation features</span>
                    </li>
                  </>
                )}
              </ul>
            </CardContent>
          </Card>
        </div>

        {/* Add Account Component */}
        <AddAccount
          totalAccounts={totalAccounts}
          accountLimit={accountLimit}
          userTier={userTier}
        />
      </div>
    </div>
  );
}
