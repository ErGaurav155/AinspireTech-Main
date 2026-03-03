// components/shared/AccountSelectionDialog.tsx
"use client";

import { useState } from "react";
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
import { Checkbox } from "@rocketreplai/ui/components/radix/checkbox";
import { Label } from "@rocketreplai/ui/components/radix/label";
import { useThemeStyles } from "@/lib/theme";
import { Loader2, AlertTriangle } from "lucide-react";

interface AccountSelectionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (selectedAccountIds: string[]) => void;
  accounts: Array<{ _id: string; username: string; name?: string }>;
  newPlanName: string;
  accountLimit: number;
  isLoading?: boolean;
}

export function AccountSelectionDialog({
  isOpen,
  onClose,
  onConfirm,
  accounts,
  newPlanName,
  accountLimit,
  isLoading = false,
}: AccountSelectionDialogProps) {
  const [selectedAccounts, setSelectedAccounts] = useState<string[]>([]);
  const { styles, isDark } = useThemeStyles();

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
    <AlertDialog open={isOpen} onOpenChange={onClose}>
      <AlertDialogContent
        className={
          isDark
            ? "bg-[#1A1A1E] border border-white/[0.08] rounded-2xl max-w-md"
            : "bg-white border border-gray-100 rounded-2xl max-w-md"
        }
      >
        <AlertDialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center bg-red-100}`}
            >
              <AlertTriangle
                className={`h-5 w-5 ${isDark ? "text-red-400" : "text-red-600"}`}
              />
            </div>
            <AlertDialogTitle className={styles.text.primary}>
              Account Limit Exceeded
            </AlertDialogTitle>
          </div>
          <AlertDialogDescription className={styles.text.secondary}>
            The {newPlanName} plan allows only {accountLimit} account(s). Please
            select {accountsToDelete} account(s) to delete.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="py-4 max-h-60 overflow-y-auto">
          <div className="space-y-3">
            {accounts.map((account) => (
              <div key={account._id} className="flex items-center space-x-2">
                <Checkbox
                  id={account._id}
                  checked={selectedAccounts.includes(account._id)}
                  onCheckedChange={(checked) =>
                    handleAccountSelection(account._id, checked as boolean)
                  }
                  disabled={
                    selectedAccounts.length >= accountsToDelete &&
                    !selectedAccounts.includes(account._id)
                  }
                  className={
                    isDark
                      ? "border-white/30 data-[state=checked]:bg-pink-500 data-[state=checked]:border-pink-500"
                      : "border-gray-300 data-[state=checked]:bg-pink-500 data-[state=checked]:border-pink-500"
                  }
                />
                <Label
                  htmlFor={account._id}
                  className={`${styles.text.primary} cursor-pointer`}
                >
                  {account.username || account.name || "Unknown account"}
                </Label>
              </div>
            ))}
          </div>
          {selectedAccounts.length < accountsToDelete && (
            <p className={`text-sm text-red-500 dark:text-red-400 mt-3`}>
              Please select {accountsToDelete - selectedAccounts.length} more
              account(s)
            </p>
          )}
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
            onClick={handleConfirm}
            disabled={isLoading || selectedAccounts.length < accountsToDelete}
            className="rounded-xl bg-red-500 hover:bg-red-600 text-white disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Processing...
              </>
            ) : (
              `Delete Selected Accounts (${selectedAccounts.length}/${accountsToDelete})`
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
