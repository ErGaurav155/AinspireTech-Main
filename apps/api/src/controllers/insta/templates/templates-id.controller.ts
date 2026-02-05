import { Request, Response } from "express";
import { connectToDatabase } from "@/config/database.config";
import ReplyTemplate from "@/models/insta/ReplyTemplate.model";
import { getAuth } from "@clerk/express";

// GET /api/insta/templates/:templateId - Get single template by ID
export const getInstaTemplateByIdController = async (
  req: Request,
  res: Response,
) => {
  try {
    await connectToDatabase();

    const { userId } = getAuth(req);
    const { templateId } = req.params;

    if (!userId) {
      return res.status(400).json({
        success: false,
        error: "User ID is required",
        timestamp: new Date().toISOString(),
      });
    }

    const template = await ReplyTemplate.findOne({
      _id: templateId,
      userId: userId,
    });

    if (!template) {
      return res.status(404).json({
        success: false,
        error: "Template not found",
        timestamp: new Date().toISOString(),
      });
    }

    return res.status(200).json({
      success: true,
      data: { template },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error fetching template:", error);
    return res.status(500).json({
      success: false,
      error: "Failed to fetch template",
      timestamp: new Date().toISOString(),
    });
  }
};

// PUT /api/insta/templates/:templateId - Update Instagram template
export const updateInstaTemplateController = async (
  req: Request,
  res: Response,
) => {
  try {
    await connectToDatabase();
    const { userId } = getAuth(req);
    const { templateId } = req.params;
    const updateData = req.body;

    if (!userId) {
      return res.status(400).json({
        success: false,
        error: "User ID is required",
        timestamp: new Date().toISOString(),
      });
    }

    // Check if template exists and user owns it
    const existingTemplate = await ReplyTemplate.findOne({
      _id: templateId,
      userId: userId,
    });

    if (!existingTemplate) {
      return res.status(404).json({
        success: false,
        error: "Template not found",
        timestamp: new Date().toISOString(),
      });
    }

    // Prepare update data
    const updateFields: any = {
      updatedAt: new Date(),
    };

    // Update allowed fields
    if (updateData.name !== undefined)
      updateFields.name = updateData.name.trim();
    if (updateData.description !== undefined)
      updateFields.description = updateData.description?.trim();
    if (updateData.isActive !== undefined)
      updateFields.isActive = updateData.isActive;
    if (updateData.priority !== undefined)
      updateFields.priority = updateData.priority;
    if (updateData.replyProbability !== undefined)
      updateFields.replyProbability = Math.min(
        100,
        Math.max(0, updateData.replyProbability),
      );

    if (
      updateData.replyTexts !== undefined &&
      Array.isArray(updateData.replyTexts)
    ) {
      updateFields.replyTexts = updateData.replyTexts.map((r: string) =>
        r.trim(),
      );
    }

    if (updateData.triggers !== undefined) {
      if (Array.isArray(updateData.triggers)) {
        updateFields.triggers = updateData.triggers.map((t: string) =>
          t.trim().toLowerCase(),
        );
      } else if (typeof updateData.triggers === "string") {
        updateFields.triggers = updateData.triggers
          .split(",")
          .map((t: string) => t.trim().toLowerCase());
      }
    }

    if (updateData.triggerType !== undefined)
      updateFields.triggerType = updateData.triggerType;
    if (updateData.caseSensitive !== undefined)
      updateFields.caseSensitive = updateData.caseSensitive;
    if (updateData.excludeOwnComments !== undefined)
      updateFields.excludeOwnComments = updateData.excludeOwnComments;
    if (updateData.excludeRepliedUsers !== undefined)
      updateFields.excludeRepliedUsers = updateData.excludeRepliedUsers;

    if (
      updateData.excludeKeywords !== undefined &&
      Array.isArray(updateData.excludeKeywords)
    ) {
      updateFields.excludeKeywords = updateData.excludeKeywords.map(
        (k: string) => k.trim().toLowerCase(),
      );
    }

    // Update the template
    const updatedTemplate = await ReplyTemplate.findByIdAndUpdate(
      templateId,
      updateFields,
      { new: true, runValidators: true },
    );

    return res.status(200).json({
      success: true,
      data: {
        success: true,
        template: updatedTemplate,
        message: "Template updated successfully",
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error("Error updating template:", error);
    return res.status(500).json({
      success: false,
      error: error.message || "Failed to update template",
      timestamp: new Date().toISOString(),
    });
  }
};

// DELETE /api/insta/templates/:templateId - Delete Instagram template
export const deleteInstaTemplateController = async (
  req: Request,
  res: Response,
) => {
  try {
    await connectToDatabase();
    const { userId } = getAuth(req);
    const { templateId } = req.params;

    if (!userId) {
      return res.status(400).json({
        success: false,
        error: "User ID is required",
        timestamp: new Date().toISOString(),
      });
    }

    // Check if template exists and user owns it
    const template = await ReplyTemplate.findOne({
      _id: templateId,
      userId: userId,
    });

    if (!template) {
      return res.status(404).json({
        success: false,
        error: "Template not found",
        timestamp: new Date().toISOString(),
      });
    }

    // Delete the template
    await ReplyTemplate.findByIdAndDelete(templateId);

    return res.status(200).json({
      success: true,
      data: {
        message: "Template deleted successfully",
        deletedTemplate: {
          _id: template._id,
          name: template.name,
          mediaId: template.mediaId,
        },
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error deleting template:", error);
    return res.status(500).json({
      success: false,
      error: "Failed to delete template",
      timestamp: new Date().toISOString(),
    });
  }
};
