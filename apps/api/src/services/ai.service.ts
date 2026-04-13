// apps/api/services/ai.service.ts (updated)
import { connectToDatabase } from "@/config/database.config";
import OpenAI from "openai";
import WebFaq from "@/models/web/webFaq.model";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ConvMessage {
  role: "user" | "assistant";
  content: string;
}

// ─── DeepSeek client (singleton) ─────────────────────────────────────────────

let openaiInstance: OpenAI | Error | null = null;

function getOpenAI(): OpenAI | Error {
  if (openaiInstance) {
    return openaiInstance;
  }

  if (!process.env.DEEPSEEK_API_KEY) {
    openaiInstance = new Error("DEEPSEEK_API_KEY is not set");
    return openaiInstance;
  }

  openaiInstance = new OpenAI({
    baseURL: "https://api.deepseek.com",
    apiKey: process.env.DEEPSEEK_API_KEY,
  });

  return openaiInstance;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function downloadCloudinaryContent(
  cloudinaryUrl: string,
): Promise<string> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);

  try {
    const response = await fetch(cloudinaryUrl, {
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    return await response.text();
  } catch (error) {
    clearTimeout(timeout);
    throw error;
  }
}

function formatContextFromData(data: any): string {
  if (!data) return "No data available";

  // Handle URL->description object format (from website scrape)
  if (typeof data === "object" && !Array.isArray(data)) {
    const sections: string[] = [];

    // Extract website pages
    const urlKeys = Object.keys(data).filter((key) => key.startsWith("http"));
    if (urlKeys.length > 0) {
      sections.push("=== WEBSITE CONTENT ===");
      sections.push(
        urlKeys.map((url) => `Page: ${url}\nInfo: ${data[url]}`).join("\n\n"),
      );
    }

    // Extract file uploads
    const fileKeys = Object.keys(data).filter((key) => key.startsWith("file_"));
    if (fileKeys.length > 0) {
      sections.push("=== UPLOADED DOCUMENTS ===");
      for (const key of fileKeys) {
        const fileData = data[key];
        sections.push(`Document: ${fileData.name || key}`);
        sections.push(`Content: ${fileData.content || "No content preview"}`);
        sections.push("");
      }
    }

    return sections.join("\n\n");
  }

  // Handle array of pages format
  if (Array.isArray(data)) {
    return data
      .map(
        (page: any) =>
          `URL: ${page.url}\nTitle: ${page.title || "N/A"}\nDescription: ${
            page.description || "N/A"
          }\nContent: ${(page.content || "").substring(0, 200)}...`,
      )
      .join("\n\n");
  }

  // Handle plain string data
  return String(data).substring(0, 4000);
}

async function getFAQContext(
  clerkId: string,
  chatbotType: string,
): Promise<string> {
  try {
    const faqData = await WebFaq.findOne({ clerkId, chatbotType });
    if (!faqData || !faqData.questions || faqData.questions.length === 0) {
      return "";
    }

    const faqContext = faqData.questions
      .map(
        (q) =>
          `Q: ${q.question}\nA: ${q.answer}\nCategory: ${q.category || "General"}`,
      )
      .join("\n\n");

    return `\n=== FAQ KNOWLEDGE BASE ===\n${faqContext}\n`;
  } catch (error) {
    console.error("Failed to fetch FAQ:", error);
    return "";
  }
}

// ─── Lead generation / general chatbot ───────────────────────────────────────

export const generateGptResponse = async ({
  userInput,
  userfileName,
  conversationHistory = [],
  clerkId,
  chatbotType,
}: {
  userInput: string;
  userfileName: string;
  conversationHistory?: ConvMessage[];
  clerkId?: string;
  chatbotType?: string;
}) => {
  const openai = getOpenAI();
  if (openai instanceof Error) {
    throw openai;
  }

  try {
    await connectToDatabase();

    let context = "No knowledge base data available.";

    // Fetch website/scraped data
    if (userfileName) {
      try {
        const cloudinaryContent = await downloadCloudinaryContent(userfileName);
        const parsedData = JSON.parse(cloudinaryContent);
        context = formatContextFromData(parsedData);
      } catch (error) {
        console.error("Failed to load Cloudinary data:", error);
        context = "Website data is temporarily unavailable.";
      }
    }

    // Fetch FAQ data for additional context
    let faqContext = "";
    if (clerkId && chatbotType) {
      faqContext = await getFAQContext(clerkId, chatbotType);
    }

    const fullContext = context + faqContext;

    // Sanitise history
    const sanitisedHistory: ConvMessage[] = Array.isArray(conversationHistory)
      ? conversationHistory
          .filter(
            (m) =>
              m &&
              typeof m.role === "string" &&
              typeof m.content === "string" &&
              (m.role === "user" || m.role === "assistant") &&
              m.content.trim().length > 0,
          )
          .slice(-20)
      : [];

    const completion = await openai.chat.completions.create({
      model: "deepseek-chat",
      messages: [
        {
          role: "system",
          content: `You are a helpful customer support assistant. Use the following knowledge base to answer questions accurately. If you cannot find the answer in the knowledge base, politely say you don't have that information and suggest checking the website or contacting support.

Knowledge Base:
${fullContext}

Guidelines:
- Keep responses to 2-3 lines when possible
- Be friendly and helpful
- Use the provided context only
- If asked about appointments, guide the user to the appointment tab
- If asked about pricing or services, provide information from the knowledge base`,
        },
        ...sanitisedHistory.map((m) => ({
          role: m.role as "user" | "assistant",
          content: m.content,
        })),
        { role: "user", content: userInput },
      ],
      max_tokens: 500,
      temperature: 0.7,
    });

    const response = completion.choices[0]?.message?.content ?? "";

    const usage = completion.usage ?? {
      prompt_tokens: 0,
      completion_tokens: 0,
      total_tokens: 0,
    };

    return {
      response,
      tokens: usage.total_tokens,
    };
  } catch (error) {
    console.error("Error in generateGptResponse:", error);
    throw new Error(
      `Failed to generate response: ${
        error instanceof Error ? error.message : "Unknown error"
      }`,
    );
  }
};

// ─── MCQ / Education chatbot (unchanged) ──────────────────────────────────────

export const generateMcqResponse = async ({
  userInput,
  isMCQRequest,
}: {
  userInput: string;
  isMCQRequest: boolean;
}) => {
  const openai = getOpenAI();
  if (openai instanceof Error) {
    throw openai;
  }

  const systemMessage = isMCQRequest
    ? `Generate 10 MCQs in JSON format.Must follow below structure also dont provide any heading and json word text:
    {
      "questions": [
        {
          "question": "text",
          "options": ["A", "B", "C", "D"],
          "correctAnswer": 0,
          "explanation": "text",
        }
      ]
    }`
    : "You are an AI assistant.Your work is to give satified answer of there question in plain text format";

  const completion = await openai.chat.completions.create({
    model: "deepseek-chat",
    messages: [
      { role: "system", content: systemMessage },
      { role: "user", content: userInput },
    ],
  });

  const content = completion.choices[0]?.message?.content ?? "";

  const usage = completion.usage ?? {
    prompt_tokens: 0,
    completion_tokens: 0,
    total_tokens: 0,
  };

  return {
    content,
    tokens: usage.total_tokens,
  };
};
