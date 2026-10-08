import { Router } from "express";
import { getTokenBalanceControllerWeb } from "@/controllers/web/tokens/balance.controller";
import { requireAuth } from "@clerk/express";
import { getIndividualAiUsageController } from "@/controllers/web/tokens/ai-usage.controller";

const router = Router();

router.use(requireAuth());

// GET /api/tokens/balance - Get user token balance
router.get("/balance", getTokenBalanceControllerWeb);
// GET /api/tokens/ai-usage - Individual service/package AI allowance
router.get("/ai-usage", getIndividualAiUsageController);

export default router;
