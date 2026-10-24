import type { Request, Response } from "express";
import {
  backfillLegacyAgencyTrials,
  expireAgencyFreeTrials,
} from "@/services/tenant/agency-trial.service";

export const expireAgencyTrialsController = async (
  _req: Request,
  res: Response,
) => {
  try {
    const backfilled = await backfillLegacyAgencyTrials();
    const result = await expireAgencyFreeTrials();
    return res.status(200).json({
      success: true,
      data: { backfilled, ...result },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Agency trial expiration failed:", error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Agency trial expiration failed",
      timestamp: new Date().toISOString(),
    });
  }
};
