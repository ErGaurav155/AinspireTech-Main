"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useAuth } from "@clerk/nextjs";
import {
  Calendar,
  Plus,
  Save,
  Trash2,
  X,
  HelpCircle,
  Bot,
  ExternalLink,
  ArrowUpRight,
  GraduationCap,
} from "lucide-react";
import { useApi } from "@/lib/useApi";
import {
  getAppointmentQuestions,
  saveAppointmentQuestions,
  getChatbots,
} from "@/lib/services/web-actions.api";
import {
  Button,
  Orbs,
  Spinner,
  Switch,
  toast,
  useThemeStyles,
} from "@rocketreplai/ui";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { useParams, useRouter } from "next/navigation";

interface AppointmentQuestion {
  id: number;
  question: string;
  type: "text" | "email" | "tel" | "date" | "select" | "textarea";
  required: boolean;
  options?: string[];
}

const LEAD_TYPE = "chatbot-lead-generation";
const DEFAULT_QUESTIONS: AppointmentQuestion[] = [
  { id: 1, question: "What is your full name?", type: "text", required: true },
  {
    id: 2,
    question: "What is your email address?",
    type: "email",
    required: true,
  },
  {
    id: 3,
    question: "What is your phone number?",
    type: "tel",
    required: true,
  },
  {
    id: 4,
    question: "What service are you interested in?",
    type: "select",
    options: ["Consultation", "Service A", "Service B"],
    required: true,
  },
  {
    id: 5,
    question: "Preferred appointment date?",
    type: "date",
    required: true,
  },
];

