// controllers/cron/followup.controller.ts
import { Request, Response } from "express";
import { processFollowUpDMs } from "@/services/automation/followup-processor.service";

export const followupCronController = async (req: Request, res: Response) => {
  try {
    // Verify cron secret to prevent unauthorized calls
    const cronSecret = req.headers["x-cron-secret"] as string;
    const expectedSecret = process.env.CRON_SECRET;

    if (!expectedSecret) {
      console.error("CRON_SECRET not configured");
      return res.status(500).json({
        success: false,
        error: "Cron configuration error",
        timestamp: new Date().toISOString(),
      });
    }

    if (cronSecret !== expectedSecret) {
      return res.status(401).json({
        success: false,
        error: "Unauthorized",
        timestamp: new Date().toISOString(),
      });
    }

    const results = await processFollowUpDMs();

    return res.status(200).json({
      success: true,
      ...results,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error("Cron follow-up error:", error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
      timestamp: new Date().toISOString(),
    });
  }
};
