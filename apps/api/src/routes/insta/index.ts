import { Router } from "express";
import { handleInstaCallbackController } from "@/controllers/insta/callback.controller";
import { getInstaMediaController } from "@/controllers/insta/media.controller";
import { getInstaReplyLogsController } from "@/controllers/insta/replylogs.controller";
import {
  deleteInstaAccountController,
  getAllInstaAccountsInfoController,
  getInstaAccountByIdController,
  updateInstaAccountController,
} from "@/controllers/insta/accounts-id.controller";

import { listInstaSubscriptionsController } from "@/controllers/insta/subscription/list.controller";
import {
  createInstaTemplateController,
  getInstaTemplatesController,
} from "@/controllers/insta/templates/templates.controller";
import { bulkTemplateActionController } from "@/controllers/insta/templates/bulk.controller";
import { refreshInstagramTokenController } from "@/controllers/insta/refresh-token.controller";
import {
  deleteInstaTemplateController,
  getInstaTemplateByIdController,
  updateInstaTemplateController,
} from "@/controllers/insta/templates/templates-id.controller";
import { requireAuth } from "@clerk/express";

const router = Router();

router.use(requireAuth());

// GET /api/insta/callback - Handle Instagram OAuth callback
router.get("/callback", handleInstaCallbackController);
// GET /api/insta/media - Get Instagram media for account
router.get("/media", getInstaMediaController);
// GET /api/insta/replylogs - Get Instagram reply logs
router.get("/replylogs", getInstaReplyLogsController);
// POST /api/insta/refresh-token - Refresh Instagram token
router.post("/refresh-token", refreshInstagramTokenController);

//accounts

// GET /api/insta/accounts - Get Instagram accounts for user
router.get("/accounts", getAllInstaAccountsInfoController);
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

// GET /api/insta/templates/:templateId - Update template
router.get("/templates/:templateId", getInstaTemplateByIdController);
// PUT /api/insta/templates/:templateId - Update template
router.put("/templates/:templateId", updateInstaTemplateController);
// DELETE /api/insta/templates/:templateId - Delete template
router.delete("/templates/:templateId", deleteInstaTemplateController);

export default router;
