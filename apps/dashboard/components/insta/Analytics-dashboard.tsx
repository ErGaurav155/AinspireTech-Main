"use client";

import { useAuth } from "@clerk/nextjs";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
  AreaChart,
  Area,
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
} from "recharts";
import { useTheme } from "next-themes";
import { useRouter } from "next/navigation";
import { tailwindHexColors } from "@rocketreplai/shared";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@rocketreplai/ui/components/radix/tabs";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@rocketreplai/ui/components/radix/card";
import {
  Activity,
  TrendingUp,
  Target,
  Clock,
  MessageSquare,
  Users,
  BarChart3,
  Zap,
  Calendar,
  TrendingDown,
  Sparkles,
  ArrowUpRight,
  ArrowDownRight,
} from "lucide-react";
import { Button } from "@rocketreplai/ui/components/radix/button";
import { Badge } from "@rocketreplai/ui/components/radix/badge";

export interface TemplateChartData {
  name: string;
  value: number;
  color: string;
  percentage?: number;
}

export interface SentimentChartData {
  category: string;
  value: number;
  color: string;
}

export interface DailyDataPoint {
  date: string;
  comments: number;
  replies: number;
  engagement: number;
  reach: number;
  conversions: number;
}

export interface TimeSeriesData {
  hour: string;
  engagement: number;
  replies: number;
  successRate: number;
}

export interface PerformanceMetrics {
  totalEngagement: number;
  avgResponseTime: number;
  peakHour: string;
  conversionRate: number;
  growthRate: number;
}

