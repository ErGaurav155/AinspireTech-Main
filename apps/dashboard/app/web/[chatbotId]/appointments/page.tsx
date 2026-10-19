"use client";
// apps/dashboard/app/web/[chatbotId]/appointments/page.tsx

import { useState, useEffect, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@clerk/nextjs";
import Link from "next/link";
import {
  Plus,
  Save,
  Trash2,
  GripVertical,
  Bot,
  ExternalLink,
  Calendar,
  AlertCircle,
  Loader2,
  ChevronDown,
  MessageSquareText,
  X,
} from "lucide-react";
import { useApi } from "@/lib/useApi";
import {
  getChatbots,
  getAppointmentQuestions,
  saveAppointmentQuestions,
} from "@/lib/services/web-actions.api";
import { Button, Orbs, Spinner, toast, useThemeStyles } from "@rocketreplai/ui";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";

type FieldType = "text" | "email" | "tel" | "date" | "select" | "textarea";

interface Question {
  id: string;
  question: string;
  type: FieldType;
  required: boolean;
  options?: string[];
}

interface CustomerFlow {
  id: string;
  label: string;
  introMessage: string;
  completionAction: "book_appointment" | "submit_details";
  questions: Question[];
}

const FIELD_TYPES: { value: FieldType; label: string; icon: string }[] = [
  { value: "text", label: "Short Text", icon: "Aa" },
  { value: "email", label: "Email Address", icon: "✉" },
  { value: "tel", label: "Phone Number", icon: "📞" },
  { value: "date", label: "Date Picker", icon: "📅" },
  { value: "select", label: "Dropdown", icon: "≡" },
  { value: "textarea", label: "Long Text", icon: "¶" },
];

const DEFAULT_QUESTIONS: Question[] = [
  {
    id: "dq1",
    question: "What is your full name?",
    type: "text",
    required: true,
  },
  {
    id: "dq2",
    question: "What is your email address?",
    type: "email",
    required: true,
  },
  {
    id: "dq3",
    question: "What is your phone number?",
    type: "tel",
    required: true,
  },
  {
    id: "dq4",
    question: "What service are you interested in?",
    type: "select",
    required: true,
    options: ["Consultation", "Service A", "Service B", "Other"],
  },
];

function uid() {
  return `q_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

function flowUid() {
  return `flow_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

const createDefaultFlow = (label = "Book an appointment"): CustomerFlow => ({
  id: flowUid(),
  label,
  introMessage:
    label === "Book an appointment"
      ? "I'd love to help you book an appointment. Let me gather some details."
      : `Let's get started with ${label}.`,
  completionAction:
    label === "Book an appointment" ? "book_appointment" : "submit_details",
  questions: DEFAULT_QUESTIONS.map((question) => ({ ...question, id: uid() })),
});

// ─── Question card ────────────────────────────────────────────────────────────

function QuestionCard({
  q,
  idx,
  total,
  isDark,
  styles,
  pc,
  isEditing,
  onToggleEdit,
  onChange,
  onRequestDelete,
  onMoveUp,
  onMoveDown,
}: {
  q: Question;
  idx: number;
  total: number;
  isDark: boolean;
  styles: any;
  pc: string;
  isEditing: boolean;
  onToggleEdit: () => void;
  onChange: (field: keyof Question, value: any) => void;
  onRequestDelete: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
}) {
  const [optionInput, setOptionInput] = useState("");
  const ft = FIELD_TYPES.find((f) => f.value === q.type);

  function addOption() {
    const v = optionInput.trim();
    if (!v) return;
    const opts = [...(q.options || [])];
    if (!opts.includes(v)) onChange("options", [...opts, v]);
    setOptionInput("");
  }

  return (
    <div
      className={`${styles.card} rounded-2xl overflow-hidden transition-all ${
        isEditing
          ? isDark
            ? "ring-2 ring-purple-500/40"
            : "ring-2 ring-purple-300"
          : ""
      }`}
    >
      {/* Summary row */}
      <div
        className={`flex flex-wrap items-center justify-between  gap-3 p-4 cursor-pointer select-none ${
          isDark ? "hover:bg-white/[0.03]" : "hover:bg-gray-50"
        } transition-colors`}
        onClick={onToggleEdit}
      >
        <div className="flex flex-wrap items-center gap-5">
          <div className="flex items-center justify-between sm:justify-center gap-1">
            <div className="flex items-center gap-1 md:gap-2">
              <GripVertical
                className={`h-4 w-4 flex-shrink-0 ${styles.text.muted} cursor-grab`}
              />
              <div
                className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
                style={{ background: pc }}
              >
                {idx + 1}
              </div>
            </div>
          </div>
          <div className="flex flex-col items-center gap-1">
            <p
              className={`text-sm font-medium truncate ${styles.text.primary} max-w-xs text-center`}
            >
              {q.question || (
                <span className={`italic ${styles.text.muted}`}>
                  Untitled question
                </span>
              )}
            </p>
            <div className="flex items-center gap-2 mt-0.5">
              <span
                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium border ${
                  isDark
                    ? "bg-blue-500/10 border-blue-500/20 text-blue-400"
                    : "bg-blue-50 border-blue-100 text-blue-700"
                }`}
              >
                {ft?.icon} {ft?.label}
              </span>
              {q.required && (
                <span className="text-xs text-red-500 font-medium">
                  Required
                </span>
              )}
            </div>
          </div>
        </div>
        <div
          className="flex items-center gap-1"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={onMoveUp}
            disabled={idx === 0}
            className={`p-1.5 rounded-lg disabled:opacity-30 transition-colors ${
              isDark
                ? "hover:bg-white/[0.08] text-white/60"
                : "hover:bg-gray-100 text-gray-500"
            }`}
          >
            <ChevronDown className="h-3.5 w-3.5 rotate-180" />
          </button>
          <button
            onClick={onMoveDown}
            disabled={idx === total - 1}
            className={`p-1.5 rounded-lg disabled:opacity-30 transition-colors ${
              isDark
                ? "hover:bg-white/[0.08] text-white/60"
                : "hover:bg-gray-100 text-gray-500"
            }`}
          >
            <ChevronDown className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={onRequestDelete}
            className={`p-1.5 rounded-lg transition-colors ${
              isDark
                ? "hover:bg-red-500/20 text-red-400"
                : "hover:bg-red-50 text-red-500"
            }`}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Expanded editor */}
      {isEditing && (
        <div
          className={`px-4 pb-4 pt-1 space-y-4 border-t ${
            isDark ? "border-white/[0.06]" : "border-gray-100"
          }`}
        >
          {/* Question text */}
          <div>
            <label
              className={`block text-xs font-medium mb-1.5 ${styles.text.secondary}`}
            >
              Question text
            </label>
            <input
              type="text"
              value={q.question}
              onChange={(e) => onChange("question", e.target.value)}
              placeholder="e.g. What is your full name?"
              className={`w-full px-3 py-2 text-sm rounded-lg border outline-none ${styles.input}`}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Field type */}
            <div>
              <label
                className={`block text-xs font-medium mb-1.5 ${styles.text.secondary}`}
              >
                Field type
              </label>
              <select
                value={q.type}
                onChange={(e) => onChange("type", e.target.value as FieldType)}
                className={`w-full px-3 py-2 text-sm rounded-lg border outline-none ${styles.input}`}
              >
                {FIELD_TYPES.map((ft) => (
                  <option
                    key={ft.value}
                    value={ft.value}
                    className={isDark ? "bg-[#1A1A1E]" : "bg-white"}
                  >
                    {ft.icon} {ft.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Required toggle */}
            <div>
              <label
                className={`block text-xs font-medium mb-1.5 ${styles.text.secondary}`}
              >
                Required
              </label>
              <div className="flex items-center gap-3 mt-2">
                <button
                  type="button"
                  onClick={() => onChange("required", !q.required)}
                  className={`relative w-11 h-6 rounded-full transition-colors ${
                    q.required
                      ? "bg-purple-500"
                      : isDark
                        ? "bg-white/20"
                        : "bg-gray-200"
                  }`}
                >
                  <span
                    className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${
                      q.required ? "translate-x-0" : "-translate-x-5"
                    }`}
                  />
                </button>
                <span className={`text-sm ${styles.text.secondary}`}>
                  {q.required ? "Required" : "Optional"}
                </span>
              </div>
            </div>
          </div>

          {/* Dropdown options */}
          {q.type === "select" && (
            <div>
              <label
                className={`block text-xs font-medium mb-1.5 ${styles.text.secondary}`}
              >
                Dropdown options
              </label>
              <div className="flex flex-wrap gap-1.5 mb-2">
                {(q.options || []).map((opt) => (
                  <span
                    key={opt}
                    className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium ${
                      isDark
                        ? "bg-white/[0.08] text-white/80"
                        : "bg-gray-100 text-gray-700"
                    }`}
                  >
                    {opt}
                    <button
                      onClick={() =>
                        onChange(
                          "options",
                          (q.options || []).filter((o) => o !== opt),
                        )
                      }
                      className="hover:text-red-500 ml-0.5"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={optionInput}
                  onChange={(e) => setOptionInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addOption();
                    }
                  }}
                  placeholder="Type option and press Enter…"
                  className={`flex-1 px-3 py-1.5 text-xs rounded-lg border outline-none ${styles.input}`}
                />
                <button
                  onClick={addOption}
                  className="px-3 py-1.5 text-xs rounded-lg font-medium text-white"
                  style={{ background: pc }}
                >
                  Add
                </button>
              </div>
            </div>
          )}

          {/* Date info note */}
          {q.type === "date" && (
            <div
              className={`flex items-center gap-2 text-xs p-3 rounded-lg ${
                isDark
                  ? "bg-blue-500/10 border border-blue-500/20 text-blue-400"
                  : "bg-blue-50 border border-blue-100 text-blue-700"
              }`}
            >
              <Calendar className="h-3.5 w-3.5 flex-shrink-0" />
              <span>
                In the chat widget this shows an inline calendar picker followed
                by time slot selection.
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AppointmentQuestionsPage() {
  const params = useParams();
  const router = useRouter();
  const rawId = params.chatbotId as string;
  const { userId } = useAuth();
  const { apiRequest } = useApi();
  const { styles, isDark } = useThemeStyles();

  const isValid = rawId === "chatbot-lead-generation";
  const pc = "#8b5cf6";

  const [pageStatus, setPageStatus] = useState<
    "checking" | "not-built" | "ready"
  >("checking");
  const [flows, setFlows] = useState<CustomerFlow[]>([
    createDefaultFlow(),
  ]);
  const [activeFlowId, setActiveFlowId] = useState("");
  const [quickReplyInput, setQuickReplyInput] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const activeFlow = useMemo(
    () => flows.find((flow) => flow.id === activeFlowId) || flows[0],
    [activeFlowId, flows],
  );
  const questions = activeFlow?.questions || [];
  const quickReplies = flows.map((flow) => flow.label);

  const updateActiveFlow = (
    update: (flow: CustomerFlow) => CustomerFlow,
  ) => {
    if (!activeFlow) return;
    setFlows((current) =>
      current.map((flow) => (flow.id === activeFlow.id ? update(flow) : flow)),
    );
  };

  const setQuestions = (
    update: Question[] | ((current: Question[]) => Question[]),
  ) => {
    updateActiveFlow((flow) => ({
      ...flow,
      questions:
        typeof update === "function" ? update(flow.questions) : update,
    }));
  };

  useEffect(() => {
    if (!isValid) router.replace("/web");
  }, [isValid, router]);

  useEffect(() => {
    if (!userId || !isValid) return;
    const init = async () => {
      try {
        const bots = await getChatbots(apiRequest);
        const found = (bots.chatbots || []).find(
          (b: any) => b.type === "chatbot-lead-generation",
        );
        if (!found) {
          setPageStatus("not-built");
          return;
        }
        setIsLoading(true);
        setPageStatus("ready");
        try {
          const data = await getAppointmentQuestions(
            apiRequest,
            "chatbot-lead-generation",
          );
          const qs: Question[] = data?.questions || [];
          const savedFlows: CustomerFlow[] = Array.isArray(data?.flows)
            ? data.flows.filter(
                (flow: CustomerFlow) => flow?.id && flow?.label,
              )
            : [];
          const nextFlows =
            savedFlows.length > 0
              ? savedFlows
              : (
                  Array.isArray(data?.quickReplies) &&
                  data.quickReplies.length > 0
                    ? data.quickReplies
                    : ["Book an appointment"]
                ).map((label: string) => ({
                  ...createDefaultFlow(label),
                  questions: (qs.length > 0 ? qs : DEFAULT_QUESTIONS).map(
                    (question) => ({ ...question, id: uid() }),
                  ),
                }));
          setFlows(nextFlows);
          setActiveFlowId(nextFlows[0].id);
        } catch {
          const fallback = createDefaultFlow();
          setFlows([fallback]);
          setActiveFlowId(fallback.id);
        }
      } catch {
        setPageStatus("not-built");
      } finally {
        setIsLoading(false);
      }
    };
    init();
  }, [userId, isValid, apiRequest]);

  function addQuestion() {
    const newQ: Question = {
      id: uid(),
      question: "",
      type: "text",
      required: false,
    };
    setQuestions((prev) => [...prev, newQ]);
    setEditingId(newQ.id);
  }

  function addQuickReply() {
    const value = quickReplyInput.trim().slice(0, 30);
    if (!value || quickReplies.includes(value) || quickReplies.length >= 5)
      return;
    const newFlow = createDefaultFlow(value);
    setFlows((current) => [...current, newFlow]);
    setActiveFlowId(newFlow.id);
    setQuickReplyInput("");
  }

  function updateQuestion(id: string, field: keyof Question, value: any) {
    setQuestions((prev) =>
      prev.map((q) => (q.id === id ? { ...q, [field]: value } : q)),
    );
  }

  function moveQuestion(idx: number, dir: "up" | "down") {
    const target = dir === "up" ? idx - 1 : idx + 1;
    if (target < 0 || target >= questions.length) return;
    const updated = [...questions];
    [updated[idx], updated[target]] = [updated[target], updated[idx]];
    setQuestions(updated);
  }

  function deleteQuestion(id: string) {
    setQuestions((prev) => prev.filter((q) => q.id !== id));
    setDeleteId(null);
    if (editingId === id) setEditingId(null);
  }

  async function handleSave() {
    if (!userId) return;
    if (flows.length === 0) {
      toast({
        title: "Add a flow button",
        description: "At least one quick reply button is required.",
        variant: "destructive",
        duration: 3000,
      });
      return;
    }
    if (
      new Set(flows.map((flow) => flow.label.trim().toLowerCase())).size !==
      flows.length
    ) {
      toast({
        title: "Use unique button names",
        description: "Each customer flow needs a different quick reply label.",
        variant: "destructive",
        duration: 3000,
      });
      return;
    }
    for (const flow of flows) {
      if (!flow.label.trim() || flow.questions.length === 0) {
        toast({
          title: "Complete every flow",
          description: "Every customer flow needs a name and at least one question.",
          variant: "destructive",
          duration: 3000,
        });
        return;
      }
      for (const q of flow.questions) {
        if (!q.question.trim()) {
          toast({
            title: "Validation error",
            description: "All questions must have text.",
            variant: "destructive",
            duration: 3000,
          });
          return;
        }
        if (q.type === "select" && (!q.options || q.options.length === 0)) {
          toast({
            title: "Validation error",
            description: `"${q.question}" needs at least one dropdown option.`,
            variant: "destructive",
            duration: 3000,
          });
          return;
        }
      }
    }
    setIsSaving(true);
    try {
      await saveAppointmentQuestions(
        apiRequest,
        "chatbot-lead-generation",
        flows[0].questions,
        quickReplies,
        flows,
      );
      setEditingId(null);
      toast({ title: "Questions saved!", duration: 2500 });
    } catch {
      toast({
        title: "Failed to save",
        variant: "destructive",
        duration: 3000,
      });
    } finally {
      setIsSaving(false);
    }
  }

  if (!isValid) return null;

  if (pageStatus === "checking") {
    return (
      <div
        className={`${styles.page} flex items-center justify-center min-h-[40vh]`}
      >
        <Loader2 className="h-7 w-7 animate-spin text-purple-500" />
      </div>
    );
  }

  if (pageStatus === "not-built") {
    return (
      <div className={styles.page}>
        {isDark && <Orbs />}
        <div className="flex flex-col items-center justify-center py-20 px-4 text-center">
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center mb-6">
            <Bot className="h-10 w-10 text-white" />
          </div>
          <h2 className={`text-2xl font-bold ${styles.text.primary} mb-3`}>
            Build your chatbot first
          </h2>
          <p className={`text-sm ${styles.text.secondary} mb-8 max-w-sm`}>
            Create your Lead Generation chatbot before customising customer
            flows.
          </p>
          <Link
            href="/web/chatbot-lead-generation/create"
            className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl text-sm font-medium hover:opacity-90 transition-opacity"
          >
            Build Chatbot
            <ExternalLink className="h-4 w-4" />
          </Link>
        </div>
      </div>
    );
  }

  if (isLoading) return <Spinner label="Loading questions…" />;

  return (
    <div className={styles.page}>
      {isDark && <Orbs />}
      <div className={styles.container}>
        {/* Header */}
        <div className="flex flex-wrap gap-3 items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
              <Calendar className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className={`text-xl font-bold ${styles.text.primary}`}>
                Customer Flow Builder
              </h1>
              <p className={`text-sm ${styles.text.secondary}`}>
                Lead Generation · {questions.length} question
                {questions.length !== 1 ? "s" : ""}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-1 md:gap-2 ">
            <Button
              onClick={addQuestion}
              className="bg-gradient-to-r from-purple-500 to-pink-500 hover:opacity-90 text-white rounded-xl text-sm md:text-base p-2 md:p-3 flex items-center"
            >
              <Plus className="h-4 w-4  mr-1 md:mr-2" />
              Add Question
            </Button>
            <Button
              onClick={handleSave}
              disabled={isSaving}
              className={`${
                isDark
                  ? "bg-green-500/80 hover:bg-green-500"
                  : "bg-green-500 hover:bg-green-600"
              } text-white rounded-xl disabled:opacity-50 text-sm md:text-base p-2 md:p-3 flex items-center`}
            >
              {isSaving ? (
                <Loader2 className="h-4 w-4 mr-1 md:mr-2 animate-spin" />
              ) : (
                <Save className="h-4 w-4  mr-1 md:mr-2" />
              )}
              {isSaving ? "Saving…" : "Save Changes"}
            </Button>
          </div>
        </div>

        {/* Info banner */}
        <div
          className={`flex items-start gap-3 p-4 rounded-xl text-sm ${
            isDark
              ? "bg-purple-500/10 border border-purple-500/20 text-purple-300"
              : "bg-purple-50 border border-purple-100 text-purple-700"
          }`}
        >
          <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-medium mb-0.5">How the no-AI flow works</p>
            <p
              className={`text-xs ${
                isDark ? "text-purple-300/80" : "text-purple-600"
              }`}
            >
              Your quick reply buttons appear below AI chat replies. When a
              visitor clicks one, AI stops for that interaction and this flow
              asks the configured questions one-by-one, validates the answers,
              then either submits the details or shows appointment date and
              time selection, depending on that flow's completion action.
            </p>
          </div>
        </div>

        <section className={`${styles.card} rounded-2xl p-5`}>
          <div className="flex items-start gap-3">
            <MessageSquareText className="mt-0.5 h-5 w-5 text-purple-500" />
            <div>
              <h2 className={`font-semibold ${styles.text.primary}`}>
                Customer flow quick replies
              </h2>
              <p className={`mt-1 text-sm ${styles.text.secondary}`}>
                Create up to five buttons. Each button can run its own questions
                and completion action without using AI.
              </p>
            </div>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            {flows.map((flow) => (
              <div
                key={flow.id}
                className={`inline-flex items-center overflow-hidden rounded-full border text-sm transition ${
                  activeFlow?.id === flow.id
                    ? "border-purple-500 bg-purple-500 text-white"
                    : "border-purple-500/25 bg-purple-500/10 text-purple-600 dark:text-purple-300"
                }`}
              >
                <button
                  type="button"
                  onClick={() => {
                    setActiveFlowId(flow.id);
                    setEditingId(null);
                  }}
                  className="px-3 py-1.5"
                >
                  {flow.label}
                </button>
                <button
                  type="button"
                  aria-label={`Remove ${flow.label}`}
                  disabled={flows.length === 1}
                  onClick={(event) => {
                    event.stopPropagation();
                    if (flows.length === 1) return;
                    const remaining = flows.filter((item) => item.id !== flow.id);
                    setFlows(remaining);
                    if (activeFlow?.id === flow.id) {
                      setActiveFlowId(remaining[0]?.id || "");
                    }
                  }}
                  className="py-1.5 pl-1 pr-2.5 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
          <div className="mt-4 flex gap-2">
            <input
              value={quickReplyInput}
              maxLength={30}
              disabled={quickReplies.length >= 5}
              onChange={(event) => setQuickReplyInput(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  addQuickReply();
                }
              }}
              placeholder="Example: Get a free consultation"
              className={`min-w-0 flex-1 rounded-xl border px-4 py-2.5 text-sm outline-none ${isDark ? "border-white/10 bg-white/5 text-white" : "border-gray-200 bg-white text-gray-900"}`}
            />
            <Button
              type="button"
              onClick={addQuickReply}
              disabled={!quickReplyInput.trim() || quickReplies.length >= 5}
              className="rounded-xl bg-purple-500 text-white"
            >
              <Plus className="mr-2 h-4 w-4" /> Add
            </Button>
          </div>
          <p className={`mt-2 text-xs ${styles.text.muted}`}>
            {quickReplies.length}/5 flows. Select a button above to edit its
            own setup. At least one is required.
          </p>
        </section>

        {activeFlow && (
          <section className={`${styles.card} rounded-2xl p-5`}>
            <h2 className={`font-semibold ${styles.text.primary}`}>
              {activeFlow.label} setup
            </h2>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <label className={`text-sm ${styles.text.secondary}`}>
                Quick reply button
                <input
                  value={activeFlow.label}
                  maxLength={30}
                  onChange={(event) =>
                    updateActiveFlow((flow) => ({
                      ...flow,
                      label: event.target.value,
                    }))
                  }
                  className={`mt-1.5 w-full rounded-xl border px-4 py-2.5 text-sm outline-none ${styles.input}`}
                />
              </label>
              <label className={`text-sm ${styles.text.secondary}`}>
                When questions finish
                <select
                  value={activeFlow.completionAction}
                  onChange={(event) =>
                    updateActiveFlow((flow) => ({
                      ...flow,
                      completionAction: event.target.value as CustomerFlow["completionAction"],
                    }))
                  }
                  className={`mt-1.5 w-full rounded-xl border px-4 py-2.5 text-sm outline-none ${styles.input}`}
                >
                  <option value="submit_details">Submit details</option>
                  <option value="book_appointment">Book an appointment</option>
                </select>
              </label>
            </div>
            <label className={`mt-4 block text-sm ${styles.text.secondary}`}>
              Opening message
              <textarea
                value={activeFlow.introMessage}
                maxLength={300}
                rows={2}
                onChange={(event) =>
                  updateActiveFlow((flow) => ({
                    ...flow,
                    introMessage: event.target.value,
                  }))
                }
                className={`mt-1.5 w-full rounded-xl border px-4 py-2.5 text-sm outline-none ${styles.input}`}
              />
            </label>
          </section>
        )}

        {/* Questions list */}
        <div className="space-y-3">
          {questions.length === 0 ? (
            <div className={`${styles.card} p-12 text-center rounded-2xl`}>
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center mx-auto mb-4">
                <Calendar className="h-8 w-8 text-white" />
              </div>
              <h3
                className={`text-lg font-semibold ${styles.text.primary} mb-2`}
              >
                No questions yet
              </h3>
              <p className={`text-sm ${styles.text.secondary} mb-6`}>
                Add questions the flow will ask without using AI
              </p>
              <Button
                onClick={addQuestion}
                className="bg-gradient-to-r from-purple-500 to-pink-500 hover:opacity-90 text-white rounded-xl"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add First Question
              </Button>
            </div>
          ) : (
            questions.map((q, idx) => (
              <QuestionCard
                key={q.id}
                q={q}
                idx={idx}
                total={questions.length}
                isDark={isDark}
                styles={styles}
                pc={pc}
                isEditing={editingId === q.id}
                onToggleEdit={() =>
                  setEditingId(editingId === q.id ? null : q.id)
                }
                onChange={(field, value) => updateQuestion(q.id, field, value)}
                onRequestDelete={() => setDeleteId(q.id)}
                onMoveUp={() => moveQuestion(idx, "up")}
                onMoveDown={() => moveQuestion(idx, "down")}
              />
            ))
          )}
        </div>

        {questions.length > 0 && (
          <p className={`text-xs text-center ${styles.text.muted}`}>
            Click any card to expand and edit. Use arrows to reorder.
          </p>
        )}
      </div>

      <ConfirmDialog
        open={!!deleteId}
        onOpenChange={() => setDeleteId(null)}
        onConfirm={() => deleteId && deleteQuestion(deleteId)}
        title="Delete question?"
        description="This question will be permanently removed from the customer flow."
        confirmText="Delete"
        isDestructive
      />
    </div>
  );
}
