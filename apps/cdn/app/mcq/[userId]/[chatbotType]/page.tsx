// apps/cdn/app/mcq/[userId]/[chatbotType]/page.tsx
// MCQ/Education Bot - Full page landing page
// Served at: cdn.rocketreplai.com/mcq/{userId}/{chatbotType}

export const dynamic = "force-dynamic";

import type { Metadata } from "next";
import MCQWidget from "@/components/MCQWidget";

interface Props {
  params:
    | Promise<{ userId: string; chatbotType: string }>
    | { userId: string; chatbotType: string };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const resolved = await params;
  const chatbotType = decodeURIComponent(resolved.chatbotType || "");

  return {
    title: "MCQ Practice Bot | RocketReplAI",
    description: "Generate practice quizzes and test your knowledge with AI.",
    robots: "noindex, nofollow",
  };
}

export default async function MCQBotLandingPage({ params }: Props) {
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
        Invalid MCQ bot configuration.
      </div>
    );
  }

  return <MCQWidget userId={userId} chatbotType={chatbotType} mode="landing" />;
}
