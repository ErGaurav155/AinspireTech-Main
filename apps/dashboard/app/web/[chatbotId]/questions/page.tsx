"use client";

import { useState } from "react";
import Link from "next/link";
import { useAuth } from "@clerk/nextjs";
import {
  BookOpen,
  Plus,
  Save,
  Trash2,
  Edit,
  Check,
  X,
  HelpCircle,
  AlertCircle,
  Copy,
  Eye,
} from "lucide-react";
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
import { Switch } from "@rocketreplai/ui/components/radix/switch";

interface MCQQuestion {
  id: string;
  question: string;
  options: string[];
  correctAnswer: number;
  explanation?: string;
  category: string;
  difficulty: "easy" | "medium" | "hard";
  points: number;
}

export default function EducationQuestionsPage() {
  const { userId } = useAuth();

  const [questions, setQuestions] = useState<MCQQuestion[]>([
    {
      id: "1",
      question: "What is the capital of France?",
      options: ["London", "Berlin", "Paris", "Madrid"],
      correctAnswer: 2,
      explanation: "Paris is the capital and largest city of France.",
      category: "Geography",
      difficulty: "easy",
      points: 10,
    },
    {
      id: "2",
      question: "Which planet is known as the Red Planet?",
      options: ["Venus", "Mars", "Jupiter", "Saturn"],
      correctAnswer: 1,
      explanation: "Mars appears red due to iron oxide on its surface.",
      category: "Astronomy",
      difficulty: "easy",
      points: 10,
    },
  ]);

  const [isSaving, setIsSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [previewId, setPreviewId] = useState<string | null>(null);

  const handleAddQuestion = () => {
    const newId = (
      Math.max(...questions.map((q) => parseInt(q.id)), 0) + 1
    ).toString();
    setQuestions([
      ...questions,
      {
        id: newId,
        question: "",
        options: ["", "", "", ""],
        correctAnswer: 0,
        category: "General",
        difficulty: "medium",
        points: 10,
      },
    ]);
    setEditingId(newId);
  };

  const handleUpdateQuestion = (id: string, field: string, value: any) => {
    setQuestions((prev) =>
      prev.map((q) => (q.id === id ? { ...q, [field]: value } : q)),
    );
  };

  const handleUpdateOption = (
    id: string,
    optionIndex: number,
    value: string,
  ) => {
    setQuestions((prev) =>
      prev.map((q) => {
        if (q.id === id) {
          const options = [...q.options];
          options[optionIndex] = value;
          return { ...q, options };
        }
        return q;
      }),
    );
  };

  const handleDeleteQuestion = (id: string) => {
    setQuestions((prev) => prev.filter((q) => q.id !== id));
    setDeleteId(null);
    toast({
      title: "Question deleted",
      duration: 2000,
    });
  };

  const handleDuplicateQuestion = (question: MCQQuestion) => {
    const newId = (
      Math.max(...questions.map((q) => parseInt(q.id)), 0) + 1
    ).toString();
    setQuestions([
      ...questions,
      {
        ...question,
        id: newId,
        question: `${question.question} (Copy)`,
      },
    ]);
    toast({
      title: "Question duplicated",
      duration: 2000,
    });
  };

  const handleSaveQuestions = () => {
    // Validate
    const invalid = questions.some(
      (q) =>
        !q.question.trim() ||
        q.options.some((opt) => !opt.trim()) ||
        q.options.length < 2,
    );

    if (invalid) {
      toast({
        title: "Validation Error",
        description: "Please fill in all fields and ensure at least 2 options",
        variant: "destructive",
        duration: 3000,
      });
      return;
    }

    setIsSaving(true);
    // Simulate API call
    setTimeout(() => {
      setIsSaving(false);
      setEditingId(null);
      toast({
        title: "Questions saved",
        description: "Your MCQ questions have been updated",
        duration: 3000,
      });
    }, 1000);
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case "easy":
        return "bg-green-100 text-green-600 border-green-200";
      case "medium":
        return "bg-yellow-100 text-yellow-600 border-yellow-200";
      case "hard":
        return "bg-red-100 text-red-600 border-red-200";
      default:
        return "bg-gray-100 text-gray-600";
    }
  };

  return (
    <div className="min-h-screen bg-[#F8F9FA]">
      <div className="p-4 md:p-6 lg:p-8 max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-wrap gap-2 items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center">
              <BookOpen className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-800">MCQ Questions</h1>
              <p className="text-sm text-gray-500">
                {questions.length} questions •{" "}
                {questions.reduce((acc, q) => acc + q.points, 0)} total points
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              onClick={handleAddQuestion}
              className="bg-gradient-to-r from-green-500 to-green-200 hover:from-green-600 hover:to-green-300 text-white rounded-xl"
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
                Students will be presented with these questions one by one. They
                need to select the correct answer to earn points. You can set
                difficulty levels and provide explanations.
              </p>
            </div>
          </div>
        </div>

        {/* Questions List */}
        <div className="space-y-4">
          {questions.map((question) => (
            <div
              key={question.id}
              className={`bg-white border border-gray-100 rounded-2xl p-6 transition-all ${
                editingId === question.id
                  ? "ring-2 ring-green-300"
                  : "hover:border-gray-200"
              }`}
            >
              {/* Header Actions */}
              <div className="flex flex-wrap gap-2 items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Badge className={getDifficultyColor(question.difficulty)}>
                    {question.difficulty.charAt(0).toUpperCase() +
                      question.difficulty.slice(1)}
                  </Badge>
                  <Badge variant="outline" className="text-gray-600">
                    {question.points} points
                  </Badge>
                  <Badge variant="outline" className="text-gray-600">
                    {question.category}
                  </Badge>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() =>
                      setPreviewId(
                        previewId === question.id ? null : question.id,
                      )
                    }
                    className="p-1.5 text-gray-400 hover:text-blue-600 rounded-lg hover:bg-blue-50"
                  >
                    <Eye className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => handleDuplicateQuestion(question)}
                    className="p-1.5 text-gray-400 hover:text-purple-600 rounded-lg hover:bg-purple-50"
                  >
                    <Copy className="h-4 w-4" />
                  </button>
                  {editingId === question.id ? (
                    <button
                      onClick={() => setEditingId(null)}
                      className="p-1.5 text-green-600 hover:text-green-700 rounded-lg hover:bg-green-50"
                    >
                      <Check className="h-4 w-4" />
                    </button>
                  ) : (
                    <button
                      onClick={() => setEditingId(question.id)}
                      className="p-1.5 text-gray-400 hover:text-green-600 rounded-lg hover:bg-green-50"
                    >
                      <Edit className="h-4 w-4" />
                    </button>
                  )}
                  <button
                    onClick={() => setDeleteId(question.id)}
                    className="p-1.5 text-gray-400 hover:text-red-600 rounded-lg hover:bg-red-50"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* Question */}
              <div className="mb-4">
                {editingId === question.id ? (
                  <textarea
                    value={question.question}
                    onChange={(e) =>
                      handleUpdateQuestion(
                        question.id,
                        "question",
                        e.target.value,
                      )
                    }
                    placeholder="Enter your question..."
                    rows={2}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-green-200 resize-none"
                  />
                ) : (
                  <h3 className="font-semibold text-gray-800 text-lg">
                    {question.question}
                  </h3>
                )}
              </div>

              {/* Options */}
              <div className="space-y-2 mb-4">
                {question.options.map((option, index) => (
                  <div key={index} className="flex items-center gap-3">
                    <div
                      className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium ${
                        !editingId && question.correctAnswer === index
                          ? "bg-green-500 text-white"
                          : "bg-gray-100 text-gray-500"
                      }`}
                    >
                      {String.fromCharCode(65 + index)}
                    </div>
                    {editingId === question.id ? (
                      <div className="flex-1 flex items-center gap-2">
                        <input
                          type="text"
                          value={option}
                          onChange={(e) =>
                            handleUpdateOption(
                              question.id,
                              index,
                              e.target.value,
                            )
                          }
                          placeholder={`Option ${String.fromCharCode(65 + index)}`}
                          className="flex-1 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-200"
                        />
                        <button
                          onClick={() =>
                            handleUpdateQuestion(
                              question.id,
                              "correctAnswer",
                              index,
                            )
                          }
                          className={`p-1.5 rounded-lg ${
                            question.correctAnswer === index
                              ? "bg-green-500 text-white"
                              : "bg-gray-100 text-gray-400 hover:bg-green-100"
                          }`}
                        >
                          <Check className="h-4 w-4" />
                        </button>
                      </div>
                    ) : (
                      <span
                        className={`text-sm ${
                          question.correctAnswer === index
                            ? "text-green-600 font-medium"
                            : "text-gray-600"
                        }`}
                      >
                        {option}
                      </span>
                    )}
                  </div>
                ))}
              </div>

              {/* Additional Settings (when editing) */}
              {editingId === question.id && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4 pt-4 border-t border-gray-100">
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">
                      Category
                    </label>
                    <input
                      type="text"
                      value={question.category}
                      onChange={(e) =>
                        handleUpdateQuestion(
                          question.id,
                          "category",
                          e.target.value,
                        )
                      }
                      className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm"
                      placeholder="e.g., Geography"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">
                      Difficulty
                    </label>
                    <select
                      value={question.difficulty}
                      onChange={(e) =>
                        handleUpdateQuestion(
                          question.id,
                          "difficulty",
                          e.target.value,
                        )
                      }
                      className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm"
                    >
                      <option value="easy">Easy</option>
                      <option value="medium">Medium</option>
                      <option value="hard">Hard</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">
                      Points
                    </label>
                    <input
                      type="number"
                      value={question.points}
                      onChange={(e) =>
                        handleUpdateQuestion(
                          question.id,
                          "points",
                          parseInt(e.target.value),
                        )
                      }
                      min="1"
                      max="100"
                      className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm"
                    />
                  </div>
                </div>
              )}

              {/* Explanation */}
              {question.explanation && !editingId && (
                <div className="mt-4 p-3 bg-blue-50 border border-blue-100 rounded-xl">
                  <p className="text-xs text-blue-700">
                    <span className="font-medium">Explanation:</span>{" "}
                    {question.explanation}
                  </p>
                </div>
              )}

              {/* Preview Mode */}
              {previewId === question.id && !editingId && (
                <div className="mt-4 p-4 bg-gray-50 border border-gray-200 rounded-xl">
                  <p className="text-xs font-medium text-gray-500 mb-3">
                    Preview Mode
                  </p>
                  <div className="space-y-2">
                    {question.options.map((option, index) => (
                      <div
                        key={index}
                        className={`p-3 rounded-lg border ${
                          question.correctAnswer === index
                            ? "border-green-500 bg-green-50"
                            : "border-gray-200"
                        }`}
                      >
                        <span className="text-sm">{option}</span>
                        {question.correctAnswer === index && (
                          <Check className="h-4 w-4 text-green-500 inline ml-2" />
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Empty State */}
        {questions.length === 0 && (
          <div className="bg-white border border-gray-100 rounded-2xl p-12 text-center">
            <div className="w-16 h-16 rounded-full bg-green-50 flex items-center justify-center mx-auto mb-4">
              <BookOpen className="h-8 w-8 text-green-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-800 mb-2">
              No questions yet
            </h3>
            <p className="text-sm text-gray-500 mb-6">
              Add your first MCQ question to start educating students
            </p>
            <Button
              onClick={handleAddQuestion}
              className="bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white rounded-xl"
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
