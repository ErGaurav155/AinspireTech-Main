"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  Activity,
  ArrowUpRight,
  BarChart3,
  Bell,
  CheckCircle2,
  Headphones,
  RefreshCw,
  Rocket,
  Shield,
  Sparkles,
  Timer,
  Users,
  Zap,
} from "lucide-react";
import {
  Button,
  Orbs,
  Spinner,
  StatCard,
  toast,
  useThemeStyles,
} from "@rocketreplai/ui";
import { useApi } from "@/lib/useApi";
import { getCallDashboard } from "@/lib/services/call-actions.api";
import CreateCallAssistantGate from "@/components/call/CreateCallAssistantGate";

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.55, ease: "easeOut" },
  },
};

const stagger = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.1 } },
};

export default function CallDashboardPage() {
  const { apiRequest } = useApi();
  const { styles, isDark } = useThemeStyles();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const result = await getCallDashboard(apiRequest);
      setData(result);
    } catch (error) {
      console.error(error);
      toast({ title: "Failed to load call dashboard", variant: "destructive" });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [apiRequest]);

  useEffect(() => {
    load();
  }, [load]);

  const usagePercent = useMemo(() => {
    const overview = data?.overview || {};
    return Math.min(
      100,
      Math.round(
        ((overview.minutesUsed || 0) / (overview.minutesLimit || 1)) * 100,
      ),
    );
  }, [data]);

  if (loading) return <Spinner label="Loading call dashboard..." />;

  if (!data?.isConfigured) {
    return <CreateCallAssistantGate onCreated={load} />;
  }

  const overview = data?.overview || {};
  const recentCalls = data?.recentCalls || [];
  const recentLeads = data?.recentLeads || [];
  const gradientText =
    "bg-gradient-to-r from-pink-400 to-rose-400 bg-clip-text text-transparent";

  return (
    <div className={styles.page}>
      {isDark && <Orbs />}
      <div className={styles.container}>
        <motion.section
          variants={stagger}
          initial="hidden"
          animate="visible"
          className={`${styles.card} p-5 md:p-8 lg:p-10 relative overflow-hidden group`}
        >
          <div className="absolute inset-0 bg-gradient-to-br from-pink-500/10 via-rose-500/5 to-orange-400/10 pointer-events-none" />
          <div className="absolute inset-0 bg-gradient-to-br from-pink-500/5 to-rose-500/5 opacity-0 group-hover:opacity-100 transition-opacity" />
          <div className="absolute top-0 left-0 h-1 w-full bg-gradient-to-r from-transparent via-pink-400 to-transparent" />
          <div className="relative z-10 flex flex-wrap items-start justify-between gap-5">
            <div className="max-w-3xl">
              <motion.div variants={fadeUp} className="inline-flex items-center gap-2 rounded-full border border-pink-500/20 bg-pink-500/10 px-4 py-2 mb-4">
                <Sparkles className="h-4 w-4 text-pink-400" />
                <span className="text-xs font-bold uppercase tracking-widest text-pink-400">
                  AI Call Assistant
                </span>
              </motion.div>

              <motion.h1
                variants={fadeUp}
                className={`text-3xl md:text-5xl font-bold leading-tight ${styles.text.primary}`}
              >
                Never miss calls.
                <br />
                <span className={gradientText}>Turn callers into leads.</span>
              </motion.h1>

              <motion.p
                variants={fadeUp}
                className={`font-montserrat mt-3 max-w-2xl text-sm md:text-base leading-relaxed ${styles.text.secondary}`}
              >
                Answer missed calls, qualify callers, capture lead details, and
                notify the owner through WhatsApp, SMS, or email.
              </motion.p>

              {data?.subscription?.isFree && (
                <motion.div
                  variants={fadeUp}
                  className="mt-4 rounded-xl border border-amber-500/20 bg-amber-500/10 px-4 py-3"
                >
                  <p className="font-montserrat text-xs font-semibold text-amber-400">
                    Free mode: {overview.minutesUsed || 0}/
                    {overview.minutesLimit || 10} minutes and{" "}
                    {overview.callsUsed || 0}/{overview.callsLimit || 5} calls
                    used. Upgrade before the limit to keep the assistant active.
                  </p>
                </motion.div>
              )}

              <motion.div variants={fadeUp} className="mt-6 flex flex-wrap gap-3">
                <Link
                  href="/call/flows"
                  className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-pink-500 to-rose-500 px-4 py-2.5 text-sm font-bold text-white shadow-lg shadow-pink-500/20 transition-opacity hover:opacity-90"
                >
                  <Rocket className="h-4 w-4" />
                  Configure AI Flow
                  <ArrowUpRight className="h-4 w-4" />
                </Link>
                <Link
                  href="/call/pricing"
                  className={`inline-flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-bold ${
                    isDark
                      ? "border-pink-500/30 text-pink-300 hover:bg-white/[0.06]"
                      : "border-pink-200 text-pink-600 hover:bg-pink-50"
                  }`}
                >
                  <Zap className="h-4 w-4" />
                  View Pricing
                </Link>
                <Link
                  href="/call/settings"
                  className={`inline-flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-bold ${
                    isDark
                      ? "border-white/[0.08] text-white/70 hover:bg-white/[0.06]"
                      : "border-gray-200 text-gray-700 hover:bg-gray-50"
                  }`}
                >
                  Number Settings
                </Link>
              </motion.div>

              <motion.div
                variants={fadeUp}
                className={`mt-6 flex flex-wrap gap-4 text-xs font-montserrat ${styles.text.muted}`}
              >
                <span className="inline-flex items-center gap-1">
                  <Shield className="h-3.5 w-3.5 text-green-400" />
                  Secure call records
                </span>
                <span className="inline-flex items-center gap-1">
                  <Headphones className="h-3.5 w-3.5 text-pink-400" />
                  Receptionist workflow
                </span>
                <span className="inline-flex items-center gap-1">
                  <Bell className="h-3.5 w-3.5 text-rose-400" />
                  Instant alerts
                </span>
              </motion.div>
            </div>

            <motion.div variants={fadeUp}>
              <Button
                onClick={async () => {
                  setRefreshing(true);
                  await load();
                }}
                variant="outline"
                className="rounded-xl"
              >
                <RefreshCw
                  className={`h-4 w-4 mr-2 ${refreshing ? "animate-spin" : ""}`}
                />
                Refresh
              </Button>
            </motion.div>
          </div>
        </motion.section>

        <motion.div
          variants={stagger}
          initial="hidden"
          animate="visible"
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"
        >
          {[
            {
              iconBg: styles.icon.blue,
              label: "Total Calls",
              icon: <Headphones className="h-5 w-5 text-blue-400" />,
              value: (overview.totalCalls || 0).toLocaleString(),
            },
            {
              iconBg: styles.icon.green,
              label: "Answered",
              icon: <CheckCircle2 className="h-5 w-5 text-green-400" />,
              value: (overview.answeredCalls || 0).toLocaleString(),
            },
            {
              iconBg: styles.icon.pink,
              label: "Leads Captured",
              icon: <Users className="h-5 w-5 text-pink-400" />,
              value: (overview.totalLeads || 0).toLocaleString(),
            },
            {
              iconBg: styles.icon.amber,
              label: "Minutes Used",
              icon: <Timer className="h-5 w-5 text-amber-400" />,
              value: `${overview.minutesUsed || 0}/${overview.minutesLimit || 0}`,
            },
          ].map((card) => (
            <motion.div key={card.label} variants={fadeUp}>
              <StatCard {...card} />
            </motion.div>
          ))}
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className={`${styles.card} p-5 lg:col-span-2`}
          >
            <div className="flex items-center justify-between mb-5">
              <h2 className={`text-base font-bold flex items-center gap-2 ${styles.text.primary}`}>
                <BarChart3 className="h-4 w-4 text-pink-400" />
                Call Trends
              </h2>
              <span className={`text-xs font-montserrat ${styles.text.muted}`}>
                Last 7 days
              </span>
            </div>
            <div className="grid grid-cols-7 gap-2 items-end min-h-48">
              {(data?.trends || []).map((point: any) => {
                const height = Math.max(8, Math.min(100, point.calls * 24));
                return (
                  <div key={point.label} className="flex flex-col items-center gap-2">
                    <div className="w-full flex items-end justify-center h-32">
                      <motion.div
                        initial={{ height: 0 }}
                        whileInView={{ height: `${height}%` }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.7, ease: "easeOut" }}
                        className="w-8 rounded-t-lg bg-gradient-to-t from-pink-500 via-rose-500 to-orange-400"
                        title={`${point.calls} calls, ${point.leads} leads`}
                      />
                    </div>
                    <span className={`text-[11px] font-montserrat ${styles.text.muted}`}>
                      {point.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className={`${styles.card} p-5`}
          >
            <h2 className={`text-base font-bold flex items-center gap-2 ${styles.text.primary}`}>
              <Bell className="h-4 w-4 text-pink-400" />
              Usage
            </h2>
            <div
              className={
                isDark
                  ? "mt-5 h-3 rounded-full bg-white/[0.08]"
                  : "mt-5 h-3 rounded-full bg-gray-100"
              }
            >
              <div
                className="h-3 rounded-full bg-gradient-to-r from-pink-500 to-rose-500"
                style={{ width: `${usagePercent}%` }}
              />
            </div>
            <p className={`font-montserrat mt-3 text-sm ${styles.text.secondary}`}>
              {usagePercent}% of this billing cycle's included receptionist
              minutes used.
            </p>
            <Link href="/call/billing" className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-pink-400">
              View billing
              <ArrowUpRight className="h-4 w-4" />
            </Link>
          </motion.div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {[
            {
              title: "Recent Calls",
              icon: Activity,
              href: "/call/calls",
              items: recentCalls,
              render: (call: any) => ({
                key: call.callSid,
                primary: call.fromNumber,
                secondary: call.summary || call.status,
                badge: call.status,
                badgeClass: "bg-pink-500/10 text-pink-400",
              }),
            },
            {
              title: "Recent Leads",
              icon: Users,
              href: "/call/leads",
              items: recentLeads,
              render: (lead: any, index: number) => ({
                key: lead._id || index,
                primary: lead.callerName,
                secondary: lead.interest || lead.callerPhone,
                badge: lead.status,
                badgeClass: "bg-emerald-500/10 text-emerald-400",
              }),
            },
          ].map((section) => {
            const Icon = section.icon;
            return (
              <motion.div
                key={section.title}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className={`${styles.card} overflow-hidden`}
              >
                <div className={`p-4 border-b ${styles.divider} flex items-center justify-between`}>
                  <h2 className={`text-sm font-bold flex items-center gap-2 ${styles.text.primary}`}>
                    <Icon className="h-4 w-4 text-pink-400" />
                    {section.title}
                  </h2>
                  <Link href={section.href} className="text-xs font-semibold text-pink-400">
                    View all
                  </Link>
                </div>
                <div className={`divide-y ${styles.divider}`}>
                  {section.items.map((item: any, index: number) => {
                    const row = section.render(item, index);
                    return (
                      <div
                        key={row.key}
                        className={`p-4 flex items-center justify-between gap-3 ${styles.rowHover}`}
                      >
                        <div>
                          <p className={`text-sm font-semibold ${styles.text.primary}`}>
                            {row.primary}
                          </p>
                          <p className={`font-montserrat text-xs ${styles.text.muted}`}>
                            {row.secondary}
                          </p>
                        </div>
                        <span className={`rounded-full px-2 py-1 text-xs font-semibold ${row.badgeClass}`}>
                          {row.badge}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
