import { getAuth } from "@clerk/express";
import { Request, Response } from "express";

// Helper function to generate analytics data based on chatbot type
const generateAnalyticsData = (chatbotType: string) => {
  const baseData = {
    "chatbot-customer-support": {
      totalConversations: Math.floor(Math.random() * 1000) + 500,
      totalMessages: Math.floor(Math.random() * 5000) + 2000,
      averageResponseTime: Math.floor(Math.random() * 10) + 2,
      satisfactionScore: Math.floor(Math.random() * 20) + 80,
      resolvedIssues: Math.floor(Math.random() * 800) + 400,
      pendingTickets: Math.floor(Math.random() * 50) + 10,
    },
    "chatbot-e-commerce": {
      totalConversations: Math.floor(Math.random() * 1500) + 800,
      totalMessages: Math.floor(Math.random() * 7000) + 3000,
      salesAssisted: Math.floor(Math.random() * 50000) + 20000,
      cartRecoveries: Math.floor(Math.random() * 200) + 100,
      conversionRate: Math.floor(Math.random() * 10) + 8,
      productInquiries: Math.floor(Math.random() * 2000) + 1000,
    },
    "chatbot-lead-generation": {
      totalConversations: Math.floor(Math.random() * 800) + 300,
      totalMessages: Math.floor(Math.random() * 3000) + 1500,
      leadsGenerated: Math.floor(Math.random() * 500) + 200,
      qualifiedLeads: Math.floor(Math.random() * 200) + 100,
      conversionRate: Math.floor(Math.random() * 8) + 5,
      formCompletions: Math.floor(Math.random() * 200) + 70,
    },
    "chatbot-education": {
      totalConversations: Math.floor(Math.random() * 2000) + 1000,
      totalMessages: Math.floor(Math.random() * 8000) + 4000,
      commentsReplied: Math.floor(Math.random() * 3000) + 1500,
      dmsAutomated: Math.floor(Math.random() * 1000) + 500,
      engagementRate: Math.floor(Math.random() * 10) + 12,
      followersGrowth: Math.floor(Math.random() * 400) + 200,
    },
  };

  return (
    baseData[chatbotType as keyof typeof baseData] ||
    baseData["chatbot-customer-support"]
  );
};

// Helper function to generate trend data for charts
const generateTrendData = () => {
  const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  return days.map((day) => ({
    name: day,
    conversations: Math.floor(Math.random() * 100) + 20,
    responses: Math.floor(Math.random() * 90) + 15,
    engagement: Math.floor(Math.random() * 80) + 10,
  }));
};

// GET /api/web/analytics/:chatbotType - Get chatbot analytics
export const getWebAnalyticsController = async (
  req: Request,
  res: Response,
) => {
  try {
    const chatbotType = (req as any).chatbotType;

    // Get userId from auth headers
    const { userId } = getAuth(req);

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: "Unauthorized",
        timestamp: new Date().toISOString(),
      });
    }

    const period = (req.query.period as string) || "7d";

    // Validate period parameter
    const validPeriods = ["1d", "7d", "30d", "90d", "1y"];
    if (!validPeriods.includes(period)) {
      return res.status(400).json({
        success: false,
        error: "Invalid period. Valid values: 1d, 7d, 30d, 90d, 1y",
        timestamp: new Date().toISOString(),
      });
    }

    // Generate analytics data based on chatbot type
    const analyticsData = {
      chatbotType,
      period,
      userId,
      overview: generateAnalyticsData(chatbotType),
      trends: generateTrendData(),
      responseTime: [
        { time: "0-30s", count: Math.floor(Math.random() * 200) + 100 },
        { time: "30s-1m", count: Math.floor(Math.random() * 150) + 50 },
        { time: "1-2m", count: Math.floor(Math.random() * 100) + 30 },
        { time: "2-5m", count: Math.floor(Math.random() * 50) + 20 },
        { time: "5m+", count: Math.floor(Math.random() * 30) + 10 },
      ],
      satisfaction: [
        {
          name: "Excellent",
          value: Math.floor(Math.random() * 20) + 40,
          color: "#00F0FF",
        },
        {
          name: "Good",
          value: Math.floor(Math.random() * 20) + 30,
          color: "#B026FF",
        },
        {
          name: "Average",
          value: Math.floor(Math.random() * 15) + 10,
          color: "#FF2E9F",
        },
        {
          name: "Poor",
          value: Math.floor(Math.random() * 10) + 5,
          color: "#666",
        },
      ],
      timestamp: new Date().toISOString(),
    };

    return res.status(200).json({
      success: true,
      data: { analytics: analyticsData },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Analytics fetch error:", error);
    return res.status(500).json({
      success: false,
      error: "Internal server error",
      timestamp: new Date().toISOString(),
    });
  }
};
