import { Router } from "express";

import { processCommissionsController } from "@/controllers/cron/process-commissions.controller";
import { resetWebTokensController } from "@/controllers/cron/web-token.controller";

const router = Router();

// GET /api/cron/process-commissions - Process affiliate commissions
router.get("/process-commissions", processCommissionsController);

// GET /api/cron/web-token - Reset free web tokens for users
router.get("/web-token", resetWebTokensController);

export default router;
