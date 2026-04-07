// apps/dashboard/app/embed/chat/[chatbotId]/page.tsx
// Route: /embed/chat/[chatbotId]
// This page renders inside the iframe embedded on customer websites.
// No Clerk auth — public route.

export const dynamic = "force-dynamic";

import ChatWidgetClient from "@/components/embed/ChatWidgetClient";

interface Props {
  params: Promise<{ chatbotId: string }> | { chatbotId: string };
  searchParams: Promise<{ origin?: string }> | { origin?: string };
}

export default async function EmbedChatPage({ params, searchParams }: Props) {
  // Handle both sync and async params (Next.js 15+)
  const resolvedParams = await params;
  const resolvedSearchParams = await searchParams;

  const chatbotId = resolvedParams.chatbotId;
  const originUrl = resolvedSearchParams.origin
    ? decodeURIComponent(resolvedSearchParams.origin)
    : "";

  if (!chatbotId) {
    return (
      <div style={{ padding: 20, textAlign: "center", color: "red" }}>
        Invalid chatbot configuration
      </div>
    );
  }

  return <ChatWidgetClient chatbotId={chatbotId} originUrl={originUrl} />;
}
