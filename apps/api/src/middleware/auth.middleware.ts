import { getAuth } from "@clerk/express";
import { Request, Response, NextFunction } from "express";
import { isAdminOwnerId } from "@/utils/admin-owner";

// Middleware to require owner access
export const requireOwner = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const auth = getAuth(req);

    // Check if userId matches
    if (!auth || !auth.userId) {
      return res.status(401).json({
        success: false,
        error: "Authentication required",
        timestamp: new Date().toISOString(),
      });
    }
    if (!isAdminOwnerId(auth.userId)) {
      return res.status(403).json({
        success: false,
        error: "Owner access required",
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
