import { Router } from "express";
import { requireAuth } from "@clerk/express";
import { createRazorpaySubscriptionController } from "@/controllers/razorpay/create-sub.controller";
import { verifyRazorpayPaymentController } from "@/controllers/razorpay/verify-sub.controller";
import { cancelInstaSubscriptionController } from "@/controllers/razorpay/cancel-sub.controller";
import { getRazerpayPlanInfoController } from "@/controllers/razorpay/get-planInfo.controller";

const router = Router();
router.use(requireAuth({ signInUrl: "http://localhost:3002/sign-in" }));

// GET /api/razorpay/plan/:productId - Get Razorpay planInfo
router.get("/plan/:productId", getRazerpayPlanInfoController);

// POST /api/razorpay/subscription/create - Create Razorpay subscription
router.post("/subscription/create", createRazorpaySubscriptionController);

// POST /api/razorpay/subscription/verify - Verify Razorpay payment
router.post("/subscription/verify", verifyRazorpayPaymentController);

// POST /api/razorpay/subscription/cancel - Verify Razorpay payment
router.post("/subscription/cancel", cancelInstaSubscriptionController);

export default router;
