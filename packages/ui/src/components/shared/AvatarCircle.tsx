// components/shared/AvatarCircle.tsx
const AVATAR_COLORS = [
  "#f59e0b",
  "#3b82f6",
  "#22c55e",
  "#ef4444",
  "#a855f7",
  "#06b6d4",
];

export function AvatarCircle({
  name,
  idx,
  className = "",
}: {
  name: string;
  idx: number;
  className?: string;
}) {
  const initials = name.slice(0, 2).toUpperCase() || "??";
  return (
    <div
      className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0 ${className}`}
      style={{
        background: `linear-gradient(135deg,${AVATAR_COLORS[idx % 6]},${AVATAR_COLORS[(idx + 2) % 6]})`,
      }}
    >
      {initials}
    </div>
  );
}
