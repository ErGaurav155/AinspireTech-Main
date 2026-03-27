import { Router } from "express";

import { resetWebTokensController } from "@/controllers/cron/web-token.controller";
import { hourlyWindowResetController } from "@/controllers/cron/hourly-window-reset.controller";
import { processCommissionsController } from "@/controllers/cron/process-commissions.controller";
import { followupCronController } from "@/controllers/cron/followup.controller";

const router = Router();

// Disable CORS for all cron routes
const disableCorsForCron = (req: any, res: any, next: any) => {
  // Remove CORS headers for cron endpoints
  res.removeHeader("Access-Control-Allow-Origin");
  res.removeHeader("Access-Control-Allow-Headers");
  res.removeHeader("Access-Control-Allow-Methods");
  next();
};

router.use(disableCorsForCron);

// POST /api/cron/hourly-window-reset - Hourly window reset
router.post("/hourly-window-reset", hourlyWindowResetController);

// GET /api/cron/web-token - Monthly web token reset
router.get("/web-token", resetWebTokensController);

// GET /api/cron/process-commissions - Process affiliate commissions
router.get("/process-commissions", processCommissionsController);

// GET /api/cron/followup - Process followups
router.get("/followup ", followupCronController);

export default router;
