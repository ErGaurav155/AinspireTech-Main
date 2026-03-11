// components/shared/ConfirmDialog.tsx
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
import { Loader2 } from "lucide-react";

interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  title: string;
  description: string;
  confirmText?: string;
  cancelText?: string;
  isDestructive?: boolean;
  isLoading?: boolean;
}

export function ConfirmDialog({
  open,
  onOpenChange,
  onConfirm,
  title,
  description,
  confirmText = "Confirm",
  cancelText = "Cancel",
  isDestructive = false,
  isLoading = false,
}: ConfirmDialogProps) {
  const { styles, isDark } = useThemeStyles();

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
          <AlertDialogTitle className={styles.text.primary}>
            {title}
          </AlertDialogTitle>
          <AlertDialogDescription className={styles.text.secondary}>
            {description}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel
            className={
              isDark
                ? "rounded-xl bg-white/[0.06] text-white hover:bg-white/[0.09]"
                : "rounded-xl bg-gray-100 text-gray-700 hover:bg-gray-200"
            }
            disabled={isLoading}
          >
            {cancelText}
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            disabled={isLoading}
            className={
              isDestructive
                ? "rounded-xl bg-red-500 hover:bg-red-600 text-white"
                : styles.button.primary
            }
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Processing...
              </>
            ) : (
              confirmText
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
