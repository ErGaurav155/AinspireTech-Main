import { connectToDatabase } from "@/config/database.config";
import Plan from "@/models/plan.model";

// Call this function once during deployment or setup
// createPlans();

export const getRazerpayPlanInfo = async (productId: string) => {
  try {
    await connectToDatabase(); // Ensure database connection

    const plan = await Plan.findOne({ productId });
    if (!plan) {
      throw new Error(`Plan with productId ${productId} not found.`);
    }
    return JSON.parse(JSON.stringify(plan));
  } catch (error: any) {
    console.error("Error retrieving plan info:", error.message);
    throw new Error("Failed to retrieve plan info.");
  }
};
