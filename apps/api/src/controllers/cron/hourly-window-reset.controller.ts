import { Request, Response } from "express";
import { connectToDatabase } from "@/config/database.config";
import { resetHourlyWindow } from "@/services/rate-limit.service";

export const hourlyWindowResetController = async (
  req: Request,
  res: Response,
) => {
  try {
    // Verify cron job secret for security
    const cronSecret = req.headers["x-cron-secret"];
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
