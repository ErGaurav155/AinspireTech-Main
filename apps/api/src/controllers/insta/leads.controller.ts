// controllers/insta/leads.controller.ts
import { Request, Response } from "express";
import { getAuth } from "@clerk/express";
import { connectToDatabase } from "@/config/database.config";
import InstaLeadCollection from "@/models/insta/LeadCollection.model";

/**
 * GET /api/insta/leads
 * Query params: accountId, templateId, source, page, limit
 */
export const getLeadsController = async (req: Request, res: Response) => {
  try {
    const { userId } = getAuth(req);
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: "Unauthorized",
        timestamp: new Date().toISOString(),
      });
    }

    const {
      accountId,
      templateId,
      source,
      automationType,
      page = "1",
      limit = "20",
    } = req.query;

    const pageNum = Math.max(1, parseInt(page as string));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit as string)));

    await connectToDatabase();

    const query: Record<string, any> = { userId };
    if (accountId) query.accountId = accountId;
    if (templateId) query.templateId = templateId;
    if (source) query.source = source;
    if (automationType) query.automationType = automationType;

    const total = await InstaLeadCollection.countDocuments(query);
    const leads = await InstaLeadCollection.find(query)
      .sort({ createdAt: -1 })
      .skip((pageNum - 1) * limitNum)
      .limit(limitNum)
      .lean();

    return res.status(200).json({
      success: true,
      data: {
        leads,
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum),
        hasMore: pageNum * limitNum < total,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error("Error fetching leads:", error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Failed to fetch leads",
      timestamp: new Date().toISOString(),
    });
  }
};

/**
 * DELETE /api/insta/leads?id=leadId
 */
export const deleteLeadController = async (req: Request, res: Response) => {
  try {
    const { userId } = getAuth(req);
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: "Unauthorized",
        timestamp: new Date().toISOString(),
      });
    }

    const { id } = req.query;
    if (!id) {
      return res.status(400).json({
        success: false,
        error: "Lead ID required",
        timestamp: new Date().toISOString(),
      });
    }

    await connectToDatabase();

    const lead = await InstaLeadCollection.findOneAndDelete({
      _id: id,
      userId,
    });
    if (!lead) {
      return res.status(404).json({
        success: false,
        error: "Lead not found",
        timestamp: new Date().toISOString(),
      });
    }

    return res.status(200).json({
      success: true,
      data: { message: "Lead deleted" },
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error("Error deleting lead:", error);
    return res.status(500).json({
      success: false,
      error: "Failed to delete lead",
      timestamp: new Date().toISOString(),
    });
  }
};

/**
 * GET /api/insta/leads/export
 * Export leads as CSV
 */
export const exportLeadsController = async (req: Request, res: Response) => {
  try {
    const { userId } = getAuth(req);
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: "Unauthorized",
        timestamp: new Date().toISOString(),
      });
    }

    const { accountId, templateId, source, automationType } = req.query;

    await connectToDatabase();

    const query: Record<string, any> = { userId };
    if (accountId) query.accountId = accountId;
    if (templateId) query.templateId = templateId;
    if (source) query.source = source;
    if (automationType) query.automationType = automationType;

    const leads = await InstaLeadCollection.find(query)
      .sort({ createdAt: -1 })
      .lean();

    // Convert to CSV
    const headers = [
      "Email",
      "Phone",
      "Username",
      "User ID",
      "Source",
      "Template Name",
      "Account ID",
      "Collected At",
    ];

    const rows = leads.map((lead) => [
      lead.email || "",
      lead.phone || "",
      lead.userId || "",
      lead.source || "",
      lead.templateName || "",
      lead.accountId || "",
      lead.createdAt ? new Date(lead.createdAt).toISOString() : "",
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map((row) => row.map((cell) => `"${cell}"`).join(",")),
    ].join("\n");

    res.setHeader("Content-Type", "text/csv");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=leads_${new Date().toISOString().split("T")[0]}.csv`,
    );

    return res.status(200).send(csvContent);
  } catch (error: any) {
    console.error("Error exporting leads:", error);
    return res.status(500).json({
      success: false,
      error: "Failed to export leads",
      timestamp: new Date().toISOString(),
    });
  }
};
