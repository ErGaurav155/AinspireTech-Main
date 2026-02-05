import { Router } from "express";
import { handleChatbotRequest } from "@/controllers/embed/chatbot.controller";
import { handleConversationRequest } from "@/controllers/embed/conversation.controller";
import { handleFaqRequest } from "@/controllers/embed/faq.controller";
import { handleMcqChatbotRequest } from "@/controllers/embed/mcqchatbot.controller";
import { getTokenBalanceController } from "@/controllers/embed/token/balance.controller";
import { postTokenUsageController } from "@/controllers/embed/token/usage.controller";
import { getWebQuestionsController } from "@/controllers/embed/webquestion.controller";
import { createAppointmentController } from "@/controllers/misc/misc-actions.controller";
import { embedCors } from "@/middleware/embed-cors.middleware";

const router = Router();

// Apply CORS middleware ONLY to embed routes
router.use(embedCors);

// POST /api/embed/chatbot - Handle chatbot requests
router.post("/chatbot", handleChatbotRequest);
// POST /api/embed/conversation - Handle conversation creation
router.post("/conversation", handleConversationRequest);
// POST /api/embed/faq - Get FAQ for user and chatbot type
router.post("/faq", handleFaqRequest);
// POST /api/embed/mcqchatbot - Handle MCQ chatbot requests
router.post("/mcqchatbot", handleMcqChatbotRequest);
// GET /api/embed/token/balance - Get user's token balance
router.get("/token/balance", getTokenBalanceController);
// POST /api/embed/token/usage - Record token usage
router.post("/token/usage", postTokenUsageController);
// POST /api/embed/webquestion - Get appointment questions
router.post("/webquestion", getWebQuestionsController);
// POST /api/misc/appointments - Create a new appointment
router.post("/appointments", createAppointmentController);
export default router;
