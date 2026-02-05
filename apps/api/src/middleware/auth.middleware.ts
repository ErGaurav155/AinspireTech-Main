import { getAuth } from "@clerk/express";
import { Request, Response, NextFunction } from "express";

// Middleware to require owner access
export const requireOwner = (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const auth = getAuth(req);

    // Check if userId matches
    if (auth.userId !== process.env.OWNERID!) {
      return res.status(400).json({
        success: true,
        data: { isOwner: false },
        timestamp: new Date().toISOString(),
      });
    }

    return next();
  } catch (error) {
    console.error("Auth middleware error:", error);
    return res.status(500).json({
      success: false,
      message: "Authentication error",
      timestamp: new Date().toISOString(),
    });
  }
};
