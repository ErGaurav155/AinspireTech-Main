// apps/api/controllers/admin/approve-payout.controller.ts
import { Request, Response } from "express";
import { connectToDatabase } from "@/config/database.config";
import AffiPayout from "@/models/affiliate/Payout";
import AffiCommissionRecord from "@/models/affiliate/CommissionRecord";
import Affiliate from "@/models/affiliate/Affiliate";
import User from "@/models/user.model";

// POST /api/admin/payouts/:payoutId
export const approvePayoutController = async (req: Request, res: Response) => {
  try {
    // Admin authentication should be handled by middleware
    const { payoutId } = req.params;
    const { transactionId, notes } = req.body;

    if (!payoutId) {
      return res.status(400).json({
        success: false,
        error: "Payout ID required",
        timestamp: new Date().toISOString(),
      });
    }

    await connectToDatabase();

    const payout = await AffiPayout.findById(payoutId);
    if (!payout) {
      return res.status(404).json({
        success: false,
        error: "Payout not found",
        timestamp: new Date().toISOString(),
      });
    }

    if (payout.status !== "processing") {
      return res.status(400).json({
        success: false,
        error: `Payout already ${payout.status}`,
        timestamp: new Date().toISOString(),
      });
    }

    // Mark all pending commission records for this affiliate as paid
    const commissionRecords = await AffiCommissionRecord.find({
      affiliateId: payout.affiliateId,
      status: "pending",
      createdAt: { $lte: payout.createdAt }, // Only commissions up to payout request time
    });

    // Update each commission record
    for (const record of commissionRecords) {
      record.status = "paid";
      record.payoutId = payout._id.toString();
      record.payoutDate = new Date();
      await record.save();
    }

    // Update payout status
    payout.status = "completed";
    payout.transactionId = transactionId;
    if (notes) payout.notes = notes;
    payout.completedAt = new Date();
    await payout.save();

    // Update affiliate paid earnings and reduce pending earnings (already reduced at request time, but ensure consistency)
    const affiliate = await Affiliate.findById(payout.affiliateId);
    if (affiliate) {
      // The pendingEarnings was already reduced when payout was requested.
      // Now add to paidEarnings.
      affiliate.paidEarnings = (affiliate.paidEarnings || 0) + payout.amount;
      affiliate.lastPayoutDate = new Date();
      await affiliate.save();
    }

    return res.status(200).json({
      success: true,
      data: {
        message: "Payout approved successfully",
        payout,
        commissionsUpdated: commissionRecords.length,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error("Error approving payout:", error);
    return res.status(500).json({
      success: false,
      error: error.message || "Internal server error",
      timestamp: new Date().toISOString(),
    });
  }
};

// GET /api/admin/payouts - List pending payouts
export const listPayoutsController = async (req: Request, res: Response) => {
  try {
    await connectToDatabase();

    const { status } = req.query;
    const filter: any = {};
    if (status) filter.status = status;

    const rawPayouts = await AffiPayout.find(filter).sort({ createdAt: -1 }).lean();
    const affiliateIds = rawPayouts
      .map((payout) => String(payout.affiliateId || ""))
      .filter(Boolean);
    const affiliates = await Affiliate.find({ _id: { $in: affiliateIds } })
      .select("userId affiliateCode totalEarnings pendingEarnings paidEarnings")
      .lean();
    const affiliateUserIds = affiliates
      .map((affiliate) => String(affiliate.userId || ""))
      .filter(Boolean);
    const users = await User.find({
      $or: [{ clerkId: { $in: affiliateUserIds } }, { _id: { $in: affiliateUserIds } }],
    })
      .select("_id clerkId email firstName lastName username")
      .lean();
    const userById = new Map<string, any>();
    users.forEach((user) => {
      userById.set(String(user._id), user);
      userById.set(String(user.clerkId), user);
    });
    const affiliateById = new Map(
      affiliates.map((affiliate) => {
        const user = userById.get(String(affiliate.userId));
        return [
          String(affiliate._id),
          {
            ...affiliate,
            totalEarnings: affiliate.paidEarnings || 0,
            generatedEarnings: affiliate.totalEarnings || 0,
            user,
          },
        ];
      }),
    );
    const payouts = rawPayouts.map((payout) => ({
      ...payout,
      affiliateId: affiliateById.get(String(payout.affiliateId)) || payout.affiliateId,
    }));

    return res.status(200).json({
      success: true,
      data: { payouts },
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error("Error listing payouts:", error);
    return res.status(500).json({
      success: false,
      error: error.message || "Internal server error",
      timestamp: new Date().toISOString(),
    });
  }
};