export default function AppointmentQuestionsPage() {
  const params = useParams();
  const router = useRouter();
  const chatbotId = params.chatbotId as string;
  const { userId } = useAuth();
  const { apiRequest } = useApi();
  const { styles, isDark } = useThemeStyles();

  const [pageStatus, setPageStatus] = useState<
    "checking" | "not-built" | "wrong-type" | "ready"
  >("checking");
  const [questions, setQuestions] = useState<AppointmentQuestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [editingOptions, setEditingOptions] = useState<number | null>(null);
  const [newOption, setNewOption] = useState("");

  // ── guard ─────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (chatbotId !== LEAD_TYPE && chatbotId !== "chatbot-education")
      router.replace("/web");
  }, [chatbotId, router]);

  useEffect(() => {
    if (!userId || !chatbotId) return;
    if (chatbotId === "chatbot-education") {
      setPageStatus("wrong-type");
      return;
    }
    if (chatbotId !== LEAD_TYPE) return;

    const init = async () => {
      try {
        const data = await getChatbots(apiRequest);
        const found = (data.chatbots || []).find(
          (b: any) => b.type === LEAD_TYPE,
        );
        if (!found) {
          setPageStatus("not-built");
          return;
        }
        setPageStatus("ready");
        setIsLoading(true);
        const qData = await getAppointmentQuestions(apiRequest, LEAD_TYPE);
        setQuestions(
          qData.appointmentQuestions?.questions || DEFAULT_QUESTIONS,
        );
      } catch {
        toast({
          title: "Failed to load questions",
          variant: "destructive",
          duration: 3000,
        });
        setQuestions(DEFAULT_QUESTIONS);
      } finally {
        setIsLoading(false);
      }
    };
    init();
  }, [userId, chatbotId, apiRequest]);

  const handleAddQuestion = () => {
    const newId = Math.max(...questions.map((q) => q.id), 0) + 1;
    setQuestions((p) => [
      ...p,
      { id: newId, question: "New question?", type: "text", required: false },
    ]);
  };

  const handleUpdateQuestion = (id: number, field: string, value: any) =>
    setQuestions((p) =>
      p.map((q) => (q.id === id ? { ...q, [field]: value } : q)),
    );

  const handleDeleteQuestion = (id: number) => {
    setQuestions((p) => p.filter((q) => q.id !== id));
    setDeleteId(null);
  };

  const handleAddOption = (qId: number) => {
    if (!newOption.trim()) return;
    setQuestions((p) =>
      p.map((q) =>
        q.id === qId
          ? { ...q, options: [...(q.options || []), newOption.trim()] }
          : q,
      ),
    );
    setNewOption("");
  };

  const handleRemoveOption = (qId: number, idx: number) =>
    setQuestions((p) =>
      p.map((q) => {
        if (q.id !== qId) return q;
        const opts = [...(q.options || [])];
        opts.splice(idx, 1);
        return { ...q, options: opts };
      }),
    );

  const handleSaveQuestions = async () => {
    if (questions.some((q) => !q.question.trim())) {
      toast({
        title: "Validation Error",
        description: "Please fill in all question fields",
        variant: "destructive",
        duration: 3000,
      });
      return;
    }
    setIsSaving(true);
    try {
      await saveAppointmentQuestions(apiRequest, LEAD_TYPE, questions);
      toast({
        title: "Questions saved",
        description: "Appointment questions updated",
        duration: 3000,
      });
    } catch {
      toast({
        title: "Failed to save questions",
        variant: "destructive",
        duration: 3000,
      });
    } finally {
      setIsSaving(false);
    }
  };

  const getTypeIcon = (type: string) =>
    (
      ({
        text: "📝",
        email: "📧",
        tel: "📞",
        date: "📅",
        select: "▼",
        textarea: "📄",
      }) as Record<string, string>
    )[type] || "📝";

  // ─── early returns ────────────────────────────────────────────────────────
  if (pageStatus === "checking") {
    return (
      <div
        className={`${styles.page} flex items-center justify-center min-h-[40vh]`}
      >
        <div className="w-5 h-5 border-2 border-t-transparent border-purple-400 rounded-full animate-spin" />
      </div>
    );
  }

  // MCQ chatbot → this page doesn't apply
  if (pageStatus === "wrong-type") {
    return (
      <div className={styles.page}>
        {isDark && <Orbs />}
        <div className="flex flex-col items-center justify-center py-20 px-4 text-center">
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center mb-6">
            <GraduationCap className="h-10 w-10 text-white" />
          </div>
          <h2 className={`text-2xl font-bold ${styles.text.primary} mb-3`}>
            Not available for MCQ chatbot
          </h2>
          <p className={`text-sm ${styles.text.secondary} max-w-md mb-8`}>
            Appointment questions are only for the Lead Generation chatbot. MCQ
            chatbot uses topic-based question generation instead.
          </p>
          <Link
            href="/web/chatbot-education/overview"
            className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-xl text-sm font-medium hover:opacity-90 transition-opacity"
          >
            Go to MCQ Overview <ArrowUpRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    );
  }

  // lead chatbot not built yet
  if (pageStatus === "not-built") {
    return (
      <div className={styles.page}>
        {isDark && <Orbs />}
        <div className="flex flex-col items-center justify-center py-20 px-4 text-center">
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center mb-6 shadow-lg">
            <Bot className="h-10 w-10 text-white" />
          </div>
          <h2 className={`text-2xl font-bold ${styles.text.primary} mb-3`}>
            Build your Lead Generation chatbot first
          </h2>
          <p className={`text-sm ${styles.text.secondary} max-w-md mb-8`}>
            You need to create your Lead Generation chatbot before configuring
            appointment questions.
          </p>
          <Link
            href="/web/chatbot-lead-generation/build"
            className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl text-sm font-medium hover:opacity-90 transition-opacity"
          >
            Build Lead Generation Chatbot <ExternalLink className="h-4 w-4" />
          </Link>
        </div>
      </div>
    );
  }

  if (isLoading) return <Spinner label="Loading questions..." />;

  return (
    <div className={styles.page}>
      {isDark && <Orbs />}
      <div className={styles.container}>
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center ${styles.icon.purple}`}
            >
              <Calendar
                className={`h-5 w-5 ${isDark ? "text-purple-400" : "text-purple-600"}`}
              />
            </div>
            <div>
              <h1
                className={`text-lg md:text-xl font-bold ${styles.text.primary}`}
              >
                Appointment Questions
              </h1>
              <p className={`text-xs ${styles.text.secondary}`}>
                Configure the questions asked during appointment booking
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              onClick={handleAddQuestion}
              className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white rounded-xl"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Question
            </Button>
            <Button
              onClick={handleSaveQuestions}
              disabled={isSaving}
              className={`${isDark ? "bg-green-500/80 hover:bg-green-500" : "bg-green-500 hover:bg-green-600"} text-white rounded-xl ${isSaving ? "opacity-50 cursor-not-allowed" : ""}`}
            >
              <Save className="h-4 w-4 mr-2" />
              {isSaving ? "Saving..." : "Save All"}
            </Button>
          </div>
        </div>

        {/* Info banner */}
        <div
          className={`${isDark ? "bg-blue-500/10 border border-blue-500/20" : "bg-blue-50 border border-blue-200"} rounded-2xl p-4`}
        >
          <div className="flex items-start gap-3">
            <HelpCircle
              className={`h-5 w-5 ${isDark ? "text-blue-400" : "text-blue-500"} flex-shrink-0 mt-0.5`}
            />
            <div>
              <p
                className={`text-sm font-medium ${isDark ? "text-blue-400" : "text-blue-800"} mb-1`}
              >
                How it works
              </p>
              <p
                className={`text-xs ${isDark ? "text-blue-400/80" : "text-blue-700"}`}
              >
                These questions appear when visitors want to book an
                appointment. Answers are collected and forwarded to your
                WhatsApp if configured.
              </p>
            </div>
          </div>
        </div>

        {/* Questions list */}
        <div className="space-y-4">
          {questions.map((question) => (
            <div
              key={question.id}
              className={`${styles.card} p-4 hover:border-white/[0.12] transition-all`}
            >
              <div className="flex items-start gap-3 relative">
                <div className="flex-1 space-y-4">
                  {/* Question row */}
                  <div className="flex items-start gap-3">
                    <span className="hidden md:flex text-base">
                      {getTypeIcon(question.type)}
                    </span>
                    <input
                      type="text"
                      value={question.question}
                      onChange={(e) =>
                        handleUpdateQuestion(
                          question.id,
                          "question",
                          e.target.value,
                        )
                      }
                      className={`${styles.input} w-[95%] md:w-[90%] rounded-lg p-2`}
                      placeholder="Enter your question..."
                    />
                  </div>
                  {/* Settings row */}
                  <div className="flex flex-wrap items-center gap-4 md:ml-7">
                    <select
                      value={question.type}
                      onChange={(e) =>
                        handleUpdateQuestion(
                          question.id,
                          "type",
                          e.target.value,
                        )
                      }
                      className={`px-3 py-1.5 ${isDark ? "bg-white/[0.05] border-white/[0.09] text-white/70" : "bg-gray-50 border-gray-200 text-gray-600"} rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-purple-500/50`}
                    >
                      {[
                        "text",
                        "email",
                        "tel",
                        "date",
                        "select",
                        "textarea",
                      ].map((t) => (
                        <option
                          key={t}
                          value={t}
                          className={isDark ? "bg-[#1A1A1E]" : "bg-white"}
                        >
                          {t.charAt(0).toUpperCase() + t.slice(1)}
                        </option>
                      ))}
                    </select>
                    <label
                      className={`flex items-center gap-2 text-xs ${styles.text.secondary}`}
                    >
                      <Switch
                        checked={question.required}
                        onCheckedChange={(checked) =>
                          handleUpdateQuestion(question.id, "required", checked)
                        }
                        className={
                          isDark
                            ? "data-[state=checked]:bg-purple-500/50 data-[state=unchecked]:bg-white/[0.06]"
                            : "data-[state=checked]:bg-purple-500 data-[state=unchecked]:bg-gray-200"
                        }
                      />
                      Required
                    </label>
                    {question.type === "select" && (
                      <button
                        onClick={() =>
                          setEditingOptions(
                            editingOptions === question.id ? null : question.id,
                          )
                        }
                        className={`text-xs ${isDark ? "text-purple-400 hover:text-purple-300" : "text-purple-600 hover:text-purple-700"} font-medium`}
                      >
                        Manage Options
                      </button>
                    )}
                  </div>
                  {/* Options editor */}
                  {question.type === "select" &&
                    editingOptions === question.id && (
                      <div
                        className={`md:ml-7 mt-3 p-4 ${isDark ? "bg-white/[0.03] border border-white/[0.06]" : "bg-gray-50 border border-gray-200"} rounded-xl`}
                      >
                        <p
                          className={`text-xs font-medium ${isDark ? "text-white/70" : "text-gray-700"} mb-3`}
                        >
                          Dropdown Options
                        </p>
                        <div className="space-y-2 mb-3">
                          {question.options?.map((opt, i) => (
                            <div key={i} className="flex items-center gap-2">
                              <span className={`text-xs ${styles.text.muted}`}>
                                {i + 1}.
                              </span>
                              <span
                                className={`flex-1 text-sm ${isDark ? "text-white/60" : "text-gray-700"}`}
                              >
                                {opt}
                              </span>
                              <button
                                onClick={() =>
                                  handleRemoveOption(question.id, i)
                                }
                                className={`${isDark ? "text-white/40 hover:text-red-400" : "text-gray-400 hover:text-red-500"}`}
                              >
                                <X className="h-4 w-4" />
                              </button>
                            </div>
                          ))}
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          <input
                            type="text"
                            value={newOption}
                            onChange={(e) => setNewOption(e.target.value)}
                            placeholder="New option..."
                            className={styles.input}
                            onKeyPress={(e) => {
                              if (e.key === "Enter") {
                                e.preventDefault();
                                handleAddOption(question.id);
                              }
                            }}
                          />
                          <button
                            onClick={() => handleAddOption(question.id)}
                            className="px-3 py-1.5 bg-purple-500 text-white rounded-lg text-xs hover:bg-purple-600"
                          >
                            Add
                          </button>
                        </div>
                      </div>
                    )}
                </div>
                <button
                  onClick={() => setDeleteId(question.id)}
                  className={`absolute -top-3 -right-3 p-1 rounded-lg ${isDark ? "text-white/40 hover:text-red-400 hover:bg-red-500/10" : "text-gray-400 hover:text-red-600 hover:bg-red-50"}`}
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Empty state */}
        {questions.length === 0 && (
          <div className={`${styles.card} p-12 text-center`}>
            <div
              className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 ${styles.icon.purple}`}
            >
              <Calendar
                className={`h-8 w-8 ${isDark ? "text-purple-400" : "text-purple-400"}`}
              />
            </div>
            <h3 className={`text-lg font-semibold ${styles.text.primary} mb-2`}>
              No questions yet
            </h3>
            <p className={`text-sm ${styles.text.secondary} mb-6`}>
              Add your first appointment question to start collecting lead
              information
            </p>
            <Button
              onClick={handleAddQuestion}
              className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white rounded-xl"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Your First Question
            </Button>
          </div>
        )}
      </div>

      <ConfirmDialog
        open={!!deleteId}
        onOpenChange={() => setDeleteId(null)}
        onConfirm={() => deleteId && handleDeleteQuestion(deleteId)}
        title="Delete Question"
        description="Are you sure you want to delete this question? This cannot be undone."
        confirmText="Remove Question"
        isDestructive
      />
    </div>
  );
}
