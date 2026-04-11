export const dynamic = "force-dynamic";

import MCQWidget from "@/components/MCQWidget";

interface Props {
  params:
    | Promise<{ userId: string; chatbotType: string }>
    | { userId: string; chatbotType: string };
}

export default async function MCQEmbedPage({ params }: Props) {
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
          color: "#64748b",
          fontSize: 13,
          textAlign: "center",
          padding: 20,
        }}
      >
        Invalid MCQ bot configuration.
      </div>
    );
  }

  return <MCQWidget userId={userId} chatbotType={chatbotType} mode="embed" />;
}
