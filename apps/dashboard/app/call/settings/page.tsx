"use client";

import { useCallback, useEffect, useState } from "react";
import { Building2, Check, Phone, RefreshCw, Save } from "lucide-react";
import { Button, Orbs, Spinner, toast, useThemeStyles } from "@rocketreplai/ui";
import { useApi } from "@/lib/useApi";
import {
  getAvailableCallNumbers,
  getCallDashboard,
  selectDedicatedCallNumber,
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
  const [meta, setMeta] = useState<any>({});
  const [numberState, setNumberState] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [selecting, setSelecting] = useState("");

  const load = useCallback(async () => {
    const data = await getCallDashboard(apiRequest);
    setMeta(data || {});
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

  const scanNumbers = async () => {
    try {
      setScanning(true);
      const data = await getAvailableCallNumbers(apiRequest);
      setNumberState(data);
    } catch (error) {
      console.error(error);
      toast({ title: "Could not scan available numbers", variant: "destructive" });
    } finally {
      setScanning(false);
    }
  };

  const selectNumber = async (phoneNumber: string) => {
    try {
      setSelecting(phoneNumber);
      await selectDedicatedCallNumber(apiRequest, { phoneNumber });
      toast({ title: "Permanent call number selected" });
      await Promise.all([load(), scanNumbers()]);
    } catch (error: any) {
      console.error(error);
      toast({
        title: "Could not select number",
        description: error?.message || "Please scan again and try another number.",
        variant: "destructive",
      });
    } finally {
      setSelecting("");
    }
  };

  if (loading) return <Spinner label="Loading settings..." />;

  const isFree = meta.subscription?.isFree;
  const selectedNumbers =
    numberState?.selectedNumbers ||
    (meta.numbers || []).filter((number: any) => number.assignment === "dedicated");
  const availableNumbers = numberState?.numbers || [];

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
                Manage owner business details and receptionist number availability.
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

        <div className={`${styles.card} p-5`}>
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h2 className={`text-xl font-black flex items-center gap-2 ${styles.text.primary}`}>
                <Phone className="h-5 w-5 text-cyan-500" />
                Receptionist Number
              </h2>
              <p className={`mt-2 max-w-2xl text-sm ${styles.text.secondary}`}>
                Free accounts use a shared number only when one is available at call time. Paid accounts can select one permanent number while the subscription is active.
              </p>
            </div>
            <Button onClick={scanNumbers} disabled={scanning} variant="outline" className="rounded-xl">
              <RefreshCw className={`h-4 w-4 mr-2 ${scanning ? "animate-spin" : ""}`} />
              Scan Available Numbers
            </Button>
          </div>

          <div className="mt-5 grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className={`${styles.innerCard} p-4`}>
              <p className={`text-xs font-semibold uppercase ${styles.text.muted}`}>Plan Mode</p>
              <p className={`mt-1 text-lg font-bold capitalize ${styles.text.primary}`}>
                {isFree ? "Free shared pool" : `${meta.subscription?.plan || "Paid"} permanent number`}
              </p>
            </div>
            <div className={`${styles.innerCard} p-4 md:col-span-2`}>
              <p className={`text-xs font-semibold uppercase ${styles.text.muted}`}>
                Current Permanent Number
              </p>
              <p className={`mt-1 text-lg font-bold ${styles.text.primary}`}>
                {selectedNumbers[0]?.phoneNumber || "No permanent number selected"}
              </p>
            </div>
          </div>

          {numberState && (
            <div className="mt-5 overflow-hidden rounded-xl border border-white/[0.08]">
              <div className={`px-4 py-3 border-b ${styles.divider}`}>
                <p className={`text-sm font-semibold ${styles.text.primary}`}>
                  {numberState.canSelect ? "Dedicated numbers available" : "Shared numbers currently available"}
                </p>
                {!numberState.canSelect && (
                  <p className={`mt-1 text-xs ${styles.text.muted}`}>
                    Free users can preview availability only. The assistant leases a shared number dynamically during a call.
                  </p>
                )}
              </div>
              <div className={`divide-y ${styles.divider}`}>
                {availableNumbers.length === 0 ? (
                  <p className={`px-4 py-8 text-center text-sm ${styles.text.secondary}`}>
                    No available numbers found.
                  </p>
                ) : (
                  availableNumbers.map((number: any) => (
                    <div
                      key={number.phoneNumber}
                      className="flex flex-wrap items-center justify-between gap-3 px-4 py-3"
                    >
                      <div>
                        <p className={`font-bold ${styles.text.primary}`}>{number.phoneNumber}</p>
                        <p className={`text-xs ${styles.text.muted}`}>
                          {number.type} · {number.countryCode}
                        </p>
                      </div>
                      {numberState.canSelect ? (
                        <Button
                          onClick={() => selectNumber(number.phoneNumber)}
                          disabled={selecting === number.phoneNumber}
                          className="rounded-xl bg-cyan-600 hover:bg-cyan-700 text-white"
                        >
                          <Check className="h-4 w-4 mr-2" />
                          {selecting === number.phoneNumber ? "Selecting..." : "Select Permanent"}
                        </Button>
                      ) : (
                        <span className="rounded-full border border-amber-500/20 bg-amber-500/10 px-3 py-1 text-xs font-semibold text-amber-500">
                          Preview only
                        </span>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
