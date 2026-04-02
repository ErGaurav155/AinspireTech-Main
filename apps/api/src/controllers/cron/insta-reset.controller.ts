import { Request, Response } from "express";
import { connectToDatabase } from "@/config/database.config";
import InstagramAccount from "@/models/insta/InstagramAccount.model";

// GET /api/cron/insta - Reset Insta Info for users
export const resetInstaController = async (req: Request, res: Response) => {
  try {
    // Check API key
    const cronKey = req.headers["x-cron-key"] as string;

    if (!cronKey || cronKey !== process.env.CRON_SECRET) {
      return res.status(401).json({
        success: false,
        error: "Unauthorized: Invalid cron key",
        timestamp: new Date().toISOString(),
      });
    }

    await connectToDatabase();

    const now = new Date();
    const usersToReset = await InstagramAccount.find({
      nextResetAt: { $lte: now },
    });

    let resetCount = 0;

    for (const InstaAccount of usersToReset) {
      try {
        // Reset tokens logic
        InstaAccount.accountReply = 0;
        InstaAccount.accountFollowCheck = 0;
        InstaAccount.accountDMSent = 0;
        InstaAccount.lastResetAt = new Date(Date.now());
        InstaAccount.nextResetAt = new Date(
          Date.now() + 30 * 24 * 60 * 60 * 1000,
        ); // Reset in 30 days
        await InstaAccount.save();
        resetCount++;
      } catch (error) {
        console.error(
          `Error resetting InstaAccount for user ${InstaAccount.userId}:`,
          error,
        );
      }
    }

    return res.status(200).json({
      success: true,
      data: {
        message: `Reset Insta Info for ${resetCount} users`,
        resetCount,
      },
      timestamp: now.toISOString(),
    });
  } catch (error) {
    console.error("Cron job error:", error);
    return res.status(500).json({
      success: false,
      error: "Internal server error",
      timestamp: new Date().toISOString(),
    });
  }
};
