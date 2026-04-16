// apps/api/controllers/web/analytics.controller.ts
import { Request, Response } from "express";
import { getAuth } from "@clerk/express";
import { connectToDatabase } from "@/config/database.config";
import WebConversation from "@/models/web/Conversation.model";

// GET /api/web/analytics/:chatbotType - Get real chatbot analytics from database
export const getWebAnalyticsController = async (
  req: Request,
  res: Response,
) => {
  try {
    const { chatbotType } = req.params;
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

    await connectToDatabase();

    // Calculate date range based on period
    const now = new Date();
    const startDate = new Date();
    switch (period) {
      case "1d":
        startDate.setDate(now.getDate() - 1);
        break;
      case "7d":
        startDate.setDate(now.getDate() - 7);
        break;
      case "30d":
        startDate.setDate(now.getDate() - 30);
        break;
      case "90d":
        startDate.setDate(now.getDate() - 90);
        break;
      case "1y":
        startDate.setFullYear(now.getFullYear() - 1);
        break;
    }

    // Get all conversations for this user and chatbot type within the period
    const conversations = await WebConversation.find({
      clerkId: userId,
      chatbotType: chatbotType,
      createdAt: { $gte: startDate, $lte: now },
    }).lean();

    // Total conversations (total leads)
    const totalConversations = conversations.length;

    // Conversations with formData (appointments booked / qualified leads)
    const conversationsWithAppointments = conversations.filter(
      (conv: any) => conv.formData && Object.keys(conv.formData).length > 0,
    );
    const totalAppointments = conversationsWithAppointments.length;

    // Calculate conversion rate (appointments / total conversations)
    const conversionRate =
      totalConversations > 0
        ? (totalAppointments / totalConversations) * 100
        : 0;

    // Calculate average response time
    let totalResponseTime = 0;
    let responseCount = 0;

    conversations.forEach((conv: any) => {
      const messages = conv.messages || [];
      for (let i = 0; i < messages.length - 1; i++) {
        const currentMsg = messages[i];
        const nextMsg = messages[i + 1];

        // If user message followed by bot response, calculate response time
        if (currentMsg.type === "user" && nextMsg.type === "bot") {
          const responseTime =
            new Date(nextMsg.timestamp).getTime() -
            new Date(currentMsg.timestamp).getTime();
          // Only count reasonable response times (less than 5 minutes)
          if (responseTime > 0 && responseTime < 300000) {
            totalResponseTime += responseTime;
            responseCount++;
          }
        }
      }
    });

    const averageResponseTime =
      responseCount > 0
        ? Math.round(totalResponseTime / responseCount / 1000) // Convert to seconds
        : 0;

    // Generate trend data for charts (daily breakdown)
    const trendData = generateTrendData(conversations, startDate, now, period);

    // Calculate response time distribution
    const responseTimeDistribution =
      calculateResponseTimeDistribution(conversations);

    // Get recent conversations for the period
    const recentConversations = conversations
      .sort(
        (a: any, b: any) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      )
      .slice(0, 10);

    // Build overview based on chatbot type
    let overview: any = {
      totalConversations,
      totalMessages: conversations.reduce(
        (sum: number, conv: any) => sum + (conv.messages?.length || 0),
        0,
      ),
      averageResponseTime,
    };

    if (chatbotType === "chatbot-lead-generation") {
      overview = {
        ...overview,
        totalLeads: totalConversations,
        qualifiedLeads: totalAppointments,
        conversionRate: Math.round(conversionRate * 10) / 10,
        formCompletions: totalAppointments,
      };
    } else if (chatbotType === "chatbot-education") {
      // For education, calculate additional metrics
      const completedQuizzes = conversations.filter(
        (conv: any) =>
          conv.status === "resolved" || conv.status === "completed",
      ).length;

      const scores: number[] = [];
      conversations.forEach((conv: any) => {
        if (conv.score && typeof conv.score === "number") {
          scores.push(conv.score);
        }
      });

      const averageScore =
        scores.length > 0
          ? scores.reduce((a, b) => a + b, 0) / scores.length
          : 0;

      overview = {
        ...overview,
        totalStudents: totalConversations,
        completedQuizzes,
        averageScore: Math.round(averageScore * 10) / 10,
        totalQuestions: conversations.reduce(
          (sum: number, conv: any) => sum + (conv.totalQuestions || 0),
          0,
        ),
      };
    }

    const analyticsData = {
      chatbotType,
      period,
      userId,
      overview,
      trends: trendData,
      responseTime: responseTimeDistribution,
      recentConversations: recentConversations.map((conv: any) => ({
        id: conv._id,
        customerName: conv.customerName || "Anonymous",
        customerEmail: conv.customerEmail,
        messagesCount: conv.messages?.length || 0,
        hasAppointment: !!(
          conv.formData && Object.keys(conv.formData).length > 0
        ),
        status: conv.status,
        createdAt: conv.createdAt,
        updatedAt: conv.updatedAt,
      })),
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

// Helper function to generate trend data based on period
function generateTrendData(
  conversations: any[],
  startDate: Date,
  endDate: Date,
  period: string,
) {
  const trends: any[] = [];
  const currentDate = new Date(startDate);
  const now = new Date(endDate);

  // Determine interval based on period
  let interval: "hour" | "day" | "week" | "month" = "day";
  if (period === "1d") interval = "hour";
  else if (period === "7d" || period === "30d") interval = "day";
  else if (period === "90d") interval = "week";
  else interval = "month";

  while (currentDate <= now) {
    const periodStart = new Date(currentDate);
    let periodEnd = new Date(currentDate);
    let label = "";

    switch (interval) {
      case "hour":
        periodEnd.setHours(periodStart.getHours() + 1);
        label = periodStart.toLocaleTimeString("en-US", {
          hour: "numeric",
          hour12: true,
        });
        break;
      case "day":
        periodEnd.setDate(periodStart.getDate() + 1);
        label = periodStart.toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
        });
        break;
      case "week":
        periodEnd.setDate(periodStart.getDate() + 7);
        label = `Week of ${periodStart.toLocaleDateString("en-US", { month: "short", day: "numeric" })}`;
        break;
      case "month":
        periodEnd.setMonth(periodStart.getMonth() + 1);
        label = periodStart.toLocaleDateString("en-US", {
          month: "short",
          year: "2-digit",
        });
        break;
    }

    // Count conversations in this period
    const periodConversations = conversations.filter((conv: any) => {
      const convDate = new Date(conv.createdAt);
      return convDate >= periodStart && convDate < periodEnd;
    });

    const appointmentsInPeriod = periodConversations.filter(
      (conv: any) => conv.formData && Object.keys(conv.formData).length > 0,
    ).length;

    trends.push({
      date: label,
      timestamp: periodStart.toISOString(),
      conversations: periodConversations.length,
      appointments: appointmentsInPeriod,
      conversionRate:
        periodConversations.length > 0
          ? (appointmentsInPeriod / periodConversations.length) * 100
          : 0,
    });

    currentDate.setTime(periodEnd.getTime());
  }

  return trends;
}

// Helper function to calculate response time distribution
function calculateResponseTimeDistribution(conversations: any[]) {
  const distribution = [
    { time: "0-30s", range: [0, 30], count: 0 },
    { time: "30s-1m", range: [30, 60], count: 0 },
    { time: "1-2m", range: [60, 120], count: 0 },
    { time: "2-5m", range: [120, 300], count: 0 },
    { time: "5m+", range: [300, Infinity], count: 0 },
  ];

  conversations.forEach((conv: any) => {
    const messages = conv.messages || [];
    for (let i = 0; i < messages.length - 1; i++) {
      const currentMsg = messages[i];
      const nextMsg = messages[i + 1];

      if (currentMsg.type === "user" && nextMsg.type === "bot") {
        const responseTime =
          (new Date(nextMsg.timestamp).getTime() -
            new Date(currentMsg.timestamp).getTime()) /
          1000;

        if (responseTime > 0) {
          const bucket = distribution.find(
            (d) => responseTime >= d.range[0] && responseTime < d.range[1],
          );
          if (bucket) bucket.count++;
        }
      }
    }
  });

  return distribution;
}
