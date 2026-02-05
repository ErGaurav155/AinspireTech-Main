import { Router } from "express";
import { getTokenBalanceControllerWeb } from "@/controllers/web/tokens/balance.controller";
import {
  createTokenPurchaseController,
  verifyTokenPurchaseController,
} from "@/controllers/web/tokens/purchase.controller";
import { getTokenPurchasesController } from "@/controllers/web/tokens/purchase-history.controller";
import { resetFreeTokensController } from "@/controllers/web/tokens/reset-free.controller";
import { getTokenUsageController } from "@/controllers/web/tokens/usage.controller";
import { requireAuth } from "@clerk/express";

const router = Router();

router.use(requireAuth({ signInUrl: "http://localhost:3002/sign-in" }));

// GET /api/tokens/balance - Get user token balance
router.get("/balance", getTokenBalanceControllerWeb);
// POST /api/tokens/purchase - Create token purchase order
router.post("/purchase", createTokenPurchaseController);
// PUT /api/tokens/purchase - Verify and complete token purchase
router.put("/purchase", verifyTokenPurchaseController);
// GET /api/tokens/purchase-history - Get user's token purchase history
router.get("/purchase-history", getTokenPurchasesController);
// GET /api/tokens/usage - Get token usage statistics
router.get("/usage", getTokenUsageController);
// POST /api/tokens/reset-free - Reset free tokens
router.post("/reset-free", resetFreeTokensController);

export default router;
