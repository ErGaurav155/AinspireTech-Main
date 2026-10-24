import type { Request, Response } from "express";
import { z } from "zod";
import PromotionCode from "@/models/billing/PromotionCode.model";
import { connectToDatabase } from "@/config/database.config";

const promotionSchema = z.object({
  code: z.string().trim().min(2).max(40).regex(/^[A-Za-z0-9_-]+$/),
  name: z.string().trim().min(2).max(160),
  razorpayOfferId: z.string().trim().min(5).max(100),
  accountTypes: z.array(z.enum(["BUSINESS", "AGENCY"])).min(1).max(2),
  planCodes: z.array(z.string().trim().min(1).max(100)).max(100).default([]),
  productIds: z.array(z.string().trim().min(1).max(100)).max(100).default([]),
  billingIntervals: z.array(z.enum(["monthly", "yearly"])).min(1).max(2),
  durationCycles: z.number().int().min(1).max(120).optional(),
  validFrom: z.string().datetime().optional(),
  validUntil: z.string().datetime().optional(),
  active: z.boolean().default(true),
}).strict();

export const listPromotionsController = async (_req: Request, res: Response) => {
  await connectToDatabase();
  const promotions = await PromotionCode.find().sort({ createdAt: -1 }).lean();
  return res.status(200).json({ success: true, data: promotions, timestamp: new Date().toISOString() });
};

export const createPromotionController = async (req: Request, res: Response) => {
  const parsed = promotionSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ success: false, error: "Invalid promotion", details: parsed.error.flatten() });
  await connectToDatabase();
  try {
    const promotion = await PromotionCode.create({
      ...parsed.data,
      code: parsed.data.code.toUpperCase(),
      planCodes: parsed.data.planCodes.map((value) => value.toLowerCase()),
      productIds: parsed.data.productIds.map((value) => value.toLowerCase()),
      validFrom: parsed.data.validFrom ? new Date(parsed.data.validFrom) : undefined,
      validUntil: parsed.data.validUntil ? new Date(parsed.data.validUntil) : undefined,
    });
    return res.status(201).json({ success: true, data: promotion, timestamp: new Date().toISOString() });
  } catch (error: any) {
    return res.status(error?.code === 11000 ? 409 : 500).json({ success: false, error: error?.code === 11000 ? "Coupon code already exists" : "Unable to create coupon" });
  }
};

export const updatePromotionController = async (req: Request, res: Response) => {
  const parsed = promotionSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ success: false, error: "Invalid promotion", details: parsed.error.flatten() });
  await connectToDatabase();
  try {
    const promotion = await PromotionCode.findByIdAndUpdate(
      req.params.promotionId,
      {
        ...parsed.data,
        code: parsed.data.code.toUpperCase(),
        planCodes: parsed.data.planCodes.map((value) => value.toLowerCase()),
        productIds: parsed.data.productIds.map((value) => value.toLowerCase()),
        validFrom: parsed.data.validFrom ? new Date(parsed.data.validFrom) : undefined,
        validUntil: parsed.data.validUntil ? new Date(parsed.data.validUntil) : undefined,
      },
      { new: true, runValidators: true },
    );
    if (!promotion) return res.status(404).json({ success: false, error: "Coupon not found" });
    return res.status(200).json({ success: true, data: promotion, timestamp: new Date().toISOString() });
  } catch (error: any) {
    if (error?.name === "CastError") {
      return res.status(400).json({ success: false, error: "Invalid coupon id" });
    }
    return res.status(error?.code === 11000 ? 409 : 500).json({
      success: false,
      error: error?.code === 11000 ? "Coupon code already exists" : "Unable to update coupon",
    });
  }
};
