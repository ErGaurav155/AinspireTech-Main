import type { Request, Response } from "express";
import { getAuth } from "@clerk/express";
import type { IndividualAiService } from "@/config/individual-ai-catalog.config";
import { getIndividualAiTokenSummary } from "@/services/usage/individual-ai-usage.service";

const services = new Set<IndividualAiService>([
  "website",
  "instagram",
  "whatsapp",
]);

export const getIndividualAiUsageController = async (
  req: Request,
  res: Response,
) => {
  const userId = getAuth(req).userId;
  if (!userId) {
    return res.status(401).json({
      success: false,
      error: "Authentication required",
      timestamp: new Date().toISOString(),
    });
  }
  const service = String(req.query.service || "") as IndividualAiService;
  if (!services.has(service)) {
    return res.status(400).json({
      success: false,
      error: "A valid service is required",
      timestamp: new Date().toISOString(),
    });
  }
  try {
    const summary = await getIndividualAiTokenSummary(userId, service);
    if (!summary.applicable) {
      return res.status(403).json({
        success: false,
        error: "Individual AI token access denied",
        timestamp: new Date().toISOString(),
      });
    }
    return res.status(200).json({
      success: true,
      data: summary,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Unable to load individual AI usage:", error);
    return res.status(500).json({
      success: false,
      error: "Unable to load AI token usage",
      timestamp: new Date().toISOString(),
    });
  }
};
