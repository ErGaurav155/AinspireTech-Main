import { Router } from "express";
import {
  checkRateLimitController,
  recordRateLimitController,
  processQueueController,
  resetWindowController,
  getCurrentWindowController,
  getAppLimitController,
} from "@/controllers/insta/rate-limit/rate-limit.controller";
const router = Router();
// Rate limit routes
router.post("/check", checkRateLimitController);
router.post("/record", recordRateLimitController);
router.get("/queue/process", processQueueController);
router.post("/window/reset", resetWindowController);
router.get("/window/current", getCurrentWindowController);

export default router;
