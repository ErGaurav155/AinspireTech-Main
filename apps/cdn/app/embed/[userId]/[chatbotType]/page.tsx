// apps/cdn/app/embed/[userId]/[chatbotType]/page.tsx
// Served at: cdn.rocketreplai.com/embed/{userId}/{chatbotType}
// This URL is loaded inside the iframe that website-bot.js injects.
// Public route — no auth.

export const dynamic = "force-dynamic";

import ChatWidget from "@/components/ChatWidget";

interface Props {
  params:
    | Promise<{ userId: string; chatbotType: string }>
    | { userId: string; chatbotType: string };
}

export default async function EmbedPage({ params }: Props) {
  const resolved = await params;
  const userId = decodeURIComponent(resolved.userId || "");
  const chatbotType = decodeURIComponent(resolved.chatbotType || "");

  if (!userId || !chatbotType) {
    return (
      <div
        style={{
          position: "fixed",
          inset: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#fff",
          fontSize: 13,
          color: "#6b7280",
          textAlign: "center",
          padding: 20,
          borderRadius: 16,
        }}
      >
        Invalid widget configuration.
      </div>
    );
  }

  return <ChatWidget userId={userId} chatbotType={chatbotType} mode="embed" />;
}
