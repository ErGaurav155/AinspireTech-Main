import { Router } from "express";
import { requireAuth } from "@clerk/express";
import { createRazorpaySubscriptionController } from "@/controllers/razorpay/create-sub.controller";
import { verifyRazorpayPaymentController } from "@/controllers/razorpay/verify-sub.controller";
import { cancelInstaSubscriptionController } from "@/controllers/razorpay/cancel-sub.controller";
import { getRazerpayPlanInfoController } from "@/controllers/razorpay/get-planInfo.controller";
import { razorpayCheckoutCallbackController } from "@/controllers/razorpay/checkout-callback.controller";
import {
  createTestRazorpaySubscriptionController,
  getTestRazorpaySubscriptionStatusController,
  verifyTestRazorpaySubscriptionController,
} from "@/controllers/razorpay/test-sub.controller";
import {
  createTestRazorpayOrderController,
  getTestRazorpayOrderStatusController,
  verifyTestRazorpayOrderController,
} from "@/controllers/razorpay/test-order.controller";

const router = Router();

router.get("/checkout-callback", razorpayCheckoutCallbackController);
router.post("/checkout-callback", razorpayCheckoutCallbackController);

router.use(requireAuth());

// GET /api/razorpay/plan/:productId - Get Razorpay planInfo
router.get("/plan/:productId", getRazerpayPlanInfoController);

// POST /api/razorpay/subscription/create - Create Razorpay subscription
router.post("/subscription/create", createRazorpaySubscriptionController);

// POST /api/razorpay/subscription/verify - Verify Razorpay payment
router.post("/subscription/verify", verifyRazorpayPaymentController);

// POST /api/razorpay/subscription/cancel - Verify Razorpay payment
router.post("/subscription/cancel", cancelInstaSubscriptionController);

// POST /api/razorpay/test-subscription/create - Create isolated Razorpay test subscription
router.post(
  "/test-subscription/create",
  createTestRazorpaySubscriptionController,
);

// POST /api/razorpay/test-subscription/verify - Verify isolated Razorpay test subscription
router.post(
  "/test-subscription/verify",
  verifyTestRazorpaySubscriptionController,
);

// GET /api/razorpay/test-subscription/:subscriptionId/status - Fetch isolated Razorpay test status
router.get(
  "/test-subscription/:subscriptionId/status",
  getTestRazorpaySubscriptionStatusController,
);

router.post("/test-order/create", createTestRazorpayOrderController);
router.post("/test-order/verify", verifyTestRazorpayOrderController);
router.get("/test-order/:orderId/status", getTestRazorpayOrderStatusController);

export default router;
