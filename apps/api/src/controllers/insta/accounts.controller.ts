import { Request, Response } from "express";
import { connectToDatabase } from "@/config/database.config";
import InstagramAccount from "@/models/insta/InstagramAccount.model";
import ReplyTemplate from "@/models/insta/ReplyTemplate.model";
import { getAuth } from "@clerk/express";

// GET /api/insta/accounts - Get Instagram accounts for user
export const getAllInstaAccountsController = async (
  req: Request,
  res: Response,
) => {
  try {
    await connectToDatabase();
    const { userId } = getAuth(req);

    if (!userId) {
      return res.status(400).json({
        success: false,
        error: "User ID is required",
        timestamp: new Date().toISOString(),
      });
    }

    const accounts = await InstagramAccount.find({ userId: userId });

    // Get template counts for each account
    const accountsWithTemplateCounts = await Promise.all(
      accounts.map(async (account) => {
        const templatesCount = await ReplyTemplate.countDocuments({
          accountId: account.instagramId,
          isActive: true,
        });

        return {
          _id: account._id,
          userId: account.userId,
          instagramId: account.instagramId,
          userInstaId: account.userInstaId,
          username: account.username,
          profilePicture: account.profilePicture,
          followersCount: account.followersCount,
          followingCount: account.followingCount,
          mediaCount: account.mediaCount,
          isActive: account.isActive,
          lastActivity: account.lastActivity,
          accountReply: account.accountReply,
          accountDMSent: account.accountDMSent,
          accountFollowCheck: account.accountFollowCheck,
          autoReplyEnabled: account.autoReplyEnabled,
          autoDMEnabled: account.autoDMEnabled,
          followCheckEnabled: account.followCheckEnabled,
          requireFollowForFreeUsers: account.requireFollowForFreeUsers,
          metaCallsThisHour: account.metaCallsThisHour,
          isMetaRateLimited: account.isMetaRateLimited,
          templatesCount,
          createdAt: account.createdAt,
          updatedAt: account.updatedAt,
        };
      }),
    );

    return res.status(200).json({
      success: true,
      data: { accounts: accountsWithTemplateCounts },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error fetching Instagram accounts:", error);
    return res.status(500).json({
      success: false,
      error: "Failed to fetch accounts",
      timestamp: new Date().toISOString(),
    });
  }
};
// POST /api/insta/accounts - Create or update Instagram account
// export const createUpdateInstaAccountController = async (
//   req: Request,
//   res: Response,
// ) => {
//   try {
//     await connectToDatabase();

//     const {
//       userId,
//       instagramId,
//       username,
//       isProfessional,
//       accountType,
//       accessToken,
//       displayName,
//       profilePicture,
//       followersCount,
//       postsCount,
//       pageId,
//       pageAccessToken,
//     } = req.body;

//     // Check if account already exists
//     const existingAccount = await InstagramAccount.findOne({
//       $or: [{ instagramId }, { username: username.toLowerCase() }],
//     });

//     if (existingAccount) {
//       // Update existing account
//       const updatedAccount = await InstagramAccount.findByIdAndUpdate(
//         existingAccount._id,
//         {
//           userId,
//           isProfessional,
//           accountType,
//           accessToken,
//           displayName,
//           profilePicture,
//           followersCount,
//           postsCount,
//           pageId,
//           pageAccessToken,
//           lastTokenRefresh: new Date(),
//           lastActivity: new Date(),
//         },
//         { new: true },
//       );

//       return res.status(200).json({
//         success: true,
//         account: updatedAccount,
//         message: "Account updated successfully",
//         timestamp: new Date().toISOString(),
//       });
//     }

//     // Create new account
//     const newAccount = await InstagramAccount.create({
//       userId,
//       instagramId,
//       username: username.toLowerCase(),
//       isProfessional,
//       accountType,
//       accessToken,
//       displayName,
//       profilePicture,
//       followersCount,
//       postsCount,
//       pageId,
//       pageAccessToken,
//       lastTokenRefresh: new Date(),
//       lastActivity: new Date(),
//     });

//     return res.status(201).json({
//       success: true,
//       account: newAccount,
//       message: "Account created successfully",
//       timestamp: new Date().toISOString(),
//     });
//   } catch (error) {
//     console.error("Error creating/updating Instagram account:", error);
//     return res.status(500).json({
//       success: false,
//       error: "Failed to save account",
//       timestamp: new Date().toISOString(),
//     });
//   }
// };
