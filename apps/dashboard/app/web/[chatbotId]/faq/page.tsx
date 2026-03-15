"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useAuth } from "@clerk/nextjs";
import {
  MessageCircle,
  Plus,
  Save,
  Trash2,
  Edit,
  CheckCircle,
  Search,
  GraduationCap,
  Bot,
} from "lucide-react";
import { useApi } from "@/lib/useApi";
import { getFAQ, saveFAQ } from "@/lib/services/web-actions.api";
import { Button, Orbs, Spinner, toast, useThemeStyles } from "@rocketreplai/ui";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { useParams, useRouter } from "next/navigation";

// ─── Types ────────────────────────────────────────────────────────────────────

type ChatbotTypeId = "chatbot-lead-generation" | "chatbot-education";

interface FAQQuestion {
  id: string;
  question: string;
  answer: string;
  category: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const VALID_IDS: ChatbotTypeId[] = [
  "chatbot-lead-generation",
  "chatbot-education",
];

const TYPE_CONFIG: Record<
  ChatbotTypeId,
  { label: string; gradient: string; accentDark: string; accentLight: string }
> = {
  "chatbot-lead-generation": {
    label: "Lead Generation",
    gradient: "from-purple-500 to-pink-500",
    accentDark: "text-purple-400",
    accentLight: "text-purple-600",
  },
  "chatbot-education": {
    label: "Education (MCQ)",
    gradient: "from-green-500 to-emerald-500",
    accentDark: "text-green-400",
    accentLight: "text-green-600",
  },
};

// ─── Component ────────────────────────────────────────────────────────────────

export default function FAQPage() {
  const params = useParams();
  const router = useRouter();
  const rawId = params.chatbotId as string;
  const { userId } = useAuth();
  const { apiRequest } = useApi();
  const { styles, isDark } = useThemeStyles();

  // ── Validate type ─────────────────────────────────────────────────────────
  const isValidType = VALID_IDS.includes(rawId as ChatbotTypeId);
  // ✅ Use the ACTUAL chatbotId from the URL — never hardcode
  const chatbotType = isValidType ? (rawId as ChatbotTypeId) : null;
  const cfg = chatbotType ? TYPE_CONFIG[chatbotType] : null;
  const isLead = chatbotType === "chatbot-lead-generation";

  const [questions, setQuestions] = useState<FAQQuestion[]>([]);
  const [filteredQuestions, setFilteredQuestions] = useState<FAQQuestion[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [categories, setCategories] = useState<string[]>([]);

  // ── Redirect invalid type ─────────────────────────────────────────────────
  useEffect(() => {
    if (!isValidType) router.replace("/web");
  }, [isValidType, router]);

  // ── Load FAQ for THIS chatbot type ────────────────────────────────────────
  const loadFAQ = useCallback(async () => {
    if (!userId || !chatbotType) return;
    try {
      setIsLoading(true);
      // ✅ Pass chatbotType from URL, not a hardcoded string
      const data = await getFAQ(apiRequest, chatbotType);
      const faqQuestions: FAQQuestion[] = data.faq?.questions || [];
      setQuestions(faqQuestions);
      setFilteredQuestions(faqQuestions);
      const uniqueCategories = Array.from(
        new Set(faqQuestions.map((q) => q.category)),
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
  }, [userId, chatbotType, apiRequest]);

  useEffect(() => {
    loadFAQ();
  }, [loadFAQ]);

  // ── Filter ────────────────────────────────────────────────────────────────
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

  // ── Handlers ──────────────────────────────────────────────────────────────
  const handleAddQuestion = () => {
    const newQ: FAQQuestion = {
      id: Date.now().toString(),
      question: "",
      answer: "",
      category: "General",
    };
    setQuestions((prev) => [...prev, newQ]);
    setEditingId(newQ.id);
  };

  const handleUpdateQuestion = (id: string, field: string, value: string) => {
    setQuestions((prev) =>
      prev.map((q) => (q.id === id ? { ...q, [field]: value } : q)),
    );
  };

  const handleSaveFAQ = async (updatedQuestions = questions) => {
    if (!userId || !chatbotType) return;

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
      // ✅ Pass chatbotType from URL, not a hardcoded string
      await saveFAQ(apiRequest, userId, chatbotType, updatedQuestions);

      const uniqueCategories = Array.from(
        new Set(updatedQuestions.map((q) => q.category)),
      ) as string[];
      setCategories(uniqueCategories);
      setEditingId(null);
      toast({
        title: "FAQ Saved",
        description: "Questions updated successfully",
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

  const handleDeleteQuestion = async (id: string) => {
    const updated = questions.filter((q) => q.id !== id);
    setQuestions(updated);
    setDeleteId(null);
    await handleSaveFAQ(updated);
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

  // ─── Early returns ────────────────────────────────────────────────────────

  if (!isValidType || !cfg) return null;
  if (isLoading) return <Spinner label="Loading FAQ..." />;

  const accentColor = isDark ? cfg.accentDark : cfg.accentLight;
  const ringClass = isLead
    ? isDark
      ? "border-purple-500 ring-2 ring-purple-500/30"
      : "border-purple-300 ring-2 ring-purple-200"
    : isDark
      ? "border-green-500 ring-2 ring-green-500/30"
      : "border-green-300 ring-2 ring-green-200";

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div className={styles.page}>
      {isDark && <Orbs />}
      <div className={styles.container}>
        {/* Header */}
        <div className="flex flex-wrap gap-2 items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className={`w-10 h-10 rounded-xl bg-gradient-to-br ${cfg.gradient} flex items-center justify-center`}
            >
              <MessageCircle className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className={`text-xl font-bold ${styles.text.primary}`}>
                FAQ Management
              </h1>
              <p className={`text-sm ${styles.text.secondary}`}>
                {cfg.label} · {questions.length} question
                {questions.length !== 1 ? "s" : ""}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1 md:gap-2">
            <Button
              onClick={handleAddQuestion}
              className={`bg-gradient-to-r ${cfg.gradient} hover:opacity-90 text-white rounded-xl p-2 md:p-4`}
            >
              <Plus className="h-4 w-4 mr-1 md:mr-2" />
              Add Question
            </Button>
            <Button
              onClick={() => handleSaveFAQ()}
              disabled={isSaving}
              className={`${
                isDark
                  ? "bg-green-500/80 hover:bg-green-500"
                  : "bg-green-500 hover:bg-green-600"
              } text-white rounded-xl p-2 md:p-4 disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              <Save className="h-4 w-4 mr-1 md:mr-2" />
              {isSaving ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </div>

        {/* Type indicator */}
        <div
          className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium w-fit ${
            isLead
              ? isDark
                ? "bg-purple-500/10 border border-purple-500/20 text-purple-400"
                : "bg-purple-50 border border-purple-100 text-purple-700"
              : isDark
                ? "bg-green-500/10 border border-green-500/20 text-green-400"
                : "bg-green-50 border border-green-100 text-green-700"
          }`}
        >
          {isLead ? (
            <Bot className="h-3.5 w-3.5" />
          ) : (
            <GraduationCap className="h-3.5 w-3.5" />
          )}
          Showing FAQ for {cfg.label} chatbot only
        </div>

        {/* Search + filter */}
        <div className="flex flex-col sm:flex-row gap-4 relative z-10">
          <div className="flex-1 relative">
            <Search
              size={14}
              className={`absolute left-3 top-1/2 -translate-y-1/2 ${styles.text.muted}`}
            />
            <input
              type="text"
              placeholder="Search questions or answers..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className={`w-full rounded-xl pl-9 pr-4 py-2.5 text-sm border outline-none focus:ring-1 transition-all ${styles.input}`}
            />
          </div>
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

        {/* FAQ list */}
        <div className="space-y-4">
          {filteredQuestions.length > 0 ? (
            filteredQuestions.map((faq) => {
              const isEditing = editingId === faq.id;
              return (
                <div
                  key={faq.id}
                  className={`${styles.card} p-5 transition-all ${
                    isEditing ? ringClass : ""
                  }`}
                >
                  <div className="space-y-4">
                    {/* Question row */}
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
                            className={`${styles.input} w-full rounded-lg p-2`}
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
                              {[
                                "General",
                                "Support",
                                "Pricing",
                                "Technical",
                                "Services",
                              ].map((cat) => (
                                <option
                                  key={cat}
                                  value={cat}
                                  className={
                                    isDark ? "bg-[#1A1A1E]" : "bg-white"
                                  }
                                >
                                  {cat}
                                </option>
                              ))}
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
                            className={`p-1.5 ${styles.text.muted} rounded-lg ${
                              isLead
                                ? isDark
                                  ? "hover:text-purple-400 hover:bg-purple-500/10"
                                  : "hover:text-purple-600 hover:bg-purple-50"
                                : isDark
                                  ? "hover:text-green-400 hover:bg-green-500/10"
                                  : "hover:text-green-600 hover:bg-green-50"
                            }`}
                          >
                            <Edit className="h-4 w-4" />
                          </button>
                        )}
                        <button
                          onClick={() => setDeleteId(faq.id)}
                          className={`p-1.5 ${styles.text.muted} hover:text-red-500 rounded-lg ${
                            isDark ? "hover:bg-red-500/10" : "hover:bg-red-50"
                          }`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>

                    {/* Answer row */}
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
                className={`w-16 h-16 rounded-full bg-gradient-to-br ${cfg.gradient} flex items-center justify-center mx-auto mb-4`}
              >
                <MessageCircle className="h-8 w-8 text-white" />
              </div>
              <h3
                className={`text-lg font-semibold ${styles.text.primary} mb-2`}
              >
                No FAQ questions yet
              </h3>
              <p className={`text-sm ${styles.text.secondary} mb-6`}>
                {searchTerm || categoryFilter !== "all"
                  ? "No questions match your current filter"
                  : `Add the first FAQ question for your ${cfg.label} chatbot`}
              </p>
              {!searchTerm && categoryFilter === "all" && (
                <Button
                  onClick={handleAddQuestion}
                  className={`bg-gradient-to-r ${cfg.gradient} hover:opacity-90 text-white rounded-xl`}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Your First Question
                </Button>
              )}
            </div>
          )}
        </div>
      </div>

      <ConfirmDialog
        open={!!deleteId}
        onOpenChange={() => setDeleteId(null)}
        onConfirm={() => deleteId && handleDeleteQuestion(deleteId)}
        title="Delete FAQ Question"
        description="Are you sure you want to delete this question? This action cannot be undone."
        confirmText="Remove Question"
        isDestructive={true}
      />
    </div>
  );
}
