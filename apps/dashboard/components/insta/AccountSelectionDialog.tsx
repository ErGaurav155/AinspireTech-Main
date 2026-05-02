"use client";

import { useEffect, useMemo, useState } from "react";
import { useTheme } from "next-themes";
import { PricingPlan } from "@rocketreplai/shared";

import * as DialogPrimitive from "@radix-ui/react-dialog";

import {
  Button,
  Checkbox,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Label,
  useThemeStyles,
} from "@rocketreplai/ui";

interface AccountSelectionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (selectedAccountIds: string[]) => void;
  accounts: any[];
  newPlan: PricingPlan | null;
  isLoading?: boolean;
  mode?: "delete" | "keep";
}

export function AccountSelectionDialog({
  isOpen,
  onClose,
  onConfirm,
  accounts,
  newPlan,
  isLoading = false,
  mode = "delete",
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
  const requiredSelections = mode === "keep" ? accountLimit : accountsToDelete;
  const getAccountId = (account: any) =>
    account.instagramId || account._id || account.username;

  useEffect(() => {
    if (!isOpen) {
      setSelectedAccounts([]);
    }
  }, [isOpen]);

  const handleAccountSelection = (accountId: string, checked: boolean) => {
    if (checked) {
      setSelectedAccounts([...selectedAccounts, accountId]);
    } else {
      setSelectedAccounts(selectedAccounts.filter((id) => id !== accountId));
    }
  };

  const handleConfirm = () => {
    if (selectedAccounts.length >= requiredSelections) {
      if (mode === "keep") {
        const selectedToKeep = new Set(selectedAccounts);
        onConfirm(
          accounts
            .filter((account) => !selectedToKeep.has(getAccountId(account)))
            .map((account) => getAccountId(account)),
        );
        return;
      }

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
              {mode === "keep"
                ? `The ${newPlan?.name} plan allows only ${accountLimit} Instagram account(s). Please select the account you want to keep. Other accounts and their data will be deleted.`
                : `The ${newPlan?.name} plan allows only ${accountLimit} Instagram account(s). Please select ${accountsToDelete} account(s) to delete.`}
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 max-h-60 overflow-y-auto">
            <div className="space-y-3">
              {accounts.map((account) => (
                <div
                  key={getAccountId(account)}
                  className="flex items-center space-x-2"
                >
                  <Checkbox
                    id={getAccountId(account)}
                    checked={selectedAccounts.includes(getAccountId(account))}
                    onCheckedChange={(checked) =>
                      handleAccountSelection(
                        getAccountId(account),
                        checked as boolean,
                      )
                    }
                    disabled={
                      selectedAccounts.length >= requiredSelections &&
                      !selectedAccounts.includes(getAccountId(account))
                    }
                    className={pageStyles.checkbox}
                  />
                  <Label
                    htmlFor={getAccountId(account)}
                    className={pageStyles.label}
                  >
                    {account.username}
                  </Label>
                </div>
              ))}
            </div>
            {selectedAccounts.length < requiredSelections && (
              <p className={pageStyles.errorText}>
                Please select {requiredSelections - selectedAccounts.length}{" "}
                more account(s)
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
              disabled={
                isLoading || selectedAccounts.length < requiredSelections
              }
              className={pageStyles.buttonConfirm}
            >
              {isLoading ? (
                "Processing..."
              ) : mode === "keep" ? (
                `Keep Selected Account (${selectedAccounts.length}/${requiredSelections})`
              ) : (
                `Delete Selected Accounts (${selectedAccounts.length}/${accountsToDelete})`
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </DialogPrimitive.Portal>
    </Dialog>
  );
}
