import { Router } from "express";
import healthRoutes from "@/routes/health";
import adminRoutes from "@/routes/admin";
import affiliateRoutes from "@/routes/affiliates";
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
import { embedCors } from "@/middleware/embed-cors.middleware";

const router = Router();

// Register all routes
router.use("/admin", adminRoutes);
router.use("/affiliates", affiliateRoutes);
router.use("/cron", cronRoutes);
router.use("/embed", embedCors, embedRoutes);
router.use("/health", healthRoutes);
router.use("/insta", instaRoutes);
router.use("/rate-limit", rateLimitRoutes);
router.use("/razorpay", razorpayRoutes);
router.use("/scrape", scrapeRoutes);
router.use("/tokens", tokensRoutes);
router.use("/web", webRoutes);
router.use("/webhooks", webhooksRoutes);
router.use("/user", userRoutes);
router.use("/misc", miscRoutes);

export default router;
