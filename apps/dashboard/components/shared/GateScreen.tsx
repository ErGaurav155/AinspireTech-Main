// components/shared/GateScreen.tsx
import { ReactNode } from "react";
import { useThemeStyles } from "@/lib/theme";
import { Orbs } from "./Orbs";

interface GateScreenProps {
  icon: ReactNode;
  title: string;
  body: string;
  children: ReactNode;
  subText?: string;
}

export function GateScreen({
  icon,
  title,
  body,
  children,
  subText,
}: GateScreenProps) {
  const { styles, isDark } = useThemeStyles();
  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      {isDark && <Orbs />}
      <div
        className={`relative z-10 rounded-2xl p-8 max-w-sm w-full text-center space-y-4 ${styles.card}`}
      >
        <div
          className={`w-16 h-16 rounded-2xl flex items-center justify-center mx-auto bg-gray-100 dark:bg-white/5 border dark:border-white/10`}
        >
          {icon}
        </div>
        <h1 className={`text-xl font-bold ${styles.text.primary}`}>{title}</h1>
        <p className={`text-sm ${styles.text.secondary}`}>{body}</p>
        {subText && <p className={`text-xs ${styles.text.muted}`}>{subText}</p>}
        <div className="pt-2">{children}</div>
      </div>
    </div>
  );
}
