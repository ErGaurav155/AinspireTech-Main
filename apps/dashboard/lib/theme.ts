// lib/theme.ts
import { useMemo } from "react";
import { useTheme } from "next-themes";

export interface ThemeStyles {
  // Layout
  page: string;
  container: string;

  // Cards
  card: string;
  innerCard: string;

  // Text
  text: {
    primary: string;
    secondary: string;
    muted: string;
  };

  // Interactive elements
  pill: string;
  input: string;
  divider: string;
  rowHover: string;

  // Tabs
  tab: {
    active: string;
    inactive: string;
  };

  // Icon backgrounds (color-coded)
  icon: {
    pink: string;
    green: string;
    blue: string;
    purple: string;
    amber: string;
    cyan: string;
    red: string;
    orange: string;
  };

  // Badges (color-coded)
  badge: {
    pink: string;
    green: string;
    blue: string;
    purple: string;
    amber: string;
    cyan: string;
    red: string;
    orange: string;
    gray: string;
    // Status badges
    active: string;
    cancelled: string;
    expired: string;
  };

  // Dialogs
  dialogOverlay: string;
  dialogContent: string;
  dialogClose: string;

  // Empty state
  empty: {
    icon: string;
    text: string;
  };

  // Table
  tableContainer: string;
  tableHeader: string;
  tableHead: string;
  tableRow: string;
  tableCell: string;

  // Progress
  progressTrack: string;
  progressFill: string;

  // Buttons
  button: {
    primary: string;
    secondary: string;
    danger: string;
  };

  // Status indicators (functions for dynamic classes)
  statusDot: (isActive: boolean) => string;
  statusText: (isActive: boolean) => string;

  // Avatar gradient helper
  avatarGradient: (color1: string, color2: string) => string;
}

