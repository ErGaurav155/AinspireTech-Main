import { Request, Response } from "express";
import { connectToDatabase } from "@/config/database.config";
import InstagramAccount from "@/models/insta/InstagramAccount.model";

// GET /api/admin/insta-accounts - Get all Instagram accounts
export const getInstaAccountsController = async (
  req: Request,
  res: Response,
) => {
  try {
    await connectToDatabase();

    // Get all Instagram accounts sorted by creation date (newest first)
    const accounts = await InstagramAccount.find({})
      .sort({ createdAt: -1 })
      .lean();

    return res.status(200).json({
      success: true,
      data: {
        data: accounts,
        count: accounts.length,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error fetching Instagram accounts:", error);
    return res.status(500).json({
      success: false,
      error: "Internal server error",
      timestamp: new Date().toISOString(),
    });
  }
};
