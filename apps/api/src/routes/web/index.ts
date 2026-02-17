import { Router } from "express";
import { requireAuth } from "@clerk/express";
import {
  getAppointmentQuestionsController,
  saveAppointmentQuestionsController,
} from "@/controllers/web/appointment-question.controller";
import { getWebAnalyticsController } from "@/controllers/web/analytics.controller";
import { getConversationsController } from "@/controllers/web/conversations/conversations.controller";
import { getConversationsByTypeController } from "@/controllers/web/conversations/chatbotType.controller";
import { getUserChatbotsController } from "@/controllers/web/chatbot.controller";
import { createChatbotController } from "@/controllers/web/create.controller";
import {
  deleteChatbotController,
  getChatbotByIdController,
  updateChatbotController,
} from "@/controllers/web/chatbot/chatbot.controller";
import {
  createOrUpdateFaqController,
  getFaqController,
} from "@/controllers/web/faq.controller";
import { sendOtpController } from "@/controllers/web/send-otp.controller";
import { verifyOtpController } from "@/controllers/web/verify-otp.controller";
import { listSubscriptionsController } from "@/controllers/web/subscription/list.controller";

const router = Router();

router.use(requireAuth());

//analytics
// GET /api/web/analytics/:chatbotType - Get chatbot analytics
router.get("/analytics/:chatbotType", getWebAnalyticsController);

//appointment-question
// GET /api/web/appointment-question - Get appointment questions
router.get("/appointment-question", getAppointmentQuestionsController);
// POST /api/web/appointment-question - Save appointment questions
router.post("/appointment-question", saveAppointmentQuestionsController);

//conversations
// GET /api/web/conversations - Get conversations
router.get("/conversations", getConversationsController);
// GET /api/web/conversations/:chatbotType - Get conversations by chatbot type
router.get("/conversations/:chatbotType", getConversationsByTypeController);

//chatbot
// GET /api/web/chatbot - Get all user chatbots
router.get("/chatbot/list", getUserChatbotsController);
// POST /api/web/chatbot/create - Create new chatbot
router.post("/chatbot/create", createChatbotController);
// GET /api/web/chatbot/:id - Get specific chatbot
router.get("/chatbot/:chatbot", getChatbotByIdController);
// PUT /api/web/chatbot/:id - Update chatbot
router.put("/chatbot/:chatbot", updateChatbotController);
// DELETE /api/web/chatbot/:id - Delete chatbot
router.delete("/chatbot/:chatbot", deleteChatbotController);

//faq
// GET /api/web/faq - Get FAQ
router.get("/faq", getFaqController);
// POST /api/web/faq - Create or update FAQ
router.post("/faq", createOrUpdateFaqController);

//otp
// POST /api/web/send-otp - Send OTP
router.post("/send-otp", sendOtpController);
// POST /api/web/verify-otp - Verify OTP
router.post("/verify-otp", verifyOtpController);

//subscription
// GET /api/web/subscription/list - List subscriptions
router.get("/subscription/list", listSubscriptionsController);

export default router;
