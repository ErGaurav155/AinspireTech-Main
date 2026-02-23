"use client";

import { useState, useEffect, useCallback } from "react";
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
} from "lucide-react";
import { useApi } from "@/lib/useApi";
import {
  getAppointmentQuestions,
  saveAppointmentQuestions,
} from "@/lib/services/web-actions.api";
import { toast } from "@rocketreplai/ui/components/radix/use-toast";
import { Button } from "@rocketreplai/ui/components/radix/button";
import { Switch } from "@rocketreplai/ui/components/radix/switch";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@rocketreplai/ui/components/radix/alert-dialog";

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
    return (
      <div className="min-h-screen bg-[#F8F9FA] flex items-center justify-center">
        <div className="w-5 h-5 border-2 border-t-transparent border-purple-500 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8F9FA]">
      {/* Top bar */}
      <div className="bg-white border-b border-gray-100 sticky top-0 z-10">
        <div className="px-6 py-3 flex items-center gap-2 text-sm text-gray-500">
          <Link
            href="/web/dashboard"
            className="text-gray-400 hover:text-gray-600"
          >
            Dashboard
          </Link>
          <span className="text-gray-300">›</span>
          <Link
            href="/web/lead-generation/overview"
            className="text-gray-400 hover:text-gray-600"
          >
            Lead Generation
          </Link>
          <span className="text-gray-300">›</span>
          <span className="font-medium text-gray-800">
            Appointment Questions
          </span>
        </div>
      </div>

      <div className="p-6 max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
              <Calendar className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-800">
                Appointment Questions
              </h1>
              <p className="text-sm text-gray-500">
                Configure the questions asked during appointment booking
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
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
              className="bg-green-500 hover:bg-green-600 text-white rounded-xl"
            >
              <Save className="h-4 w-4 mr-2" />
              {isSaving ? "Saving..." : "Save All"}
            </Button>
          </div>
        </div>

        {/* Info Banner */}
        <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4">
          <div className="flex items-start gap-3">
            <HelpCircle className="h-5 w-5 text-blue-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-blue-800 mb-1">
                How it works
              </p>
              <p className="text-xs text-blue-700">
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
              className="bg-white border border-gray-100 rounded-2xl p-5 hover:border-gray-200 transition-all"
            >
              <div className="flex items-start gap-3">
                <div className="cursor-move text-gray-300 hover:text-gray-400 mt-3">
                  <GripVertical className="h-5 w-5" />
                </div>

                <div className="flex-1 space-y-4">
                  {/* Question Row */}
                  <div className="flex items-start gap-3">
                    <span className="text-lg">
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
                      className="flex-1 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-purple-200"
                      placeholder="Enter your question..."
                    />
                  </div>

                  {/* Settings Row */}
                  <div className="flex flex-wrap items-center gap-4 ml-7">
                    <select
                      value={question.type}
                      onChange={(e) =>
                        handleUpdateQuestion(
                          question.id,
                          "type",
                          e.target.value,
                        )
                      }
                      className="px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-xs text-gray-600 focus:outline-none focus:ring-2 focus:ring-purple-200"
                    >
                      <option value="text">Text</option>
                      <option value="email">Email</option>
                      <option value="tel">Phone</option>
                      <option value="date">Date</option>
                      <option value="select">Select</option>
                      <option value="textarea">Textarea</option>
                    </select>

                    <label className="flex items-center gap-2 text-xs text-gray-600">
                      <Switch
                        checked={question.required}
                        onCheckedChange={(checked) =>
                          handleUpdateQuestion(question.id, "required", checked)
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
                        className="text-xs text-purple-600 hover:text-purple-700 font-medium"
                      >
                        Manage Options
                      </button>
                    )}
                  </div>

                  {/* Options Editor (for select type) */}
                  {question.type === "select" &&
                    editingOptions === question.id && (
                      <div className="ml-7 mt-3 p-4 bg-gray-50 border border-gray-200 rounded-xl">
                        <p className="text-xs font-medium text-gray-700 mb-3">
                          Dropdown Options
                        </p>
                        <div className="space-y-2 mb-3">
                          {question.options?.map((option, optIndex) => (
                            <div
                              key={optIndex}
                              className="flex items-center gap-2"
                            >
                              <span className="text-xs text-gray-500">
                                {optIndex + 1}.
                              </span>
                              <span className="flex-1 text-sm text-gray-700">
                                {option}
                              </span>
                              <button
                                onClick={() =>
                                  handleRemoveOption(question.id, optIndex)
                                }
                                className="text-gray-400 hover:text-red-500"
                              >
                                <X className="h-4 w-4" />
                              </button>
                            </div>
                          ))}
                        </div>
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            value={newOption}
                            onChange={(e) => setNewOption(e.target.value)}
                            placeholder="New option..."
                            className="flex-1 px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-200"
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
                  className="p-1.5 text-gray-400 hover:text-red-600 rounded-lg hover:bg-red-50"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Empty State */}
        {questions.length === 0 && (
          <div className="bg-white border border-gray-100 rounded-2xl p-12 text-center">
            <div className="w-16 h-16 rounded-full bg-purple-50 flex items-center justify-center mx-auto mb-4">
              <Calendar className="h-8 w-8 text-purple-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-800 mb-2">
              No questions yet
            </h3>
            <p className="text-sm text-gray-500 mb-6">
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

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Question</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this question? This action cannot
              be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteId && handleDeleteQuestion(deleteId)}
              className="bg-red-500 hover:bg-red-600 text-white rounded-xl"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
