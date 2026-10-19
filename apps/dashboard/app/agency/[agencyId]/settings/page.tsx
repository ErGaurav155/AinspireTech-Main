"use client";

import { useCallback, useEffect, useState } from "react";
import { BarChart3, Building2, Loader2, Palette, Save } from "lucide-react";
import { useParams } from "next/navigation";
import { useThemeStyles } from "@rocketreplai/ui";
import { useApi } from "@/lib/useApi";
import { getAgency, updateAgencySettings } from "@/lib/services/platform.api";

type FormState = {
  name: string;
  contactEmail: string;
  contactPhone: string;
  websiteUrl: string;
  timezone: string;
  displayName: string;
  logoUrl: string;
  primaryColor: string;
  hideRocketReplAI: boolean;
  weeklyEmailEnabled: boolean;
  reportEmail: string;
  defaultRangeDays: 7 | 30 | 90;
  includeUsage: boolean;
  includeLeads: boolean;
  includeAppointments: boolean;
};

const emptyForm: FormState = {
  name: "",
  contactEmail: "",
  contactPhone: "",
  websiteUrl: "",
  timezone: "Asia/Kolkata",
  displayName: "",
  logoUrl: "",
  primaryColor: "#8b5cf6",
  hideRocketReplAI: false,
  weeklyEmailEnabled: false,
  reportEmail: "",
  defaultRangeDays: 30,
  includeUsage: true,
  includeLeads: true,
  includeAppointments: true,
};

