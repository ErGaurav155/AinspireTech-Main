"use client";

import React, { useMemo } from "react";
import { useState } from "react";

import { Instagram, Shield, AlertCircle, Zap, Cpu, Clock } from "lucide-react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import LoginPage from "./InstagramAutomationWizard";
import { useTheme } from "next-themes";
import {
  Alert,
  AlertDescription,
} from "@ainspiretech/ui/components/radix/alert";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@ainspiretech/ui/components/radix/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@ainspiretech/ui/components/radix/dialog";
import { Button } from "@ainspiretech/ui/components/radix/button";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@ainspiretech/ui/components/radix/alert-dialog";
import { Badge } from "@ainspiretech/ui/components/radix/badge";
import { Progress } from "@ainspiretech/ui/components/radix/progress";

interface AccountVerificationProps {
  totalAccounts: number;
  accountLimit: number;
  userTier: "free" | "pro";
}

const AddAccount = ({
  totalAccounts,
  accountLimit,
  userTier,
}: AccountVerificationProps) => {
  const [isLoad, setIsLoad] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [dialog, setDialog] = useState(false);
  const router = useRouter();
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

  const handleConnectAccount = () => {
    if (totalAccounts >= accountLimit) {
      setDialog(true);
    } else {
      setIsLoad(true);
    }
  };

  return (
    <div
      className={`space-y-6 ${themeStyles.textPrimary} ${themeStyles.containerBg}`}
    >
      <div className="text-center mb-8">
        <div className="flex justify-center mb-4">
          <div className="h-16 w-16 bg-gradient-to-r from-pink-500 to-purple-500 rounded-full flex items-center justify-center">
            <Instagram className="h-8 w-8 text-white" />
          </div>
        </div>
        <h1 className="text-3xl font-bold mb-2 bg-gradient-to-r from-[#00F0FF] to-[#B026FF] bg-clip-text text-transparent">
          Connect Instagram Account
        </h1>
        <p className="text-muted-foreground font-montserrat">
          Add your Instagram account to start automating comment replies
        </p>

        {/* Current Usage */}
        <div className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-blue-900/20 to-cyan-900/20">
          <span className="text-sm">
            Accounts: {totalAccounts}/{accountLimit}
          </span>
          <Progress
            value={(totalAccounts / accountLimit) * 100}
            className="w-20 h-2"
          />
        </div>
      </div>

      {/* Important Notice */}
      <Alert className="mb-6 card-hover group bg-gradient-to-r from-blue-900/10 to-cyan-900/10 border-blue-500/30">
        <Shield className="h-4 w-4" />
        <AlertDescription className="font-montserrat">
          <strong>Important:</strong> We use Instagrams official Business API
          for secure authentication. Your credentials are encrypted and never
          stored. We only request necessary permissions for comment automation.
        </AlertDescription>
      </Alert>

      {/* Rate Limit Info */}
      <Card className="card-hover group border-yellow-500/30 bg-gradient-to-r from-yellow-900/10 to-amber-900/10">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Cpu className="h-5 w-5 text-yellow-500" />
            Rate Limits Information
          </CardTitle>
        </CardHeader>
        <CardContent className="p-2">
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm">Your Plan</span>
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
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Hourly API Calls</span>
                <span className="font-semibold">
                  {userTier === "pro" ? "Unlimited" : "100 calls"}
                </span>
              </div>
              <Progress
                value={userTier === "pro" ? 100 : 0}
                className="h-2 bg-gray-700"
              />
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Clock className="h-4 w-4" />
              <span>Limits reset every hour</span>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="card-hover group">
        <CardHeader>
          <CardTitle>Account Connection</CardTitle>
          <CardDescription className="font-montserrat">
            Connect your Instagram account securely using Instagrams official
            OAuth flow.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-2">
          <Dialog open={isLoad} onOpenChange={() => setIsLoad(false)}>
            <DialogContent
              className={`max-w-md ${themeStyles.containerBg} backdrop-blur-lg border border-[#333] rounded-xl`}
            >
              <DialogHeader>
                <DialogTitle className="text-start text-white font-bold text-2xl bg-clip-text text-transparent bg-gradient-to-r from-[#00F0FF] to-[#B026FF]">
                  Connect Instagram
                </DialogTitle>
              </DialogHeader>
              <DialogDescription className="font-montserrat">
                Connect your Instagram Business Account using Metas official
                authentication.
              </DialogDescription>
              <LoginPage />
            </DialogContent>
          </Dialog>
          <div className="space-y-4">
            <div className="flex gap-2 md:gap-4">
              <Button
                type="submit"
                disabled={isSubmitting}
                onClick={handleConnectAccount}
                className="flex-1 bg-gradient-to-r from-[#00F0FF] to-[#B026FF] hover:opacity-90"
              >
                {isSubmitting ? "Connecting..." : "Connect Account"}
              </Button>
              <Button
                className="card-hover group"
                type="button"
                variant="outline"
                asChild
              >
                <Link href="/insta/dashboard">Cancel</Link>
              </Button>
            </div>
            {userTier === "free" && totalAccounts < accountLimit && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <AlertCircle className="h-4 w-4 text-yellow-500" />
                <span>
                  Free tier allows {accountLimit} account
                  {accountLimit > 1 ? "s" : ""}
                </span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Benefits Section */}
      <Card className="card-hover group">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-green-500" />
            Benefits of Connecting
          </CardTitle>
        </CardHeader>
        <CardContent className="p-2">
          <ul className="space-y-3 text-sm text-muted-foreground font-montserrat">
            <li className="flex items-start gap-2">
              <div className="h-2 w-2 rounded-full bg-green-500 mt-2" />
              <span>Automated comment replies 24/7</span>
            </li>
            <li className="flex items-start gap-2">
              <div className="h-2 w-2 rounded-full bg-green-500 mt-2" />
              <span>Smart follow verification system</span>
            </li>
            <li className="flex items-start gap-2">
              <div className="h-2 w-2 rounded-full bg-green-500 mt-2" />
              <span>Real-time analytics dashboard</span>
            </li>
            <li className="flex items-start gap-2">
              <div className="h-2 w-2 rounded-full bg-green-500 mt-2" />
              <span>Template-based response system</span>
            </li>
            <li className="flex items-start gap-2">
              <div className="h-2 w-2 rounded-full bg-green-500 mt-2" />
              <span>Rate limit protection</span>
            </li>
          </ul>
        </CardContent>
      </Card>

      {/* Account Limit Dialog */}
      <AlertDialog open={dialog} onOpenChange={setDialog}>
        <AlertDialogContent className="bg-gradient-to-r from-red-900/20 to-pink-900/20 backdrop-blur-md border border-red-500/30">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">
              Account Limit Reached
            </AlertDialogTitle>
            <AlertDialogDescription className="text-gray-300">
              You have reached the maximum number of accounts ({accountLimit})
              for your current plan. Upgrade to Pro for unlimited accounts and
              higher rate limits.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-gray-600 text-gray-300 hover:bg-gray-800">
              Cancel
            </AlertDialogCancel>
            <Button
              onClick={() => router.push("/insta/pricing")}
              className="bg-gradient-to-r from-purple-600 to-pink-600 hover:opacity-90"
            >
              Upgrade to Pro
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default AddAccount;
