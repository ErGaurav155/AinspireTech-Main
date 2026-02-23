// routes/affiliate.routes.ts
import { Router } from "express";
import { getAffiliateDashboardController } from "@/controllers/affiliate/dashboard.controller";
import { updatePaymentDetailsController } from "@/controllers/affiliate/update-payment-details.controller";
import { requestPayoutController } from "@/controllers/affiliate/request-payout.controller";
import { requireAuth } from "@clerk/express";

const router = Router();

router.use(requireAuth());

// GET /api/affiliates/dashboard - Get affiliate dashboard data
router.get("/dashboard", getAffiliateDashboardController);

// PUT /api/affiliates/payment-details - Update payment details
router.put("/payment-details", updatePaymentDetailsController);

// POST /api/affiliates/request-payout - Request payout
router.post("/request-payout", requestPayoutController);

export default router;
