import { Request, Response } from "express";
import { connectToDatabase } from "@/config/database.config";
import { getAuth } from "@clerk/express";
import InstaReplyTemplate from "@/models/insta/ReplyTemplate.model";

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

    const template = await InstaReplyTemplate.findOne({
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
    const existingTemplate = await InstaReplyTemplate.findOne({
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

    // ── Basic Fields ────────────────────────────────────────────────────────────

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

    // ── Media Fields ────────────────────────────────────────────────────────────

    if (updateData.mediaId !== undefined)
      updateFields.mediaId = updateData.mediaId;
    if (updateData.mediaUrl !== undefined)
      updateFields.mediaUrl = updateData.mediaUrl;
    if (updateData.mediaType !== undefined)
      updateFields.mediaType = updateData.mediaType;

    // ── Content & Replies ───────────────────────────────────────────────────────

    if (updateData.content !== undefined && Array.isArray(updateData.content)) {
      updateFields.content = updateData.content.map((item: any) => ({
        text: item.text?.trim() || "",
        link: item.link?.trim() || "",
        buttonTitle: item.buttonTitle?.trim() || "Get Access",
      }));
    }

    if (
      updateData.replyTexts !== undefined &&
      Array.isArray(updateData.replyTexts)
    ) {
      updateFields.reply = updateData.replyTexts.map((r: string) => r.trim());
    }

    if (updateData.reply !== undefined && Array.isArray(updateData.reply)) {
      updateFields.reply = updateData.reply.map((r: string) => r.trim());
    }

    // ── Triggers & Keywords ─────────────────────────────────────────────────────

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

    if (updateData.anyKeyword !== undefined)
      updateFields.anyKeyword = updateData.anyKeyword;
    if (updateData.triggerType !== undefined)
      updateFields.triggerType = updateData.triggerType;
    if (updateData.caseSensitive !== undefined)
      updateFields.caseSensitive = updateData.caseSensitive;
    if (updateData.excludeOwnComments !== undefined)
      updateFields.excludeOwnComments = updateData.excludeOwnComments;
    if (updateData.excludeRepliedUsers !== undefined)
      updateFields.excludeRepliedUsers = updateData.excludeRepliedUsers;

    // ── Automation Type & Post Selection ────────────────────────────────────────

    if (updateData.automationType !== undefined)
      updateFields.automationType = updateData.automationType;
    if (updateData.anyPostOrReel !== undefined)
      updateFields.anyPostOrReel = updateData.anyPostOrReel;

    // ── Timing ──────────────────────────────────────────────────────────────────

    if (updateData.delaySeconds !== undefined)
      updateFields.delaySeconds = updateData.delaySeconds;
    if (updateData.delayOption !== undefined)
      updateFields.delayOption = updateData.delayOption;

    // ── Welcome Message ─────────────────────────────────────────────────────────

    if (updateData.welcomeMessage !== undefined) {
      updateFields.welcomeMessage = {
        enabled: updateData.welcomeMessage.enabled ?? false,
        text:
          updateData.welcomeMessage.text?.trim() ||
          "Hi {{username}}! So glad you're interested 🎉",
        buttonTitle:
          updateData.welcomeMessage.buttonTitle?.trim() || "Send me the link",
      };
    }

    // ── Public Reply ────────────────────────────────────────────────────────────

    if (updateData.publicReply !== undefined) {
      updateFields.publicReply = {
        enabled: updateData.publicReply.enabled ?? false,
        replies: Array.isArray(updateData.publicReply.replies)
          ? updateData.publicReply.replies.filter(Boolean)
          : [],
        tagType: updateData.publicReply.tagType || "none",
      };
    }

    // ── Ask Follow ──────────────────────────────────────────────────────────────

    if (updateData.askFollow !== undefined) {
      updateFields.askFollow = {
        enabled: updateData.askFollow.enabled ?? false,
        message:
          updateData.askFollow.message?.trim() ||
          "Hey! It seems you haven't followed me yet",
        visitProfileBtn:
          updateData.askFollow.visitProfileBtn?.trim() || "Visit Profile",
        followingBtn:
          updateData.askFollow.followingBtn?.trim() || "I'm following ✅",
      };
    }

    // Legacy isFollow field
    if (updateData.isFollow !== undefined)
      updateFields.isFollow = updateData.isFollow;

    // ── Ask Email ───────────────────────────────────────────────────────────────

    if (updateData.askEmail !== undefined) {
      updateFields.askEmail = {
        enabled: updateData.askEmail.enabled ?? false,
        openingMessage:
          updateData.askEmail.openingMessage?.trim() ||
          "I'll need your email address first.",
        retryMessage:
          updateData.askEmail.retryMessage?.trim() ||
          "Please enter a correct email address",
        sendDmIfNoEmail: updateData.askEmail.sendDmIfNoEmail ?? true,
      };
    }

    // ── Ask Phone (NEW) ─────────────────────────────────────────────────────────

    if (updateData.askPhone !== undefined) {
      updateFields.askPhone = {
        enabled: updateData.askPhone.enabled ?? false,
        openingMessage:
          updateData.askPhone.openingMessage?.trim() ||
          "I'll need your phone number first.",
        retryMessage:
          updateData.askPhone.retryMessage?.trim() ||
          "Please enter a correct phone number",
        sendDmIfNoPhone: updateData.askPhone.sendDmIfNoPhone ?? true,
      };
    }

    // ── Follow-Up DMs ───────────────────────────────────────────────────────────

    if (updateData.followUpDMs !== undefined) {
      updateFields.followUpDMs = {
        enabled: updateData.followUpDMs.enabled ?? false,
        messages: Array.isArray(updateData.followUpDMs.messages)
          ? updateData.followUpDMs.messages.map((msg: any) => ({
              condition: msg.condition || "",
              waitTime: msg.waitTime || 60,
              waitUnit: msg.waitUnit || "minutes",
              message: msg.message?.trim() || "",
              links: Array.isArray(msg.links)
                ? msg.links.map((link: any) => ({
                    url: link.url?.trim() || "",
                    buttonTitle: link.buttonTitle?.trim() || "Get Access",
                  }))
                : [],
            }))
          : [],
      };
    }

    // Update the template
    const updatedTemplate = await InstaReplyTemplate.findByIdAndUpdate(
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
    const template = await InstaReplyTemplate.findOne({
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
    await InstaReplyTemplate.findByIdAndDelete(templateId);

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
