import { Request, Response } from "express";
import { connectToDatabase } from "@/config/database.config";
import WhatsAppWorkspace from "@/models/whatsapp/WhatsAppWorkspace.model";

const MONTH_IN_MS = 30 * 24 * 60 * 60 * 1000;

// GET /api/cron/web-token - Reset monthly WhatsApp message usage.
// AI token allowances use UTC period keys and require no refill cron.
export const resetWebTokensController = async (req: Request, res: Response) => {
  try {
    await connectToDatabase();

    const now = new Date();
    const whatsappWorkspacesToReset = await WhatsAppWorkspace.find({
      $or: [
        { "subscription.nextMessageResetAt": { $lte: now } },
        { "subscription.nextMessageResetAt": { $exists: false } },
      ],
    });
    let whatsappResetCount = 0;

    for (const workspace of whatsappWorkspacesToReset) {
      try {
        const isPaidPlan = ["launch", "package"].includes(
          workspace.subscription.plan,
        );
        workspace.subscription.messageLimit = isPaidPlan ? 10000 : 10;
        workspace.subscription.messagesUsed = 0;
        workspace.subscription.lastMessageResetAt = now;
        workspace.subscription.nextMessageResetAt = new Date(
          now.getTime() + MONTH_IN_MS,
        );
        await workspace.save();
        whatsappResetCount++;
      } catch (error) {
        console.error(
          `Error resetting WhatsApp messages for workspace ${workspace._id}:`,
          error,
        );
      }
    }

    return res.status(200).json({
      success: true,
      data: {
        message: `Reset WhatsApp message usage for ${whatsappResetCount} workspaces`,
        whatsappResetCount,
      },
      timestamp: now.toISOString(),
    });
  } catch (error) {
    console.error("Cron job error:", error);
    return res.status(500).json({
      success: false,
      error: "Internal server error",
      timestamp: new Date().toISOString(),
    });
  }
};
