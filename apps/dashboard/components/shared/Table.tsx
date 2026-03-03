// components/shared/Table.tsx
import { ReactNode } from "react";
import { useThemeStyles } from "@/lib/theme";

export function TableHead({ cols }: { cols: string[] }) {
  const { styles } = useThemeStyles();
  return (
    <thead>
      <tr className={`border-b ${styles.divider}`}>
        {cols.map((col) => (
          <th
            key={col}
            className={`text-left px-6 py-3 text-xs font-medium uppercase tracking-wide ${styles.text.muted}`}
          >
            {col}
          </th>
        ))}
      </tr>
    </thead>
  );
}
