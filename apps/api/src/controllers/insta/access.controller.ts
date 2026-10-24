import { getAuth } from "@clerk/express";
import type { Request, Response } from "express";
import { getEffectiveInstagramAccess } from "@/services/billing/instagram-access.service";

export const getInstagramAccessController = async (req: Request, res: Response) => {
  const userId = getAuth(req).userId;
  if (!userId) {
    return res.status(401).json({
      success: false,
      error: "Authentication required",
      timestamp: new Date().toISOString(),
    });
  }
  try {
    const access = await getEffectiveInstagramAccess(userId);
    return res.status(200).json({
      success: true,
      data: access,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Unable to resolve Instagram access:", error);
    return res.status(500).json({
      success: false,
      error: "Unable to resolve Instagram access",
      timestamp: new Date().toISOString(),
    });
  }
};
