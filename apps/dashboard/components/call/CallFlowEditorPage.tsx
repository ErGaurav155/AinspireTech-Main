"use client";

import { useCallback, useEffect, useState } from "react";
import { GitBranch, Save, Sparkles } from "lucide-react";
import { Button, Orbs, Spinner, toast, useThemeStyles } from "@rocketreplai/ui";
import { useApi } from "@/lib/useApi";
import { getCallCollection, updateCallWorkspace } from "@/lib/services/call-actions.api";
import CreateCallAssistantGate from "@/components/call/CreateCallAssistantGate";

const QUESTION_SUGGESTIONS = [
  "May I know your name?",
  "What is your phone number?",
  "What is your business name?",
  "Which service or plan are you interested in?",
  "When should Gaurav call you back?",
];

export default function CallFlowEditorPage() {
  const { apiRequest } = useApi();
  const { styles, isDark } = useThemeStyles();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [meta, setMeta] = useState<any>({});
  const [flow, setFlow] = useState<any>({
    name: "CatchCustomerCall Voice Lead Capture",
    greeting: "",
    behaviorPrompt: "",
    questions: QUESTION_SUGGESTIONS,
    collectFields: ["name", "phone", "business_name", "service_or_plan"],
    noVoiceTimeoutSec: 120,
    fallbackAction: "take_message",
    isActive: true,
  });

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const data = await getCallCollection(apiRequest, "flows");
      setMeta(data || {});
      setFlow({ ...flow, ...(data?.flows?.[0] || {}) });
    } catch (error) {
      console.error(error);
      toast({ title: "Could not load AI flow", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [apiRequest]);

  useEffect(() => {
    load();
  }, [load]);

  const save = async () => {
    try {
      setSaving(true);
      await updateCallWorkspace(apiRequest, { flow });
      toast({ title: "AI flow saved" });
      await load();
    } catch (error) {
      console.error(error);
      toast({ title: "Could not save AI flow", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <Spinner label="Loading AI flow..." />;
  if (!meta.isConfigured) return <CreateCallAssistantGate onCreated={load} />;

  return (
    <div className={styles.page}>
      {isDark && <Orbs />}
      <div className={styles.container}>
        <div className={`${styles.card} p-5 md:p-8`}>
          <div className="flex items-start gap-4">
            <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-pink-500 to-rose-500 flex items-center justify-center text-white">
              <GitBranch className="h-6 w-6" />
            </div>
            <div>
              <h1 className={`text-2xl md:text-3xl font-black ${styles.text.primary}`}>
                AI Flow Editor
              </h1>
              <p className={`font-montserrat mt-2 max-w-2xl text-sm ${styles.text.secondary}`}>
                Edit assistant behavior, questions, captured fields, and the
                two-minute no-voice timeout.
              </p>
            </div>
          </div>
        </div>

        <div className={`${styles.card} p-5 md:p-6 space-y-5`}>
          <label className="block space-y-1">
            <span className={`text-xs font-semibold ${styles.text.muted}`}>Greeting</span>
            <textarea
              rows={2}
              value={flow.greeting || ""}
              onChange={(event) => setFlow({ ...flow, greeting: event.target.value })}
              className={`w-full rounded-xl border px-3 py-2 text-sm outline-none ${isDark ? "border-white/[0.08] bg-white/[0.04] text-white" : "border-gray-200 bg-white text-gray-900"}`}
            />
          </label>

          <label className="block space-y-1">
            <span className={`text-xs font-semibold ${styles.text.muted}`}>Assistant behavior prompt</span>
            <textarea
              rows={7}
              value={flow.behaviorPrompt || ""}
              onChange={(event) => setFlow({ ...flow, behaviorPrompt: event.target.value })}
              className={`w-full rounded-xl border px-3 py-2 text-sm outline-none ${isDark ? "border-white/[0.08] bg-white/[0.04] text-white" : "border-gray-200 bg-white text-gray-900"}`}
            />
          </label>

          <div>
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="h-4 w-4 text-pink-400" />
              <span className={`text-xs font-semibold ${styles.text.muted}`}>Suggested question flow</span>
            </div>
            <div className="space-y-2">
              {(flow.questions || []).map((question: string, index: number) => (
                <input
                  key={`${question}-${index}`}
                  value={question}
                  onChange={(event) => {
                    const next = [...(flow.questions || [])];
                    next[index] = event.target.value;
                    setFlow({ ...flow, questions: next });
                  }}
                  className={`w-full rounded-xl border px-3 py-2 text-sm outline-none ${isDark ? "border-white/[0.08] bg-white/[0.04] text-white" : "border-gray-200 bg-white text-gray-900"}`}
                />
              ))}
            </div>
          </div>

          <label className="block space-y-1">
            <span className={`text-xs font-semibold ${styles.text.muted}`}>No voice timeout seconds</span>
            <input
              type="number"
              min={30}
              max={120}
              value={flow.noVoiceTimeoutSec || 120}
              onChange={(event) =>
                setFlow({ ...flow, noVoiceTimeoutSec: Number(event.target.value) })
              }
              className={`w-full rounded-xl border px-3 py-2 text-sm outline-none ${isDark ? "border-white/[0.08] bg-white/[0.04] text-white" : "border-gray-200 bg-white text-gray-900"}`}
            />
          </label>

          <Button
            onClick={save}
            disabled={saving}
            className="rounded-xl bg-gradient-to-r from-pink-500 to-rose-500 text-white"
          >
            <Save className="h-4 w-4 mr-2" />
            {saving ? "Saving..." : "Save Flow"}
          </Button>
        </div>
      </div>
    </div>
  );
}
