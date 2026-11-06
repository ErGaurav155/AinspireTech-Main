import { Request, Response } from "express";
import { handleChatConversationRequest } from "@/controllers/embed/chat-conversation.controller";

/**
 * Backwards-compatible endpoint for older embed clients.
 *
 * Both embed endpoints deliberately use the same merge-safe persistence path.
 * Otherwise an older widget could replace a customer's complete transcript
 * with only its newest messages.
 */
export const handleConversationRequest = async (
  req: Request,
  res: Response,
) => {
  const formData = Array.isArray(req.body?.formData) ? req.body.formData : [];

  req.body = {
    ...req.body,
    sessionId:
      req.body?.sessionId ||
      `conv_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
    hasAppointment:
      Boolean(req.body?.hasAppointment) || formData.length > 0,
    status:
      req.body?.status || (formData.length > 0 ? "completed" : "active"),
  };

  return handleChatConversationRequest(req, res);
};
