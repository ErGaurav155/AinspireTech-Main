import { Router } from "express";
import { getAllAppointmentsController } from "@/controllers/admin/appointment.controller";
import { getInstaSubscriptionsController } from "@/controllers/admin/insta-subscription.controller";
import { requireOwner } from "@/middleware/auth.middleware";
import { getUsersController } from "@/controllers/admin/users.controller";
import { getWebSubscriptionsController } from "@/controllers/admin/web-subscription.controller";
import { verifyOwnerController } from "@/controllers/admin/verify-owner.controller";
import { requireAuth } from "@clerk/express";
import {
  getRateLimitStatsController,
  getWindowStatsController,
} from "@/controllers/admin/rate-limit.controller";
import { getAppLimitController } from "@/controllers/insta/rate-limit/rate-limit.controller";
import { getInstaAccountsController } from "@/controllers/insta/get-account-controller";
import { getAllChatbotsController } from "@/controllers/admin/web-chatbots.controller";

const router = Router();

router.use(requireAuth());

// GET /api/admin/verify-owner - Verify if user is owner
router.get("/verify-owner", verifyOwnerController);

router.use(requireOwner);

// Admin routes
router.get("/insta-subscriptions", getInstaSubscriptionsController);
// GET /api/admin/appointments - Get all appointments (admin only)
router.get("/appointments", getAllAppointmentsController);
// GET /api/admin/users - Get all users (admin only)
router.get("/users", getUsersController);
// GET /api/admin/web-subscriptions - Get all web subscriptions (owner only)
router.get("/web-subscriptions", getWebSubscriptionsController);
// GET /api/admin/user-stats - Get all users stats (admin only)
router.get("/user-stats", getRateLimitStatsController);
// GET /api/admin/window-stats - Get window stats (admin only)
router.get("/window-stats", getWindowStatsController);
// GET /api/admin/app-limit - Get app rate-limit (admin only)
router.get("/app-limit", getAppLimitController);
// GET /api/admin/insta-accounts - Get insta accounts (admin only)
router.get("/insta-accounts", getInstaAccountsController);
// GET /api/admin/web-chatbots - Get web chatbots  (admin only)
router.get("/web-chatbots", getAllChatbotsController);

export default router;
