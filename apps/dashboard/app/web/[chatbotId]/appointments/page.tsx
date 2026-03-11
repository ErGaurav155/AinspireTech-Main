"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import { useAuth } from "@clerk/nextjs";
import {
  Calendar,
  Plus,
  Save,
  Trash2,
  GripVertical,
  AlertCircle,
  Check,
  X,
  ChevronDown,
  HelpCircle,
  RefreshCw,
  ArrowRight,
} from "lucide-react";
import { useApi } from "@/lib/useApi";
import {
  getAppointmentQuestions,
  saveAppointmentQuestions,
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

interface AppointmentQuestion {
  id: number;
  question: string;
  type: "text" | "email" | "tel" | "date" | "select" | "textarea";
  required: boolean;
  options?: string[];
}

export default function AppointmentQuestionsPage() {
  const { userId } = useAuth();
  const { apiRequest } = useApi();
  const { styles, isDark } = useThemeStyles();

  const [questions, setQuestions] = useState<AppointmentQuestion[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [editingOptions, setEditingOptions] = useState<number | null>(null);
  const [newOption, setNewOption] = useState("");

  const loadQuestions = useCallback(async () => {
    if (!userId) return;

    try {
      setIsLoading(true);
      const data = await getAppointmentQuestions(
        apiRequest,
        "chatbot-lead-generation",
      );

      if (data.appointmentQuestions?.questions) {
        setQuestions(data.appointmentQuestions.questions);
      } else {
        // Default questions
        setQuestions([
          {
            id: 1,
            question: "What is your full name?",
            type: "text",
            required: true,
          },
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
        ]);
      }
    } catch (error) {
      console.error("Error loading questions:", error);
      toast({
        title: "Failed to load questions",
        variant: "destructive",
        duration: 3000,
      });
    } finally {
      setIsLoading(false);
    }
  }, [userId, apiRequest]);

  useEffect(() => {
    loadQuestions();
  }, [loadQuestions]);

  const handleAddQuestion = () => {
    const newId = Math.max(...questions.map((q) => q.id), 0) + 1;
    setQuestions([
      ...questions,
      {
        id: newId,
        question: "New question?",
        type: "text",
        required: false,
      },
    ]);
  };

  const handleUpdateQuestion = (id: number, field: string, value: any) => {
    setQuestions((prev) =>
      prev.map((q) => (q.id === id ? { ...q, [field]: value } : q)),
    );
  };

  const handleDeleteQuestion = (id: number) => {
    setQuestions((prev) => prev.filter((q) => q.id !== id));
    setDeleteId(null);
  };

  const handleAddOption = (questionId: number) => {
    if (!newOption.trim()) return;

    setQuestions((prev) =>
      prev.map((q) => {
        if (q.id === questionId) {
          const options = q.options || [];
          return {
            ...q,
            options: [...options, newOption.trim()],
          };
        }
        return q;
      }),
    );
    setNewOption("");
  };

  const handleRemoveOption = (questionId: number, optionIndex: number) => {
    setQuestions((prev) =>
      prev.map((q) => {
        if (q.id === questionId) {
          const options = [...(q.options || [])];
          options.splice(optionIndex, 1);
          return { ...q, options };
        }
        return q;
      }),
    );
  };

  const handleSaveQuestions = async () => {
    // Validate
    const invalid = questions.some((q) => !q.question.trim());
    if (invalid) {
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
      await saveAppointmentQuestions(
        apiRequest,
        "chatbot-lead-generation",
        questions,
      );
      toast({
        title: "Questions saved",
        description: "Your appointment questions have been updated",
        duration: 3000,
      });
    } catch (error) {
      console.error("Error saving questions:", error);
      toast({
        title: "Failed to save questions",
        variant: "destructive",
        duration: 3000,
      });
    } finally {
      setIsSaving(false);
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "text":
        return "📝";
      case "email":
        return "📧";
      case "tel":
        return "📞";
      case "date":
        return "📅";
      case "select":
        return "▼";
      case "textarea":
        return "📄";
      default:
        return "📝";
    }
  };

  if (isLoading) {
    return <Spinner label="Loading questions..." />;
  }

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
              className={`bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white rounded-xl`}
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

        {/* Info Banner */}
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
                These questions will be asked when users want to book an
                appointment. The answers will be collected and sent to your
                WhatsApp if configured. You can reorder questions by dragging
                the grip handles.
              </p>
            </div>
          </div>
        </div>

        {/* Questions List */}
        <div className="space-y-4">
          {questions.map((question, index) => (
            <div
              key={question.id}
              className={`${styles.card} p-4 hover:border-white/[0.12] transition-all`}
            >
              <div className="flex items-start gap-3 relative">
                <div className="flex-1 space-y-4">
                  {/* Question Row */}
                  <div className="flex items-start gap-3">
                    <span className="hidden md:flex ">
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
                      className={`${styles.input} w-[95%] md:w-[90%]  rounded-lg p-2`}
                      placeholder="Enter your question..."
                    />
                  </div>

                  {/* Settings Row */}
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
                      <option
                        value="text"
                        className={isDark ? "bg-[#1A1A1E]" : "bg-white"}
                      >
                        Text
                      </option>
                      <option
                        value="email"
                        className={isDark ? "bg-[#1A1A1E]" : "bg-white"}
                      >
                        Email
                      </option>
                      <option
                        value="tel"
                        className={isDark ? "bg-[#1A1A1E]" : "bg-white"}
                      >
                        Phone
                      </option>
                      <option
                        value="date"
                        className={isDark ? "bg-[#1A1A1E]" : "bg-white"}
                      >
                        Date
                      </option>
                      <option
                        value="select"
                        className={isDark ? "bg-[#1A1A1E]" : "bg-white"}
                      >
                        Select
                      </option>
                      <option
                        value="textarea"
                        className={isDark ? "bg-[#1A1A1E]" : "bg-white"}
                      >
                        Textarea
                      </option>
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

                  {/* Options Editor (for select type) */}
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
                          {question.options?.map((option, optIndex) => (
                            <div
                              key={optIndex}
                              className="flex items-center gap-2"
                            >
                              <span className={`text-xs ${styles.text.muted}`}>
                                {optIndex + 1}.
                              </span>
                              <span
                                className={`flex-1 ${isDark ? "text-white/60" : "text-gray-700"} text-sm`}
                              >
                                {option}
                              </span>
                              <button
                                onClick={() =>
                                  handleRemoveOption(question.id, optIndex)
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
                  className={`absolute -top-3 -right-3 p-1 ${isDark ? "text-white/40 hover:text-red-400 rounded-lg hover:bg-red-500/10" : "text-gray-400 hover:text-red-600 rounded-lg hover:bg-red-50"}`}
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Empty State */}
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
              className={`bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white rounded-xl`}
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Your First Question
            </Button>
          </div>
        )}
      </div>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        open={!!deleteId}
        onOpenChange={() => setDeleteId(null)}
        onConfirm={() => deleteId && handleDeleteQuestion(deleteId)}
        title="Delete Question"
        description={`Are you sure you want to delete this question? This action cannot
              be undone.`}
        confirmText="Remove Question"
        isDestructive={true}
      />
    </div>
  );
}
