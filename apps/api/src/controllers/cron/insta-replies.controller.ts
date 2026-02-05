import { Request, Response } from "express";
import { connectToDatabase } from "@/config/database.config";
import User from "@/models/user.model";

// Helper function to reset free replies
const resetFreeRepliesForAllUsers = async (): Promise<number> => {
  try {
    await connectToDatabase();

    const twentyEightDaysAgo = new Date();
    twentyEightDaysAgo.setDate(twentyEightDaysAgo.getDate() - 28);

    // Single update for efficiency
    const result = await User.updateMany(
      {
        updatedAt: { $lte: twentyEightDaysAgo },
        $or: [
          { totalReplies: { $gt: 0 } },
          { totalReplies: { $exists: true } },
        ],
      },
      {
        $set: {
          totalReplies: 0,
          updatedAt: new Date(),
        },
      },
    );

    const processedCount = result.modifiedCount || 0;
    console.log(`Total free replies reset for ${processedCount} users`);
    return processedCount;
  } catch (error) {
    console.error("Error resetting free replies:", error);
    throw error;
  }
};
// GET /api/cron/insta-replies - Reset free replies for all users
export const resetInstaRepliesController = async (
  req: Request,
  res: Response,
) => {
  // Check API key
  const cronKey = req.headers["x-cron-key"] as string;

  if (!cronKey || cronKey !== process.env.CRON_SECRET) {
    return res.status(401).json({
      error: "Unauthorized: Invalid cron key",
      timestamp: new Date().toISOString(),
    });
  }
  try {
    const resetCount = await resetFreeRepliesForAllUsers();
    return res.status(200).json({
      success: true,
      message: `Free replies reset for ${resetCount} users`,
      resetCount,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Cron job error:", error);
    return res.status(500).json({
      success: false,
      error: "Failed to reset free replies",
      timestamp: new Date().toISOString(),
    });
  }
};
