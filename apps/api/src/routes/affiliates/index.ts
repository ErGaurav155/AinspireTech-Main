import { Router } from "express";
import { clerkMiddleware, requireAuth } from "@clerk/express";
import { createAffiliateController } from "@/controllers/affiliate/create.controller";
import { getAffiliateDashboardController } from "@/controllers/affiliate/dashboard.controller";

const router = Router();
router.use(requireAuth({ signInUrl: "http://localhost:3002/sign-in" }));

// POST /api/affiliates/create - Create new affiliate
router.post("/create", clerkMiddleware(), createAffiliateController);

// GET /api/affiliates/dashboard - Get affiliate dashboard data
router.get("/dashboard", getAffiliateDashboardController);

export default router;
