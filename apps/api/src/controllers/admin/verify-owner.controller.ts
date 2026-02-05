import { getAuth } from "@clerk/express";
import { Request, Response } from "express";

// GET /api/user/verify-owner - Verify if user is owner
export const verifyOwnerController = async (req: Request, res: Response) => {
  try {
    const auth = getAuth(req);
    if (auth.userId !== process.env.OWNERID!) {
      return res.status(200).json({
        success: true,
        data: { isOwner: false },
        timestamp: new Date().toISOString(),
      });
    }

    return res.status(200).json({
      success: true,
      data: { isOwner: true },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error verifying owner:", error);
    return res.status(500).json({
      success: false,
      error: "Internal server error",
      timestamp: new Date().toISOString(),
    });
  }
};
