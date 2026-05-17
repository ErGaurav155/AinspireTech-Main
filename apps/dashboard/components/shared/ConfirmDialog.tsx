// components/shared/ConfirmDialog.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  Checkbox,
  Label,
  useThemeStyles,
} from "@rocketreplai/ui";
import { Loader2 } from "lucide-react";

interface ConfirmationAcknowledgement {
  id: string;
  label: string;
}

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
  acknowledgements?: ConfirmationAcknowledgement[];
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
  acknowledgements = [],
}: ConfirmDialogProps) {
  const { styles, isDark } = useThemeStyles();
  const [checkedAcknowledgements, setCheckedAcknowledgements] = useState<
    Record<string, boolean>
  >({});

  useEffect(() => {
    if (!open) {
      setCheckedAcknowledgements({});
    }
  }, [open]);

  const hasAcceptedAcknowledgements = useMemo(
    () =>
      acknowledgements.every(
        (acknowledgement) => checkedAcknowledgements[acknowledgement.id],
      ),
    [acknowledgements, checkedAcknowledgements],
  );

  const isConfirmDisabled =
    isLoading || (acknowledgements.length > 0 && !hasAcceptedAcknowledgements);

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
        {acknowledgements.length > 0 && (
          <div
            className={`space-y-3 rounded-xl border p-4 ${
              isDark
                ? "border-red-500/20 bg-red-500/10"
                : "border-red-100 bg-red-50"
            }`}
          >
            {acknowledgements.map((acknowledgement) => (
              <div
                key={acknowledgement.id}
                className="flex items-start gap-3"
              >
                <Checkbox
                  id={acknowledgement.id}
                  checked={!!checkedAcknowledgements[acknowledgement.id]}
                  onCheckedChange={(checked) =>
                    setCheckedAcknowledgements((current) => ({
                      ...current,
                      [acknowledgement.id]: checked === true,
                    }))
                  }
                  disabled={isLoading}
                  className={
                    isDark
                      ? "mt-0.5 border-white/30 data-[state=checked]:border-red-500 data-[state=checked]:bg-red-500"
                      : "mt-0.5 border-red-300 data-[state=checked]:border-red-500 data-[state=checked]:bg-red-500"
                  }
                />
                <Label
                  htmlFor={acknowledgement.id}
                  className={`cursor-pointer text-sm leading-5 ${
                    isDark ? "text-red-100" : "text-red-800"
                  }`}
                >
                  {acknowledgement.label}
                </Label>
              </div>
            ))}
          </div>
        )}
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
            disabled={isConfirmDisabled}
            className={
              isDestructive
                ? "rounded-xl bg-red-500 hover:bg-red-600 text-white disabled:opacity-50 disabled:cursor-not-allowed"
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
