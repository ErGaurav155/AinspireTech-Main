import { Request, Response } from "express";
import { connectToDatabase } from "@/config/database.config";
import WebChatbot from "@/models/web/WebChatbot.model";
import { uploadTextToCloudinary } from "@/services/transaction.service";

interface ScrapedPage {
  url: string;
  content: string;
  fullText?: string;
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
export function formatScrapedData(pages: ScrapedPage[]): string {
  const formattedPages = pages.map((page) => {
    const textBody = sanitizeForOpenAI(page.fullText || page.content || "");
    const limit = isHomePageUrl(page.url) ? 2000 : 1000;
    const content = textBody.length > limit ? textBody.slice(0, limit) : textBody;

    return {
      url: page.url,
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

function isHomePageUrl(url: string): boolean {
  try {
    const pathname = new URL(url).pathname
      .replace(/\/index\.(html?|php|aspx?)$/i, "")
      .replace(/\/+$/, "")
      .toLowerCase();

    return !pathname || pathname === "/home";
  } catch {
    return false;
  }
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
