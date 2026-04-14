// apps/cdn/app/lead/[userId]/[chatbotType]/page.tsx
// Lead Generation Bot - Full page landing page
// Served at: cdn.rocketreplai.com/lead/{userId}/{chatbotType}

export const dynamic = "force-dynamic";

import type { Metadata } from "next";
import ChatWidget from "@/components/ChatWidget";

interface Props {
  params:
    | Promise<{ userId: string; chatbotType: string }>
    | { userId: string; chatbotType: string };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const resolved = await params;
  const chatbotType = decodeURIComponent(resolved.chatbotType || "");

  return {
    title: chatbotType.includes("lead")
      ? "Book an Appointment | RocketReplAI"
      : "Chat with us | RocketReplAI",
    description:
      "Schedule your appointment or get instant answers from our AI assistant.",
    robots: "noindex, nofollow",
  };
}

export default async function LeadBotLandingPage({ params }: Props) {
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
