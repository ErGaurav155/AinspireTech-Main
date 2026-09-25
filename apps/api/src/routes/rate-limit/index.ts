import { Router } from "express";
import {
  checkRateLimitController,
  recordRateLimitController,
  processQueueController,
  resetWindowController,
  getCurrentWindowController,
} from "@/controllers/insta/rate-limit/rate-limit.controller";
import { requireAuth } from "@clerk/express";
import { requireOwner } from "@/middleware/auth.middleware";
const router = Router();
router.use(requireAuth());
// Rate limit routes
router.post("/check", checkRateLimitController);
router.post("/record", recordRateLimitController);
router.get("/queue/process", requireOwner, processQueueController);
router.post("/window/reset", requireOwner, resetWindowController);
router.get("/window/current", getCurrentWindowController);

export default router;
