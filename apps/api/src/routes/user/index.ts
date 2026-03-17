import { Router } from "express";
import {
  createUserController,
  getUserByIdController,
  updateUserNumberController,
  hasActiveSubscriptionsController,
  updateUserLimitsController,
  getAffiliateUserController,
  checkAndPrepareScrapeController,
} from "@/controllers/user/user-actions.controller";
import { requireAuth } from "@clerk/express";

const router = Router();

// POST /api/user/create - Create user
router.post("/create", createUserController);

router.use(requireAuth());

// GET /api/user/:userId - Get user by ID
router.get("/:userId", getUserByIdController);

// PUT /api/user/update-number - Update user phone number
router.put("/update-number", updateUserNumberController);

// GET /api/user/active-subscriptions - Check active subscriptions
router.get("/active-subscriptions", hasActiveSubscriptionsController);

// PUT /api/user/update-limits - Update user limits
router.put("/update-limits", updateUserLimitsController);

// GET /api/user/affiliate/:userId - Get affiliate user
router.get("/affiliate/:userId", getAffiliateUserController);

// POST /api/user/check-scrape - Check and prepare for scraping
router.post("/check-scrape", checkAndPrepareScrapeController);

export default router;
