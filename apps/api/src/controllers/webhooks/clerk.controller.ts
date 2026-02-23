import { Request, Response } from "express";
import { Webhook } from "svix";
import {
  createUser,
  deleteUserData,
  updateUser,
} from "@/services/user.service";
import { clerkClient } from "@clerk/express";
import Affiliate from "@/models/affiliate/Affiliate";

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

    // Get the body
    const payload = req.body;
    const body = JSON.stringify(payload);

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
      const replyLimit = (public_metadata?.replyLimit as number) || 500;
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

        console.log("✅ User & Affiliate created:", id, affiliateCode);
      } catch (affiliateError) {
        console.error("Error creating affiliate:", affiliateError);
        // Don't fail the whole webhook if affiliate creation fails
      }

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

      return res.status(200).json({
        success: true,
        message: "User deleted successfully",
        data: { user: deletedUser },
        timestamp: new Date().toISOString(),
      });
    }

    // For other event types, return success
    return res.status(200).json({
      success: true,
      message: "Webhook received",
      data: { eventType },
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error("Webhook processing error:", error);
    return res.status(500).json({
      success: false,
      error: "Internal server error",
      timestamp: new Date().toISOString(),
    });
  }
};
