import { Router } from "express";
import { createAffiliateController } from "@/controllers/affiliate/create.controller";
import { getAffiliateDashboardController } from "@/controllers/affiliate/dashboard.controller";
import { requireAuth } from "@clerk/express";

const router = Router();

router.use(requireAuth());

// POST /api/affiliates/create - Create new affiliate
router.post("/create", createAffiliateController);

// GET /api/affiliates/dashboard - Get affiliate dashboard data
router.get("/dashboard", getAffiliateDashboardController);

export default router;
