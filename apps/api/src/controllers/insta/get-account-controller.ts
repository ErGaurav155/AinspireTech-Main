import { Request, Response } from "express";
import { connectToDatabase } from "@/config/database.config";
import InstagramAccount from "@/models/insta/InstagramAccount.model";
import { getAuth } from "@clerk/express";

// GET /api/insta/getAccount - Simple version (for backward compatibility)
export const getInstaAccountsController = async (
  req: Request,
  res: Response,
) => {
  try {
    const { userId } = getAuth(req);

    if (!userId) {
      return res.status(400).json({
        success: false,
        error: "User ID is required",
        timestamp: new Date().toISOString(),
      });
    }

    await connectToDatabase();

    const accounts = await InstagramAccount.find({ userId: userId }).sort({
      createdAt: -1,
    });

    if (!accounts || accounts.length === 0) {
      return res.status(200).json({
        success: true,
        error: "No Instagram accounts found",
        data: { accounts: [] },
        timestamp: new Date().toISOString(),
      });
    }

    return res.status(200).json({
      success: true,
      data: {
        accounts,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error("Error fetching Instagram accounts:", error);
    return res.status(500).json({
      success: false,
      error: "Failed to fetch Instagram accounts",
      details: error.message,
      timestamp: new Date().toISOString(),
    });
  }
};
