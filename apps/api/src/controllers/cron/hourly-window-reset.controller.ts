// apps/api/controllers/cron/hourly-window-reset.controller.ts
import { Request, Response } from "express";
import { connectToDatabase } from "@/config/database.config";
import { resetHourlyWindow } from "@/services/rate-limit.service";

export const hourlyWindowResetController = async (
  req: Request,
  res: Response,
) => {
  try {
    // Authentication is handled by middleware
    // No need to check secret here anymore

    await connectToDatabase();

    console.log(
      `🕐 Cron job triggered: Hourly window reset at ${new Date().toISOString()}`,
    );

    const result = await resetHourlyWindow();

    return res.status(200).json({
      success: true,
      data: result,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error("Hourly window reset cron error:", error);
    return res.status(500).json({
      success: false,
      error: error.message || "Failed to reset hourly window",
      timestamp: new Date().toISOString(),
    });
  }
};