export function buildBaseTheme(isDark: boolean): ThemeStyles {
  return {
    // Layout
    page: isDark ? "min-h-screen relative overflow-hidden" : "min-h-screen",
    container: isDark
      ? "max-w-7xl mx-auto space-y-6 relative z-10 p-4 md:p-6 lg:p-8"
      : "max-w-7xl mx-auto space-y-6 p-4 md:p-6 lg:p-8",
    // Cards
    card: isDark
      ? "bg-white/[0.06] border border-white/[0.08] shadow-[0_8px_32px_rgba(0,0,0,0.35),inset_0_1px_0_rgba(255,255,255,0.07)] backdrop-blur-[24px] backdrop-saturate-[180%] crystal-card shimmer-card relative overflow-hidden rounded-xl"
      : "bg-white border border-gray-100 shadow-sm hover:border-cyan-200 hover:shadow-md transition-all rounded-xl",

    innerCard: isDark
      ? "bg-white/[0.03] border border-white/[0.06] backdrop-blur-[12px] rounded-xl"
      : "bg-gray-50 border border-gray-100 rounded-xl",

    // Text
    text: {
      primary: isDark ? "text-white" : "text-gray-900",
      secondary: isDark ? "text-white/40" : "text-gray-500",
      muted: isDark ? "text-white/25" : "text-gray-400",
    },

    // Interactive elements
    pill: isDark
      ? "bg-white/[0.06] border border-white/[0.09] backdrop-blur-[12px] text-white/70 hover:bg-white/[0.09] rounded-xl transition-all"
      : "bg-white border border-gray-200 text-gray-600 hover:border-gray-300 rounded-xl transition-all",
    input: isDark
      ? "bg-white/[0.05] border-white/[0.09] text-white placeholder:text-white/25 focus:ring-white/20"
      : "bg-gray-50 border-gray-200 text-gray-700 placeholder:text-gray-400 focus:ring-cyan-200",
    divider: isDark
      ? "border-b border-white/[0.06]"
      : "border-b border-gray-100",
    rowHover: isDark ? "hover:bg-white/[0.03]" : "hover:bg-gray-50/80",

    // Tabs
    tab: {
      active: isDark
        ? "border-blue-400 text-white"
        : "border-cyan-500 text-cyan-600",
      inactive: isDark
        ? "border-transparent text-white/30 hover:text-white/60"
        : "border-transparent text-gray-400 hover:text-gray-600",
    },

    // Icon containers
    icon: {
      pink: isDark ? "bg-pink-500/20 border border-pink-500/30" : "bg-pink-100",
      green: isDark
        ? "bg-green-500/20 border border-green-500/30"
        : "bg-green-100",
      blue: isDark ? "bg-blue-500/20 border border-blue-500/30" : "bg-blue-100",
      purple: isDark
        ? "bg-purple-500/20 border border-purple-500/30"
        : "bg-purple-100",
      amber: isDark
        ? "bg-amber-500/20 border border-amber-500/30"
        : "bg-amber-100",
      cyan: isDark ? "bg-cyan-500/20 border border-cyan-500/30" : "bg-cyan-100",
      red: isDark ? "bg-red-500/20 border border-red-500/30" : "bg-red-100",
      orange: isDark
        ? "bg-orange-500/20 border border-orange-500/30"
        : "bg-orange-100",
    },

    // Badges
    badge: {
      pink: isDark
        ? "bg-pink-500/10 border border-pink-500/20 text-pink-400"
        : "bg-pink-100 text-pink-600 border-pink-200",
      green: isDark
        ? "bg-green-500/10 border border-green-500/20 text-green-400"
        : "bg-green-100 text-green-600 border-green-200",
      blue: isDark
        ? "bg-blue-500/10 border border-blue-500/20 text-blue-400"
        : "bg-blue-100 text-blue-600 border-blue-200",
      purple: isDark
        ? "bg-purple-500/10 border border-purple-500/20 text-purple-400"
        : "bg-purple-100 text-purple-600 border-purple-200",
      amber: isDark
        ? "bg-amber-500/10 border border-amber-500/20 text-amber-400"
        : "bg-amber-100 text-amber-600 border-amber-200",
      cyan: isDark
        ? "bg-cyan-500/10 border border-cyan-500/20 text-cyan-400"
        : "bg-cyan-100 text-cyan-600 border-cyan-200",
      red: isDark
        ? "bg-red-500/10 border border-red-500/20 text-red-400"
        : "bg-red-100 text-red-600 border-red-200",
      orange: isDark
        ? "bg-orange-500/10 border border-orange-500/20 text-orange-400"
        : "bg-orange-100 text-orange-600 border-orange-200",
      gray: isDark
        ? "bg-gray-500/10 border border-gray-500/20 text-gray-400"
        : "bg-gray-100 text-gray-600 border-gray-200",
      // Status badges
      active: isDark
        ? "bg-green-500/10 border border-green-500/20 text-green-400"
        : "bg-green-100 text-green-600 border-green-200",
      cancelled: isDark
        ? "bg-red-500/10 border border-red-500/20 text-red-400"
        : "bg-red-100 text-red-600 border-red-200",
      expired: isDark
        ? "bg-yellow-500/10 border border-yellow-500/20 text-yellow-400"
        : "bg-yellow-100 text-yellow-600 border-yellow-200",
    },

    // Dialogs
    dialogOverlay: "fixed inset-0 bg-black/60 backdrop-blur-sm z-50",
    dialogContent: isDark
      ? "fixed left-[50%] top-[50%] z-50 translate-x-[-50%] translate-y-[-50%] w-full max-w-lg rounded-2xl bg-[#1A1A1E] p-6 shadow-xl border border-white/[0.08] focus:outline-none"
      : "fixed left-[50%] top-[50%] z-50 translate-x-[-50%] translate-y-[-50%] w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl border border-gray-200 focus:outline-none",
    dialogClose: isDark
      ? "absolute right-4 top-4 rounded-lg p-1 text-white/60 hover:bg-white/[0.06] hover:text-white transition-colors"
      : "absolute right-4 top-4 rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors",

    // Empty state
    empty: {
      icon: isDark ? "text-white/20" : "text-gray-300",
      text: isDark ? "text-white/35" : "text-gray-500",
    },

    // Table (basic, can be extended per page)
    tableContainer: isDark
      ? "rounded-2xl overflow-hidden glass-card"
      : "rounded-2xl overflow-hidden bg-white border border-gray-100",
    tableHeader: isDark ? "bg-white/[0.04]" : "bg-gray-50",
    tableHead: isDark
      ? "text-left px-6 py-3 text-xs font-medium text-gray-400 uppercase tracking-wide"
      : "text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide",
    tableRow: isDark
      ? "hover:bg-white/[0.03] transition-colors border-b border-white/[0.06]"
      : "hover:bg-gray-50 transition-colors border-b border-gray-100",
    tableCell: isDark
      ? "px-6 py-4 text-sm text-gray-300"
      : "px-6 py-4 text-sm text-gray-800",

    // Progress
    progressTrack: isDark
      ? "w-full bg-white/10 rounded-full h-2 overflow-hidden"
      : "w-full bg-gray-200 rounded-full h-2 overflow-hidden",
    progressFill:
      "bg-gradient-to-r from-purple-500 to-pink-500 h-full rounded-full",

    // Buttons
    button: {
      primary: isDark
        ? "bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600 text-white rounded-xl transition-colors"
        : "bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600 text-white rounded-xl transition-colors",
      secondary: isDark
        ? "bg-gray-800 border border-gray-700 text-gray-300 hover:bg-gray-700 rounded-xl transition-colors"
        : "bg-white border border-gray-200 text-gray-600 hover:border-gray-300 rounded-xl transition-colors",
      danger: isDark
        ? "bg-red-500/80 hover:bg-red-500 text-white rounded-xl transition-colors"
        : "bg-red-500 hover:bg-red-600 text-white rounded-xl transition-colors",
    },

    // Status indicators
    statusDot: (isActive: boolean) =>
      isDark
        ? `w-2 h-2 rounded-full ${isActive ? "bg-green-400" : "bg-gray-500"}`
        : `w-2 h-2 rounded-full ${isActive ? "bg-green-500" : "bg-gray-400"}`,
    statusText: (isActive: boolean) =>
      isDark
        ? `text-sm font-medium ${isActive ? "text-green-400" : "text-gray-400"}`
        : `text-sm font-medium ${isActive ? "text-green-600" : "text-gray-500"}`,

    // Avatar gradient helper
    avatarGradient: (color1: string, color2: string) =>
      `linear-gradient(135deg, ${color1}, ${color2})`,
  };
}

// Custom hook to use theme styles
export function useThemeStyles() {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";
  const styles = useMemo(() => buildBaseTheme(isDark), [isDark]);
  return { styles, isDark };
}
