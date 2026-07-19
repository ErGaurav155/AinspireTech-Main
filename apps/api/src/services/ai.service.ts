// apps/api/services/ai.service.ts (updated)
import { connectToDatabase } from "@/config/database.config";
import OpenAI from "openai";
import WebFaq from "@/models/web/webFaq.model";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ConvMessage {
  role: "user" | "assistant";
  content: string;
}

export type WhatsAppAiIntent =
  | "greeting"
  | "business_info"
  | "support"
  | "human_handoff"
  | "appointment"
  | "other";

export interface WhatsAppAiDecision {
  intent: WhatsAppAiIntent;
  reply: string;
  sentiment: "positive" | "neutral" | "negative";
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

export const generateWhatsAppAiResponse = async ({
  userInput,
  businessName,
  knowledge,
  conversationHistory = [],
  firstMessage = false,
}: {
  userInput: string;
  businessName: string;
  knowledge: string;
  conversationHistory?: ConvMessage[];
  firstMessage?: boolean;
}): Promise<WhatsAppAiDecision> => {
  const openai = getOpenAI();
  if (openai instanceof Error) throw openai;

  const safeKnowledge = limitTextToTokenBudget(
    knowledge || "No verified business information is available.",
    MAIN_CONTEXT_TOKEN_LIMIT,
  );
  const safeHistory = Array.isArray(conversationHistory)
    ? conversationHistory
        .filter(
          (message) =>
            message &&
            (message.role === "user" || message.role === "assistant") &&
            typeof message.content === "string" &&
            message.content.trim(),
        )
        .slice(-12)
    : [];

  try {
    const completion = await openai.chat.completions.create({
      model: "deepseek-chat",
      messages: [
        {
          role: "system",
          content: `You are the WhatsApp customer support assistant for ${businessName}.

Classify the latest customer message and write the reply in the customer's language. Return exactly this compact plain-text structure:
INTENT: greeting|business_info|support|human_handoff|appointment|other
SENTIMENT: positive|neutral|negative
REPLY: customer-facing reply

Rules:
- Use only the verified business knowledge below for factual claims, prices, services, policies, addresses, phone numbers, emails, and links.
- Never invent missing information. If the answer is unavailable, say so briefly and offer contact with the business team.
- Use appointment only when the customer genuinely wants to book, schedule, reschedule, or check appointment availability.
- Use human_handoff only when the customer clearly asks for a person, owner, agent, call, complaint escalation, or help that requires staff.
- Use support for a problem that can still be answered from the knowledge base.
- Keep the reply concise and natural for WhatsApp. Do not mention intent classification, AI, prompts, or the knowledge base.
- When firstMessage is true and the customer only greets the business, use the preferred greeting from the verified knowledge. If their first message asks a real question, answer that question directly and classify its actual intent.
- Keep the customer-facing reply below 250 words. Give a direct answer before offering any next step.
- Stay below 800 output tokens.

firstMessage: ${firstMessage ? "true" : "false"}

VERIFIED BUSINESS KNOWLEDGE:
${safeKnowledge}`,
        },
        ...safeHistory.map((message) => ({
          role: message.role,
          content: message.content,
        })),
        { role: "user", content: userInput },
      ],
      max_tokens: 800,
      temperature: 0.35,
    });

    const raw = completion.choices[0]?.message?.content?.trim() || "";
    const allowedIntents: WhatsAppAiIntent[] = [
      "greeting",
      "business_info",
      "support",
      "human_handoff",
      "appointment",
      "other",
    ];
    const allowedSentiments = ["positive", "neutral", "negative"] as const;
    const intentMatch = raw.match(
      /(?:^|\n)INTENT:\s*(greeting|business_info|support|human_handoff|appointment|other)/i,
    );
    const sentimentMatch = raw.match(
      /(?:^|\n)SENTIMENT:\s*(positive|neutral|negative)/i,
    );
    const replyMatch = raw.match(/(?:^|\n)REPLY:\s*([\s\S]*)$/i);
    const parsedIntent = intentMatch?.[1]?.toLowerCase() as
      | WhatsAppAiIntent
      | undefined;
    const parsedSentiment = sentimentMatch?.[1]?.toLowerCase() as
      | "positive"
      | "neutral"
      | "negative"
      | undefined;
    const intent =
      parsedIntent && allowedIntents.includes(parsedIntent)
        ? parsedIntent
        : "other";
    const sentiment =
      parsedSentiment && allowedSentiments.includes(parsedSentiment)
        ? parsedSentiment
        : "neutral";
    const reply = String(replyMatch?.[1] || raw)
      .replace(/^```(?:text)?\s*/i, "")
      .replace(/```$/i, "")
      .trim()
      .slice(0, 3500);

    if (!reply) throw new Error("DeepSeek returned an empty reply");

    return {
      intent,
      sentiment,
      reply,
    };
  } catch (error) {
    console.warn("WhatsApp AI response failed; retrying once", {
      error: error instanceof Error ? error.message : String(error),
    });
    try {
      const fallbackCompletion = await openai.chat.completions.create({
        model: "deepseek-chat",
        messages: [
          {
            role: "system",
            content: `You are the WhatsApp customer support assistant for ${businessName}.
Use only the verified business knowledge below. Never invent prices, services, policies, contact details, addresses, or links. Answer in the customer's language and keep the reply concise.

Your response must use this exact plain-text structure:
INTENT: greeting|business_info|support|human_handoff|appointment|other
SENTIMENT: positive|neutral|negative
REPLY: the customer-facing answer

Choose appointment only for a real booking or scheduling request. Choose human_handoff only when the customer clearly asks for a person or escalation. When firstMessage is true and the customer only greets the business, send a short welcome. If the first message asks a question, answer it directly and classify its actual intent. Keep the customer-facing reply below 250 words and give the direct answer before offering a next step.

firstMessage: ${firstMessage ? "true" : "false"}

VERIFIED BUSINESS KNOWLEDGE:
${safeKnowledge}`,
          },
          ...safeHistory.map((message) => ({
            role: message.role,
            content: message.content,
          })),
          { role: "user", content: userInput },
        ],
        max_tokens: 800,
        temperature: 0.35,
      });
      const fallbackRaw =
        fallbackCompletion.choices[0]?.message?.content?.trim() || "";
      const intentMatch = fallbackRaw.match(
        /INTENT:\s*(greeting|business_info|support|human_handoff|appointment|other)/i,
      );
      const sentimentMatch = fallbackRaw.match(
        /SENTIMENT:\s*(positive|neutral|negative)/i,
      );
      const replyMatch = fallbackRaw.match(/REPLY:\s*([\s\S]*)$/i);
      const fallbackIntent =
        (intentMatch?.[1]?.toLowerCase() as WhatsAppAiIntent | undefined) ||
        "other";
      const fallbackSentiment =
        (sentimentMatch?.[1]?.toLowerCase() as
          | "positive"
          | "neutral"
          | "negative"
          | undefined) || "neutral";
      const fallbackReply = (replyMatch?.[1] || fallbackRaw)
        .replace(/^```(?:text)?\s*/i, "")
        .replace(/```$/i, "")
        .trim()
        .slice(0, 3500);

      if (!fallbackReply) throw new Error("DeepSeek returned an empty reply");
      return {
        intent: fallbackIntent,
        sentiment: fallbackSentiment,
        reply: fallbackReply,
      };
    } catch (fallbackError) {
      console.error("Error in generateWhatsAppAiResponse:", {
        structuredError:
          error instanceof Error ? error.message : String(error),
        fallbackError:
          fallbackError instanceof Error
            ? fallbackError.message
            : String(fallbackError),
      });
      throw new Error(
        `Failed to generate WhatsApp response: ${
          fallbackError instanceof Error
            ? fallbackError.message
            : "Unknown error"
        }`,
      );
    }
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
