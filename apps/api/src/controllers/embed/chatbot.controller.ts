import { generateGptResponse } from "@/services/ai.service";
import { Request, Response } from "express";
import { usedTokens } from "@/services/token.service";
import { connectToDatabase } from "@/config/database.config";
import WebChatConversation from "@/models/web/WebChatConversation.model";

// POST /api/embed/chatbot - Handle chatbot requests
export const handleChatbotRequest = async (req: Request, res: Response) => {
  try {
    // API key validation is handled by embedAuth middleware

    const {
      userInput,
      userId,
      agentId,
      fileData,
      conversationHistory,
      sessionId,
      visitorId,
    } = req.body;

    if (!userInput || !userId || !agentId) {
      return res.status(400).json({
        success: false,
        error: "Missing required fields",
        timestamp: new Date().toISOString(),
      });
    }

    await connectToDatabase();

    // Generate AI response
    const result = await generateGptResponse({
      userInput,
      userfileName: fileData || "default",
      conversationHistory: conversationHistory || [],
      clerkId: userId,
      chatbotType: agentId,
    });

    // Deduct tokens from user's balance
    const tokensUsed = result.tokens || 0;

    if (tokensUsed > 0) {
      try {
        const tokenResult = await usedTokens(
          userId,
          tokensUsed,
          agentId,
          tokensUsed * 0.0000014, // Approximate cost
        );

        // Save conversation to database
        if (sessionId) {
          try {
            const userMessage = {
              id: `user_${Date.now()}`,
              role: "user" as const,
              content: userInput,
              timestamp: new Date(),
            };

            const botMessage = {
              id: `bot_${Date.now()}`,
              role: "bot" as const,
              content: result.response,
              timestamp: new Date(),
              tokensUsed,
            };

            let conversation = await WebChatConversation.findOne({
              clerkId: userId,
              sessionId,
            });

            if (conversation) {
              // Update existing conversation
              conversation.messages.push(userMessage, botMessage);
              conversation.totalTokensUsed += tokensUsed;
              conversation.totalMessages += 2;
              conversation.lastActivity = new Date();
              await conversation.save();
            } else {
              // Create new conversation
              await WebChatConversation.create({
                chatbotType: agentId,
                clerkId: userId,
                sessionId,
                visitorId,
                messages: [userMessage, botMessage],
                totalTokensUsed: tokensUsed,
                totalMessages: 2,
                hasAppointment: false,
                status: "active",
                lastActivity: new Date(),
                tags: [],
              });
            }
          } catch (convError) {
            console.error("Error saving conversation:", convError);
            // Don't fail the request if conversation save fails
          }
        }

        return res.status(200).json({
          success: true,
          data: {
            response: result.response,
            tokens: tokensUsed,
            remainingTokens: tokenResult.remainingTokens,
            freeTokensRemaining: tokenResult.freeTokensRemaining,
            subscriptionTokensRemaining:
              tokenResult.subscriptionTokensRemaining,
          },
          timestamp: new Date().toISOString(),
        });
      } catch (tokenError: any) {
        // If insufficient tokens, return error
        if (tokenError.message === "Insufficient tokens") {
          return res.status(402).json({
            success: false,
            error:
              "Insufficient tokens. Please upgrade your plan to continue.",
            timestamp: new Date().toISOString(),
          });
        }
        throw tokenError;
      }
    }

    return res.status(200).json({
      success: true,
      data: {
        response: result.response,
        tokens: tokensUsed,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Chatbot API error:", error);
    return res.status(500).json({
      success: false,
      error: "Internal server error",
      timestamp: new Date().toISOString(),
    });
  }
};
