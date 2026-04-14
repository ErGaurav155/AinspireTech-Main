// apps/cdn/app/[userId]/[chatbotType]/page.tsx
// Universal landing page - auto-detects bot type and redirects to appropriate route
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

  // Auto-detect bot type and redirect to appropriate landing page
  const isEducationBot =
    chatbotType.includes("education") || chatbotType.includes("mcq");

  if (isEducationBot) {
    redirect(`/mcq/${userId}/${chatbotType}`);
  } else {
    redirect(`/lead/${userId}/${chatbotType}`);
  }
}
