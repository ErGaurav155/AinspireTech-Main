// components/shared/AccountLimitDialog.tsx
"use client";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  useThemeStyles,
} from "@rocketreplai/ui";

import { Crown, AlertTriangle } from "lucide-react";
import { useRouter } from "next/navigation";

interface AccountLimitDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentAccounts: number;
  accountLimit: number;
  dashboardType: "insta" | "web";
}

export function AccountLimitDialog({
  open,
  onOpenChange,
  currentAccounts,
  accountLimit,
  dashboardType,
}: AccountLimitDialogProps) {
  const router = useRouter();
  const { styles, isDark } = useThemeStyles();
  const isInsta = dashboardType === "insta";

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent
        className={
          isDark
            ? "bg-[#1A1A1E] border border-white/[0.08] rounded-2xl"
            : "bg-white border border-gray-100 rounded-2xl"
        }
      >
        <AlertDialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center ${styles.icon.amber}`}
            >
              <AlertTriangle
                className={`h-5 w-5 ${isDark ? "text-amber-400" : "text-amber-600"}`}
              />
            </div>
            <AlertDialogTitle className={styles.text.primary}>
              Account Limit Reached
            </AlertDialogTitle>
          </div>
          <AlertDialogDescription className={styles.text.secondary}>
            Your current plan allows {accountLimit} account(s). You currently
            have {currentAccounts} account(s) connected.
            {isInsta ? (
              <>
                {" "}
                Upgrade to Pro to connect up to 3 Instagram accounts and unlock
                unlimited automations.
              </>
            ) : (
              <>
                {" "}
                Upgrade to a paid plan to create more chatbots and unlock
                advanced features.
              </>
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel
            className={
              isDark
                ? "rounded-xl bg-white/[0.06] text-white hover:bg-white/[0.09]"
                : "rounded-xl bg-gray-100 text-gray-700 hover:bg-gray-200"
            }
          >
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={() =>
              router.push(isInsta ? "/insta/pricing" : "/web/pricing")
            }
            className={styles.button.primary}
          >
            <Crown className="h-4 w-4 mr-2" />
            Upgrade Now
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
