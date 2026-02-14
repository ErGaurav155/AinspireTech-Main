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

const router = Router();

// Handle OPTIONS requests for all routes
router.options("*", (req, res) => {
  res.status(200).end();
});
// Register all routes
router.use("/admin", adminRoutes);
router.use("/affiliates", affiliateRoutes);
router.use("/cron", cronRoutes);
// router.use("/embed", embedRoutes);
// CORS
router.use(
  "/embed",
  (req, res, next) => {
    // Set CORS headers for embed routes
    const origin = req.headers.origin;

    // Allow specific origins for appointments
    if (req.path.includes("/appointments")) {
      const allowedOrigins = [
        "http://localhost:3000",
        "https://app.rocketreplai.com",
      ];
      if (origin && allowedOrigins.includes(origin)) {
        res.setHeader("Access-Control-Allow-Origin", origin);
      }
    } else {
      // Allow all for other embed routes
      res.setHeader("Access-Control-Allow-Origin", "*");
    }

    res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    res.setHeader(
      "Access-Control-Allow-Headers",
      "Content-Type, x-api-key, Authorization",
    );
    res.setHeader("Access-Control-Allow-Credentials", "false");

    // Handle preflight
    if (req.method === "OPTIONS") {
      return res.status(200).end();
    }

    next();
  },
  embedRoutes,
);

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
