// apps/cdn/app/[userId]/[chatbotType]/page.tsx
// Legacy landing page for the lead-generation chatbot.
// Served at: cdn.rocketreplai.com/{userId}/{chatbotType}

export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";

interface Props {
  params:
    | Promise<{ userId: string; chatbotType: string }>
    | { userId: string; chatbotType: string };
}

export default async function UniversalLandingPage({ params }: Props) {
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

  if (chatbotType !== "chatbot-lead-generation") {
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

  redirect(`/lead/${userId}/${chatbotType}`);
}
