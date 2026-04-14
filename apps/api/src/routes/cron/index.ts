// apps/api/routes/cron/index.ts
import { Router } from "express";
import { cronAuth } from "@/middleware/secret-auth.middleware";

import { resetWebTokensController } from "@/controllers/cron/web-token.controller";
import { hourlyWindowResetController } from "@/controllers/cron/hourly-window-reset.controller";
import { processCommissionsController } from "@/controllers/cron/process-commissions.controller";
import { followupCronController } from "@/controllers/cron/followup.controller";
import { resetInstaController } from "@/controllers/cron/insta-reset.controller";

const router = Router();

// Define allowed origins for cron jobs (Railway cron service URLs)
// You can get these from Railway dashboard for each cron job
const allowedCronOrigins = [
  process.env.CRON_JOB_1_URL!, // Default to localhost for local testing
  process.env.CRON_JOB_2_URL!,
  process.env.CRON_JOB_3_URL!,
  process.env.CRON_JOB_4_URL!,
  process.env.CRON_JOB_5_URL!,
];

// Apply cron authentication to ALL cron routes
// This ensures only requests with valid CRON_SECRET can access these endpoints
router.use(cronAuth(allowedCronOrigins));

// POST /api/cron/hourly-window-reset - Hourly window reset
router.post("/hourly-window-reset", hourlyWindowResetController);

// GET /api/cron/web-token - Monthly web token reset
router.get("/web-token", resetWebTokensController);

// GET /api/cron/insta - Monthly insta info reset
router.get("/insta", resetInstaController);

// GET /api/cron/process-commissions - Process affiliate commissions
router.get("/process-commissions", processCommissionsController);

// GET /api/cron/followup - Process followups
router.get("/followup", followupCronController);

export default router;
