"use client";

import { Clock3, Zap } from "lucide-react";
import { Button, useThemeStyles } from "@rocketreplai/ui";

export type SubscriptionChangeTiming = "now" | "cycle_end";

export function SubscriptionTimingDialog({
  open,
  currentName,
  targetName,
  periodEnd,
  busy = false,
  onClose,
  onConfirm,
}: {
  open: boolean;
  currentName: string;
  targetName: string;
  periodEnd?: string;
  busy?: boolean;
  onClose: () => void;
  onConfirm: (timing: SubscriptionChangeTiming) => void;
}) {
  const { styles, isDark } = useThemeStyles();
  if (!open) return null;

  const parsedEnd = periodEnd ? new Date(periodEnd) : null;
  const formattedEnd =
    parsedEnd && !Number.isNaN(parsedEnd.getTime())
      ? new Intl.DateTimeFormat("en-IN", {
          day: "numeric",
          month: "short",
          year: "numeric",
        }).format(parsedEnd)
      : "the current billing period end";

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/55 p-4 backdrop-blur-sm">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="subscription-change-title"
        className={`w-full max-w-lg rounded-2xl border p-6 shadow-2xl ${
          isDark
            ? "border-white/10 bg-[#17171c]"
            : "border-slate-200 bg-white"
        }`}
      >
        <h2 id="subscription-change-title" className={`text-xl font-bold ${styles.text.primary}`}>
          When should this change happen?
        </h2>
        <p className={`mt-2 text-sm ${styles.text.secondary}`}>
          Change {currentName} to {targetName}. Razorpay keeps the same subscription and payment mandate.
        </p>

        <div className="mt-6 grid gap-3">
          <button
            type="button"
            disabled={busy}
            onClick={() => onConfirm("now")}
            className={`rounded-xl border p-4 text-left transition hover:border-violet-500 ${
              isDark ? "border-white/10 bg-white/[0.04]" : "border-slate-200 bg-slate-50"
            }`}
          >
            <span className={`flex items-center gap-2 font-semibold ${styles.text.primary}`}>
              <Zap className="h-4 w-4 text-violet-500" /> Immediately
            </span>
            <span className={`mt-1 block text-sm ${styles.text.secondary}`}>
              Razorpay applies the new plan now. Proration or an immediate charge may apply.
            </span>
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => onConfirm("cycle_end")}
            className={`rounded-xl border p-4 text-left transition hover:border-violet-500 ${
              isDark ? "border-white/10 bg-white/[0.04]" : "border-slate-200 bg-slate-50"
            }`}
          >
            <span className={`flex items-center gap-2 font-semibold ${styles.text.primary}`}>
              <Clock3 className="h-4 w-4 text-violet-500" /> At billing-cycle end
            </span>
            <span className={`mt-1 block text-sm ${styles.text.secondary}`}>
              Keep the current plan until {formattedEnd}, then switch automatically.
            </span>
          </button>
        </div>

        <Button type="button" variant="outline" disabled={busy} onClick={onClose} className="mt-5 w-full">
          Keep current plan
        </Button>
      </div>
    </div>
  );
}
