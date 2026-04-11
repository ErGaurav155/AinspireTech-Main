export const dynamic = "force-dynamic";

import type { Metadata } from "next";
import MCQWidget from "@/components/MCQWidget";

interface Props {
  params:
    | Promise<{ userId: string; chatbotType: string }>
    | { userId: string; chatbotType: string };
}

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: "Practice with our MCQ bot | RocketReplAI",
    description: "Ask doubts, generate quizzes, and browse FAQs with our education bot.",
  };
}

export default async function MCQLandingPage({ params }: Props) {
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
          background: "linear-gradient(135deg, #eff6ff, #f8fafc)",
          color: "#64748b",
          fontSize: 14,
        }}
      >
        Invalid MCQ bot configuration.
      </div>
    );
  }

  return <MCQWidget userId={userId} chatbotType={chatbotType} mode="landing" />;
}
