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
  X,
  ChevronDown,
  AlertCircle,
  CheckCircle,
  Search,
  Filter,
  RefreshCw,
} from "lucide-react";
import { useApi } from "@/lib/useApi";
import { getFAQ, saveFAQ } from "@/lib/services/web-actions.api";
import { toast } from "@rocketreplai/ui/components/radix/use-toast";
import { Button } from "@rocketreplai/ui/components/radix/button";
import { Badge } from "@rocketreplai/ui/components/radix/badge";
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

interface FAQQuestion {
  id: string;
  question: string;
  answer: string;
  category: string;
}

export default function LeadFAQPage() {
  const { userId } = useAuth();
  const { apiRequest } = useApi();

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
      General: "bg-blue-100 text-blue-600 border-blue-200",
      Support: "bg-green-100 text-green-600 border-green-200",
      Pricing: "bg-purple-100 text-purple-600 border-purple-200",
      Technical: "bg-orange-100 text-orange-600 border-orange-200",
      Services: "bg-pink-100 text-pink-600 border-pink-200",
    };
    return colors[category] || "bg-gray-100 text-gray-600 border-gray-200";
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
      <div className="p-4 md:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-wrap gap-2 items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
              <MessageCircle className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-800">
                FAQ Management
              </h1>
              <p className="text-sm text-gray-500">
                {questions.length} questions • Last updated{" "}
                {new Date().toLocaleDateString()}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1 md:gap-2">
            <Button
              onClick={handleAddQuestion}
              className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white rounded-xl p-2 md:p-4"
            >
              <Plus className="h-4 w-4 mr-1 md:mr-2" />
              Add Question
            </Button>
            <Button
              onClick={() => handleSaveFAQ()}
              disabled={isSaving}
              className="bg-green-500 hover:bg-green-600 text-white rounded-xl p-2 md:p-4"
            >
              <Save className="h-4 w-4 mr-1 md:mr-2" />
              {isSaving ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white border border-gray-100 rounded-2xl p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search questions and answers..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-200"
              />
            </div>
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-gray-400" />
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-purple-200"
              >
                <option value="all">All Categories</option>
                {categories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* FAQ List */}
        <div className="space-y-4">
          {filteredQuestions.length > 0 ? (
            filteredQuestions.map((faq) => (
              <div
                key={faq.id}
                className={`bg-white border border-gray-100 rounded-2xl p-5 transition-all ${
                  editingId === faq.id
                    ? "ring-2 ring-purple-300"
                    : "hover:border-gray-200"
                }`}
              >
                <div className="space-y-4">
                  {/* Question Row */}
                  <div className="flex items-start gap-4">
                    <div className="flex-1">
                      {editingId === faq.id ? (
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
                          className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-purple-200"
                        />
                      ) : (
                        <h3 className="font-semibold text-gray-800">
                          {faq.question}
                        </h3>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className={getCategoryColor(faq.category)}>
                        {faq.category}
                      </Badge>
                      {editingId === faq.id ? (
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
                            className="px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-xs text-gray-600 focus:outline-none focus:ring-2 focus:ring-purple-200"
                          >
                            <option value="General">General</option>
                            <option value="Support">Support</option>
                            <option value="Pricing">Pricing</option>
                            <option value="Technical">Technical</option>
                            <option value="Services">Services</option>
                          </select>
                          <button
                            onClick={() => setEditingId(null)}
                            className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
                          >
                            <CheckCircle className="h-4 w-4" />
                          </button>
                        </>
                      ) : (
                        <button
                          onClick={() => setEditingId(faq.id)}
                          className="p-1.5 text-gray-400 hover:text-purple-600 rounded-lg hover:bg-purple-50"
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                      )}
                      <button
                        onClick={() => setDeleteId(faq.id)}
                        className="p-1.5 text-gray-400 hover:text-red-600 rounded-lg hover:bg-red-50"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  {/* Answer Row */}
                  <div>
                    {editingId === faq.id ? (
                      <textarea
                        value={faq.answer}
                        onChange={(e) =>
                          handleUpdateQuestion(faq.id, "answer", e.target.value)
                        }
                        placeholder="Enter answer..."
                        rows={3}
                        className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-purple-200 resize-none"
                      />
                    ) : (
                      <p className="text-sm text-gray-600 leading-relaxed">
                        {faq.answer}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="bg-white border border-gray-100 rounded-2xl p-12 text-center">
              <div className="w-16 h-16 rounded-full bg-purple-50 flex items-center justify-center mx-auto mb-4">
                <MessageCircle className="h-8 w-8 text-purple-400" />
              </div>
              <h3 className="text-lg font-semibold text-gray-800 mb-2">
                No FAQ questions yet
              </h3>
              <p className="text-sm text-gray-500 mb-6">
                Add your first frequently asked question to help your leads
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
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete FAQ Question</AlertDialogTitle>
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
