import { Router } from "express";
import { getAllAppointmentsController } from "@/controllers/admin/appointment.controller";
import { getInstaSubscriptionsController } from "@/controllers/admin/insta-subscription.controller";
import { requireOwner } from "@/middleware/auth.middleware";
import { getUsersController } from "@/controllers/admin/users.controller";
import { getWebSubscriptionsController } from "@/controllers/admin/web-subscription.controller";
import { requireAuth } from "@clerk/express";
import { verifyOwnerController } from "@/controllers/admin/verify-owner.controller";

const router = Router();

router.use(requireAuth({ signInUrl: "http://localhost:3002/sign-in" }));

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

export default router;
