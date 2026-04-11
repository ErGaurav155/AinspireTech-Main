// apps/api/routes/embed/index.ts
import { Router } from "express";
import { handleChatbotRequest } from "@/controllers/embed/chatbot.controller";
import { handleConversationRequest } from "@/controllers/embed/conversation.controller";
import { handleFaqRequest } from "@/controllers/embed/faq.controller";
import { handleMcqChatbotRequest } from "@/controllers/embed/mcqchatbot.controller";
import { getTokenBalanceController } from "@/controllers/embed/token/balance.controller";
import { postTokenUsageController } from "@/controllers/embed/token/usage.controller";
import { getWebQuestionsController } from "@/controllers/embed/webquestion.controller";
import { createAppointmentController } from "@/controllers/misc/misc-actions.controller";
import { getEmbedConfigByTypeController } from "@/controllers/embed/config.controller";

const router = Router();

// All embed routes need CORS - handled by embedCors middleware in parent router
// But we also add OPTIONS handlers for each route

// Helper to handle OPTIONS for each route
const handleOptions = (req: any, res: any, next: any) => {
  if (req.method === "OPTIONS") {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    res.setHeader(
      "Access-Control-Allow-Headers",
      "Content-Type, Authorization, x-api-key",
    );
    return res.status(200).end();
  }
  next();
};

// POST /api/embed/chatbot - Handle chatbot requests
router.post("/chatbot", handleOptions, handleChatbotRequest);
// POST /api/embed/conversation - Handle conversation creation
router.post("/conversation", handleOptions, handleConversationRequest);
// POST /api/embed/faq - Get FAQ for user and chatbot type
router.post("/faq", handleOptions, handleFaqRequest);
// POST /api/embed/mcqchatbot - Handle MCQ chatbot requests
router.post("/mcqchatbot", handleOptions, handleMcqChatbotRequest);
// GET /api/embed/token/balance - Get user's token balance
router.get("/token/balance", handleOptions, getTokenBalanceController);
// POST /api/embed/token/usage - Record token usage
router.post("/token/usage", handleOptions, postTokenUsageController);

// POST /api/embed/webquestion - Get appointment questions
router.post("/webquestion", handleOptions, getWebQuestionsController);
// POST /api/embed/appointments - Create a new appointment (note: path should be /appointments not /misc/appointments)
router.post("/appointments", handleOptions, createAppointmentController);
// Get config by userId + chatbotType (used by new CDN widget)
router.get("/config-by-type", handleOptions, getEmbedConfigByTypeController);

// Also add OPTIONS handler for the route itself
router.options("/webquestion", (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, x-api-key");
  res.status(200).end();
});

router.options("/appointments", (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, x-api-key");
  res.status(200).end();
});

export default router;