export function AnalyticsDashboard({ templates }: { templates: any[] }) {
  const { userId, isLoaded } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { theme, resolvedTheme } = useTheme();
  const currentTheme = resolvedTheme || theme || "light";
  const router = useRouter();

  // State for all data
  const [templateData, setTemplateData] = useState<TemplateChartData[]>([]);
  const [sentimentData, setSentimentData] = useState<SentimentChartData[]>([]);
  const [dailyData, setDailyData] = useState<DailyDataPoint[]>([]);
  const [performanceData, setPerformanceData] = useState<any[]>([]);
  const [timeSeriesData, setTimeSeriesData] = useState<TimeSeriesData[]>([]);
  const [metrics, setMetrics] = useState<PerformanceMetrics>({
    totalEngagement: 0,
    avgResponseTime: 0,
    peakHour: "N/A",
    conversionRate: 0,
    growthRate: 0,
  });

  // Theme-based styles
  const themeStyles = useMemo(() => {
    const isDark = currentTheme === "dark";
    return {
      containerBg: isDark ? "bg-[#0a0a0a]" : "bg-gray-50",
      textPrimary: isDark ? "text-white" : "text-gray-900",
      textSecondary: isDark ? "text-gray-300" : "text-gray-600",
      textMuted: isDark ? "text-gray-400" : "text-gray-500",
      cardBg: isDark ? "bg-[#0a0a0a]/60" : "bg-white/80",
      cardBorder: isDark ? "border-white/10" : "border-gray-200",
      tabBg: isDark ? "bg-[#0a0a0a]/60" : "bg-white/60",
      tabBorder: isDark ? "border-gray-900" : "border-gray-300",
      chartGridColor: isDark ? "#374151" : "#E5E7EB",
      chartAxisColor: isDark ? "#9CA3AF" : "#6B7280",
      tooltipBg: isDark ? "#1F2937" : "#FFFFFF",
      tooltipBorder: isDark ? "#374151" : "#E5E7EB",
      tooltipText: isDark ? "#FFFFFF" : "#111827",
      gradientStart: isDark ? "#B026FF" : "#8B5CF6",
      gradientEnd: isDark ? "#00F0FF" : "#06B6D4",
      positiveColor: isDark ? "#10B981" : "#059669",
      negativeColor: isDark ? "#EF4444" : "#DC2626",
      neutralColor: isDark ? "#6B7280" : "#4B5563",
    };
  }, [currentTheme]);

  // Generate mock time series data for hourly trends
  const generateTimeSeriesData = useCallback(() => {
    const data: TimeSeriesData[] = [];
    const hours = [
      "12AM",
      "1AM",
      "2AM",
      "3AM",
      "4AM",
      "5AM",
      "6AM",
      "7AM",
      "8AM",
      "9AM",
      "10AM",
      "11AM",
      "12PM",
      "1PM",
      "2PM",
      "3PM",
      "4PM",
      "5PM",
      "6PM",
      "7PM",
      "8PM",
      "9PM",
      "10PM",
      "11PM",
    ];

    let peakEngagement = 0;
    let peakHour = "12AM";

    hours.forEach((hour, index) => {
      // Simulate engagement patterns (higher during business hours)
      let engagement = 0;
      if (index >= 9 && index <= 17) {
        // 9AM to 5PM
        engagement = Math.floor(Math.random() * 80) + 40;
      } else if (index >= 19 && index <= 23) {
        // 7PM to 11PM
        engagement = Math.floor(Math.random() * 60) + 30;
      } else {
        engagement = Math.floor(Math.random() * 30) + 10;
      }

      const replies = Math.floor(engagement * (0.85 + Math.random() * 0.15));
      const successRate = 85 + Math.random() * 10;

      if (engagement > peakEngagement) {
        peakEngagement = engagement;
        peakHour = hour;
      }

      data.push({
        hour,
        engagement,
        replies,
        successRate: parseFloat(successRate.toFixed(1)),
      });
    });

    return { data, peakHour };
  }, []);

  // Generate enhanced daily data with more metrics
  const generateDailyData = useCallback(() => {
    const data: DailyDataPoint[] = [];
    const today = new Date();

    for (let i = 6; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dateStr = date.toLocaleDateString("en-US", {
        weekday: "short",
        month: "short",
        day: "numeric",
      });

      const baseEngagement = 20 + i * 5; // Simulating growth
      const comments = Math.floor(baseEngagement * (1.5 + Math.random() * 0.5));
      const replies = Math.floor(comments * (0.92 + Math.random() * 0.05));
      const engagement = parseFloat(((replies / comments) * 100).toFixed(1));
      const reach = Math.floor(comments * (10 + Math.random() * 20));
      const conversions = Math.floor(replies * (0.1 + Math.random() * 0.05));

      data.push({
        date: dateStr,
        comments,
        replies,
        engagement,
        reach,
        conversions,
      });
    }

    return data;
  }, []);

  // Generate performance data with more metrics
  const generatePerformanceData = useCallback((templates: any[]) => {
    return templates
      .map((template) => ({
        name:
          template.name.length > 15
            ? template.name.substring(0, 15) + "..."
            : template.name,
        usage: template.usageCount || 0,
        successRate:
          template.successRate || Math.floor(Math.random() * 15) + 85,
        avgResponseTime: Math.floor(Math.random() * 5000) + 1000,
        engagement: Math.floor(Math.random() * 80) + 20,
        conversion: Math.floor(Math.random() * 30) + 5,
        costPerReply: parseFloat((Math.random() * 0.5 + 0.1).toFixed(2)),
      }))
      .slice(0, 8)
      .sort((a, b) => b.usage - a.usage);
  }, []);

  // Calculate performance metrics
  const calculateMetrics = useCallback(
    (
      templates: any[],
      dailyData: DailyDataPoint[],
      timeSeriesData: TimeSeriesData[],
    ) => {
      const totalEngagement = dailyData.reduce(
        (sum, day) => sum + day.engagement,
        0,
      );
      const totalComments = dailyData.reduce(
        (sum, day) => sum + day.comments,
        0,
      );
      const totalReplies = dailyData.reduce((sum, day) => sum + day.replies, 0);
      const totalConversions = dailyData.reduce(
        (sum, day) => sum + day.conversions,
        0,
      );

      const avgResponseTime =
        templates.length > 0
          ? templates.reduce(
              (sum, template) => sum + (template.avgResponseTime || 2500),
              0,
            ) / templates.length
          : 2500;

      const conversionRate =
        totalReplies > 0 ? (totalConversions / totalReplies) * 100 : 0;

      // Calculate growth rate (comparing last day to average of previous days)
      const lastDay = dailyData[dailyData.length - 1];
      const previousDaysAvg =
        dailyData.slice(0, -1).reduce((sum, day) => sum + day.replies, 0) /
        (dailyData.length - 1);
      const growthRate =
        previousDaysAvg > 0
          ? ((lastDay.replies - previousDaysAvg) / previousDaysAvg) * 100
          : 0;

      const { peakHour } = generateTimeSeriesData();

      return {
        totalEngagement: parseFloat(totalEngagement.toFixed(1)),
        avgResponseTime: Math.round(avgResponseTime),
        peakHour,
        conversionRate: parseFloat(conversionRate.toFixed(1)),
        growthRate: parseFloat(growthRate.toFixed(1)),
      };
    },
    [generateTimeSeriesData],
  );

  useEffect(() => {
    if (!isLoaded) {
      return;
    }
    if (!userId) {
      router.push("/sign-in");
      return;
    }

    if (templates && templates.length > 0) {
      try {
        // Calculate total usage count
        const totalUsageCount = templates.reduce(
          (sum: number, template: any) => sum + (template.usageCount || 0),
          0,
        );

        // Transform template data
        const transformedData = templates
          .map((template: any, index: number) => ({
            name:
              template.name.length > 15
                ? template.name.substring(0, 15) + "..."
                : template.name,
            value: template.usageCount || 0,
            color: tailwindHexColors[index % tailwindHexColors.length],
            percentage:
              totalUsageCount > 0
                ? parseFloat(
                    ((template.usageCount / totalUsageCount) * 100).toFixed(1),
                  )
                : 0,
          }))
          .sort((a, b) => b.value - a.value)
          .slice(0, 8);

        setTemplateData(transformedData);

        // Calculate sentiment data based on template usage
        const adjustSentimentPercentages = () => {
          let positiveScore = 0;
          let neutralScore = 0;
          let negativeScore = 0;

          templates.forEach((template: any) => {
            const usage = template.usageCount || 1;
            const name = template.name.toLowerCase();

            if (
              name.includes("thank") ||
              name.includes("welcome") ||
              name.includes("great") ||
              name.includes("awesome") ||
              name.includes("perfect") ||
              name.includes("love") ||
              name.includes("happy") ||
              name.includes("excited") ||
              name.includes("congrat")
            ) {
              positiveScore += usage;
            } else if (
              name.includes("issue") ||
              name.includes("problem") ||
              name.includes("sorry") ||
              name.includes("apology") ||
              name.includes("complaint") ||
              name.includes("help") ||
              name.includes("urgent") ||
              name.includes("refund") ||
              name.includes("cancel")
            ) {
              negativeScore += usage;
            } else {
              neutralScore += usage;
            }
          });

          const total = positiveScore + neutralScore + negativeScore || 1;

          setSentimentData([
            {
              category: "Positive",
              value: parseFloat(((positiveScore / total) * 100).toFixed(1)),
              color: themeStyles.positiveColor,
            },
            {
              category: "Neutral",
              value: parseFloat(((neutralScore / total) * 100).toFixed(1)),
              color: themeStyles.neutralColor,
            },
            {
              category: "Negative",
              value: parseFloat(((negativeScore / total) * 100).toFixed(1)),
              color: themeStyles.negativeColor,
            },
          ]);
        };

        adjustSentimentPercentages();

        // Generate data
        const daily = generateDailyData();
        setDailyData(daily);

        const performance = generatePerformanceData(templates);
        setPerformanceData(performance);

        const timeSeries = generateTimeSeriesData();
        setTimeSeriesData(timeSeries.data);

        // Calculate metrics
        const calculatedMetrics = calculateMetrics(
          templates,
          daily,
          timeSeries.data,
        );
        setMetrics(calculatedMetrics);

        setIsLoading(false);
      } catch (error) {
        console.error("Error processing template data:", error);
        setError("Failed to load analytics data");
        setIsLoading(false);
      }
    } else {
      setIsLoading(false);
    }
  }, [
    templates,
    userId,
    isLoaded,
    router,
    generateDailyData,
    generatePerformanceData,
    generateTimeSeriesData,
    calculateMetrics,
    themeStyles,
  ]);

  // Custom tooltip for charts
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div
          className={`p-3 rounded-lg shadow-lg border ${themeStyles.tooltipBorder} ${themeStyles.tooltipBg}`}
        >
          <p className={`font-semibold ${themeStyles.tooltipText}`}>{label}</p>
          {payload.map((entry: any, index: number) => (
            <p
              key={index}
              className={`text-sm ${themeStyles.tooltipText}`}
              style={{ color: entry.color }}
            >
              {entry.dataKey === "engagement" && "Engagement: "}
              {entry.dataKey === "replies" && "Replies: "}
              {entry.dataKey === "successRate" && "Success Rate: "}
              {entry.dataKey === "comments" && "Comments: "}
              {entry.dataKey === "conversions" && "Conversions: "}
              {entry.dataKey === "reach" && "Reach: "}
              {entry.dataKey === "usage" && "Usage: "}
              {entry.value}
              {entry.dataKey === "successRate" || entry.dataKey === "engagement"
                ? "%"
                : ""}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  // Format large numbers
  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  if (isLoading || !isLoaded) {
    return (
      <div
        className={`min-h-64 ${themeStyles.textPrimary} flex items-center justify-center ${themeStyles.containerBg}`}
      >
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#00F0FF] mx-auto mb-4"></div>
          <p className={themeStyles.textSecondary}>Loading analytics...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div
        className={`text-center py-12 ${themeStyles.cardBg} ${themeStyles.cardBorder} rounded-lg`}
      >
        <div className="p-3 rounded-full bg-red-500/10 w-16 h-16 mx-auto mb-4 flex items-center justify-center">
          <Activity className="h-8 w-8 text-red-500" />
        </div>
        <h3 className={`text-lg font-semibold mb-2 ${themeStyles.textPrimary}`}>
          Error Loading Analytics
        </h3>
        <p className={themeStyles.textSecondary}>{error}</p>
        <Button
          onClick={() => window.location.reload()}
          className="mt-4"
          variant="outline"
        >
          Retry
        </Button>
      </div>
    );
  }

  if (!templates || templates.length === 0) {
    return (
      <div
        className={`text-center py-12 ${themeStyles.cardBg} ${themeStyles.cardBorder} rounded-lg`}
      >
        <MessageSquare className="h-12 w-12 mx-auto text-gray-500 mb-4" />
        <h3 className={`text-lg font-semibold mb-2 ${themeStyles.textPrimary}`}>
          No Template Analytics
        </h3>
        <p className={themeStyles.textSecondary}>
          Analytics will appear here once you create and use templates
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8 mb-10">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className={`text-3xl font-bold mb-2 ${themeStyles.textPrimary}`}>
            Template Analytics Dashboard
          </h2>
          <p className={`${themeStyles.textSecondary} font-montserrat`}>
            Track your template performance and engagement metrics
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="flex items-center gap-1">
            <Calendar className="h-3 w-3" />
            Last 7 days
          </Badge>
          <Button variant="outline" size="sm">
            <Sparkles className="h-4 w-4 mr-2" />
            Insights
          </Button>
        </div>
      </div>

      {/* Performance Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card
          className={`${themeStyles.cardBg} ${themeStyles.cardBorder} hover:shadow-lg transition-shadow`}
        >
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className={`text-sm ${themeStyles.textMuted}`}>
                  Total Engagement
                </p>
                <p className={`text-2xl font-bold ${themeStyles.textPrimary}`}>
                  {formatNumber(metrics.totalEngagement)}%
                </p>
              </div>
              <div
                className={`p-3 rounded-full ${metrics.growthRate >= 0 ? "bg-green-500/10" : "bg-red-500/10"}`}
              >
                {metrics.growthRate >= 0 ? (
                  <ArrowUpRight className="h-6 w-6 text-green-500" />
                ) : (
                  <ArrowDownRight className="h-6 w-6 text-red-500" />
                )}
              </div>
            </div>
            <div className="flex items-center mt-2">
              {metrics.growthRate >= 0 ? (
                <span className="text-xs text-green-500 flex items-center">
                  <TrendingUp className="h-3 w-3 mr-1" />+
                  {metrics.growthRate.toFixed(1)}%
                </span>
              ) : (
                <span className="text-xs text-red-500 flex items-center">
                  <TrendingDown className="h-3 w-3 mr-1" />
                  {metrics.growthRate.toFixed(1)}%
                </span>
              )}
              <span className={`text-xs ${themeStyles.textMuted} ml-2`}>
                vs last period
              </span>
            </div>
          </CardContent>
        </Card>

        <Card
          className={`${themeStyles.cardBg} ${themeStyles.cardBorder} hover:shadow-lg transition-shadow`}
        >
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className={`text-sm ${themeStyles.textMuted}`}>
                  Conversion Rate
                </p>
                <p className={`text-2xl font-bold ${themeStyles.textPrimary}`}>
                  {metrics.conversionRate.toFixed(1)}%
                </p>
              </div>
              <div className="p-3 rounded-full bg-purple-500/10">
                <Target className="h-6 w-6 text-purple-500" />
              </div>
            </div>
            <p className={`text-xs ${themeStyles.textMuted} mt-2`}>
              From{" "}
              {dailyData
                .reduce((sum, day) => sum + day.replies, 0)
                .toLocaleString()}{" "}
              replies
            </p>
          </CardContent>
        </Card>

        <Card
          className={`${themeStyles.cardBg} ${themeStyles.cardBorder} hover:shadow-lg transition-shadow`}
        >
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className={`text-sm ${themeStyles.textMuted}`}>
                  Avg. Response Time
                </p>
                <p className={`text-2xl font-bold ${themeStyles.textPrimary}`}>
                  {(metrics.avgResponseTime / 1000).toFixed(1)}s
                </p>
              </div>
              <div className="p-3 rounded-full bg-blue-500/10">
                <Clock className="h-6 w-6 text-blue-500" />
              </div>
            </div>
            <p className={`text-xs ${themeStyles.textMuted} mt-2`}>
              Peak hour: {metrics.peakHour}
            </p>
          </CardContent>
        </Card>

        <Card
          className={`${themeStyles.cardBg} ${themeStyles.cardBorder} hover:shadow-lg transition-shadow`}
        >
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className={`text-sm ${themeStyles.textMuted}`}>
                  Active Templates
                </p>
                <p className={`text-2xl font-bold ${themeStyles.textPrimary}`}>
                  {templates.filter((t: any) => t.isActive).length}/
                  {templates.length}
                </p>
              </div>
              <div className="p-3 rounded-full bg-yellow-500/10">
                <Users className="h-6 w-6 text-yellow-500" />
              </div>
            </div>
            <p className={`text-xs ${themeStyles.textMuted} mt-2`}>
              {templateData.length > 0
                ? `${templateData[0].percentage?.toFixed(1)}%`
                : "0%"}{" "}
              top template
            </p>
          </CardContent>
        </Card>

        <Card
          className={`${themeStyles.cardBg} ${themeStyles.cardBorder} hover:shadow-lg transition-shadow`}
        >
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className={`text-sm ${themeStyles.textMuted}`}>
                  Total Reach
                </p>
                <p className={`text-2xl font-bold ${themeStyles.textPrimary}`}>
                  {formatNumber(
                    dailyData.reduce((sum, day) => sum + day.reach, 0),
                  )}
                </p>
              </div>
              <div className="p-3 rounded-full bg-cyan-500/10">
                <Zap className="h-6 w-6 text-cyan-500" />
              </div>
            </div>
            <p className={`text-xs ${themeStyles.textMuted} mt-2`}>
              {formatNumber(dailyData[dailyData.length - 1]?.reach || 0)} today
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="trends" className="space-y-6">
        <TabsList
          className={`${themeStyles.tabBg} ${themeStyles.tabBorder} border min-h-max flex flex-wrap items-center justify-start max-w-max gap-1 md:gap-3 w-full grid-cols-5`}
        >
          <TabsTrigger
            value="trends"
            className="data-[state=active]:text-black data-[state=active]:bg-gradient-to-r data-[state=active]:from-[#B026FF] data-[state=active]:to-[#00F0FF]"
          >
            <TrendingUp className="h-4 w-4 mr-2" />
            Trends
          </TabsTrigger>
          <TabsTrigger
            value="performance"
            className="data-[state=active]:text-black data-[state=active]:bg-gradient-to-r data-[state=active]:from-[#B026FF] data-[state=active]:to-[#00F0FF]"
          >
            <Activity className="h-4 w-4 mr-2" />
            Performance
          </TabsTrigger>
          <TabsTrigger
            value="templates"
            className="data-[state=active]:text-black data-[state=active]:bg-gradient-to-r data-[state=active]:from-[#B026FF] data-[state=active]:to-[#00F0FF]"
          >
            <BarChart3 className="h-4 w-4 mr-2" />
            Templates
          </TabsTrigger>
          <TabsTrigger
            value="sentiment"
            className="data-[state=active]:text-black data-[state=active]:bg-gradient-to-r data-[state=active]:from-[#B026FF] data-[state=active]:to-[#00F0FF]"
          >
            <MessageSquare className="h-4 w-4 mr-2" />
            Sentiment
          </TabsTrigger>
          <TabsTrigger
            value="insights"
            className="data-[state=active]:text-black data-[state=active]:bg-gradient-to-r data-[state=active]:from-[#B026FF] data-[state=active]:to-[#00F0FF]"
          >
            <Sparkles className="h-4 w-4 mr-2" />
            Insights
          </TabsTrigger>
        </TabsList>

        {/* Trends Tab - COMPLETED SECTION */}
        <TabsContent value="trends" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card
              className={`${themeStyles.cardBg} backdrop-blur-sm ${themeStyles.cardBorder}`}
            >
              <CardHeader>
                <CardTitle className={themeStyles.textPrimary}>
                  Daily Engagement Trends
                </CardTitle>
                <CardDescription className={themeStyles.textSecondary}>
                  Comments, replies, and engagement rate over the last 7 days
                </CardDescription>
              </CardHeader>
              <CardContent className="p-0 overflow-x-auto">
                <ResponsiveContainer width="100%" height={350}>
                  <AreaChart data={dailyData}>
                    <defs>
                      <linearGradient
                        id="colorEngagement"
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="1"
                      >
                        <stop
                          offset="5%"
                          stopColor={themeStyles.gradientStart}
                          stopOpacity={0.8}
                        />
                        <stop
                          offset="95%"
                          stopColor={themeStyles.gradientStart}
                          stopOpacity={0}
                        />
                      </linearGradient>
                      <linearGradient
                        id="colorReplies"
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="1"
                      >
                        <stop
                          offset="5%"
                          stopColor={themeStyles.gradientEnd}
                          stopOpacity={0.8}
                        />
                        <stop
                          offset="95%"
                          stopColor={themeStyles.gradientEnd}
                          stopOpacity={0}
                        />
                      </linearGradient>
                    </defs>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke={themeStyles.chartGridColor}
                    />
                    <XAxis dataKey="date" stroke={themeStyles.chartAxisColor} />
                    <YAxis stroke={themeStyles.chartAxisColor} />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend />
                    <Area
                      type="monotone"
                      dataKey="engagement"
                      name="Engagement Rate (%)"
                      stroke={themeStyles.gradientStart}
                      fill="url(#colorEngagement)"
                      strokeWidth={2}
                    />
                    <Area
                      type="monotone"
                      dataKey="replies"
                      name="Replies"
                      stroke={themeStyles.gradientEnd}
                      fill="url(#colorReplies)"
                      strokeWidth={2}
                    />
                    <Line
                      type="monotone"
                      dataKey="comments"
                      name="Comments"
                      stroke="#FF2E9F"
                      strokeWidth={2}
                      dot={{ r: 4 }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card
              className={`${themeStyles.cardBg} backdrop-blur-sm ${themeStyles.cardBorder}`}
            >
              <CardHeader>
                <CardTitle className={themeStyles.textPrimary}>
                  Hourly Engagement Patterns
                </CardTitle>
                <CardDescription className={themeStyles.textSecondary}>
                  Engagement and success rates throughout the day
                </CardDescription>
              </CardHeader>
              <CardContent className="p-0 overflow-x-auto">
                <ResponsiveContainer width="100%" height={350}>
                  <LineChart data={timeSeriesData}>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke={themeStyles.chartGridColor}
                    />
                    <XAxis
                      dataKey="hour"
                      stroke={themeStyles.chartAxisColor}
                      interval={2}
                    />
                    <YAxis stroke={themeStyles.chartAxisColor} />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="engagement"
                      name="Engagement"
                      stroke={themeStyles.gradientStart}
                      strokeWidth={3}
                      dot={{ r: 4 }}
                      activeDot={{ r: 6 }}
                    />
                    <Line
                      type="monotone"
                      dataKey="successRate"
                      name="Success Rate (%)"
                      stroke={themeStyles.gradientEnd}
                      strokeWidth={2}
                      strokeDasharray="5 5"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className={`${themeStyles.cardBg} ${themeStyles.cardBorder}`}>
              <CardHeader>
                <CardTitle className={`text-lg ${themeStyles.textPrimary}`}>
                  Peak Performance Hours
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className={themeStyles.textSecondary}>
                      Peak Engagement
                    </span>
                    <span
                      className={`font-semibold ${themeStyles.textPrimary}`}
                    >
                      {metrics.peakHour}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className={themeStyles.textSecondary}>
                      Avg. Daily Engagement
                    </span>
                    <span
                      className={`font-semibold ${themeStyles.textPrimary}`}
                    >
                      {(
                        dailyData.reduce(
                          (sum, day) => sum + day.engagement,
                          0,
                        ) / dailyData.length
                      ).toFixed(1)}
                      %
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className={themeStyles.textSecondary}>
                      Best Performing Day
                    </span>
                    <span
                      className={`font-semibold ${themeStyles.textPrimary}`}
                    >
                      {
                        dailyData.reduce((max, day) =>
                          day.engagement > max.engagement ? day : max,
                        ).date
                      }
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className={`${themeStyles.cardBg} ${themeStyles.cardBorder}`}>
              <CardHeader>
                <CardTitle className={`text-lg ${themeStyles.textPrimary}`}>
                  Conversion Funnel
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="space-y-1">
                    <div className="flex justify-between">
                      <span className={themeStyles.textSecondary}>
                        Comments
                      </span>
                      <span className={themeStyles.textPrimary}>
                        {dailyData
                          .reduce((sum, day) => sum + day.comments, 0)
                          .toLocaleString()}
                      </span>
                    </div>
                    <Progress value={100} className="h-2" />
                  </div>
                  <div className="space-y-1">
                    <div className="flex justify-between">
                      <span className={themeStyles.textSecondary}>
                        Replies Sent
                      </span>
                      <span className={themeStyles.textPrimary}>
                        {dailyData
                          .reduce((sum, day) => sum + day.replies, 0)
                          .toLocaleString()}
                      </span>
                    </div>
                    <Progress
                      value={
                        (dailyData.reduce((sum, day) => sum + day.replies, 0) /
                          dailyData.reduce(
                            (sum, day) => sum + day.comments,
                            0,
                          ) || 0) * 100
                      }
                      className="h-2 bg-blue-500/20"
                    />
                  </div>
                  <div className="space-y-1">
                    <div className="flex justify-between">
                      <span className={themeStyles.textSecondary}>
                        Conversions
                      </span>
                      <span className={themeStyles.textPrimary}>
                        {dailyData
                          .reduce((sum, day) => sum + day.conversions, 0)
                          .toLocaleString()}
                      </span>
                    </div>
                    <Progress
                      value={metrics.conversionRate}
                      className="h-2 bg-green-500/20"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className={`${themeStyles.cardBg} ${themeStyles.cardBorder}`}>
              <CardHeader>
                <CardTitle className={`text-lg ${themeStyles.textPrimary}`}>
                  Growth Metrics
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center">
                    <div
                      className={`p-2 rounded-lg ${metrics.growthRate >= 0 ? "bg-green-500/10" : "bg-red-500/10"} mr-3`}
                    >
                      {metrics.growthRate >= 0 ? (
                        <ArrowUpRight className="h-5 w-5 text-green-500" />
                      ) : (
                        <ArrowDownRight className="h-5 w-5 text-red-500" />
                      )}
                    </div>
                    <div>
                      <p className={`font-semibold ${themeStyles.textPrimary}`}>
                        {metrics.growthRate >= 0 ? "+" : ""}
                        {metrics.growthRate.toFixed(1)}%
                      </p>
                      <p className={`text-sm ${themeStyles.textMuted}`}>
                        Reply Growth
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center">
                    <div className="p-2 rounded-lg bg-blue-500/10 mr-3">
                      <TrendingUp className="h-5 w-5 text-blue-500" />
                    </div>
                    <div>
                      <p className={`font-semibold ${themeStyles.textPrimary}`}>
                        +
                        {(
                          (dailyData[dailyData.length - 1]?.engagement || 0) -
                          (dailyData[0]?.engagement || 0)
                        ).toFixed(1)}
                        %
                      </p>
                      <p className={`text-sm ${themeStyles.textMuted}`}>
                        Engagement Increase
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center">
                    <div className="p-2 rounded-lg bg-purple-500/10 mr-3">
                      <Zap className="h-5 w-5 text-purple-500" />
                    </div>
                    <div>
                      <p className={`font-semibold ${themeStyles.textPrimary}`}>
                        -{(metrics.avgResponseTime / 1000 - 2.5).toFixed(1)}s
                      </p>
                      <p className={`text-sm ${themeStyles.textMuted}`}>
                        Response Time Improvement
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Performance Tab */}
        <TabsContent value="performance" className="space-y-6">
          <Card
            className={`${themeStyles.cardBg} backdrop-blur-sm ${themeStyles.cardBorder}`}
          >
            <CardHeader>
              <CardTitle className={themeStyles.textPrimary}>
                Template Performance Matrix
              </CardTitle>
              <CardDescription className={themeStyles.textSecondary}>
                Success rates, usage, and response times across templates
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0 overflow-x-auto">
              <ResponsiveContainer minWidth={800} width="100%" height={400}>
                <BarChart data={performanceData}>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke={themeStyles.chartGridColor}
                  />
                  <XAxis
                    dataKey="name"
                    stroke={themeStyles.chartAxisColor}
                    angle={-45}
                    textAnchor="end"
                    height={60}
                  />
                  <YAxis stroke={themeStyles.chartAxisColor} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend />
                  <Bar
                    dataKey="successRate"
                    name="Success Rate (%)"
                    fill="#00F0FF"
                    radius={[4, 4, 0, 0]}
                  />
                  <Bar
                    dataKey="usage"
                    name="Usage Count"
                    fill="#B026FF"
                    radius={[4, 4, 0, 0]}
                  />
                  <Bar
                    dataKey="engagement"
                    name="Engagement (%)"
                    fill="#10B981"
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className={`${themeStyles.cardBg} ${themeStyles.cardBorder}`}>
              <CardHeader>
                <CardTitle className={themeStyles.textPrimary}>
                  Response Time Analysis
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <RadarChart data={performanceData}>
                    <PolarGrid stroke={themeStyles.chartGridColor} />
                    <PolarAngleAxis
                      dataKey="name"
                      stroke={themeStyles.chartAxisColor}
                    />
                    <PolarRadiusAxis stroke={themeStyles.chartAxisColor} />
                    <Radar
                      name="Response Time (ms)"
                      dataKey="avgResponseTime"
                      stroke="#FF2E9F"
                      fill="#FF2E9F"
                      fillOpacity={0.6}
                    />
                    <Tooltip content={<CustomTooltip />} />
                  </RadarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card className={`${themeStyles.cardBg} ${themeStyles.cardBorder}`}>
              <CardHeader>
                <CardTitle className={themeStyles.textPrimary}>
                  Performance Leaders
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {performanceData.slice(0, 5).map((item, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-3 border rounded-lg"
                    >
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 rounded-full flex items-center justify-center bg-gradient-to-r from-[#B026FF] to-[#00F0FF]">
                          <span className="text-white font-bold">
                            {index + 1}
                          </span>
                        </div>
                        <div>
                          <p
                            className={`font-medium ${themeStyles.textPrimary}`}
                          >
                            {item.name}
                          </p>
                          <p className={`text-sm ${themeStyles.textMuted}`}>
                            {item.usage} uses
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p
                          className={`font-semibold ${themeStyles.textPrimary}`}
                        >
                          {item.successRate}%
                        </p>
                        <p className={`text-xs ${themeStyles.textMuted}`}>
                          success rate
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Templates Tab */}
        <TabsContent value="templates" className="space-y-6">
          <Card
            className={`${themeStyles.cardBg} backdrop-blur-sm ${themeStyles.cardBorder}`}
          >
            <CardHeader>
              <CardTitle className={themeStyles.textPrimary}>
                Template Usage Distribution
              </CardTitle>
              <CardDescription
                className={`${themeStyles.textSecondary} font-montserrat`}
              >
                Which templates are used most frequently
              </CardDescription>
            </CardHeader>
            <CardContent className="p-2">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <ResponsiveContainer width="100%" height={350}>
                  <PieChart>
                    <Pie
                      data={templateData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) =>
                        percent && percent > 0.05
                          ? `${name} ${(percent * 100).toFixed(0)}%`
                          : ""
                      }
                      outerRadius={120}
                      innerRadius={40}
                      paddingAngle={2}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {templateData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value, name) => [`${value} uses`, name]}
                      contentStyle={{
                        backgroundColor: themeStyles.tooltipBg,
                        border: `1px solid ${themeStyles.tooltipBorder}`,
                        borderRadius: "6px",
                        color: themeStyles.tooltipText,
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>

                <div className="space-y-4 max-h-96 overflow-y-auto">
                  {templateData.map((item, index) => (
                    <div
                      key={index}
                      className={`flex items-center justify-between p-4 ${
                        currentTheme === "dark"
                          ? "bg-[#0a0a0a]/60"
                          : "bg-gray-100"
                      } border ${
                        currentTheme === "dark"
                          ? "border-[#208d7d]"
                          : "border-gray-300"
                      } rounded-lg`}
                    >
                      <div className="flex items-center space-x-3">
                        <div
                          className="w-4 h-4 rounded-full"
                          style={{
                            backgroundColor: item.color,
                          }}
                        />
                        <div className="min-w-0">
                          <span
                            className={`${themeStyles.textPrimary} font-medium truncate block max-w-[180px]`}
                            title={item.name}
                          >
                            {item.name}
                          </span>
                          {item.percentage && (
                            <span
                              className={`text-xs ${themeStyles.textMuted}`}
                            >
                              {item.percentage.toFixed(1)}%
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        <span
                          className={`${themeStyles.textPrimary} font-semibold`}
                        >
                          {item.value.toLocaleString()}
                        </span>
                        <p className={`text-xs ${themeStyles.textMuted}`}>
                          uses
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Sentiment Tab */}
        <TabsContent value="sentiment" className="space-y-6">
          <Card
            className={`${themeStyles.cardBg} backdrop-blur-sm ${themeStyles.cardBorder}`}
          >
            <CardHeader>
              <CardTitle className={themeStyles.textPrimary}>
                Comment Sentiment Analysis
              </CardTitle>
              <CardDescription className={themeStyles.textSecondary}>
                Understanding the tone of incoming comments based on template
                usage
              </CardDescription>
            </CardHeader>
            <CardContent className="p-2">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <ResponsiveContainer width="100%" height={350}>
                  <PieChart>
                    <Pie
                      data={sentimentData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ percent }) =>
                        ` ${percent ? (percent * 100).toFixed(0) : 0}%`
                      }
                      outerRadius={120}
                      innerRadius={60}
                      paddingAngle={2}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {sentimentData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value) => [`${value}%`, "Percentage"]}
                      contentStyle={{
                        backgroundColor: themeStyles.tooltipBg,
                        border: `1px solid ${themeStyles.tooltipBorder}`,
                        borderRadius: "6px",
                        color: themeStyles.tooltipText,
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="space-y-4">
                  {sentimentData.map((item, index) => (
                    <div
                      key={index}
                      className={`flex items-center justify-between p-4 ${
                        currentTheme === "dark"
                          ? "bg-[#0a0a0a]/60"
                          : "bg-gray-100"
                      } border ${
                        currentTheme === "dark"
                          ? "border-[#208d7d]"
                          : "border-gray-300"
                      } rounded-lg`}
                    >
                      <div className="flex items-center space-x-3">
                        <div
                          className="w-4 h-4 rounded-full"
                          style={{
                            backgroundColor: item.color,
                          }}
                        />
                        <span
                          className={`${themeStyles.textPrimary} font-medium`}
                        >
                          {item.category}
                        </span>
                      </div>
                      <div className="text-right">
                        <span
                          className={`${themeStyles.textPrimary} font-semibold`}
                        >
                          {item.value.toFixed(1)}%
                        </span>
                        <p className={`text-xs ${themeStyles.textMuted}`}>
                          of total interactions
                        </p>
                      </div>
                    </div>
                  ))}

                  <div
                    className={`p-4 ${currentTheme === "dark" ? "bg-blue-900/20" : "bg-blue-50"} border border-blue-200 rounded-lg`}
                  >
                    <h4
                      className={`font-semibold mb-2 ${themeStyles.textPrimary}`}
                    >
                      Sentiment Insights
                    </h4>
                    <p className={`text-sm ${themeStyles.textSecondary}`}>
                      {sentimentData.find((s) => s.category === "Positive")
                        ?.value || 0 > 70
                        ? "Excellent! Most interactions are positive."
                        : sentimentData.find((s) => s.category === "Negative")
                              ?.value || 0 > 30
                          ? "Consider creating more positive-response templates."
                          : "Good balance of interactions."}
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Insights Tab */}
        <TabsContent value="insights" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className={`${themeStyles.cardBg} ${themeStyles.cardBorder}`}>
              <CardHeader>
                <CardTitle className={themeStyles.textPrimary}>
                  <Sparkles className="h-5 w-5 inline mr-2" />
                  Top Recommendations
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3">
                  <li className="flex items-start">
                    <div className="p-1 rounded-full bg-green-500/10 mr-3 mt-1">
                      <TrendingUp className="h-4 w-4 text-green-500" />
                    </div>
                    <div>
                      <p className={`font-medium ${themeStyles.textPrimary}`}>
                        Increase Peak Hour Activity
                      </p>
                      <p className={`text-sm ${themeStyles.textMuted}`}>
                        Schedule more posts during {metrics.peakHour}
                      </p>
                    </div>
                  </li>
                  <li className="flex items-start">
                    <div className="p-1 rounded-full bg-blue-500/10 mr-3 mt-1">
                      <Target className="h-4 w-4 text-blue-500" />
                    </div>
                    <div>
                      <p className={`font-medium ${themeStyles.textPrimary}`}>
                        Optimize Low-Performing Templates
                      </p>
                      <p className={`text-sm ${themeStyles.textMuted}`}>
                        Review templates with 70% success rate
                      </p>
                    </div>
                  </li>
                  <li className="flex items-start">
                    <div className="p-1 rounded-full bg-purple-500/10 mr-3 mt-1">
                      <Zap className="h-4 w-4 text-purple-500" />
                    </div>
                    <div>
                      <p className={`font-medium ${themeStyles.textPrimary}`}>
                        Reduce Response Time
                      </p>
                      <p className={`text-sm ${themeStyles.textMuted}`}>
                        Aim for under 2 seconds average
                      </p>
                    </div>
                  </li>
                </ul>
              </CardContent>
            </Card>

            <Card className={`${themeStyles.cardBg} ${themeStyles.cardBorder}`}>
              <CardHeader>
                <CardTitle className={themeStyles.textPrimary}>
                  <Activity className="h-5 w-5 inline mr-2" />
                  Key Metrics
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className={themeStyles.textSecondary}>
                      Engagement Score
                    </span>
                    <div className="flex items-center">
                      <div className="w-24 h-2 bg-gray-700 rounded-full mr-2">
                        <div
                          className="h-full bg-gradient-to-r from-[#B026FF] to-[#00F0FF] rounded-full"
                          style={{
                            width: `${Math.min(metrics.totalEngagement, 100)}%`,
                          }}
                        />
                      </div>
                      <span
                        className={`font-semibold ${themeStyles.textPrimary}`}
                      >
                        {metrics.totalEngagement > 80
                          ? "Excellent"
                          : metrics.totalEngagement > 60
                            ? "Good"
                            : "Needs Improvement"}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className={themeStyles.textSecondary}>
                      Response Efficiency
                    </span>
                    <span
                      className={`font-semibold ${metrics.avgResponseTime < 2000 ? "text-green-500" : "text-yellow-500"}`}
                    >
                      {metrics.avgResponseTime < 2000 ? "Fast" : "Moderate"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className={themeStyles.textSecondary}>
                      Conversion Health
                    </span>
                    <span
                      className={`font-semibold ${metrics.conversionRate > 15 ? "text-green-500" : metrics.conversionRate > 5 ? "text-yellow-500" : "text-red-500"}`}
                    >
                      {metrics.conversionRate > 15
                        ? "High"
                        : metrics.conversionRate > 5
                          ? "Medium"
                          : "Low"}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className={`${themeStyles.cardBg} ${themeStyles.cardBorder}`}>
              <CardHeader>
                <CardTitle className={themeStyles.textPrimary}>
                  <Calendar className="h-5 w-5 inline mr-2" />
                  Next Steps
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div
                    className={`p-3 rounded-lg ${currentTheme === "dark" ? "bg-green-900/20" : "bg-green-50"} border border-green-200`}
                  >
                    <p className={`font-medium ${themeStyles.textPrimary}`}>
                      Immediate Actions
                    </p>
                    <p className={`text-sm ${themeStyles.textMuted}`}>
                      Review and update templates with declining performance
                    </p>
                  </div>
                  <div
                    className={`p-3 rounded-lg ${currentTheme === "dark" ? "bg-blue-900/20" : "bg-blue-50"} border border-blue-200`}
                  >
                    <p className={`font-medium ${themeStyles.textPrimary}`}>
                      Weekly Goal
                    </p>
                    <p className={`text-sm ${themeStyles.textMuted}`}>
                      Increase engagement by 5% through template optimization
                    </p>
                  </div>
                  <div
                    className={`p-3 rounded-lg ${currentTheme === "dark" ? "bg-purple-900/20" : "bg-purple-50"} border border-purple-200`}
                  >
                    <p className={`font-medium ${themeStyles.textPrimary}`}>
                      Monthly Target
                    </p>
                    <p className={`text-sm ${themeStyles.textMuted}`}>
                      Achieve 90%+ average success rate across all templates
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

// Progress component (simplified version)
const Progress = ({
  value,
  className = "",
}: {
  value: number;
  className?: string;
}) => (
  <div
    className={`w-full bg-gray-200 rounded-full h-2 dark:bg-gray-700 ${className}`}
  >
    <div
      className="h-full bg-gradient-to-r from-[#B026FF] to-[#00F0FF] rounded-full transition-all duration-300"
      style={{ width: `${Math.min(value, 100)}%` }}
    />
  </div>
);
