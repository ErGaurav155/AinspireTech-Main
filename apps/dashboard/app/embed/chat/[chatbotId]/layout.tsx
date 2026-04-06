// apps/dashboard/app/embed/chat/[chatbotId]/layout.tsx
// Completely bare — no ClerkProvider, no sidebar, no Navbar.
// This layout is for pages that live inside customer website iframes.

import type { ReactNode } from "react";

// No metadata that could leak into customer's page head
export const metadata = {
  title: "Chat",
  robots: { index: false, follow: false },
};

export default function EmbedChatLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </head>
      <body
        style={{
          margin: 0,
          padding: 0,
          overflow: "hidden",
          background: "transparent",
        }}
      >
        {children}
      </body>
    </html>
  );
}
