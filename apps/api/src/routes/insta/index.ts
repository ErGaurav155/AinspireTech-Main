import { Router } from "express";
import { handleInstaCallbackController } from "@/controllers/insta/callback.controller";
import { getInstaDashboardController } from "@/controllers/insta/dashboard.controller";
import { getInstaMediaController } from "@/controllers/insta/media.controller";
import { getInstaReplyLogsController } from "@/controllers/insta/replylogs.controller";
import { getInstaUserInfoController } from "@/controllers/insta/user-info.controller";
import { getAllInstaAccountsController } from "@/controllers/insta/accounts.controller";
import {
  deleteInstaAccountController,
  getInstaAccountByIdController,
  updateInstaAccountController,
} from "@/controllers/insta/accounts-id.controller";

import { listInstaSubscriptionsController } from "@/controllers/insta/subscription/list.controller";
import {
  createInstaTemplateController,
  getInstaTemplatesController,
} from "@/controllers/insta/templates/templates.controller";
import { bulkTemplateActionController } from "@/controllers/insta/templates/bulk.controller";

import { requireAuth } from "@clerk/express";
import { getInstaAccountsController } from "@/controllers/insta/get-account-controller";
import { refreshInstagramTokenController } from "@/controllers/insta/refresh-token.controller";
import {
  deleteInstaTemplateController,
  updateInstaTemplateController,
} from "@/controllers/insta/templates/templates-id.controller";

const router = Router();

router.use(requireAuth({ signInUrl: "http://localhost:3002/sign-in" }));

// GET /api/insta/callback - Handle Instagram OAuth callback
router.get("/callback", handleInstaCallbackController);
// GET /api/insta/dashboard - Get Instagram dashboard stats
router.get("/dashboard", getInstaDashboardController);
// GET /api/insta/media - Get Instagram media for account
router.get("/media", getInstaMediaController);
// GET /api/insta/replylogs - Get Instagram reply logs
router.get("/replylogs", getInstaReplyLogsController);
// GET /api/insta/user-info - Get Instagram user info
router.get("/user-info", getInstaUserInfoController);
// POST /api/insta/refresh-token - Refresh Instagram token
router.post("/refresh-token", refreshInstagramTokenController);

//accounts
// GET /api/insta/accounts - Get Instagram accounts for user
router.get("/accounts", getAllInstaAccountsController);
// GET /api/insta/getAccount - Get Instagram accounts for user
router.get("/getAccount", getInstaAccountsController);
// POST /api/insta/accounts - Create or update Instagram account
// router.post("/accounts", createUpdateInstaAccountController);
// GET /api/insta/accounts/:accountId - Get specific Instagram account
router.get("/accounts/:accountId", getInstaAccountByIdController);
// PUT /api/insta/accounts/:accountId - Update Instagram account
router.put("/accounts/:accountId", updateInstaAccountController);
// DELETE /api/insta/accounts/:accountId - Delete Instagram account
router.delete("/accounts/:accountId", deleteInstaAccountController);

//subscription

// GET /api/insta/subscription/list - List Instagram subscriptions
router.get("/subscription/list", listInstaSubscriptionsController);

//templates
// GET /api/insta/templates - Get Instagram templates
router.get("/templates", getInstaTemplatesController);
// POST /api/insta/templates - Create Instagram template
router.post("/templates", createInstaTemplateController);
// POST /api/insta/templates/bulk - Bulk template actions
router.post("/templates/bulk", bulkTemplateActionController);
// PUT /api/insta/templates/:templateId - Update template
router.put("/templates/:templateId", updateInstaTemplateController);
// DELETE /api/insta/templates/:templateId - Delete template
router.delete("/templates/:templateId", deleteInstaTemplateController);

export default router;
