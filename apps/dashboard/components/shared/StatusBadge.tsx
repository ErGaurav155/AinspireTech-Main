// components/shared/StatusBadge.tsx
import { CheckCircle, XCircle, Clock } from "lucide-react";
import { useThemeStyles } from "@/lib/theme";

export function StatusBadge({
  status,
}: {
  status: "active" | "cancelled" | "expired";
}) {
  const { styles } = useThemeStyles();
  const badgeClass = styles.badge[status];
  const Icon =
    status === "active"
      ? CheckCircle
      : status === "cancelled"
        ? XCircle
        : Clock;
  return (
    <span
      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium capitalize ${badgeClass}`}
    >
      <Icon className="h-3 w-3" />
      {status}
    </span>
  );
}
