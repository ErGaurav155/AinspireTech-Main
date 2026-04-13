// apps/cdn/app/[userId]/[chatbotType]/page.tsx
// Served at: cdn.rocketreplai.com/{userId}/{chatbotType}
// Full-page standalone bot — share this URL directly.
// Example: https://cdn.rocketreplai.com/user_abc123/chatbot-lead-generation
// Public route — no auth.

export const dynamic = "force-dynamic";

import type { Metadata } from "next";
import ChatWidget from "@/components/ChatWidget";

interface Props {
  params:
    | Promise<{ userId: string; chatbotType: string }>
    | { userId: string; chatbotType: string };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  return {
    title: "Chat with us | RocketReplAI",
    description:
      "Book an appointment or get instant answers from our AI assistant.",
  };
}

export default async function LandingBotPage({ params }: Props) {
  const resolved = await params;
  const userId = decodeURIComponent(resolved.userId || "");
  const chatbotType = decodeURIComponent(resolved.chatbotType || "");

  if (!userId || !chatbotType) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, #eff6ff, #f5f3ff)",
          fontSize: 14,
          color: "#6b7280",
        }}
      >
        Invalid bot configuration.
      </div>
    );
  }

  return (
    <ChatWidget userId={userId} chatbotType={chatbotType} mode="landing" />
  );
}
