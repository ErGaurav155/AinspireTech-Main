// apps/dashboard/app/embed/chat/[chatbotId]/page.tsx
// Route: /embed/chat/[chatbotId]
// This page renders inside the iframe embedded on customer websites.
// No Clerk auth — public route.

export const dynamic = "force-dynamic";

import ChatWidgetClient from "@/components/embed/ChatWidgetClient";

interface Props {
  params: { chatbotId: string };
  searchParams: { origin?: string };
}

export default function EmbedChatPage({ params, searchParams }: Props) {
  return (
    <ChatWidgetClient
      chatbotId={params.chatbotId}
      originUrl={
        searchParams.origin ? decodeURIComponent(searchParams.origin) : ""
      }
    />
  );
}
