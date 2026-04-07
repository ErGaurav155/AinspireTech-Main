"use client";

import { useState, useEffect, useMemo } from "react";
import {
  ArrowLeft,
  Instagram,
  Shield,
  AlertCircle,
  Loader2,
} from "lucide-react";
import Link from "next/link";
import {
  Alert,
  AlertDescription,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Orbs,
  Spinner,
  useThemeStyles,
} from "@rocketreplai/ui";

import { useRouter } from "next/navigation";
import { useAuth } from "@clerk/nextjs";
import { useTheme } from "next-themes";
import { useApi } from "@/lib/useApi";
import { getUserById } from "@/lib/services/user-actions.api";
import LoginPage from "@/components/insta/InstagramAutomationWizard";

import { AccountLimitDialog } from "@/components/shared/AccountLimitDialog";
import { useInstaAccount } from "@/context/Instaaccountcontext ";

export default function AddAccountPage() {
  const { userId, isLoaded } = useAuth();
  const { resolvedTheme } = useTheme();
  const router = useRouter();
  const { apiRequest } = useApi();
  const { styles, isDark } = useThemeStyles();

  // Use context to get accounts and refresh function
  const {
    accounts: contextAccounts,
    isAccLoading,
    refreshAccounts,
  } = useInstaAccount();

  const [accountLimit, setAccountLimit] = useState(1);
  const [totalAccounts, setTotalAccounts] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [showLimitDialog, setShowLimitDialog] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);

  // Page-specific styles (not in central theme)
  const pageStyles = useMemo(() => {
    return {
      backButton: isDark
        ? "inline-flex items-center gap-2 text-sm text-white/40 hover:text-white transition-colors"
        : "inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 transition-colors",
      headerIcon: isDark
        ? "w-16 h-16 rounded-full bg-gradient-to-br from-pink-500 to-rose-500 flex items-center justify-center mx-auto mb-4 opacity-90"
        : "w-16 h-16 rounded-full bg-gradient-to-br from-pink-500 to-rose-500 flex items-center justify-center mx-auto mb-4",
      headerTitle: isDark
        ? "text-2xl font-bold text-white mb-2"
        : "text-2xl font-bold text-gray-800 mb-2",
      headerSub: isDark ? "text-sm text-white/40" : "text-sm text-gray-500",
      alert: isDark
        ? "bg-blue-500/10 border border-blue-500/20 rounded-xl"
        : "bg-blue-50 border border-blue-200 rounded-xl",
      alertIcon: isDark ? "text-blue-400" : "text-blue-600",
      alertText: isDark ? "text-sm text-blue-400" : "text-sm text-blue-700",
      alertStrong: isDark
        ? "font-semibold text-blue-400"
        : "font-semibold text-blue-700",
      connectButton: (disabled?: boolean) =>
        isDark
          ? `flex-1 bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600 text-white rounded-xl ${disabled ? "opacity-50 cursor-not-allowed" : ""}`
          : `flex-1 bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600 text-white rounded-xl ${disabled ? "opacity-50 cursor-not-allowed" : ""}`,
      cancelButton: isDark
        ? "border border-white/[0.08] text-white/70 hover:bg-white/[0.06] rounded-xl"
        : "border border-gray-200 text-gray-600 hover:bg-gray-50 rounded-xl",
      securityTitle: isDark
        ? "flex items-center gap-2 text-pink-400"
        : "flex items-center gap-2 text-pink-500",
      securityList: isDark
        ? "space-y-2 text-sm text-white/60"
        : "space-y-2 text-sm text-gray-600",
      securityBullet: isDark
        ? "w-1.5 h-1.5 rounded-full bg-pink-400 mt-2"
        : "w-1.5 h-1.5 rounded-full bg-pink-500 mt-2",
      oauthDialog: isDark
        ? "bg-[#1A1A1E] border border-white/[0.08] rounded-2xl max-w-md w-full shadow-xl"
        : "bg-white border border-gray-100 rounded-2xl max-w-md w-full shadow-xl",
    };
  }, [isDark]);

  // Fetch user data and account limit
  useEffect(() => {
    async function fetchUserData() {
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
      } catch (error: any) {
        console.error("Error fetching user data:", error.message);
      } finally {
        setIsLoading(false);
      }
    }

    if (isLoaded && userId) {
      fetchUserData();
    }
  }, [userId, router, isLoaded, apiRequest]);

  // Update total accounts from context
  useEffect(() => {
    if (contextAccounts && !isAccLoading) {
      setTotalAccounts(contextAccounts.length);
    }
  }, [contextAccounts, isAccLoading]);

  const handleConnectClick = () => {
    if (totalAccounts >= accountLimit) {
      setShowLimitDialog(true);
    } else {
      setIsConnecting(true);
    }
  };

  if (!isLoaded || isLoading || isAccLoading) {
    return <Spinner label="Loading..." />;
  }

  return (
    <div className={styles.page}>
      {isDark && <Orbs />}
      <div className={styles.container}>
        {/* Back Button */}
        <Link href="/insta/accounts" className={pageStyles.backButton}>
          <ArrowLeft className="h-4 w-4" />
          Back to Accounts
        </Link>

        {/* Header */}
        <div className="text-center">
          <div className={pageStyles.headerIcon}>
            <Instagram className="h-8 w-8 text-white" />
          </div>
          <h1 className={pageStyles.headerTitle}>Connect Instagram Account</h1>
          <p className={pageStyles.headerSub}>
            Add your Instagram Business account to start automating comment
            replies
          </p>
        </div>

        {/* Important Notice */}
        <Alert className={pageStyles.alert}>
          <Shield className={`h-4 w-4 ${pageStyles.alertIcon}`} />
          <AlertDescription className={pageStyles.alertText}>
            <span className={pageStyles.alertStrong}>Important:</span> For
            security and compliance with Instagram Terms of Service, we use
            Instagrams official Business API. We never access your password,
            only request permission through Instagrams secure OAuth flow.
          </AlertDescription>
        </Alert>

        {/* Connect Card */}
        <Card className={styles.card}>
          <CardHeader>
            <CardTitle className={styles.text.primary}>
              Account Information
            </CardTitle>
            <CardDescription className={styles.text.secondary}>
              Connect your Instagram Business account to get started
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-3">
              <Button
                onClick={handleConnectClick}
                disabled={isConnecting}
                className={pageStyles.connectButton(isConnecting)}
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
                className={pageStyles.cancelButton}
              >
                <Link href="/insta/accounts">Cancel</Link>
              </Button>
            </div>

            {/* Account limit info */}
            {totalAccounts > 0 && (
              <div className="mt-4 text-center">
                <p
                  className={`text-xs ${isDark ? "text-white/40" : "text-gray-500"}`}
                >
                  You have {totalAccounts} of {accountLimit} accounts connected
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Security Information */}
        <Card className={styles.card}>
          <CardHeader>
            <CardTitle className={pageStyles.securityTitle}>
              <Shield className="h-5 w-5" />
              Security & Privacy
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className={pageStyles.securityList}>
              <li className="flex items-start gap-2">
                <div className={pageStyles.securityBullet} />
                <span>
                  All account credentials are encrypted using industry-standard
                  AES-256 encryption
                </span>
              </li>
              <li className="flex items-start gap-2">
                <div className={pageStyles.securityBullet} />
                <span>
                  We follow Instagram rate limiting guidelines to protect your
                  account
                </span>
              </li>
              <li className="flex items-start gap-2">
                <div className={pageStyles.securityBullet} />
                <span>
                  Your data is stored securely and never shared with third
                  parties
                </span>
              </li>
              <li className="flex items-start gap-2">
                <div className={pageStyles.securityBullet} />
                <span>
                  We use Instagrams official Business API for all integrations
                </span>
              </li>
            </ul>
          </CardContent>
        </Card>
      </div>

      {/* Account Limit Dialog */}
      <AccountLimitDialog
        open={showLimitDialog}
        onOpenChange={setShowLimitDialog}
        currentAccounts={totalAccounts}
        accountLimit={accountLimit}
        dashboardType="insta"
      />

      {/* Instagram OAuth Dialog */}
      {isConnecting && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className={pageStyles.oauthDialog}>
            <LoginPage onClose={() => setIsConnecting(false)} />
          </div>
        </div>
      )}
    </div>
  );
}
