// apps/api/services/ai.service.ts (updated)
import { connectToDatabase } from "@/config/database.config";
import OpenAI from "openai";
import WebFaq from "@/models/web/webFaq.model";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ConvMessage {
  role: "user" | "assistant";
  content: string;
}

const APPROX_CHARS_PER_TOKEN = 4;
const MAIN_CONTEXT_TOKEN_LIMIT = 3000;
const FAQ_CONTEXT_TOKEN_LIMIT = 1000;
const FULL_CONTEXT_TOKEN_LIMIT = 4000;

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

  // Handle current structured scrape format
  if (
    typeof data === "object" &&
    !Array.isArray(data) &&
    Array.isArray(data.pages)
  ) {
    const pages = data.pages
      .filter((page: any) => page && typeof page === "object")
      .map((page: any) => {
        return [
          `Page: ${page.url || "Unknown URL"}`,
          `Content: ${page.content || page.fullText || "No content available"}`,
        ]
          .filter(Boolean)
          .join("\n");
      });

    if (pages.length > 0) {
      return `=== WEBSITE CONTENT ===\n${pages.join("\n\n")}`;
    }
  }

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

    return sections.length > 0 ? sections.join("\n\n") : "No data available";
  }

  // Handle array of pages format
  if (Array.isArray(data)) {
    return data
      .map(
        (page: any) =>
          `URL: ${page.url}\nContent: ${(page.content || page.fullText || "").substring(0, 1000)}`,
      )
      .join("\n\n");
  }

  // Handle plain string data
  return String(data).substring(0, 4000);
}

function limitTextToTokenBudget(text: string, tokenLimit: number): string {
  const maxChars = tokenLimit * APPROX_CHARS_PER_TOKEN;
  if (!text || text.length <= maxChars) return text;

  return text.slice(0, maxChars).trimEnd();
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

    return limitTextToTokenBudget(
      `\n=== FAQ KNOWLEDGE BASE ===\n${faqContext}\n`,
      FAQ_CONTEXT_TOKEN_LIMIT,
    );
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
        context = limitTextToTokenBudget(
          formatContextFromData(parsedData),
          MAIN_CONTEXT_TOKEN_LIMIT,
        );
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

    const fullContext = limitTextToTokenBudget(
      context + faqContext,
      FULL_CONTEXT_TOKEN_LIMIT,
    );

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
      max_tokens: 800,
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
  conversationHistory = [],
}: {
  userInput: string;
  isMCQRequest: boolean;
  conversationHistory?: ConvMessage[];
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
      { role: "system", content: systemMessage },
      ...sanitisedHistory.map((m) => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      })),
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
