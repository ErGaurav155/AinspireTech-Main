// components/shared/Spinner.tsx
import { RefreshCw } from "lucide-react";

export function Spinner({ label = "Loading…" }: { label?: string }) {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <RefreshCw className={`h-7 w-7 text-blue-400 animate-spin`} />
        <p className={`text-sm  text-gray-300`}>{label}</p>
      </div>
    </div>
  );
}
