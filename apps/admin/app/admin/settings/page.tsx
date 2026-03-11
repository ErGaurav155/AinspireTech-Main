"use client";

import { useState, useEffect, useMemo } from "react";
import { useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Settings,
  Shield,
  Bell,
  Mail,
  Lock,
  AlertTriangle,
  CheckCircle,
  Moon,
  Sun,
  Activity,
  ArrowUpRight,
  X,
} from "lucide-react";
import { useTheme } from "next-themes";
import { useApi } from "@/lib/useApi";
import {
  Button,
  GateScreen,
  Orbs,
  Spinner,
  Switch,
  toast,
  useThemeStyles,
} from "@rocketreplai/ui";
export default function AdminSettingsPage() {
  const { user, isLoaded } = useUser();
  const router = useRouter();
  const { theme, setTheme, resolvedTheme } = useTheme();
  const { apiRequest } = useApi();
  const { styles, isDark } = useThemeStyles();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isOwner, setIsOwner] = useState(false);
  const [showEmailNotifications, setShowEmailNotifications] = useState(true);
  const [showPushNotifications, setShowPushNotifications] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [showSensitiveData, setShowSensitiveData] = useState(false);
  const [maintenanceMode, setMaintenanceMode] = useState(false);

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
    setTheme(isDark ? "light" : "dark");
  };

  // Check access
  const isUserOwner =
    user?.primaryEmailAddress?.emailAddress === "gauravgkhaire@gmail.com";

  if (!isLoaded || loading) {
    return <Spinner label="Loading settings…" />;
  }

  if (!user) {
    return (
      <GateScreen
        icon={<Lock className="h-8 w-8 text-cyan-400" />}
        title="Authentication Required"
        body="Please sign in to access admin settings."
      >
        <Link
          href="/sign-in"
          className={`inline-flex items-center gap-2 px-6 py-2.5 text-sm font-medium transition-all ${styles.pill}`}
        >
          Sign In <ArrowUpRight size={14} />
        </Link>
      </GateScreen>
    );
  }

  if (!isUserOwner && isOwner === false) {
    return (
      <GateScreen
        icon={<AlertTriangle className="h-8 w-8 text-red-400" />}
        title="Access Denied"
        body="You are not authorized to view settings."
        subText={`Logged in as: ${user.primaryEmailAddress?.emailAddress}`}
      >
        <Link
          href="/"
          className={`inline-flex items-center gap-2 px-6 py-2.5 text-sm font-medium transition-all ${styles.pill}`}
        >
          Return to Home <ArrowUpRight size={14} />
        </Link>
      </GateScreen>
    );
  }

  if (error) {
    return (
      <GateScreen
        icon={<AlertTriangle className="h-8 w-8 text-red-400" />}
        title="Access Error"
        body={error}
      >
        <Link
          href="/admin"
          className={`inline-flex items-center gap-2 px-6 py-2.5 text-sm font-medium transition-all ${styles.pill}`}
        >
          Back to Dashboard <ArrowUpRight size={14} />
        </Link>
      </GateScreen>
    );
  }

  return (
    <div className={styles.page}>
      {isDark && <Orbs />}
      <div className={styles.container}>
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div
              className={`w-12 h-12 rounded-xl flex items-center justify-center bg-gray-100 dark:bg-gray-500/20 border dark:border-gray-500/30`}
            >
              <Settings className="h-6 w-6 text-gray-600 dark:text-gray-400" />
            </div>
            <div>
              <h1
                className={`text-lg md:text-xl font-bold ${styles.text.primary}`}
              >
                Admin Settings
              </h1>
              <p className={`text-xs ${styles.text.secondary}`}>
                Configure your admin dashboard preferences
              </p>
            </div>
          </div>
          <Button
            onClick={handleSaveSettings}
            disabled={saving}
            className={`${styles.pill} flex items-center gap-2 px-4 py-2 text-sm`}
          >
            <Save className="h-4 w-4" />
            {saving ? "Saving..." : "Save Changes"}
          </Button>
        </div>

        {/* Settings Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Appearance */}
          <div className={`rounded-2xl p-6 ${styles.card}`}>
            <h3
              className={`text-sm font-semibold mb-4 flex items-center gap-2 ${styles.text.primary}`}
            >
              {isDark ? (
                <Moon className="h-4 w-4" />
              ) : (
                <Sun className="h-4 w-4" />
              )}
              Appearance
            </h3>

            <div className="space-y-4 relative z-10">
              <div className="flex items-center justify-between">
                <div>
                  <p className={`text-sm font-medium ${styles.text.primary}`}>
                    Dark Mode
                  </p>
                  <p className={`text-xs ${styles.text.muted}`}>
                    Toggle between light and dark theme
                  </p>
                </div>
                <Switch
                  checked={isDark}
                  onCheckedChange={handleToggleTheme}
                  className={
                    isDark
                      ? "bg-white/[0.06] data-[state=checked]:bg-cyan-500"
                      : "bg-gray-200 data-[state=checked]:bg-cyan-500"
                  }
                />
              </div>
            </div>
          </div>

          {/* Notifications */}
          <div className={`rounded-2xl p-6 ${styles.card}`}>
            <h3
              className={`text-sm font-semibold mb-4 flex items-center gap-2 ${styles.text.primary}`}
            >
              <Bell className="h-4 w-4" />
              Notifications
            </h3>

            <div className="space-y-4 relative z-10">
              <div className="flex items-center justify-between">
                <div>
                  <p className={`text-sm font-medium ${styles.text.primary}`}>
                    Email Notifications
                  </p>
                  <p className={`text-xs ${styles.text.muted}`}>
                    Receive email alerts for important events
                  </p>
                </div>
                <Switch
                  checked={showEmailNotifications}
                  onCheckedChange={setShowEmailNotifications}
                  className={
                    isDark
                      ? "bg-white/[0.06] data-[state=checked]:bg-cyan-500"
                      : "bg-gray-200 data-[state=checked]:bg-cyan-500"
                  }
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <p className={`text-sm font-medium ${styles.text.primary}`}>
                    Push Notifications
                  </p>
                  <p className={`text-xs ${styles.text.muted}`}>
                    Browser notifications for real-time updates
                  </p>
                </div>
                <Switch
                  checked={showPushNotifications}
                  onCheckedChange={setShowPushNotifications}
                  className={
                    isDark
                      ? "bg-white/[0.06] data-[state=checked]:bg-cyan-500"
                      : "bg-gray-200 data-[state=checked]:bg-cyan-500"
                  }
                />
              </div>
            </div>
          </div>

          {/* Dashboard Preferences */}
          <div className={`rounded-2xl p-6 ${styles.card}`}>
            <h3
              className={`text-sm font-semibold mb-4 flex items-center gap-2 ${styles.text.primary}`}
            >
              <Activity className="h-4 w-4" />
              Dashboard Preferences
            </h3>

            <div className="space-y-4 relative z-10">
              <div className="flex items-center justify-between">
                <div>
                  <p className={`text-sm font-medium ${styles.text.primary}`}>
                    Auto-refresh Data
                  </p>
                  <p className={`text-xs ${styles.text.muted}`}>
                    Automatically refresh dashboard every 30s
                  </p>
                </div>
                <Switch
                  checked={autoRefresh}
                  onCheckedChange={setAutoRefresh}
                  className={
                    isDark
                      ? "bg-white/[0.06] data-[state=checked]:bg-cyan-500"
                      : "bg-gray-200 data-[state=checked]:bg-cyan-500"
                  }
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <p className={`text-sm font-medium ${styles.text.primary}`}>
                    Show Sensitive Data
                  </p>
                  <p className={`text-xs ${styles.text.muted}`}>
                    Display subscription IDs and tokens
                  </p>
                </div>
                <Switch
                  checked={showSensitiveData}
                  onCheckedChange={setShowSensitiveData}
                  className={
                    isDark
                      ? "bg-white/[0.06] data-[state=checked]:bg-cyan-500"
                      : "bg-gray-200 data-[state=checked]:bg-cyan-500"
                  }
                />
              </div>
            </div>
          </div>

          {/* Security */}
          <div className={`rounded-2xl p-6 ${styles.card}`}>
            <h3
              className={`text-sm font-semibold mb-4 flex items-center gap-2 ${styles.text.primary}`}
            >
              <Shield className="h-4 w-4" />
              Security
            </h3>

            <div className="space-y-4 relative z-10">
              <div className="flex items-center justify-between">
                <div>
                  <p className={`text-sm font-medium ${styles.text.primary}`}>
                    Maintenance Mode
                  </p>
                  <p className={`text-xs ${styles.text.muted}`}>
                    Disable public access to the platform
                  </p>
                </div>
                <Switch
                  checked={maintenanceMode}
                  onCheckedChange={setMaintenanceMode}
                  className={
                    isDark
                      ? "bg-white/[0.06] data-[state=checked]:bg-cyan-500"
                      : "bg-gray-200 data-[state=checked]:bg-cyan-500"
                  }
                />
              </div>

              <div
                className={`p-3 rounded-lg ${isDark ? "bg-yellow-500/10 border border-yellow-500/20" : "bg-yellow-50 border border-yellow-200"}`}
              >
                <p
                  className={`text-xs ${isDark ? "text-yellow-400" : "text-yellow-700"}`}
                >
                  <AlertTriangle className="h-3 w-3 inline mr-1" />
                  Maintenance mode will make the site inaccessible to users.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Owner Info */}
        <div
          className={`rounded-2xl p-6 ${isDark ? "bg-gradient-to-r from-cyan-500/10 to-blue-500/10 border border-cyan-500/20" : "bg-gradient-to-r from-cyan-50 to-blue-50 border border-cyan-200"}`}
        >
          <div className="flex flex-col items-start gap-4 relative z-10">
            <div className="flex items-center gap-3">
              <div
                className={`w-12 h-12 rounded-xl flex items-center justify-center ${isDark ? "bg-cyan-500/20 border border-cyan-500/30" : "bg-cyan-100"}`}
              >
                <Shield className="h-6 w-6 text-cyan-600 dark:text-cyan-400" />
              </div>
              <h3
                className={`text-lg font-semibold ${isDark ? "text-cyan-400" : "text-cyan-800"}`}
              >
                Owner Access
              </h3>
            </div>
            <div className="flex-1">
              <p
                className={`text-sm ${isDark ? "text-cyan-400/80" : "text-cyan-800/80"} mb-3`}
              >
                You are logged in as the owner. These settings only affect your
                admin view.
              </p>
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium ${
                    isDark
                      ? "bg-cyan-500/10 border border-cyan-500/20 text-cyan-400"
                      : "bg-cyan-100 text-cyan-600 border-cyan-200"
                  }`}
                >
                  <Mail className="h-3 w-3" />
                  {user.primaryEmailAddress?.emailAddress}
                </span>
                <span
                  className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium ${
                    isDark
                      ? "bg-green-500/10 border border-green-500/20 text-green-400"
                      : "bg-green-100 text-green-600 border-green-200"
                  }`}
                >
                  <CheckCircle className="h-3 w-3" />
                  Verified Owner
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Re-add Save import since we used it above
import { Save } from "lucide-react";
import { verifyOwner } from "@/lib/services/admin-actions.api";
