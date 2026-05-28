"use client";

import { useCallback, useEffect, useState } from "react";
import { Bell, CalendarDays, Headphones, RefreshCw, Users } from "lucide-react";
import { Button, Orbs, Spinner, toast, useThemeStyles } from "@rocketreplai/ui";
import { useApi } from "@/lib/useApi";
import { getCallCollection } from "@/lib/services/call-actions.api";
import CreateCallAssistantGate from "@/components/call/CreateCallAssistantGate";

const sections = [
  {
    key: "calls",
    title: "Calls",
    icon: Headphones,
    fields: ["createdAt", "fromNumber", "toNumber", "status", "durationSec", "summary"],
  },
  {
    key: "leads",
    title: "Leads",
    icon: Users,
    fields: ["createdAt", "callerName", "callerPhone", "callerEmail", "interest", "status"],
  },
  {
    key: "appointments",
    title: "Appointments",
    icon: CalendarDays,
    fields: ["startsAt", "title", "customerName", "customerPhone", "status"],
  },
  {
    key: "notifications",
    title: "Alert Channels",
    icon: Bell,
    fields: ["channel", "address", "enabled"],
  },
] as const;

function formatValue(value: any) {
  if (value === undefined || value === null || value === "") return "-";
  if (Array.isArray(value)) return value.join(", ");
  if (typeof value === "boolean") return value ? "Enabled" : "Disabled";
  if (typeof value === "string" && !Number.isNaN(Date.parse(value)) && value.includes("T")) {
    return new Date(value).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" });
  }
  return String(value);
}

export default function CallOperationsPage() {
  const { apiRequest } = useApi();
  const { styles, isDark } = useThemeStyles();
  const [data, setData] = useState<Record<string, any[]>>({});
  const [meta, setMeta] = useState<any>({});
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const results = await Promise.all(
        sections.map((section) => getCallCollection(apiRequest, section.key)),
      );
      const next: Record<string, any[]> = {};
      results.forEach((result, index) => {
        next[sections[index].key] = result?.[sections[index].key] || [];
      });
      setData(next);
      setMeta(results[0] || {});
    } catch (error) {
      console.error(error);
      toast({ title: "Could not load call operations", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [apiRequest]);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) return <Spinner label="Loading call operations..." />;
  if (!meta.isConfigured) return <CreateCallAssistantGate onCreated={load} />;

  return (
    <div className={styles.page}>
      {isDark && <Orbs />}
      <div className={styles.container}>
        <div className={`${styles.card} p-5 md:p-8`}>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h1 className={`text-2xl md:text-3xl font-black ${styles.text.primary}`}>
                Call Inbox
              </h1>
              <p className={`font-montserrat mt-2 text-sm ${styles.text.secondary}`}>
                Calls, leads, appointments, and alert channels in one owner-only workspace.
              </p>
            </div>
            <Button onClick={load} variant="outline" className="rounded-xl">
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>
        </div>

        {sections.map((section) => {
          const Icon = section.icon;
          const items = data[section.key] || [];
          return (
            <div key={section.key} className={`${styles.card} overflow-hidden`}>
              <div className={`p-4 border-b ${styles.divider} flex items-center justify-between`}>
                <h2 className={`text-sm font-bold flex items-center gap-2 ${styles.text.primary}`}>
                  <Icon className="h-4 w-4 text-pink-400" />
                  {section.title}
                </h2>
                <span className={`text-xs ${styles.text.muted}`}>
                  {items.length} records
                </span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className={isDark ? "bg-white/[0.03]" : "bg-gray-50"}>
                    <tr>
                      {section.fields.map((field) => (
                        <th key={field} className={`px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide ${styles.text.muted}`}>
                          {field.replace(/([A-Z])/g, " $1")}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className={`divide-y ${styles.divider}`}>
                    {items.length === 0 ? (
                      <tr>
                        <td colSpan={section.fields.length} className={`px-4 py-8 text-center ${styles.text.secondary}`}>
                          No records yet.
                        </td>
                      </tr>
                    ) : (
                      items.map((item, index) => (
                        <tr key={item._id || item.callSid || index} className={styles.rowHover}>
                          {section.fields.map((field) => (
                            <td key={field} className={`px-4 py-3 align-top ${styles.text.secondary}`}>
                              <span className="line-clamp-2">{formatValue(item[field])}</span>
                            </td>
                          ))}
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
