// components/shared/EmptyState.tsx
import { ReactNode } from "react";
import { useThemeStyles } from "@rocketreplai/ui";

export function EmptyState({
  icon,
  label,
}: {
  icon: ReactNode;
  label: string;
}) {
  const { styles } = useThemeStyles();
  return (
    <div className="p-12 text-center">
      <div className={`h-8 w-8 mx-auto mb-3 ${styles.empty.icon}`}>{icon}</div>
      <p className={`text-sm ${styles.empty.text}`}>{label}</p>
    </div>
  );
}
