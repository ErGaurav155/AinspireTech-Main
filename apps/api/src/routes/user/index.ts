import { Router } from "express";
import {
  createUserController,
  getUserByIdController,
  updateUserNumberController,
  updateUserController,
  cleanupUserDataController,
  hasActiveSubscriptionsController,
  updateUserLimitsController,
  resetFreeRepliesForAllUsersController,
  getAffiliateUserController,
  checkAndPrepareScrapeController,
} from "@/controllers/user/user-actions.controller";
import { verifyOwnerController } from "@/controllers/admin/verify-owner.controller";
import { requireAuth } from "@clerk/express";

const router = Router();

// POST /api/user/create - Create user
router.post("/create", createUserController);

router.use(
  requireAuth({
    signInUrl: "https://ainspire-tech-main-dashboard.vercel.app/sign-in",
  }),
);

// GET /api/user/:userId - Get user by ID
router.get("/:userId", getUserByIdController);

// PUT /api/user/update-number - Update user phone number
router.put("/update-number", updateUserNumberController);

// PUT /api/user/update - Update user information
router.put("/update", updateUserController);

// DELETE /api/user/cleanup - Cleanup user data
router.delete("/cleanup", cleanupUserDataController);

// GET /api/user/active-subscriptions - Check active subscriptions
router.get("/active-subscriptions", hasActiveSubscriptionsController);

// PUT /api/user/update-limits - Update user limits
router.put("/update-limits", updateUserLimitsController);

// POST /api/user/reset-free-replies - Reset free replies (admin)
router.post("/reset-free-replies", resetFreeRepliesForAllUsersController);

// GET /api/user/affiliate/:userId - Get affiliate user
router.get("/affiliate/:userId", getAffiliateUserController);

// POST /api/user/check-scrape - Check and prepare for scraping
router.post("/check-scrape", checkAndPrepareScrapeController);

export default router;
