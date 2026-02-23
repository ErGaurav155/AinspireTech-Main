import { getAuth } from "@clerk/express";
import { Request, Response, NextFunction } from "express";
import { createClerkClient } from "@clerk/backend";

// Middleware to require owner access
export const requireOwner = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const clerkClient = createClerkClient({
      secretKey: process.env.CLERK_SECRET_KEY!,
    });
    const auth = getAuth(req);

    // Check if userId matches
    if (!auth || !auth.userId) {
      return res.status(400).json({
        success: true,
        data: { isOwner: false },
        timestamp: new Date().toISOString(),
      });
    }
    const user = await clerkClient.users.getUser(auth.userId);

    const email = user.emailAddresses.find(
      (e) => e.id === user.primaryEmailAddressId,
    )?.emailAddress;
    if (email !== "gauravgkhaire155@gmail.com") {
      return res.status(200).json({
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
