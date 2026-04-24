import { Request, Response } from "express";
import { connectToDatabase } from "@/config/database.config";
import WebChatbot from "@/models/web/WebChatbot.model";
import { uploadTextToCloudinary } from "@/services/transaction.service";

interface ScrapedPage {
  url: string;
  title: string;
  description: string;
  headings: {
    h1: string[];
    h2: string[];
    h3: string[];
    h4?: string[];
    h5?: string[];
    h6?: string[];
  };
  content: string;
  fullText?: string;
  level: number;
  wordCount?: number;
  textLength?: number;
}

// Helper function to sanitize text for OpenAI
function sanitizeForOpenAI(text: string): string {
  if (!text) return "";

  return text
    .replace(/[\u{1F600}-\u{1F64F}]/gu, "")
    .replace(/[\u{1F300}-\u{1F5FF}]/gu, "")
    .replace(/[\u{1F680}-\u{1F6FF}]/gu, "")
    .replace(/[\u{1F1E0}-\u{1F1FF}]/gu, "")
    .replace(/[\u{2700}-\u{27BF}]/gu, "")
    .replace(/[\u{1F900}-\u{1F9FF}]/gu, "")
    .replace(/[^\x20-\x7E\n\t\r]/g, "")
    .replace(/�/g, "")
    .replace(/\\[^nrt"\\\/]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

// Helper function to format scraped data
function formatScrapedData(pages: ScrapedPage[]): string {
  const formattedPages = pages.map((page) => {
    const textBody = sanitizeForOpenAI(page.fullText || page.content || "");
    const content = textBody.length > 20000 ? textBody.slice(0, 20000) : textBody;

    return {
      url: page.url,
      title: sanitizeForOpenAI(page.title || ""),
      description: sanitizeForOpenAI(page.description || ""),
      level: page.level,
      headings: {
        h1: page.headings.h1 || [],
        h2: page.headings.h2 || [],
        h3: page.headings.h3 || [],
        h4: page.headings.h4 || [],
        h5: page.headings.h5 || [],
        h6: page.headings.h6 || [],
      },
      wordCount: page.wordCount || content.split(/\s+/).filter(Boolean).length,
      textLength: page.textLength || content.length,
      content,
    };
  });

  return JSON.stringify(
    {
      generatedAt: new Date().toISOString(),
      pageCount: formattedPages.length,
      pages: formattedPages,
    },
    null,
    2,
  );
}

// POST /api/scrape/anu/process-data - Process scraped data
export const processScrapedDataController = async (
  req: Request,
  res: Response,
) => {
  try {
    await connectToDatabase();

    const { fileName, domain, userId, chatbotId, scrapedPages } = req.body;

    if (!fileName || !domain || !userId || !chatbotId || !scrapedPages) {
      return res.status(400).json({
        success: false,
        error: "Missing required fields",
        timestamp: new Date().toISOString(),
      });
    }

    const chatbot = await WebChatbot.findOne({
      _id: chatbotId,
      clerkId: userId,
    });

    if (!chatbot) {
      return res.status(404).json({
        success: false,
        error: "Chatbot not found",
        timestamp: new Date().toISOString(),
      });
    }

    const formattedData = formatScrapedData(scrapedPages);

    // Upload to Cloudinary
    const cloudinaryUrl = await uploadTextToCloudinary(formattedData, fileName);

    // Update chatbot with scraped data
    await WebChatbot.updateOne(
      { _id: chatbotId, clerkId: userId },
      {
        $set: {
          scrappedFile: cloudinaryUrl,
          isScrapped: true,
          updatedAt: new Date(),
        },
      },
    );

    return res.status(200).json({
      success: true,
      data: {
        success: true,
        domain,
        cloudinaryLink: cloudinaryUrl,
        message: "Data processed and chatbot updated successfully",
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Data processing error:", error);
    return res.status(500).json({
      success: false,
      error: "An error occurred while processing the data.",
      timestamp: new Date().toISOString(),
    });
  }
};
