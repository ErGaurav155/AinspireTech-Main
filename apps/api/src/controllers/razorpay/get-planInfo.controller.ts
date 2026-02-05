import { Request, Response } from "express";
import { connectToDatabase } from "@/config/database.config";
import Plan from "@/models/plan.model";

// GET /api/misc/razerpay-plan/:productId - Get Razorpay plan info
export const getRazerpayPlanInfoController = async (
  req: Request,
  res: Response,
) => {
  try {
    const { productId } = req.params;

    if (!productId) {
      return res.status(400).json({
        success: false,
        error: "productId is required",
        timestamp: new Date().toISOString(),
      });
    }

    await connectToDatabase();

    const plan = await Plan.findOne({ productId });
    if (!plan) {
      return res.status(404).json({
        success: false,
        error: `Plan with productId ${productId} not found`,
        timestamp: new Date().toISOString(),
      });
    }

    return res.status(200).json({
      success: true,
      data: plan,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error("Error retrieving plan info:", error.message);
    return res.status(500).json({
      success: false,
      error: error.message || "Failed to retrieve plan info",
      timestamp: new Date().toISOString(),
    });
  }
};
