import { getAuth } from "@clerk/express";
import { Request, Response } from "express";
import { createClerkClient } from "@clerk/backend";

// GET /api/user/verify-owner - Verify if user is owner
export const verifyOwnerController = async (req: Request, res: Response) => {
  try {
    const clerkClient = createClerkClient({
      secretKey: process.env.CLERK_SECRET_KEY!,
    });
    const auth = getAuth(req);
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
