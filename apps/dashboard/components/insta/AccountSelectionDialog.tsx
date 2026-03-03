"use client";

import { useMemo, useState } from "react";
import { useTheme } from "next-themes";
import { PricingPlan } from "@rocketreplai/shared";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@rocketreplai/ui/components/radix/dialog";
import { Checkbox } from "@rocketreplai/ui/components/radix/checkbox";
import { Label } from "@rocketreplai/ui/components/radix/label";
import { Button } from "@rocketreplai/ui/components/radix/button";
import * as DialogPrimitive from "@radix-ui/react-dialog";

import { useThemeStyles } from "@/lib/theme";

interface AccountSelectionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (selectedAccountIds: string[]) => void;
  accounts: any[];
  newPlan: PricingPlan | null;
  isLoading?: boolean;
}

export function AccountSelectionDialog({
  isOpen,
  onClose,
  onConfirm,
  accounts,
  newPlan,
  isLoading = false,
}: AccountSelectionDialogProps) {
  const [selectedAccounts, setSelectedAccounts] = useState<string[]>([]);
  const { resolvedTheme } = useTheme();
  const { styles, isDark } = useThemeStyles();

  const pageStyles = useMemo(
    () => ({
      dialogContent: isDark
        ? "bg-[#1A1A1E] backdrop-blur-lg border border-white/[0.08] rounded-xl max-w-md"
        : "bg-white/95 backdrop-blur-lg border border-gray-200 rounded-xl max-w-md",
      checkbox: isDark
        ? "border-white/30 data-[state=checked]:bg-pink-500 data-[state=checked]:border-pink-500"
        : "border-gray-300 data-[state=checked]:bg-pink-500 data-[state=checked]:border-pink-500",
      label: isDark
        ? "text-white cursor-pointer"
        : "text-gray-900 cursor-pointer",
      errorText: "text-sm text-red-400 mt-3 font-montserrat",
      successText: "text-sm text-purple-400 mt-3 font-montserrat",
      buttonOutline: isDark
        ? "border-white/20 text-gray-300 hover:bg-white/10"
        : "border-gray-300 text-gray-700 hover:bg-gray-100",
      buttonConfirm:
        "bg-red-600 hover:bg-red-700 text-white disabled:opacity-50 disabled:cursor-not-allowed",
    }),
    [isDark],
  );

  const getAccountLimit = (plan: PricingPlan | null) => {
    if (!plan) return 1;
    switch (plan.id) {
      case "Insta-Automation-Free":
        return 1;
      case "Insta-Automation-Pro":
        return 3;
      default:
        return 1;
    }
  };

  const accountLimit = getAccountLimit(newPlan);
  const accountsToDelete = Math.max(0, accounts.length - accountLimit);

  const handleAccountSelection = (accountId: string, checked: boolean) => {
    if (checked) {
      setSelectedAccounts([...selectedAccounts, accountId]);
    } else {
      setSelectedAccounts(selectedAccounts.filter((id) => id !== accountId));
    }
  };

  const handleConfirm = () => {
    if (selectedAccounts.length >= accountsToDelete) {
      onConfirm(selectedAccounts);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className={styles.dialogOverlay} />
        <DialogContent className={pageStyles.dialogContent}>
          <DialogHeader>
            <DialogTitle className={pageStyles.errorText}>
              Account Limit Exceeded
            </DialogTitle>
            <DialogDescription className={pageStyles.successText}>
              The {newPlan?.name} plan allows only {accountLimit} Instagram
              account(s). Please select {accountsToDelete} account(s) to delete.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 max-h-60 overflow-y-auto">
            <div className="space-y-3">
              {accounts.map((account) => (
                <div
                  key={account.username}
                  className="flex items-center space-x-2"
                >
                  <Checkbox
                    id={account.username}
                    checked={selectedAccounts.includes(account.username)}
                    onCheckedChange={(checked) =>
                      handleAccountSelection(
                        account.username,
                        checked as boolean,
                      )
                    }
                    disabled={
                      selectedAccounts.length >= accountsToDelete &&
                      !selectedAccounts.includes(account.username)
                    }
                    className={pageStyles.checkbox}
                  />
                  <Label
                    htmlFor={account.username}
                    className={pageStyles.label}
                  >
                    {account.username}
                  </Label>
                </div>
              ))}
            </div>
            {selectedAccounts.length < accountsToDelete && (
              <p className={pageStyles.errorText}>
                Please select {accountsToDelete - selectedAccounts.length} more
                account(s)
              </p>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={onClose}
              disabled={isLoading}
              className={pageStyles.buttonOutline}
            >
              Cancel
            </Button>
            <Button
              onClick={handleConfirm}
              disabled={isLoading || selectedAccounts.length < accountsToDelete}
              className={pageStyles.buttonConfirm}
            >
              {isLoading
                ? "Processing..."
                : `Delete Selected Accounts (${selectedAccounts.length}/${accountsToDelete})`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </DialogPrimitive.Portal>
    </Dialog>
  );
}
