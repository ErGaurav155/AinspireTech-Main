import { Router } from "express";
import { getTokenBalanceControllerWeb } from "@/controllers/web/tokens/balance.controller";
import { resetFreeTokensController } from "@/controllers/web/tokens/reset-free.controller";
import { getTokenUsageController } from "@/controllers/web/tokens/usage.controller";
import { requireAuth } from "@clerk/express";

const router = Router();

router.use(requireAuth());

// GET /api/tokens/balance - Get user token balance
router.get("/balance", getTokenBalanceControllerWeb);
// GET /api/tokens/usage - Get token usage statistics
router.get("/usage", getTokenUsageController);
// POST /api/tokens/reset-free - Reset free tokens
router.post("/reset-free", resetFreeTokensController);

export default router;
