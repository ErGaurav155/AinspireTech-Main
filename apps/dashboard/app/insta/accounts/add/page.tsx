"use client";

import { useState, useEffect, useMemo } from "react";
import {
  ArrowLeft,
  Instagram,
  Shield,
  AlertCircle,
  Loader2,
} from "lucide-react";
import { Button } from "@rocketreplai/ui/components/radix/button";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@rocketreplai/ui/components/radix/card";
import {
  Alert,
  AlertDescription,
} from "@rocketreplai/ui/components/radix/alert";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@rocketreplai/ui/components/radix/alert-dialog";
import { useRouter } from "next/navigation";
import { useAuth } from "@clerk/nextjs";
import { useTheme } from "next-themes";
import { useApi } from "@/lib/useApi";
import { getUserById } from "@/lib/services/user-actions.api";
import { getInstaAccount } from "@/lib/services/insta-actions.api";
import LoginPage from "@/components/insta/InstagramAutomationWizard";

export default function AddAccountPage() {
  const { userId, isLoaded } = useAuth();
  const router = useRouter();
  const { theme, resolvedTheme } = useTheme();
  const currentTheme = resolvedTheme || theme || "light";
  const { apiRequest } = useApi();

  const [accountLimit, setAccountLimit] = useState(1);
  const [totalAccounts, setTotalAccounts] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [showLimitDialog, setShowLimitDialog] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);

  // Theme-based styles
  const themeStyles = useMemo(() => {
    const isDark = currentTheme === "dark";
    return {
      containerBg: isDark ? "bg-[#0F0F11]" : "bg-[#F8F9FC]",
      textPrimary: isDark ? "text-white" : "text-gray-900",
      textSecondary: isDark ? "text-gray-400" : "text-gray-500",
      cardBg: isDark
        ? "bg-[#1A1A1E] border-gray-800"
        : "bg-white border-gray-100",
      cardBorder: isDark ? "border-gray-800" : "border-gray-100",
    };
  }, [currentTheme]);

  useEffect(() => {
    async function fetchData() {
      if (!userId) {
        router.push("/sign-in");
        return;
      }

      try {
        setIsLoading(true);
        const user = await getUserById(apiRequest, userId);
        if (!user) {
          router.push("/sign-in");
          return;
        }

        setAccountLimit(user.accountLimit || 1);

        const accountsResponse = await getInstaAccount(apiRequest);
        setTotalAccounts(accountsResponse.accounts?.length || 0);
      } catch (error: any) {
        console.error("Error fetching data:", error.message);
      } finally {
        setIsLoading(false);
      }
    }

    if (isLoaded && userId) {
      fetchData();
    }
  }, [userId, router, isLoaded, apiRequest]);

  const handleConnectClick = () => {
    if (totalAccounts >= accountLimit) {
      setShowLimitDialog(true);
    } else {
      setIsConnecting(true);
    }
  };

  if (!isLoaded || isLoading) {
    return (
      <div className="min-h-screen bg-[#F8F9FA] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-3 border-pink-200 border-t-pink-500 rounded-full animate-spin" />
          <p className="text-sm text-gray-400">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${themeStyles.containerBg}`}>
      {/* Top bar */}
      <div className="bg-white border-b border-gray-100 sticky top-0 z-10">
        <div className="px-6 py-3 flex items-center gap-2 text-sm text-gray-500">
          <Link
            href="/insta/dashboard"
            className="text-gray-400 hover:text-gray-600"
          >
            Dashboard
          </Link>
          <span className="text-gray-300">›</span>
          <Link
            href="/insta/accounts"
            className="text-gray-400 hover:text-gray-600"
          >
            Accounts
          </Link>
          <span className="text-gray-300">›</span>
          <span className="font-medium text-gray-800">Add Account</span>
        </div>
      </div>

      <div className="p-6 max-w-2xl mx-auto space-y-6">
        {/* Back Button */}
        <Link
          href="/insta/accounts"
          className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Accounts
        </Link>

        {/* Header */}
        <div className="text-center">
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-pink-500 to-rose-500 flex items-center justify-center mx-auto mb-4">
            <Instagram className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-800 mb-2">
            Connect Instagram Account
          </h1>
          <p className="text-sm text-gray-500">
            Add your Instagram Business account to start automating comment
            replies
          </p>
        </div>

        {/* Important Notice */}
        <Alert className="bg-blue-50 border border-blue-200 rounded-xl">
          <Shield className="h-4 w-4 text-blue-600" />
          <AlertDescription className="text-sm text-blue-700">
            <span className="font-semibold">Important:</span> For security and
            compliance with Instagram Terms of Service, we use Instagrams
            official Business API. We never access your password, only request
            permission through Instagrams secure OAuth flow.
          </AlertDescription>
        </Alert>

        {/* Connect Card */}
        <Card
          className={`${themeStyles.cardBg} border ${themeStyles.cardBorder} rounded-2xl`}
        >
          <CardHeader>
            <CardTitle>Account Information</CardTitle>
            <CardDescription>
              Connect your Instagram Business account to get started
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-3">
              <Button
                onClick={handleConnectClick}
                disabled={isConnecting}
                className="flex-1 bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600 text-white rounded-xl"
              >
                {isConnecting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Connecting...
                  </>
                ) : (
                  <>
                    <Instagram className="h-4 w-4 mr-2" />
                    Connect Instagram Account
                  </>
                )}
              </Button>
              <Button
                variant="outline"
                asChild
                className="border-gray-200 text-gray-600 hover:bg-gray-50 rounded-xl"
              >
                <Link href="/insta/accounts">Cancel</Link>
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Security Information */}
        <Card
          className={`${themeStyles.cardBg} border ${themeStyles.cardBorder} rounded-2xl`}
        >
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-pink-500" />
              Security & Privacy
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm text-gray-600">
              <li className="flex items-start gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-pink-500 mt-2" />
                <span>
                  All account credentials are encrypted using industry-standard
                  AES-256 encryption
                </span>
              </li>
              <li className="flex items-start gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-pink-500 mt-2" />
                <span>
                  We follow Instagram rate limiting guidelines to protect your
                  account
                </span>
              </li>
              <li className="flex items-start gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-pink-500 mt-2" />
                <span>
                  Your data is stored securely and never shared with third
                  parties
                </span>
              </li>
              <li className="flex items-start gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-pink-500 mt-2" />
                <span>
                  We use Instagrams official Business API for all integrations
                </span>
              </li>
            </ul>
          </CardContent>
        </Card>
      </div>

      {/* Account Limit Dialog */}
      <AlertDialog open={showLimitDialog} onOpenChange={setShowLimitDialog}>
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Account Limit Reached</AlertDialogTitle>
            <AlertDialogDescription className="text-gray-500">
              You have reached the maximum number of accounts ({totalAccounts}/
              {accountLimit}) for your current plan. To add more accounts,
              please upgrade your subscription.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl">Cancel</AlertDialogCancel>
            <Button
              onClick={() => router.push("/insta/pricing")}
              className="bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600 text-white rounded-xl"
            >
              Upgrade Plan
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Instagram OAuth Dialog */}
      {isConnecting && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div
            className={`${themeStyles.cardBg} border ${themeStyles.cardBorder} rounded-2xl max-w-md w-full shadow-xl`}
          >
            <LoginPage onClose={() => setIsConnecting(false)} />
          </div>
        </div>
      )}
    </div>
  );
}
