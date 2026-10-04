// apps/api/routes/index.ts
import { Router } from "express";
import healthRoutes from "@/routes/health";
import adminRoutes from "@/routes/admin";
import cronRoutes from "@/routes/cron";
import embedRoutes from "@/routes/embed";
import instaRoutes from "@/routes/insta";
import tokensRoutes from "@/routes/tokens";
import webRoutes from "@/routes/web";
import webhooksRoutes from "@/routes/webhooks";
import rateLimitRoutes from "@/routes/rate-limit";
import razorpayRoutes from "@/routes/razorpay";
import scrapeRoutes from "@/routes/scrape";
import userRoutes from "@/routes/user";
import miscRoutes from "@/routes/misc";
import callRoutes from "@/routes/call";
import whatsappRoutes from "@/routes/whatsapp";
import packagesRoutes from "@/routes/packages";
import platformRoutes from "@/routes/platform";
import { embedCors } from "@/middleware/embed-cors.middleware";
import { requireAutomationAccountAccess } from "@/middleware/automation-account-access.middleware";

const router = Router();

// Public routes (no authentication required)
router.use("/health", healthRoutes);
router.use("/webhooks", webhooksRoutes);

// Embed and Cron routes - apply CORS but handle auth internally
router.use("/cron", embedCors, cronRoutes);
router.use("/embed", embedCors, embedRoutes);

// Protected routes (require Clerk authentication)
router.use("/admin", adminRoutes);
router.use("/call", callRoutes);
router.use("/whatsapp", requireAutomationAccountAccess, whatsappRoutes);
router.use("/insta", requireAutomationAccountAccess, instaRoutes);
router.use("/rate-limit", requireAutomationAccountAccess, rateLimitRoutes);
router.use("/razorpay", razorpayRoutes);
router.use("/scrape", requireAutomationAccountAccess, scrapeRoutes);
router.use("/tokens", requireAutomationAccountAccess, tokensRoutes);
router.use("/web", requireAutomationAccountAccess, webRoutes);
router.use("/user", userRoutes);
router.use("/misc", miscRoutes);
router.use("/packages", requireAutomationAccountAccess, packagesRoutes);
router.use("/platform", platformRoutes);

export default router;
