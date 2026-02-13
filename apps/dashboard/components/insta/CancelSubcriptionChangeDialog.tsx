"use client";

import { PricingPlan } from "@rocketreplai/shared";
import { Button } from "@rocketreplai/ui/components/radix/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@rocketreplai/ui/components/radix/dialog";
import { useTheme } from "next-themes";
import { useMemo } from "react";

interface ConfirmSubscriptionChangeDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  currentPlan: PricingPlan | null;
  newPlan: PricingPlan | null;
  isLoading?: boolean;
}

export function ConfirmSubscriptionChangeDialog({
  isOpen,
  onClose,
  onConfirm,
  currentPlan,
  newPlan,
  isLoading = false,
}: ConfirmSubscriptionChangeDialogProps) {
  const { theme, resolvedTheme } = useTheme();
  const currentTheme = resolvedTheme || theme || "light";

  // Theme-based styles
  const themeStyles = useMemo(() => {
    const isDark = currentTheme === "dark";
    return {
      dialogBg: isDark ? "bg-[#0a0a0a]/95" : "bg-white/95",
      dialogBorder: isDark ? "border-white/10" : "border-gray-200",
      textPrimary: isDark ? "text-white" : "text-gray-900",
      textSecondary: isDark ? "text-gray-300" : "text-gray-600",
      textMuted: isDark ? "text-gray-400" : "text-gray-500",
      buttonOutlineBorder: isDark ? "border-white/20" : "border-gray-300",
      buttonOutlineText: isDark ? "text-gray-300" : "text-gray-700",
    };
  }, [currentTheme]);
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent
        className={`${themeStyles.dialogBg} backdrop-blur-lg border ${themeStyles.dialogBorder} rounded-xl`}
      >
        <DialogHeader>
          <DialogTitle className={themeStyles.textPrimary}>
            Confirm Subscription Change
          </DialogTitle>
          <DialogDescription
            className={`${themeStyles.textSecondary} font-montserrat`}
          >
            Are you sure you want to change your subscription from{" "}
            {currentPlan?.name} to {newPlan?.name}?
          </DialogDescription>
        </DialogHeader>
        <div className="py-4">
          <p className={`text-sm ${themeStyles.textSecondary} font-montserrat`}>
            Your current subscription will be cancelled immediately and you will
            be charged for the new plan.
          </p>
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={onClose}
            disabled={isLoading}
            className={`${themeStyles.buttonOutlineBorder} ${themeStyles.buttonOutlineText}`}
          >
            Cancel
          </Button>
          <Button
            onClick={onConfirm}
            disabled={isLoading}
            className="bg-gradient-to-r from-[#00F0FF] to-[#B026FF] text-white"
          >
            {isLoading ? "Processing..." : "Confirm Change"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
