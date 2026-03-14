"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import { useAuth } from "@clerk/nextjs";
import {
  MessageCircle,
  Plus,
  Save,
  Trash2,
  Edit,
  X,
  ChevronDown,
  AlertCircle,
  CheckCircle,
  Search,
  Filter,
  RefreshCw,
  Sparkles,
} from "lucide-react";
import { useApi } from "@/lib/useApi";
import { getFAQ, saveFAQ } from "@/lib/services/web-actions.api";
import { Button, Orbs, Spinner, toast, useThemeStyles } from "@rocketreplai/ui";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { useParams, useRouter } from "next/navigation";

interface FAQQuestion {
  id: string;
  question: string;
  answer: string;
  category: string;
}

export default function LeadFAQPage() {
  const params = useParams();
  const router = useRouter();
  const chatbotId = params.chatbotId as string;
  const { userId } = useAuth();
  const { apiRequest } = useApi();
  const { styles, isDark } = useThemeStyles();

  const [questions, setQuestions] = useState<FAQQuestion[]>([]);
  const [filteredQuestions, setFilteredQuestions] = useState<FAQQuestion[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [categories, setCategories] = useState<string[]>([]);

  const loadFAQ = useCallback(async () => {
    if (!userId) return;
    if (
      chatbotId !== "chatbot-lead-generation" &&
      chatbotId !== "chatbot-education"
    ) {
      router.push("/web");
      return;
    }
    try {
      setIsLoading(true);
      const data = await getFAQ(apiRequest, "chatbot-lead-generation");

      const faqQuestions = data.faq?.questions || [];
      setQuestions(faqQuestions);
      setFilteredQuestions(faqQuestions);

      // Extract unique categories
      const uniqueCategories = Array.from(
        new Set(faqQuestions.map((q: FAQQuestion) => q.category)),
      ) as string[];
      setCategories(uniqueCategories);
    } catch (error) {
      console.error("Error loading FAQ:", error);
      toast({
        title: "Failed to load FAQ",
        variant: "destructive",
        duration: 3000,
      });
    } finally {
      setIsLoading(false);
    }
  }, [userId, apiRequest]);

  useEffect(() => {
    loadFAQ();
  }, [loadFAQ]);

  // Filter questions
  useEffect(() => {
    let filtered = questions;

    if (searchTerm) {
      filtered = filtered.filter(
        (q) =>
          q.question.toLowerCase().includes(searchTerm.toLowerCase()) ||
          q.answer.toLowerCase().includes(searchTerm.toLowerCase()),
      );
    }

    if (categoryFilter !== "all") {
      filtered = filtered.filter((q) => q.category === categoryFilter);
    }

    setFilteredQuestions(filtered);
  }, [questions, searchTerm, categoryFilter]);

  const handleAddQuestion = () => {
    const newQuestion: FAQQuestion = {
      id: Date.now().toString(),
      question: "",
      answer: "",
      category: "General",
    };
    setQuestions([...questions, newQuestion]);
    setEditingId(newQuestion.id);
  };

  const handleUpdateQuestion = (id: string, field: string, value: string) => {
    setQuestions((prev) =>
      prev.map((q) => (q.id === id ? { ...q, [field]: value } : q)),
    );
  };

  const handleDeleteQuestion = async (id: string) => {
    setQuestions((prev) => prev.filter((q) => q.id !== id));
    setDeleteId(null);

    // Auto-save after delete
    await handleSaveFAQ(questions.filter((q) => q.id !== id));
  };

  const handleSaveFAQ = async (updatedQuestions = questions) => {
    if (!userId) return;

    // Validate
    const invalid = updatedQuestions.some(
      (q) => !q.question.trim() || !q.answer.trim(),
    );
    if (invalid) {
      toast({
        title: "Validation Error",
        description: "Please fill in all question and answer fields",
        variant: "destructive",
        duration: 3000,
      });
      return;
    }

    setIsSaving(true);
    try {
      await saveFAQ(
        apiRequest,
        userId,
        "chatbot-lead-generation",
        updatedQuestions,
      );

      // Update categories
      const uniqueCategories = Array.from(
        new Set(updatedQuestions.map((q) => q.category)),
      ) as string[];
      setCategories(uniqueCategories);

      setEditingId(null);
      toast({
        title: "FAQ Saved",
        description: "Your FAQ questions have been updated",
        duration: 3000,
      });
    } catch (error) {
      console.error("Error saving FAQ:", error);
      toast({
        title: "Failed to save FAQ",
        variant: "destructive",
        duration: 3000,
      });
    } finally {
      setIsSaving(false);
    }
  };

  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      General: styles.badge.blue,
      Support: styles.badge.green,
      Pricing: styles.badge.purple,
      Technical: styles.badge.orange,
      Services: styles.badge.pink,
    };
    return colors[category] || styles.badge.gray;
  };

  if (isLoading) {
    return <Spinner label="Loading FAQ..." />;
  }
  if (
    chatbotId !== "chatbot-lead-generation" &&
    chatbotId !== "chatbot-education"
  ) {
    return null;
  }
  return (
    <div className={styles.page}>
      {isDark && <Orbs />}
      <div className={styles.container}>
        {/* Header */}
        <div className="flex flex-wrap gap-2 items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className={`w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center ${isDark ? "opacity-90" : ""}`}
            >
              <MessageCircle className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className={`text-xl font-bold ${styles.text.primary}`}>
                FAQ Management
              </h1>
              <p className={`text-sm ${styles.text.secondary}`}>
                {questions.length} questions • Last updated{" "}
                {new Date().toLocaleDateString()}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1 md:gap-2">
            <Button
              onClick={handleAddQuestion}
              className={`bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white rounded-xl p-2 md:p-4`}
            >
              <Plus className="h-4 w-4 mr-1 md:mr-2" />
              Add Question
            </Button>
            <Button
              onClick={() => handleSaveFAQ()}
              disabled={isSaving}
              className={`${isDark ? "bg-green-500/80 hover:bg-green-500" : "bg-green-500 hover:bg-green-600"} text-white rounded-xl p-2 md:p-4 ${isSaving ? "opacity-50 cursor-not-allowed" : ""}`}
            >
              <Save className="h-4 w-4 mr-1 md:mr-2" />
              {isSaving ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </div>
        <div className="flex flex-col sm:flex-row gap-4 relative z-10">
          <div className="flex-1 relative">
            <Search
              size={14}
              className={`absolute left-3 top-1/2 -translate-y-1/2 ${styles.text.muted}`}
            />
            <input
              type="text"
              placeholder="Search by name, email, phone, or subject..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className={`w-full rounded-xl pl-9 pr-4 py-2.5 text-sm border outline-none focus:ring-1 transition-all ${styles.input}`}
            />
          </div>
          <div className="flex gap-2 overflow-auto">
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className={`px-3 py-1.5 rounded-lg text-xs ${styles.input}`}
            >
              <option
                value="all"
                className={isDark ? "bg-[#1A1A1E]" : "bg-white"}
              >
                All Categories
              </option>
              {categories.map((cat) => (
                <option
                  key={cat}
                  value={cat}
                  className={isDark ? "bg-[#1A1A1E]" : "bg-white"}
                >
                  {cat}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* FAQ List */}
        <div className="space-y-4">
          {filteredQuestions.length > 0 ? (
            filteredQuestions.map((faq) => {
              const isEditing = editingId === faq.id;
              const faqCardClasses = `${styles.card} p-5 transition-all ${
                isEditing
                  ? isDark
                    ? "border-purple-500 ring-2 ring-purple-500/30"
                    : "border-purple-300 ring-2 ring-purple-200"
                  : ""
              }`;
              return (
                <div key={faq.id} className={faqCardClasses}>
                  <div className="space-y-4">
                    {/* Question Row */}
                    <div className="flex flex-wrap items-start gap-4">
                      <div className="flex-1">
                        {isEditing ? (
                          <input
                            type="text"
                            value={faq.question}
                            onChange={(e) =>
                              handleUpdateQuestion(
                                faq.id,
                                "question",
                                e.target.value,
                              )
                            }
                            placeholder="Enter question..."
                            className={`${styles.input} w-full min-w-max rounded-lg p-2`}
                          />
                        ) : (
                          <h3
                            className={`font-semibold ${styles.text.primary}`}
                          >
                            {faq.question}
                          </h3>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <span
                          className={`inline-flex px-2.5 py-1 rounded-lg text-xs font-medium ${getCategoryColor(faq.category)}`}
                        >
                          {faq.category}
                        </span>
                        {isEditing ? (
                          <>
                            <select
                              value={faq.category}
                              onChange={(e) =>
                                handleUpdateQuestion(
                                  faq.id,
                                  "category",
                                  e.target.value,
                                )
                              }
                              className={`px-3 py-1.5 rounded-lg text-xs ${styles.input}`}
                            >
                              <option
                                value="General"
                                className={isDark ? "bg-[#1A1A1E]" : "bg-white"}
                              >
                                General
                              </option>
                              <option
                                value="Support"
                                className={isDark ? "bg-[#1A1A1E]" : "bg-white"}
                              >
                                Support
                              </option>
                              <option
                                value="Pricing"
                                className={isDark ? "bg-[#1A1A1E]" : "bg-white"}
                              >
                                Pricing
                              </option>
                              <option
                                value="Technical"
                                className={isDark ? "bg-[#1A1A1E]" : "bg-white"}
                              >
                                Technical
                              </option>
                              <option
                                value="Services"
                                className={isDark ? "bg-[#1A1A1E]" : "bg-white"}
                              >
                                Services
                              </option>
                            </select>
                            <button
                              onClick={() => setEditingId(null)}
                              className={`p-1.5 ${styles.text.muted} hover:text-green-500 rounded-lg ${isDark ? "hover:bg-green-500/10" : "hover:bg-green-50"}`}
                            >
                              <CheckCircle className="h-4 w-4" />
                            </button>
                          </>
                        ) : (
                          <button
                            onClick={() => setEditingId(faq.id)}
                            className={`p-1.5 ${styles.text.muted} hover:text-purple-500 rounded-lg ${isDark ? "hover:bg-purple-500/10" : "hover:bg-purple-50"}`}
                          >
                            <Edit className="h-4 w-4" />
                          </button>
                        )}
                        <button
                          onClick={() => setDeleteId(faq.id)}
                          className={`p-1.5 ${styles.text.muted} hover:text-red-500 rounded-lg ${isDark ? "hover:bg-red-500/10" : "hover:bg-red-50"}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>

                    {/* Answer Row */}
                    <div>
                      {isEditing ? (
                        <textarea
                          value={faq.answer}
                          onChange={(e) =>
                            handleUpdateQuestion(
                              faq.id,
                              "answer",
                              e.target.value,
                            )
                          }
                          placeholder="Enter answer..."
                          rows={3}
                          className={`${styles.input} w-full rounded-lg p-2`}
                        />
                      ) : (
                        <p
                          className={`text-sm ${styles.text.secondary} leading-relaxed`}
                        >
                          {faq.answer}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          ) : (
            <div className={`${styles.card} p-12 text-center`}>
              <div
                className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 ${styles.icon.purple}`}
              >
                <MessageCircle
                  className={`h-8 w-8 ${isDark ? "text-purple-400" : "text-purple-400"}`}
                />
              </div>
              <h3
                className={`text-lg font-semibold ${styles.text.primary} mb-2`}
              >
                No FAQ questions yet
              </h3>
              <p className={`text-sm ${styles.text.secondary} mb-6`}>
                Add your first frequently asked question to help your leads
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
      </div>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        open={!!deleteId}
        onOpenChange={() => setDeleteId(null)}
        onConfirm={() => deleteId && handleDeleteQuestion(deleteId)}
        title="Delete FAQ Question"
        description={`Are you sure you want to delete this question? This action cannot
                    be undone.`}
        confirmText="Remove Question"
        isDestructive={true}
      />
    </div>
  );
}
