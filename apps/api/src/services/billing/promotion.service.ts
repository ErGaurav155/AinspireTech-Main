import { connectToDatabase } from "@/config/database.config";
import PromotionCode from "@/models/billing/PromotionCode.model";

export async function resolvePromotionCode({
  code,
  accountType,
  planCode,
  productId,
  billingInterval,
}: {
  code?: string;
  accountType: "BUSINESS" | "AGENCY";
  planCode?: string;
  productId?: string;
  billingInterval: "monthly" | "yearly";
}) {
  const normalizedCode = String(code || "").trim().toUpperCase();
  if (!normalizedCode) return null;
  await connectToDatabase();
  const now = new Date();
  const promotion = await PromotionCode.findOne({
    code: normalizedCode,
    active: true,
    accountTypes: accountType,
    billingIntervals: billingInterval,
    $and: [
      { $or: [{ validFrom: { $exists: false } }, { validFrom: null }, { validFrom: { $lte: now } }] },
      { $or: [{ validUntil: { $exists: false } }, { validUntil: null }, { validUntil: { $gt: now } }] },
    ],
  }).lean();
  if (!promotion) throw new Error("Coupon is invalid or expired");
  if (
    promotion.planCodes.length &&
    (!planCode ||
      !promotion.planCodes.some(
        (item) => item.toLowerCase() === planCode.toLowerCase(),
      ))
  ) {
    throw new Error("Coupon is not valid for this plan");
  }
  if (
    promotion.productIds.length &&
    (!productId ||
      !promotion.productIds.some(
        (item) => item.toLowerCase() === productId.toLowerCase(),
      ))
  ) {
    throw new Error("Coupon is not valid for this product");
  }
  return promotion;
}
