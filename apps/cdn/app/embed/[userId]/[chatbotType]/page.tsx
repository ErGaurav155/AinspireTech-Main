// apps/cdn/app/embed/[userId]/[chatbotType]/page.tsx
// Legacy embed route - redirects to new structure
// Served at: cdn.rocketreplai.com/embed/{userId}/{chatbotType}

export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";

interface Props {
  params:
    | Promise<{ userId: string; chatbotType: string }>
    | { userId: string; chatbotType: string };
}

export default async function LegacyEmbedPage({ params }: Props) {
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

  if (chatbotType !== "chatbot-lead-generation") {
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

  redirect(`/lead/embed/${userId}/${chatbotType}`);
}
