import { getUserTokenPurchases } from "@/services/token.service";
import { getAuth } from "@clerk/express";
import { Request, Response } from "express";

// GET /api/tokens/purchase-history - Get user's token purchase history
export const getTokenPurchasesController = async (
  req: Request,
  res: Response,
) => {
  try {
    // Get userId from auth headers
    const { userId } = getAuth(req);

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: "Unauthorized",
        timestamp: new Date().toISOString(),
      });
    }

    const purchases = await getUserTokenPurchases(userId);

    // Format purchase data for response
    const formattedPurchases = purchases.map((purchase: any) => ({
      id: purchase._id,
      tokensPurchased: purchase.tokensPurchased,
      amount: purchase.amount,
      currency: purchase.currency,
      razorpayOrderId: purchase.razorpayOrderId,
      status: purchase.status || "completed",
      isOneTime: purchase.isOneTime || true,
      createdAt: purchase.createdAt,
      updatedAt: purchase.updatedAt,
    }));

    return res.status(200).json({
      success: true,
      data: {
        purchase: formattedPurchases,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error fetching purchases:", error);
    return res.status(500).json({
      success: false,
      error: "Internal server error",
      timestamp: new Date().toISOString(),
    });
  }
};
