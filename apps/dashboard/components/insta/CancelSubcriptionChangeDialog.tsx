"use client";

import { PricingPlan } from "@rocketreplai/shared";
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@rocketreplai/ui";

import { useTheme } from "next-themes";
import { useMemo } from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";

interface ConfirmSubscriptionChangeDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  currentPlan: PricingPlan | null;
  newPlan: PricingPlan | null;
  isLoading?: boolean;
}

// Theme map matching the dashboard's pattern
function buildTheme(isDark: boolean) {
  return {
    dialogContent: isDark
      ? "bg-[#1A1A1E] backdrop-blur-lg border border-white/[0.08] rounded-xl"
      : "bg-white/95 backdrop-blur-lg border border-gray-200 rounded-xl",
    dialogTitle: isDark ? "text-white" : "text-gray-900",
    dialogDesc: isDark
      ? "text-white/60 font-montserrat"
      : "text-gray-600 font-montserrat",
    dialogText: isDark
      ? "text-white/60 font-montserrat"
      : "text-gray-500 font-montserrat",
    buttonOutline: isDark
      ? "border-white/20 text-white/70 hover:bg-white/10"
      : "border-gray-300 text-gray-700 hover:bg-gray-100",
    buttonConfirm:
      "bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600 text-white",
  } as const;
}

export function ConfirmSubscriptionChangeDialog({
  isOpen,
  onClose,
  onConfirm,
  currentPlan,
  newPlan,
  isLoading = false,
}: ConfirmSubscriptionChangeDialogProps) {
  const { resolvedTheme } = useTheme();

  const isDark = resolvedTheme === "dark";
  const themeStyles = useMemo(() => buildTheme(isDark), [isDark]);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50" />
        <DialogContent className={themeStyles.dialogContent}>
          <DialogHeader>
            <DialogTitle className={themeStyles.dialogTitle}>
              Confirm Subscription Change
            </DialogTitle>
            <DialogDescription className={themeStyles.dialogDesc}>
              Are you sure you want to change your subscription from{" "}
              {currentPlan?.name} to {newPlan?.name}?
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <p className={`text-sm ${themeStyles.dialogText}`}>
              Your current subscription will be cancelled immediately and you
              will be charged for the new plan.
            </p>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={onClose}
              disabled={isLoading}
              className={themeStyles.buttonOutline}
            >
              Cancel
            </Button>
            <Button
              onClick={onConfirm}
              disabled={isLoading}
              className={themeStyles.buttonConfirm}
            >
              {isLoading ? "Processing..." : "Confirm Change"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </DialogPrimitive.Portal>
    </Dialog>
  );
}
