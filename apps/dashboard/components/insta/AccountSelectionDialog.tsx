"use client";

import { useMemo, useState } from "react";

import { useTheme } from "next-themes";
import { PricingPlan } from "@ainspiretech/shared";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@ainspiretech/ui/components/radix/dialog";
import { Checkbox } from "@ainspiretech/ui/components/radix/checkbox";
import { Label } from "@ainspiretech/ui/components/radix/label";
import { Button } from "@ainspiretech/ui/components/radix/button";

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

  const handleAccountSelection = (username: string, checked: boolean) => {
    if (checked) {
      setSelectedAccounts([...selectedAccounts, username]);
    } else {
      setSelectedAccounts(selectedAccounts.filter((id) => id !== username));
    }
  };

  const handleConfirm = () => {
    if (selectedAccounts.length >= accountsToDelete) {
      onConfirm(selectedAccounts);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent
        className={`${themeStyles.dialogBg} backdrop-blur-lg border ${themeStyles.dialogBorder} rounded-xl max-w-md`}
      >
        <DialogHeader>
          <DialogTitle className={themeStyles.textPrimary}>
            Account Limit Exceeded
          </DialogTitle>
          <DialogDescription
            className={`${themeStyles.textSecondary} font-montserrat`}
          >
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
                    handleAccountSelection(account.username, checked as boolean)
                  }
                  disabled={
                    selectedAccounts.length >= accountsToDelete &&
                    !selectedAccounts.includes(account.username)
                  }
                />
                <Label
                  htmlFor={account.username}
                  className={`${themeStyles.textPrimary} cursor-pointer`}
                >
                  {account.username}
                </Label>
              </div>
            ))}
          </div>
          {selectedAccounts.length < accountsToDelete && (
            <p className={`text-sm text-red-400 mt-3 font-montserrat`}>
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
            className={`${themeStyles.buttonOutlineBorder} ${themeStyles.buttonOutlineText}`}
          >
            Cancel
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={isLoading || selectedAccounts.length < accountsToDelete}
            className="bg-red-600 hover:bg-red-700 text-white"
          >
            {isLoading
              ? "Processing..."
              : `Delete Selected Accounts (${selectedAccounts.length}/${accountsToDelete})`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
