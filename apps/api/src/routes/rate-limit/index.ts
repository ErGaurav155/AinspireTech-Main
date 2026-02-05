import { Router } from "express";
import {
  getRateLimitStatsController,
  checkRateLimitController,
  recordRateLimitController,
  processQueueController,
  resetWindowController,
  getCurrentWindowController,
  getAppLimitController,
} from "@/controllers/insta/rate-limit/rate-limit.controller";
const router = Router();
// Rate limit routes
router.get("/stats", getRateLimitStatsController);
router.post("/check", checkRateLimitController);
router.post("/record", recordRateLimitController);
router.get("/queue/process", processQueueController);
router.post("/window/reset", resetWindowController);
router.get("/window/current", getCurrentWindowController);
router.get("/app-limit", getAppLimitController);

export default router;
