// apps/cdn/app/embed/layout.tsx
// Legacy embed layout kept for backward compatibility.

export default function EmbedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // New embeds should use /lead/embed.
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
