import { Router } from "express";
import { scrapAnuController } from "@/controllers/web/scrape/scrap-anu.controller";
import { processScrapedDataController } from "@/controllers/web/scrape/process-data.controller";
import { requireAuth } from "@clerk/express";

const router = Router();
router.use(requireAuth());

// GET /api/scrape/scrape-anu - Scrape website with advanced level-by-level scraping
router.post("/scrap-anu", scrapAnuController);
// POST /api/scrape/process-data - Process scraped data
router.post("/process-data", processScrapedDataController);

export default router;
