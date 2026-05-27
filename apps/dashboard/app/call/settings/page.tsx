"use client";

import { useCallback, useEffect, useState } from "react";
import { Building2, Save } from "lucide-react";
import { Button, Orbs, Spinner, toast, useThemeStyles } from "@rocketreplai/ui";
import { useApi } from "@/lib/useApi";
import { getCallDashboard, updateCallWorkspace } from "@/lib/services/call-actions.api";

export default function CallSettingsPage() {
  const { apiRequest } = useApi();
  const { styles, isDark } = useThemeStyles();
  const [form, setForm] = useState({
    name: "",
    industry: "",
    phone: "",
    email: "",
    address: "",
    timeZone: "Asia/Kolkata",
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    const data = await getCallDashboard(apiRequest);
    setForm((prev) => ({ ...prev, ...(data?.organization || {}) }));
    setLoading(false);
  }, [apiRequest]);

  useEffect(() => {
    load().catch(() => setLoading(false));
  }, [load]);

  const save = async () => {
    try {
      setSaving(true);
      await updateCallWorkspace(apiRequest, { organization: form });
      toast({ title: "Call assistant settings saved" });
    } catch (error) {
      console.error(error);
      toast({ title: "Could not save settings", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <Spinner label="Loading settings..." />;

  return (
    <div className={styles.page}>
      {isDark && <Orbs />}
      <div className={styles.container}>
        <div className={`${styles.card} p-5 md:p-8`}>
          <div className="flex items-center gap-3">
            <Building2 className="h-7 w-7 text-cyan-500" />
            <div>
              <h1 className={`text-2xl md:text-3xl font-black ${styles.text.primary}`}>
                Call Assistant Settings
              </h1>
              <p className={`mt-2 text-sm ${styles.text.secondary}`}>
                Set business details the AI receptionist can use during calls.
              </p>
            </div>
          </div>
        </div>

        <div className={`${styles.card} p-5`}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {Object.entries(form).map(([key, value]) => (
              <label key={key} className="space-y-2">
                <span className={`text-xs font-semibold uppercase ${styles.text.muted}`}>
                  {key.replace(/([A-Z])/g, " $1")}
                </span>
                <input
                  value={value}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, [key]: event.target.value }))
                  }
                  className={`w-full rounded-xl border px-3 py-2 text-sm outline-none ${
                    isDark
                      ? "border-white/[0.08] bg-white/[0.04] text-white"
                      : "border-gray-200 bg-white text-gray-900"
                  }`}
                />
              </label>
            ))}
          </div>
          <Button
            onClick={save}
            disabled={saving}
            className="mt-5 rounded-xl bg-cyan-600 hover:bg-cyan-700 text-white"
          >
            <Save className="h-4 w-4 mr-2" />
            Save Settings
          </Button>
        </div>
      </div>
    </div>
  );
}
