import { connectToDatabase } from "@/config/database.config";
import OpenAI from "openai";

// Cache for OpenAI instance
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

async function downloadCloudinaryContent(
  cloudinaryUrl: string,
): Promise<string> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000); // 10 second timeout

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

  // Handle URL->description object format
  if (typeof data === "object" && !Array.isArray(data)) {
    const urlKeys = Object.keys(data).filter((key) => key.startsWith("http"));
    if (urlKeys.length > 0) {
      return urlKeys
        .map((url) => `Page: ${url}\nInfo: ${data[url]}`)
        .join("\n\n");
    }
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

  // Handle string data
  return String(data).substring(0, 4000); // Limit context length
}

export const generateGptResponse = async ({
  userInput,
  userfileName,
}: {
  userInput: string;
  userfileName: string;
}) => {
  const openai = getOpenAI();
  if (openai instanceof Error) {
    throw openai;
  }

  try {
    await connectToDatabase();

    let context = "No website data available. Please scrape a website first.";

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

    const completion = await openai.chat.completions.create({
      model: "deepseek-chat",
      messages: [
        {
          role: "system",
          content: `You are a helpful assistant. Use this context to answer questions:\n\n${context}\n\nKeep responses to 2-3 lines and only use the provided context.`,
        },
        { role: "user", content: userInput },
      ],
      max_tokens: 300,
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
