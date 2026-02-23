"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Settings,
  Shield,
  Bell,
  Mail,
  Globe,
  Lock,
  Users,
  RefreshCw,
  Save,
  AlertTriangle,
  CheckCircle,
  Moon,
  Sun,
  Eye,
  EyeOff,
  CreditCard,
  Zap,
  Activity,
} from "lucide-react";
import { useTheme } from "next-themes";
import { useApi } from "@/lib/useApi";
import { Badge } from "@rocketreplai/ui/components/radix/badge";
import { Button } from "@rocketreplai/ui/components/radix/button";
import { Switch } from "@rocketreplai/ui/components/radix/switch";
import { verifyOwner } from "@/lib/services/admin-actions.api";
import { toast } from "@rocketreplai/ui/components/radix/use-toast";

export default function AdminSettingsPage() {
  const { user, isLoaded } = useUser();
  const router = useRouter();
  const { theme, setTheme, resolvedTheme } = useTheme();
  const currentTheme = resolvedTheme || theme || "light";
  const { apiRequest } = useApi();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isOwner, setIsOwner] = useState(false);
  const [showEmailNotifications, setShowEmailNotifications] = useState(true);
  const [showPushNotifications, setShowPushNotifications] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [showSensitiveData, setShowSensitiveData] = useState(false);
  const [maintenanceMode, setMaintenanceMode] = useState(false);

  // Theme styles
  const themeStyles = useMemo(() => {
    const isDark = currentTheme === "dark";
    return {
      containerBg: isDark ? "bg-[#0F0F11]" : "bg-[#F8F9FC]",
      textPrimary: isDark ? "text-white" : "text-gray-900",
      textSecondary: isDark ? "text-gray-400" : "text-gray-500",
      textMuted: isDark ? "text-gray-500" : "text-gray-400",
      cardBg: isDark
        ? "bg-[#1A1A1E] border-gray-800"
        : "bg-white border-gray-100",
      cardBorder: isDark ? "border-gray-800" : "border-gray-100",
      inputBg: isDark ? "bg-[#252529]" : "bg-gray-50",
      inputBorder: isDark ? "border-gray-700" : "border-gray-200",
    };
  }, [currentTheme]);

  // Check owner
  useEffect(() => {
    const checkOwner = async () => {
      if (!user) return;

      try {
        const ownerVerification = await verifyOwner(apiRequest);

        setIsOwner(ownerVerification.isOwner);

        if (!ownerVerification.isOwner) {
          setError("ACCESS_DENIED");
        }
      } catch (err) {
        console.error("Error verifying owner:", err);
        setError("Failed to verify access");
      } finally {
        setLoading(false);
      }
    };

    if (isLoaded && user) {
      checkOwner();
    }
  }, [isLoaded, user, apiRequest]);

  const handleSaveSettings = async () => {
    setSaving(true);

    // Simulate API call
    setTimeout(() => {
      toast({
        title: "Settings Saved",
        description: "Your admin settings have been updated.",
        duration: 3000,
      });
      setSaving(false);
    }, 1000);
  };

  const handleToggleTheme = () => {
    setTheme(currentTheme === "dark" ? "light" : "dark");
  };

  // Check access
  const isUserOwner =
    user?.primaryEmailAddress?.emailAddress === "gauravgkhaire@gmail.com";

  if (!isLoaded || loading) {
    return (
      <div className="min-h-screen bg-[#F8F9FA] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-3 border-gray-200 border-t-gray-500 rounded-full animate-spin" />
          <p className="text-sm text-gray-400">Loading settings...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-[#F8F9FA] flex items-center justify-center p-6">
        <div className="text-center max-w-md">
          <div className="w-20 h-20 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <Lock className="h-10 w-10 text-gray-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-800 mb-4">
            Authentication Required
          </h1>
          <p className="text-gray-500 mb-6">
            Please sign in to access admin settings.
          </p>
          <Link
            href="/sign-in"
            className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-gray-600 to-gray-700 text-white rounded-xl hover:opacity-90 transition-opacity"
          >
            Sign In
          </Link>
        </div>
      </div>
    );
  }

  if (!isUserOwner && isOwner === false) {
    return (
      <div className="min-h-screen bg-[#F8F9FA] flex items-center justify-center p-6">
        <div className="text-center max-w-md">
          <div className="w-20 h-20 bg-red-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <AlertTriangle className="h-10 w-10 text-red-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-800 mb-4">
            Access Denied
          </h1>
          <p className="text-gray-500 mb-2">
            You are not authorized to view settings.
          </p>
          <p className="text-sm text-gray-400 mb-4">
            Logged in as:{" "}
            <span className="text-gray-600">
              {user.primaryEmailAddress?.emailAddress}
            </span>
          </p>
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-gray-600 to-gray-700 text-white rounded-xl hover:opacity-90 transition-opacity"
          >
            Return to Home
          </Link>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#F8F9FA] flex items-center justify-center">
        <div className="text-center max-w-md p-6 bg-red-50 rounded-2xl">
          <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <p className="text-red-600 font-medium mb-4">Access Error</p>
          <p className="text-sm text-gray-500 mb-4">{error}</p>
          <Link
            href="/admin"
            className="px-4 py-2 bg-gradient-to-r from-gray-600 to-gray-700 text-white rounded-xl hover:opacity-90 transition-opacity"
          >
            Back to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${themeStyles.containerBg}`}>
      <div className="p-4 md:p-6 lg:p-8 max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-wrap gap-3 items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-gray-500 to-gray-600 flex items-center justify-center shadow-lg shadow-gray-200/50">
              <Settings className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-800">
                Admin Settings
              </h1>
              <p className="text-sm text-gray-500">
                Configure your admin dashboard preferences
              </p>
            </div>
          </div>
          <Button
            onClick={handleSaveSettings}
            disabled={saving}
            className="bg-gradient-to-r from-gray-500 to-gray-600 hover:from-gray-600 hover:to-gray-700 text-white rounded-xl"
          >
            <Save className="h-4 w-4 mr-2" />
            {saving ? "Saving..." : "Save Changes"}
          </Button>
        </div>

        {/* Settings Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Appearance */}
          <div className="bg-white border border-gray-100 rounded-2xl p-6">
            <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
              {currentTheme === "dark" ? (
                <Moon className="h-4 w-4" />
              ) : (
                <Sun className="h-4 w-4" />
              )}
              Appearance
            </h3>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-700">Dark Mode</p>
                  <p className="text-xs text-gray-400">
                    Toggle between light and dark theme
                  </p>
                </div>
                <Switch
                  checked={currentTheme === "dark"}
                  onCheckedChange={handleToggleTheme}
                />
              </div>
            </div>
          </div>

          {/* Notifications */}
          <div className="bg-white border border-gray-100 rounded-2xl p-6">
            <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <Bell className="h-4 w-4" />
              Notifications
            </h3>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-700">
                    Email Notifications
                  </p>
                  <p className="text-xs text-gray-400">
                    Receive email alerts for important events
                  </p>
                </div>
                <Switch
                  checked={showEmailNotifications}
                  onCheckedChange={setShowEmailNotifications}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-700">
                    Push Notifications
                  </p>
                  <p className="text-xs text-gray-400">
                    Browser notifications for real-time updates
                  </p>
                </div>
                <Switch
                  checked={showPushNotifications}
                  onCheckedChange={setShowPushNotifications}
                />
              </div>
            </div>
          </div>

          {/* Dashboard Preferences */}
          <div className="bg-white border border-gray-100 rounded-2xl p-6">
            <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <Activity className="h-4 w-4" />
              Dashboard Preferences
            </h3>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-700">
                    Auto-refresh Data
                  </p>
                  <p className="text-xs text-gray-400">
                    Automatically refresh dashboard every 30s
                  </p>
                </div>
                <Switch
                  checked={autoRefresh}
                  onCheckedChange={setAutoRefresh}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-700">
                    Show Sensitive Data
                  </p>
                  <p className="text-xs text-gray-400">
                    Display subscription IDs and tokens
                  </p>
                </div>
                <Switch
                  checked={showSensitiveData}
                  onCheckedChange={setShowSensitiveData}
                />
              </div>
            </div>
          </div>

          {/* Security */}
          <div className="bg-white border border-gray-100 rounded-2xl p-6">
            <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <Shield className="h-4 w-4" />
              Security
            </h3>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-700">
                    Maintenance Mode
                  </p>
                  <p className="text-xs text-gray-400">
                    Disable public access to the platform
                  </p>
                </div>
                <Switch
                  checked={maintenanceMode}
                  onCheckedChange={setMaintenanceMode}
                />
              </div>

              <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <p className="text-xs text-yellow-700">
                  <AlertTriangle className="h-3 w-3 inline mr-1" />
                  Maintenance mode will make the site inaccessible to users.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Owner Info */}
        <div className="bg-gradient-to-r from-cyan-50 to-blue-50 border border-cyan-200 rounded-2xl p-6">
          <div className="flex flex-col items-start gap-4">
            <div className="flex items-center justify-normal gap-2">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-500 flex items-center justify-center">
                <Shield className="h-6 w-6 text-white" />{" "}
              </div>
              <h3 className="text-lg font-semibold text-cyan-800 mb-2">
                Owner Access
              </h3>
            </div>
            <div className="flex-1">
              <p className="text-sm text-cyan-700 mb-3">
                You are logged in as the owner. These settings only affect your
                admin view.
              </p>
              <div className="flex flex-wrap items-center gap-2">
                <Badge className="bg-cyan-100 text-cyan-600 border-cyan-200">
                  <Mail className="h-3 w-3 mr-1" />
                  {user.primaryEmailAddress?.emailAddress}
                </Badge>
                <Badge className="bg-green-100 text-green-600 border-green-200">
                  <CheckCircle className="h-3 w-3 mr-1" />
                  Verified Owner
                </Badge>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
