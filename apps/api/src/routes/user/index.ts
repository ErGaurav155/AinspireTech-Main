import { Router } from "express";
import {
  createUserController,
  getUserByIdController,
  updateUserNumberController,
  hasActiveSubscriptionsController,
  getAffiliateUserController,
  checkAndPrepareScrapeController,
} from "@/controllers/user/user-actions.controller";
import { requireAuth } from "@clerk/express";
import {
  deleteSharedBusinessKnowledgeController,
  getSharedBusinessKnowledgeController,
  updateSharedBusinessKnowledgeController,
  uploadSharedBusinessKnowledgeMiddleware,
} from "@/controllers/user/shared-business-knowledge.controller";

const router = Router();

router.use(requireAuth());

// POST /api/user/create - Create the authenticated user only
router.post("/create", createUserController);

router.get("/business-knowledge", getSharedBusinessKnowledgeController);
router.put(
  "/business-knowledge",
  uploadSharedBusinessKnowledgeMiddleware,
  updateSharedBusinessKnowledgeController,
);
router.delete("/business-knowledge", deleteSharedBusinessKnowledgeController);

// PUT /api/user/update-number - Update user phone number
router.put("/update-number", updateUserNumberController);

// GET /api/user/active-subscriptions - Check active subscriptions
router.get("/active-subscriptions", hasActiveSubscriptionsController);

// GET /api/user/affiliate/:userId - Get affiliate user
router.get("/affiliate/:userId", getAffiliateUserController);

// POST /api/user/check-scrape - Check and prepare for scraping
router.post("/check-scrape", checkAndPrepareScrapeController);

// Keep parameter routes last so they cannot shadow fixed routes.
// GET /api/user/:userId - Get authenticated user's record
router.get("/:userId", getUserByIdController);

export default router;
