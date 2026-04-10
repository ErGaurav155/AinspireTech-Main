// apps/cdn/app/embed/layout.tsx
// Wraps all /embed/* pages (served inside iframe on customer websites).
// Must have transparent background and no chrome.
export default function EmbedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
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
