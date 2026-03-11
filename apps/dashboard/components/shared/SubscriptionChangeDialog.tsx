// components/shared/SubscriptionChangeDialog.tsx
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
import { Loader2, ArrowRight } from "lucide-react";
import { PricingPlan } from "@rocketreplai/shared";

interface SubscriptionChangeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  currentPlan: PricingPlan | null;
  newPlan: PricingPlan | null;
  isLoading?: boolean;
}

export function SubscriptionChangeDialog({
  open,
  onOpenChange,
  onConfirm,
  currentPlan,
  newPlan,
  isLoading = false,
}: SubscriptionChangeDialogProps) {
  const { styles, isDark } = useThemeStyles();

  if (!currentPlan || !newPlan) return null;

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent
        className={
          isDark
            ? "bg-[#1A1A1E] border border-white/[0.08] rounded-2xl max-w-md"
            : "bg-white border border-gray-100 rounded-2xl max-w-md"
        }
      >
        <AlertDialogHeader>
          <AlertDialogTitle className={styles.text.primary}>
            Confirm Subscription Change
          </AlertDialogTitle>
          <AlertDialogDescription className={styles.text.secondary}>
            Are you sure you want to change your subscription?
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="py-4">
          <div
            className={`flex items-center justify-between p-3 rounded-xl ${isDark ? "bg-white/[0.03]" : "bg-gray-50"}`}
          >
            <div>
              <p className={`text-sm font-medium ${styles.text.primary}`}>
                {currentPlan.name}
              </p>
              <p className={`text-xs ${styles.text.muted}`}>Current Plan</p>
            </div>
            <ArrowRight className={`h-4 w-4 ${styles.text.muted}`} />
            <div className="text-right">
              <p className={`text-sm font-medium ${styles.text.primary}`}>
                {newPlan.name}
              </p>
              <p className={`text-xs ${styles.text.muted}`}>New Plan</p>
            </div>
          </div>

          <p className={`text-sm mt-4 ${styles.text.secondary}`}>
            Your current subscription will be cancelled immediately and you will
            be charged for the new plan.
            {newPlan.account > currentPlan.account && (
              <span className="block mt-2 text-amber-600 dark:text-amber-400">
                Note: The new plan allows {newPlan.account} accounts (currently{" "}
                {currentPlan.account}).
              </span>
            )}
          </p>
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel
            className={
              isDark
                ? "rounded-xl bg-white/[0.06] text-white hover:bg-white/[0.09]"
                : "rounded-xl bg-gray-100 text-gray-700 hover:bg-gray-200"
            }
            disabled={isLoading}
          >
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            disabled={isLoading}
            className={styles.button.primary}
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Processing...
              </>
            ) : (
              "Confirm Change"
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