export default function AgencySettingsPage() {
  const { agencyId } = useParams<{ agencyId: string }>();
  const { apiRequest } = useApi();
  const { styles } = useThemeStyles();
  const [form, setForm] = useState<FormState>(emptyForm);
  const [features, setFeatures] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const result = await getAgency(apiRequest, agencyId);
      const agency = result.agency || {};
      const profile = agency.settings?.profile || {};
      const reporting = agency.settings?.reporting || {};
      const branding = agency.branding || {};
      setFeatures(result.entitlements?.features || {});
      setForm({
        name: agency.name || "",
        contactEmail: profile.contactEmail || "",
        contactPhone: profile.contactPhone || "",
        websiteUrl: profile.websiteUrl || "",
        timezone: profile.timezone || "Asia/Kolkata",
        displayName: branding.displayName || "",
        logoUrl: branding.logoUrl || "",
        primaryColor: branding.primaryColor || "#8b5cf6",
        hideRocketReplAI: Boolean(branding.hideRocketReplAI),
        weeklyEmailEnabled: Boolean(reporting.weeklyEmailEnabled),
        reportEmail: reporting.reportEmail || "",
        defaultRangeDays: [7, 30, 90].includes(reporting.defaultRangeDays)
          ? reporting.defaultRangeDays
          : 30,
        includeUsage: reporting.includeUsage ?? true,
        includeLeads: reporting.includeLeads ?? true,
        includeAppointments: reporting.includeAppointments ?? true,
      });
    } catch (value: any) {
      setError(value.message || "Unable to load agency settings");
    } finally {
      setLoading(false);
    }
  }, [agencyId, apiRequest]);

  useEffect(() => void load(), [load]);

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((current) => ({ ...current, [key]: value }));

  const save = async () => {
    setSaving(true);
    setMessage("");
    setError("");
    try {
      const payload: Record<string, unknown> = {
        name: form.name,
        profile: {
          contactEmail: form.contactEmail,
          contactPhone: form.contactPhone,
          websiteUrl: form.websiteUrl,
          timezone: form.timezone,
        },
      };
      if (features.customBranding) {
        payload.branding = {
          displayName: form.displayName,
          logoUrl: form.logoUrl,
          primaryColor: form.primaryColor,
          hideRocketReplAI: form.hideRocketReplAI,
        };
      }
      if (features.advancedReporting) {
        payload.reporting = {
          weeklyEmailEnabled: form.weeklyEmailEnabled,
          reportEmail: form.reportEmail,
          defaultRangeDays: form.defaultRangeDays,
          includeUsage: form.includeUsage,
          includeLeads: form.includeLeads,
          includeAppointments: form.includeAppointments,
        };
      }
      await updateAgencySettings(apiRequest, agencyId, payload);
      setMessage("Agency settings saved.");
    } catch (value: any) {
      setError(value.message || "Unable to save agency settings");
    } finally {
      setSaving(false);
    }
  };

  const inputClass = `${styles.input} w-full px-3 py-2.5 text-sm`;
  const sectionClass = `${styles.card} p-5 md:p-6`;

  if (loading) {
    return (
      <div className="flex min-h-64 items-center justify-center text-slate-500">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Loading settings…
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl pb-10">
      <p className="text-sm text-violet-500 dark:text-violet-400">Agency</p>
      <h1 className="mt-1 text-3xl font-bold">Settings</h1>
      <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
        Manage your agency profile and plan-enabled client branding and reports.
      </p>

      {error && <Notice color="red">{error}</Notice>}
      {message && <Notice color="green">{message}</Notice>}

      <div className="mt-7 grid gap-5">
        <section className={sectionClass}>
          <SectionTitle icon={<Building2 className="h-5 w-5 text-violet-500" />} title="Agency profile" description="Contact and account details for your agency." />
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <Field label="Agency name"><input required className={inputClass} value={form.name} onChange={(event) => set("name", event.target.value)} /></Field>
            <Field label="Contact email"><input type="email" className={inputClass} value={form.contactEmail} onChange={(event) => set("contactEmail", event.target.value)} /></Field>
            <Field label="Contact phone"><input className={inputClass} value={form.contactPhone} onChange={(event) => set("contactPhone", event.target.value)} /></Field>
            <Field label="Website URL"><input type="url" placeholder="https://example.com" className={inputClass} value={form.websiteUrl} onChange={(event) => set("websiteUrl", event.target.value)} /></Field>
            <Field label="Timezone"><input className={inputClass} value={form.timezone} onChange={(event) => set("timezone", event.target.value)} /></Field>
          </div>
        </section>

        <section className={`${sectionClass} ${features.customBranding ? "" : "opacity-75"}`}>
          <SectionTitle icon={<Palette className="h-5 w-5 text-pink-500" />} title="Branding" description="Customize your agency identity in client-facing areas." badge={features.customBranding ? undefined : "Upgrade required"} />
          <fieldset disabled={!features.customBranding} className="mt-5 grid gap-4 disabled:cursor-not-allowed sm:grid-cols-2">
            <Field label="Display name"><input className={inputClass} value={form.displayName} onChange={(event) => set("displayName", event.target.value)} /></Field>
            <Field label="Logo URL"><input type="url" className={inputClass} value={form.logoUrl} onChange={(event) => set("logoUrl", event.target.value)} /></Field>
            <Field label="Primary color"><div className="flex gap-2"><input type="color" className="h-11 w-14 rounded-lg border border-slate-200 bg-transparent p-1 dark:border-white/10" value={form.primaryColor} onChange={(event) => set("primaryColor", event.target.value)} /><input className={inputClass} value={form.primaryColor} onChange={(event) => set("primaryColor", event.target.value)} /></div></Field>
            <label className="flex items-center gap-3 self-end pb-2 text-sm"><input type="checkbox" checked={form.hideRocketReplAI} onChange={(event) => set("hideRocketReplAI", event.target.checked)} /> Hide RocketReplAI branding where supported</label>
          </fieldset>
        </section>

        <section className={`${sectionClass} ${features.advancedReporting ? "" : "opacity-75"}`}>
          <SectionTitle icon={<BarChart3 className="h-5 w-5 text-cyan-500" />} title="Reporting" description="Configure default client reports and weekly summaries." badge={features.advancedReporting ? undefined : "Growth Partner or higher"} />
          <fieldset disabled={!features.advancedReporting} className="mt-5 grid gap-4 disabled:cursor-not-allowed sm:grid-cols-2">
            <Field label="Report email"><input type="email" className={inputClass} value={form.reportEmail} onChange={(event) => set("reportEmail", event.target.value)} /></Field>
            <Field label="Default report period"><select className={inputClass} value={form.defaultRangeDays} onChange={(event) => set("defaultRangeDays", Number(event.target.value) as 7 | 30 | 90)}><option value={7}>Last 7 days</option><option value={30}>Last 30 days</option><option value={90}>Last 90 days</option></select></Field>
            <label className="flex items-center gap-3 text-sm"><input type="checkbox" checked={form.weeklyEmailEnabled} onChange={(event) => set("weeklyEmailEnabled", event.target.checked)} /> Send a weekly email summary</label>
            <div className="flex flex-wrap gap-4 text-sm">
              <Check label="Usage" checked={form.includeUsage} onChange={(value) => set("includeUsage", value)} />
              <Check label="Leads" checked={form.includeLeads} onChange={(value) => set("includeLeads", value)} />
              <Check label="Appointments" checked={form.includeAppointments} onChange={(value) => set("includeAppointments", value)} />
            </div>
          </fieldset>
        </section>
      </div>

      <button type="button" disabled={saving || !form.name.trim()} onClick={() => void save()} className={`${styles.button.primary} mt-6 inline-flex items-center px-5 py-2.5 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-60`}>
        {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
        {saving ? "Saving…" : "Save settings"}
      </button>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="grid gap-1.5 text-sm font-medium"><span>{label}</span>{children}</label>;
}

function Check({ label, checked, onChange }: { label: string; checked: boolean; onChange: (value: boolean) => void }) {
  return <label className="flex items-center gap-2"><input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} /> {label}</label>;
}

function SectionTitle({ icon, title, description, badge }: { icon: React.ReactNode; title: string; description: string; badge?: string }) {
  return <div className="flex flex-wrap items-center justify-between gap-3"><div className="flex items-center gap-3">{icon}<div><h2 className="font-semibold">{title}</h2><p className="text-xs text-slate-500 dark:text-slate-400">{description}</p></div></div>{badge && <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-700 dark:bg-amber-500/15 dark:text-amber-300">{badge}</span>}</div>;
}

function Notice({ color, children }: { color: "red" | "green"; children: React.ReactNode }) {
  const className = color === "red" ? "border-red-300 bg-red-50 text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-200" : "border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-200";
  return <div className={`mt-5 rounded-xl border p-4 text-sm ${className}`}>{children}</div>;
}
