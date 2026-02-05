import { Request, Response } from "express";
import { connectToDatabase } from "@/config/database.config";
import ReplyLog from "@/models/insta/ReplyLog.model";
import InstagramAccount from "@/models/insta/InstagramAccount.model";
import ReplyTemplate from "@/models/insta/ReplyTemplate.model";
import { getAuth } from "@clerk/express";

// GET /api/insta/replylogs - Get Instagram reply logs
export const getInstaReplyLogsController = async (
  req: Request,
  res: Response,
) => {
  try {
    await connectToDatabase();

    const { userId } = getAuth(req);
    const accountId = req.query.accountId as string;
    const limit = parseInt(req.query.limit as string) || 50;
    const page = parseInt(req.query.page as string) || 1;
    const skip = (page - 1) * limit;

    if (!userId) {
      return res.status(400).json({
        success: false,
        error: "User ID is required",
        timestamp: new Date().toISOString(),
      });
    }

    // Build query
    const query: any = { userId: userId };
    if (accountId) {
      query.accountId = accountId;
    }

    // Get logs with pagination
    const recentLogs = await ReplyLog.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    // Get account and template information for each log
    const enhancedLogs = await Promise.all(
      recentLogs.map(async (log) => {
        let accountInfo = null;
        let templateInfo = null;

        // Get account info
        if (log.accountId) {
          accountInfo = await InstagramAccount.findOne({
            instagramId: log.accountId,
          }).select("username profilePicture");
        }

        // Get template info
        if (log.templateId) {
          templateInfo = await ReplyTemplate.findById(log.templateId).select(
            "name triggers",
          );
        }

        return {
          _id: log._id,
          userId: log.userId,
          accountId: log.accountId,
          accountUsername: accountInfo?.username || "Unknown Account",
          accountProfilePicture: accountInfo?.profilePicture || null,
          templateId: log.templateId,
          templateName:
            templateInfo?.name || log.templateName || "Unknown Template",
          commentId: log.commentId,
          commentText:
            log.commentText?.substring(0, 100) +
            (log.commentText?.length > 100 ? "..." : ""),
          commenterUsername: log.commenterUsername,
          commenterUserId: log.commenterUserId,
          mediaId: log.mediaId,
          replyType: log.replyType,
          replyText:
            log.replyText?.substring(0, 100) +
            (log.replyText?.length > 100 ? "..." : ""),
          dmFlowStage: log.dmFlowStage,
          followChecked: log.followChecked,
          userFollows: log.userFollows,
          linkSent: log.linkSent,
          success: log.success,
          responseTime: log.responseTime,
          errorMessage: log.errorMessage,
          wasQueued: log.wasQueued,
          queueId: log.queueId,
          processedAfterQueue: log.processedAfterQueue,
          createdAt: log.createdAt,
          updatedAt: log.updatedAt,
        };
      }),
    );

    // Calculate overall stats
    const totalLogs = await ReplyLog.countDocuments(query);
    const successfulLogs = await ReplyLog.countDocuments({
      ...query,
      success: true,
    });
    const failedLogs = await ReplyLog.countDocuments({
      ...query,
      success: false,
    });
    const queuedLogs = await ReplyLog.countDocuments({
      ...query,
      wasQueued: true,
    });

    // Calculate average response time
    const avgResponseTimeResult = await ReplyLog.aggregate([
      {
        $match: {
          ...query,
          success: true,
          responseTime: { $exists: true, $gt: 0 },
        },
      },
      {
        $group: {
          _id: null,
          avgResponseTime: { $avg: "$responseTime" },
        },
      },
    ]);

    const avgResponseTime = avgResponseTimeResult[0]?.avgResponseTime || 0;

    // Get recent activity summary
    const recentActivity = enhancedLogs.map((log) => ({
      id: log._id,
      type:
        log.replyType === "comment"
          ? "comment_reply"
          : log.replyType === "dm"
            ? "dm_sent"
            : log.replyType === "both"
              ? "comment_and_dm"
              : "unknown",
      account: log.commenterUsername,
      accountId: log.accountId,
      template: log.templateName,
      timestamp: log.createdAt,
      message: log.success
        ? `Auto-${log.replyType} sent to @${log.commenterUsername}`
        : `Failed to send auto-${log.replyType} to @${log.commenterUsername}`,
      success: log.success,
      dmFlowStage: log.dmFlowStage,
      followChecked: log.followChecked,
      userFollows: log.userFollows,
      linkSent: log.linkSent,
    }));

    return res.status(200).json({
      success: true,
      data: {
        logs: enhancedLogs,
        recentActivity: recentActivity,
        stats: {
          total: totalLogs,
          successful: successfulLogs,
          failed: failedLogs,
          queued: queuedLogs,
          successRate: totalLogs > 0 ? (successfulLogs / totalLogs) * 100 : 0,
          avgResponseTime: Math.round(avgResponseTime),
          currentPage: page,
          totalPages: Math.ceil(totalLogs / limit),
          hasNextPage: page * limit < totalLogs,
          hasPrevPage: page > 1,
        },
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error fetching reply logs:", error);
    return res.status(500).json({
      success: false,
      error: "Failed to fetch reply logs",
      timestamp: new Date().toISOString(),
    });
  }
};
