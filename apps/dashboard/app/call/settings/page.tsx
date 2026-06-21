"use client";

import { useCallback, useEffect, useState } from "react";
import { Building2, CheckCircle2, Copy, Phone, Save } from "lucide-react";
import { Button, Orbs, Spinner, toast, useThemeStyles } from "@rocketreplai/ui";
import { useApi } from "@/lib/useApi";
import {
  getCallDashboard,
  updateCallWorkspace,
} from "@/lib/services/call-actions.api";

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
  const [ownerForm, setOwnerForm] = useState({
    name: "",
    email: "",
    whatsappNumber: "",
    smsNumber: "",
  });
  const [meta, setMeta] = useState<any>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    const data = await getCallDashboard(apiRequest);
    setMeta(data || {});
    setForm((prev) => ({ ...prev, ...(data?.organization || {}) }));
    setOwnerForm((prev) => ({ ...prev, ...(data?.owner || {}) }));
    setLoading(false);
  }, [apiRequest]);

  useEffect(() => {
    load().catch(() => setLoading(false));
  }, [load]);

  const save = async () => {
    const missingFields = [
      ["ownerForm.name", "Owner name", ownerForm.name],
      ["ownerForm.email", "Owner email", ownerForm.email],
      ["ownerForm.whatsappNumber", "WhatsApp alert number", ownerForm.whatsappNumber],
      ["form.name", "Business name", form.name],
      ["form.phone", "Business phone", form.phone],
      ["form.email", "Business email", form.email],
    ].filter(([, , value]) => !String(value || "").trim());

    if (missingFields.length > 0) {
      toast({
        title: "Complete required details",
        description: `Please fill: ${missingFields
          .map(([, label]) => label)
          .join(", ")}.`,
        variant: "destructive",
      });
      return;
    }

    try {
      setSaving(true);
      await updateCallWorkspace(apiRequest, {
        organization: form,
        owner: ownerForm,
      });
      toast({ title: "Call assistant settings saved" });
    } catch (error) {
      console.error(error);
      toast({ title: "Could not save settings", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const copyValue = async (value: string, label: string) => {
    if (!value) return;
    try {
      await navigator.clipboard.writeText(value);
      toast({ title: `${label} copied` });
    } catch {
      toast({ title: "Could not copy value", variant: "destructive" });
    }
  };

  if (loading) return <Spinner label="Loading settings..." />;

  const isFree = meta.subscription?.isFree;
  const overview = meta.overview || {};
  const planName = isFree ? "Free" : "Business";
  const routing = meta.routing || {};
  const forwardingCodes = routing.forwardingCodes || {};
  const codeRows = [
    ["When busy", forwardingCodes.busy],
    ["When not answered", forwardingCodes.noAnswer],
    ["When unreachable", forwardingCodes.unreachable],
  ].filter(([, value]) => value);

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
                Manage owner business details and inbound call routing limits.
              </p>
            </div>
          </div>
        </div>

        <div className={`${styles.card} p-5`}>
          <div className="mb-5">
            <h2 className={`text-xl font-black ${styles.text.primary}`}>
              Owner alerts
            </h2>
            <p className={`mt-1 text-sm ${styles.text.secondary}`}>
              These details are required before upgrading the AI Call Assistant.
            </p>
          </div>
          <div className="mb-6 grid grid-cols-1 md:grid-cols-2 gap-4">
            {Object.entries(ownerForm).map(([key, value]) => (
              <label key={key} className="space-y-2">
                <span className={`text-xs font-semibold uppercase ${styles.text.muted}`}>
                  {key.replace(/([A-Z])/g, " $1")}
                </span>
                <input
                  value={value}
                  onChange={(event) =>
                    setOwnerForm((current) => ({
                      ...current,
                      [key]: event.target.value,
                    }))
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

          <div className="mb-5">
            <h2 className={`text-xl font-black ${styles.text.primary}`}>
              Business details
            </h2>
            <p className={`mt-1 text-sm ${styles.text.secondary}`}>
              Business phone and email are checked before payment opens.
            </p>
          </div>
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

        <div className={`${styles.card} p-5`}>
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h2 className={`text-xl font-black flex items-center gap-2 ${styles.text.primary}`}>
                <Phone className="h-5 w-5 text-cyan-500" />
                Inbound Call Routing
              </h2>
              <p className={`mt-2 max-w-2xl text-sm ${styles.text.secondary}`}>
                Forward missed, busy, or unreachable calls from your business
                phone to the dedicated Exotel number assigned below.
              </p>
            </div>
          </div>

          <div className="mt-5 grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className={`${styles.innerCard} p-4`}>
              <p className={`text-xs font-semibold uppercase ${styles.text.muted}`}>
                Assigned Exotel Number
              </p>
              <div className="mt-2 flex items-center justify-between gap-2">
                <p className={`text-lg font-bold ${styles.text.primary}`}>
                  {routing.assignedNumber || "Not assigned"}
                </p>
                {routing.assignedNumber && (
                  <button
                    type="button"
                    onClick={() =>
                      copyValue(routing.assignedNumber, "Exotel number")
                    }
                    className={`rounded-lg border p-2 ${
                      isDark
                        ? "border-white/[0.08] text-white/70"
                        : "border-gray-200 text-gray-600"
                    }`}
                    aria-label="Copy Exotel number"
                  >
                    <Copy className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>
            <div className={`${styles.innerCard} p-4`}>
              <p className={`text-xs font-semibold uppercase ${styles.text.muted}`}>
                Routing Status
              </p>
              <p className={`mt-2 inline-flex items-center gap-2 text-lg font-bold capitalize ${styles.text.primary}`}>
                {routing.status === "ready" && (
                  <CheckCircle2 className="h-5 w-5 text-emerald-400" />
                )}
                {routing.status || "needs_number"}
              </p>
            </div>
            <div className={`${styles.innerCard} p-4`}>
              <p className={`text-xs font-semibold uppercase ${styles.text.muted}`}>
                Concurrent Inbound Calls
              </p>
              <p className={`mt-1 text-lg font-bold ${styles.text.primary}`}>
                {overview.concurrentCallLimit || (isFree ? 1 : 3)}
              </p>
            </div>
          </div>

          {routing.assignedNumber ? (
            <div className="mt-5 grid grid-cols-1 md:grid-cols-3 gap-4">
              {codeRows.map(([label, code]) => (
                <div key={label} className={`${styles.innerCard} p-4`}>
                  <p className={`text-xs font-semibold uppercase ${styles.text.muted}`}>
                    {label}
                  </p>
                  <div className="mt-2 flex items-center justify-between gap-2">
                    <code
                      className={`rounded-lg px-2 py-1 text-sm font-bold ${
                        isDark
                          ? "bg-white/[0.06] text-cyan-100"
                          : "bg-cyan-50 text-cyan-900"
                      }`}
                    >
                      {code}
                    </code>
                    <button
                      type="button"
                      onClick={() => copyValue(String(code), String(label))}
                      className={`rounded-lg border p-2 ${
                        isDark
                          ? "border-white/[0.08] text-white/70"
                          : "border-gray-200 text-gray-600"
                      }`}
                      aria-label={`Copy ${label} forwarding code`}
                    >
                      <Copy className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className={`mt-5 rounded-xl border px-4 py-3 text-sm ${isDark ? "border-amber-400/20 bg-amber-400/10 text-amber-100" : "border-amber-100 bg-amber-50 text-amber-900"}`}>
              Add dedicated Exotel numbers to EXOTEL_PAID_NUMBER_POOL_NUMBERS
              and reload this workspace to assign one.
            </div>
          )}

          <div className={`mt-5 rounded-xl border px-4 py-3 text-sm ${isDark ? "border-cyan-400/20 bg-cyan-400/10 text-cyan-100" : "border-cyan-100 bg-cyan-50 text-cyan-900"}`}>
            Plan: {planName}. Included minutes:{" "}
            {overview.minutesLimit || (isFree ? 10 : 200)}. Webhook status:{" "}
            {routing.webhookUrlConfigured ? "configured" : "missing PUBLIC_API_URL or EXOTEL_WEBHOOK_URL"}.
          </div>
        </div>
      </div>
    </div>
  );
}
