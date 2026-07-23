// controllers/cron/followup.controller.ts
import { Request, Response } from "express";
import { processFollowUpDMs } from "@/services/automation/followup-processor.service";
import { processWhatsAppFollowUps } from "@/services/whatsapp/whatsapp.service";

export const followupCronController = async (req: Request, res: Response) => {
  try {
    const [instagram, whatsapp] = await Promise.all([
      processFollowUpDMs(),
      processWhatsAppFollowUps(),
    ]);

    return res.status(200).json({
      success: true,
      instagram,
      whatsapp,
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
