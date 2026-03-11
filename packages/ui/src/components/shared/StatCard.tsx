// components/shared/StatCard.tsx
import { ReactNode } from "react";
import { useThemeStyles } from "@rocketreplai/ui";

interface StatCardProps {
  icon: ReactNode;
  iconBg: string;
  label: string;
  value: string | number;
  badge?: ReactNode;
  sub?: ReactNode;
}

export function StatCard({
  icon,
  iconBg,
  label,
  value,
  badge,
  sub,
}: StatCardProps) {
  const { styles } = useThemeStyles();
  return (
    <div className={`rounded-2xl p-5 ${styles.card}`}>
      <div className="flex items-center justify-between mb-3">
        <div
          className={`w-10 h-10 rounded-xl flex items-center justify-center ${iconBg}`}
        >
          {icon}
        </div>
        {badge}
      </div>
      <p className={`text-xs mb-1 ${styles.text.secondary}`}>{label}</p>
      <p className={`text-2xl font-bold ${styles.text.primary}`}>{value}</p>
      {sub && <div className="mt-2">{sub}</div>}
    </div>
  );
}
