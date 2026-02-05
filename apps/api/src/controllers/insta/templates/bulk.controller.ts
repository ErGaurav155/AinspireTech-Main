import { Request, Response } from "express";
import { connectToDatabase } from "@/config/database.config";
import ReplyTemplate from "@/models/insta/ReplyTemplate.model";

// POST /api/insta/templates/bulk - Bulk template actions
export const bulkTemplateActionController = async (
  req: Request,
  res: Response,
) => {
  try {
    await connectToDatabase();

    const { action, templateIds, accountId } = req.body;

    if (!action || !templateIds || !Array.isArray(templateIds)) {
      return res.status(400).json({
        success: false,
        error: "Action and template IDs are required",
        timestamp: new Date().toISOString(),
      });
    }

    let result;
    let message = "";

    switch (action) {
      case "activate":
        result = await ReplyTemplate.updateMany(
          { _id: { $in: templateIds } },
          { isActive: true, updatedAt: new Date() },
        );
        message = `Successfully activated ${result.modifiedCount} templates`;
        break;

      case "deactivate":
        result = await ReplyTemplate.updateMany(
          { _id: { $in: templateIds } },
          { isActive: false, updatedAt: new Date() },
        );
        message = `Successfully deactivated ${result.modifiedCount} templates`;
        break;

      case "delete":
        result = await ReplyTemplate.deleteMany({
          _id: { $in: templateIds },
        });
        message = `Successfully deleted ${result.deletedCount} templates`;
        break;

      default:
        return res.status(400).json({
          success: false,
          error: "Invalid action. Valid actions: activate, deactivate, delete",
        });
    }

    return res.status(200).json({
      success: true,
      message,
      affected: result,
    });
  } catch (error) {
    console.error("Error performing bulk action:", error);
    return res.status(500).json({
      success: false,
      error: "Failed to perform bulk action",
    });
  }
};
