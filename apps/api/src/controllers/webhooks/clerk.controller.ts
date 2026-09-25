import { Request, Response } from "express";
import { Webhook } from "svix";
import {
  createUser,
  deleteUserData,
  updateUser,
} from "@/services/user.service";
import { clerkClient } from "@clerk/express";
import Affiliate from "@/models/affiliate/Affiliate";
import { createHash } from "crypto";
import { connectToDatabase } from "@/config/database.config";
import WebhookEvent from "@/models/WebhookEvent.model";
import Agency from "@/models/tenant/Agency.model";
import AgencyMember from "@/models/tenant/AgencyMember.model";
import Workspace from "@/models/tenant/Workspace.model";
import WorkspaceMember from "@/models/tenant/WorkspaceMember.model";

/* eslint-disable camelcase */

// Helper function to generate unique affiliate code
function generateAffiliateCode(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let result = "";
  for (let i = 0; i < 8; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

// POST /api/webhooks/clerk - Handle Clerk webhooks
export const clerkWebhookController = async (req: Request, res: Response) => {
  try {
    const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET;

    if (!WEBHOOK_SECRET) {
      console.error("WEBHOOK_SECRET is missing");
      return res.status(500).json({
        success: false,
        error: "Webhook secret not configured",
        timestamp: new Date().toISOString(),
      });
    }

    // Get the headers
    const svix_id = req.headers["svix-id"] as string;
    const svix_timestamp = req.headers["svix-timestamp"] as string;
    const svix_signature = req.headers["svix-signature"] as string;

    // If there are no headers, error out
    if (!svix_id || !svix_timestamp || !svix_signature) {
      return res.status(400).json({
        success: false,
        error: "Missing svix headers",
        timestamp: new Date().toISOString(),
      });
    }

    // Clerk/Svix signs the exact raw request body, not a re-stringified object.
    const body = (req as any).rawBody || JSON.stringify(req.body);

    // Create a new Svix instance with your secret.
    const wh = new Webhook(WEBHOOK_SECRET);

    let evt: any;

    // Verify the payload with the headers
    try {
      evt = wh.verify(body, {
        "svix-id": svix_id,
        "svix-timestamp": svix_timestamp,
        "svix-signature": svix_signature,
      });
    } catch (err: any) {
      console.error("Webhook verification error:", err);
      return res.status(400).json({
        success: false,
        error: "Webhook verification failed",
        timestamp: new Date().toISOString(),
      });
    }

    // Get the ID and type
    const eventType = evt.type;
    const payloadHash = createHash("sha256").update(body).digest("hex");
    await connectToDatabase();
    let webhookEvent = await WebhookEvent.findOne({
      provider: "clerk",
      providerEventId: svix_id,
    });
    if (webhookEvent?.status === "processed" || webhookEvent?.status === "ignored") {
      return res.status(200).json({
        success: true,
        message: "Webhook already processed",
        data: { eventType },
        timestamp: new Date().toISOString(),
      });
    }
    if (webhookEvent) {
      webhookEvent.status = "processing";
      webhookEvent.attempts += 1;
      webhookEvent.error = undefined;
      await webhookEvent.save();
    } else {
      try {
        webhookEvent = await WebhookEvent.create({
          provider: "clerk",
          providerEventId: svix_id,
          eventType,
          payloadHash,
          status: "processing",
        });
      } catch (error: any) {
        if (error?.code === 11000) {
          return res.status(200).json({
            success: true,
            message: "Webhook is already being processed",
            data: { eventType },
            timestamp: new Date().toISOString(),
          });
        }
        throw error;
      }
    }

    const finishEvent = async (status: "processed" | "ignored" = "processed") => {
      await WebhookEvent.updateOne(
        { _id: webhookEvent!._id },
        { $set: { status, processedAt: new Date() }, $unset: { error: 1 } },
      );
    };

    // CREATE
    if (eventType === "user.created") {
      const {
        id,
        email_addresses,
        image_url,
        first_name,
        last_name,
        username,
        public_metadata,
      } = evt.data;

      const totalReplies = (public_metadata?.totalReplies as number) || 0;
      const replyLimit = (public_metadata?.replyLimit as number) || 200;
      const accountLimit = (public_metadata?.accountLimit as number) || 1;
      const timestamps = (public_metadata?.timestamps as boolean) || true;

      const user = {
        clerkId: id,
        email: email_addresses[0].email_address,
        username: username!,
        firstName: first_name!,
        lastName: last_name!,
        totalReplies: totalReplies,
        replyLimit: replyLimit,
        accountLimit: accountLimit,
        photo: image_url,
        timestamps,
      };
      const newUser = await createUser(user);

      // Set public metadata
      if (newUser) {
        await clerkClient.users.updateUser(id, {
          publicMetadata: {
            userId: newUser._id,
          },
        });
      }

      // ✅ AUTO-CREATE AFFILIATE for every new user
      try {
        let affiliateCode = "";
        let isUnique = false;

        // Generate unique affiliate code
        while (!isUnique) {
          const newCode = generateAffiliateCode();
          const existing = await Affiliate.findOne({ affiliateCode: newCode });
          if (!existing) {
            affiliateCode = newCode;
            isUnique = true;
          }
        }

        // Create affiliate record (no payment details required initially)
        await Affiliate.create({
          userId: id,
          affiliateCode,
          status: "active",
          commissionRate: 0.25, // 25%
          monthlyMonths: 10,
          yearlyYears: 3,
          // paymentDetails: null - will be added later
        });
      } catch (affiliateError) {
        console.error("Error creating affiliate:", affiliateError);
        // Don't fail the whole webhook if affiliate creation fails
      }

      await finishEvent();

      return res.status(200).json({
        success: true,
        message: "User created successfully",
        data: { user: newUser },
        timestamp: new Date().toISOString(),
      });
    }

    // UPDATE
    if (eventType === "user.updated") {
      const { id, image_url, first_name, last_name, username } = evt.data;

      const user = {
        firstName: first_name!,
        lastName: last_name!,
        username: username!,
        photo: image_url,
      };

      const updatedUser = await updateUser(id, user);

      await finishEvent();

      return res.status(200).json({
        success: true,
        message: "User updated successfully",
        data: { user: updatedUser },
        timestamp: new Date().toISOString(),
      });
    }

    // DELETE
    if (eventType === "user.deleted") {
      const { id } = evt.data;

      const deletedUser = await deleteUserData(id!);

      await finishEvent();

      return res.status(200).json({
        success: true,
        message: "User deleted successfully",
        data: { user: deletedUser },
        timestamp: new Date().toISOString(),
      });
    }

    if (
      eventType === "organizationMembership.created" ||
      eventType === "organizationMembership.updated"
    ) {
      const data = evt.data || {};
      const organizationId =
        data.organization?.id || data.organization_id || data.organizationId;
      const membershipId = data.id;
      const userId =
        data.public_user_data?.user_id ||
        data.publicUserData?.userId ||
        data.user_id ||
        data.userId;
      const identifier = String(
        data.public_user_data?.identifier ||
          data.publicUserData?.identifier ||
          "",
      ).toLowerCase();
      if (!organizationId || !membershipId || !userId) {
        await finishEvent("ignored");
        return res.status(200).json({ success: true, message: "Incomplete membership event ignored" });
      }

      const workspace = await Workspace.findOne({ clerkOrganizationId: organizationId });
      if (!workspace) {
        await finishEvent("ignored");
        return res.status(200).json({ success: true, message: "Unmanaged organization ignored" });
      }

      if (workspace.agencyId) {
        const [agency, agencyMember] = await Promise.all([
          Agency.findById(workspace.agencyId).select("ownerUserId").lean(),
          AgencyMember.findOne({
            agencyId: workspace.agencyId,
            userId,
            status: "active",
          }).lean(),
        ]);
        if (agency?.ownerUserId === userId || agencyMember) {
          await finishEvent("ignored");
          return res.status(200).json({ success: true, message: "Agency membership kept in agency authorization layer" });
        }
      }

      const isOwner = identifier !== "" && identifier === workspace.ownerEmail.toLowerCase();
      await WorkspaceMember.findOneAndUpdate(
        { workspaceId: workspace._id, userId },
        {
          $set: {
            clerkMembershipId: membershipId,
            role: isOwner ? "CLIENT_OWNER" : "CLIENT_MEMBER",
            status: "active",
          },
          $setOnInsert: { permissions: [], deniedPermissions: [] },
        },
        { upsert: true, new: true },
      );
      if (isOwner && !workspace.ownerUserId) {
        workspace.ownerUserId = userId;
        await workspace.save();
      }
      await finishEvent();
      return res.status(200).json({
        success: true,
        message: "Organization membership synchronized",
        timestamp: new Date().toISOString(),
      });
    }

    if (eventType === "organizationMembership.deleted") {
      const data = evt.data || {};
      const membershipId = data.id;
      const organizationId =
        data.organization?.id || data.organization_id || data.organizationId;
      const userId =
        data.public_user_data?.user_id ||
        data.publicUserData?.userId ||
        data.user_id ||
        data.userId;
      const workspace = organizationId
        ? await Workspace.findOne({ clerkOrganizationId: organizationId }).select("_id").lean()
        : null;
      const update = workspace
        ? membershipId
          ? { workspaceId: workspace._id, clerkMembershipId: membershipId }
          : userId
            ? { workspaceId: workspace._id, userId }
            : null
        : null;
      if (update) {
        await WorkspaceMember.updateOne(update, { $set: { status: "removed" } });
      }
      await finishEvent(update ? "processed" : "ignored");
      return res.status(200).json({
        success: true,
        message: update ? "Organization membership removed" : "Incomplete membership event ignored",
        timestamp: new Date().toISOString(),
      });
    }

    // For other event types, return success
    await finishEvent("ignored");
    return res.status(200).json({
      success: true,
      message: "Webhook received",
      data: { eventType },
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error("Webhook processing error:", error);
    const eventId = req.headers["svix-id"] as string | undefined;
    if (eventId) {
      try {
        await WebhookEvent.updateOne(
          { provider: "clerk", providerEventId: eventId },
          {
            $set: {
              status: "failed",
              error: String(error?.message || "Webhook processing failed").slice(0, 1900),
            },
          },
        );
      } catch (trackingError) {
        console.error("Unable to record Clerk webhook failure:", trackingError);
      }
    }
    return res.status(500).json({
      success: false,
      error: "Internal server error",
      timestamp: new Date().toISOString(),
    });
  }
};
