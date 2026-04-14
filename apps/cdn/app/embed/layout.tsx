// apps/cdn/app/embed/layout.tsx
// Legacy embed layout - redirects to new structure
// Kept for backward compatibility

import { redirect } from "next/navigation";

export default function EmbedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // This layout is kept for backward compatibility
  // New embeds should use /lead/embed or /mcq/embed
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "transparent",
        overflow: "hidden",
      }}
    >
      {children}
    </div>
  );
}

export const dynamic = "force-dynamic";
