"use client";

import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL || "https://api.rocketreplai.com";
const API_KEY = process.env.NEXT_PUBLIC_API_KEY || "";

type Tab = "chat" | "quiz" | "faq";
type Mode = "embed" | "landing";
type MessageRole = "user" | "bot";

interface Message {
  id: string;
  role: MessageRole;
  content: string;
  timestamp?: Date;
  tokensUsed?: number;
}

interface TokenBalance {
  availableTokens: number;
  freeTokensRemaining: number;
  purchasedTokensRemaining: number;
  totalTokensUsed: number;
  freeTokens: number;
  purchasedTokens: number;
  usedFreeTokens: number;
  usedPurchasedTokens: number;
  nextResetAt: string;
}

interface FAQItem {
  question: string;
  answer: string;
  category?: string;
}

interface QuizQuestion {
  question: string;
  options: string[];
  correctAnswer: number;
  explanation?: string;
}

interface QuizPayload {
  title?: string;
  description?: string;
  questions: QuizQuestion[];
}

interface BotConfig {
  name: string;
  welcomeMessage: string;
  primaryColor: string;
  logoUrl?: string | null;
}

interface Props {
  userId: string;
  chatbotType: string;
  mode: Mode;
}

interface FAQItem {
  question: string;
  answer: string;
  category?: string;
}

interface QuizQuestion {
  question: string;
  options: string[];
  correctAnswer: number;
  explanation?: string;
}

interface QuizPayload {
  title?: string;
  description?: string;
  questions: QuizQuestion[];
}

interface BotConfig {
  name: string;
  welcomeMessage: string;
  primaryColor: string;
  logoUrl?: string | null;
}

interface Props {
  userId: string;
  chatbotType: string;
  mode: Mode;
}

function uid() {
  return `${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

function parseQuizResponse(text: string): QuizPayload | null {
  try {
    const cleaned = text.match(/```json\s*([\s\S]*?)\s*```/i)?.[1] || text;
    const parsed = JSON.parse(cleaned);
    return parsed && Array.isArray(parsed.questions) ? parsed : null;
  } catch {
    return null;
  }
}

function renderMultiline(text: string) {
  const lines = text.split("\n");
  return lines.map((line, index) => (
    <React.Fragment key={`${line}_${index}`}>
      {line}
      {index < lines.length - 1 ? <br /> : null}
    </React.Fragment>
  ));
}

function PoweredBy({ primaryColor }: { primaryColor: string }) {
  return (
    <div style={{ textAlign: "center", padding: "0 0 6px" }}>
      <a
        href="https://rocketreplai.com"
        target="_blank"
        rel="noopener noreferrer"
        style={{ color: "#94a3b8", fontSize: 11, textDecoration: "none" }}
      >
        Powered by{" "}
        <span style={{ color: primaryColor, fontWeight: 800 }}>
          RocketReplAI
        </span>
      </a>
    </div>
  );
}

function Bubble({
  primaryColor,
  onOpen,
}: {
  primaryColor: string;
  onOpen: () => void;
}) {
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        display: "flex",
        alignItems: "flex-end",
        justifyContent: "flex-end",
        padding: "0 14px 14px 0",
        pointerEvents: "none",
      }}
    >
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-end",
          gap: 10,
        }}
      >
        <button
          onClick={onOpen}
          style={{
            pointerEvents: "all",
            border: "none",
            cursor: "pointer",
            padding: "10px 14px",
            borderRadius: "18px 18px 6px 18px",
            background: "#fff",
            color: "#0f172a",
            fontSize: 13,
            fontWeight: 600,
            boxShadow: "0 10px 30px rgba(15,23,42,0.12)",
          }}
        >
          Ask doubts or start a quiz
        </button>
        <button
          onClick={onOpen}
          style={{
            width: 64,
            height: 64,
            pointerEvents: "all",
            borderRadius: "50%",
            border: "none",
            cursor: "pointer",
            background: `linear-gradient(135deg, ${primaryColor}, ${primaryColor}cc)`,
            boxShadow: `0 14px 36px ${primaryColor}44`,
            color: "#fff",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
          aria-label="Open MCQ bot"
        >
          <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor">
            <path d="M19 3H5c-1.1 0-2 .9-2 2v11c0 1.1.9 2 2 2h4l3 3 3-3h4c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-9 11H8v-2h2v2zm3 0h-2V7h2v7zm3 0h-2V10h2v4z" />
          </svg>
        </button>
      </div>
    </div>
  );
}

export default function MCQWidget({ userId, chatbotType, mode }: Props) {
  const [isOpen, setIsOpen] = useState(mode === "landing");
  const [activeTab, setActiveTab] = useState<Tab>("chat");
  const [config, setConfig] = useState<BotConfig | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [faqItems, setFaqItems] = useState<FAQItem[]>([]);
  const [faqSearch, setFaqSearch] = useState("");
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(null);
  const [quizTopic, setQuizTopic] = useState("");
  const [quizLevel, setQuizLevel] = useState("Intermediate");
  const [quizExam, setQuizExam] = useState("");
  const [quizContext, setQuizContext] = useState("");
  const [quizData, setQuizData] = useState<QuizPayload | null>(null);
  const [selectedAnswers, setSelectedAnswers] = useState<number[]>([]);
  const [quizSubmitted, setQuizSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tokenBalance, setTokenBalance] = useState<TokenBalance | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const primaryColor = config?.primaryColor || "#2563eb";
  const welcomeMessage =
    config?.welcomeMessage ||
    "Hi! Ask your study doubts, generate a practice quiz, or browse FAQs.";

  // Session management
  useEffect(() => {
    if (!userId || !chatbotType) return;

    const sessionKey = `mcq_session_${userId}_${chatbotType}`;
    const storedSession = localStorage.getItem(sessionKey);

    if (storedSession) {
      setSessionId(storedSession);
    } else {
      const newSession = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      setSessionId(newSession);
      localStorage.setItem(sessionKey, newSession);
    }
  }, [userId, chatbotType]);

  // Token balance fetching
  useEffect(() => {
    if (!userId || !chatbotType || !sessionId) return;

    const fetchTokenBalance = async () => {
      try {
        const response = await fetch(
          `${API_BASE}/api/embed/token/balance?userId=${encodeURIComponent(
            userId,
          )}&chatbotType=${encodeURIComponent(chatbotType)}`,
          {
            method: "GET",
            headers: {
              "Content-Type": "application/json",
              "x-api-key": API_KEY,
            },
          },
        );

        if (response.ok) {
          const data = await response.json();
          setTokenBalance(data.data || data);
        }
      } catch (error) {
        console.error("Failed to fetch token balance:", error);
      }
    };

    fetchTokenBalance();
    // Refresh token balance every 30 seconds
    const interval = setInterval(fetchTokenBalance, 30000);
    return () => clearInterval(interval);
  }, [userId, chatbotType, sessionId]);

  // Load existing conversation
  useEffect(() => {
    if (!userId || !chatbotType || !sessionId) return;

    const loadConversation = async () => {
      try {
        const response = await fetch(
          `${API_BASE}/api/embed/chat-conversations?userId=${encodeURIComponent(
            userId,
          )}&chatbotType=${encodeURIComponent(chatbotType)}&sessionId=${encodeURIComponent(sessionId)}`,
          {
            method: "GET",
            headers: {
              "Content-Type": "application/json",
              "x-api-key": API_KEY,
            },
          },
        );

        if (response.ok) {
          const data = await response.json();
          const conversations =
            data.data?.conversations || data.conversations || [];
          if (conversations.length > 0) {
            // Find the conversation for this session
            const currentConversation = conversations.find(
              (conv: any) => conv.sessionId === sessionId,
            );
            if (
              currentConversation &&
              currentConversation.messages &&
              currentConversation.messages.length > 0
            ) {
              setMessages(
                currentConversation.messages.map((msg: any) => ({
                  id: msg.id,
                  role: msg.role,
                  content: msg.content,
                  timestamp: new Date(msg.timestamp),
                  tokensUsed: msg.tokensUsed,
                })),
              );
              return; // Don't add welcome message if we have existing conversation
            }
          }
        }
      } catch (error) {
        console.error("Failed to load conversation:", error);
      }

      // Add welcome message only if no existing conversation
      setMessages([{ id: uid(), role: "bot", content: welcomeMessage }]);
    };

    loadConversation();
  }, [userId, chatbotType, sessionId, welcomeMessage]);

  const addMessage = useCallback(
    (role: MessageRole, content: string, tokensUsed?: number) => {
      const message: Message = {
        id: uid(),
        role,
        content,
        timestamp: new Date(),
        tokensUsed,
      };
      setMessages((prev) => [...prev, message]);
    },
    [],
  );

  useEffect(() => {
    setMessages([{ id: uid(), role: "bot", content: welcomeMessage }]);
  }, [welcomeMessage]);

  useEffect(() => {
    const load = async () => {
      try {
        const [cfgRes, faqRes] = await Promise.allSettled([
          fetch(
            `${API_BASE}/api/embed/config-by-type?userId=${encodeURIComponent(
              userId,
            )}&chatbotType=${encodeURIComponent(chatbotType)}`,
            {
              method: "GET",
              headers: {
                "Content-Type": "application/json",
                "x-api-key": API_KEY,
              },
            },
          ),
          fetch(`${API_BASE}/api/embed/faq`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "x-api-key": API_KEY,
            },
            body: JSON.stringify({ userId, chatbotType }),
          }),
        ]);

        if (cfgRes.status === "fulfilled" && cfgRes.value.ok) {
          const cfgJson = await cfgRes.value.json();
          setConfig(cfgJson.data);
        }

        if (faqRes.status === "fulfilled" && faqRes.value.ok) {
          const faqJson = await faqRes.value.json();
          setFaqItems(faqJson.data?.questions || faqJson.faq?.questions || []);
        }
      } catch (bootstrapError) {
        console.error("MCQ widget bootstrap failed:", bootstrapError);
      }
    };

    load();
  }, [chatbotType, userId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  useEffect(() => {
    if (mode !== "embed") return;

    window.parent.postMessage(
      { source: "rocketreplai-mcq", type: "ready" },
      "*",
    );

    const onMessage = (event: MessageEvent) => {
      const data = event.data;
      if (!data || data.source !== "rocketreplai-mcq-parent") return;
      if (data.type === "open") setIsOpen(true);
      if (data.type === "close") setIsOpen(false);
    };

    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [mode]);

  useEffect(() => {
    if (mode !== "embed") return;
    window.parent.postMessage(
      { source: "rocketreplai-mcq", type: isOpen ? "open" : "close" },
      "*",
    );
  }, [isOpen, mode]);

  const filteredFAQ = useMemo(() => {
    const term = faqSearch.trim().toLowerCase();
    return faqItems.filter(
      (item) =>
        !term ||
        item.question.toLowerCase().includes(term) ||
        item.answer.toLowerCase().includes(term) ||
        item.category?.toLowerCase().includes(term),
    );
  }, [faqItems, faqSearch]);

  const sendRequest = useCallback(
    async (userInput: string, isMCQRequest: boolean) => {
      // Check token balance before sending request
      if (!tokenBalance || tokenBalance.availableTokens <= 0) {
        throw new Error(
          "You have run out of tokens. Please purchase more tokens to continue chatting.",
        );
      }

      const conversationHistory = messages.map((msg) => ({
        role: msg.role,
        content: msg.content,
        timestamp: msg.timestamp?.toISOString(),
      }));

      const response = await fetch(`${API_BASE}/api/embed/mcqchatbot`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": API_KEY,
        },
        body: JSON.stringify({
          userInput,
          userId,
          chatbotType,
          isMCQRequest,
          conversationHistory,
          sessionId,
        }),
      });

      if (response.status === 402) {
        throw new Error(
          "You have run out of tokens. Please purchase more tokens to continue chatting.",
        );
      }
      if (!response.ok) {
        throw new Error(`Request failed with status ${response.status}`);
      }

      const json = await response.json();
      const botResponse =
        json.data?.response ||
        json.response?.content ||
        "No response available.";
      const tokensUsed = json.tokensUsed || 0;

      // Update token balance after successful response
      if (tokensUsed > 0 && tokenBalance) {
        setTokenBalance((prev) =>
          prev
            ? {
                ...prev,
                availableTokens: Math.max(0, prev.availableTokens - tokensUsed),
                totalTokensUsed: prev.totalTokensUsed + tokensUsed,
              }
            : null,
        );
      }

      return { response: botResponse, tokensUsed };
    },
    [chatbotType, userId, tokenBalance, messages, sessionId],
  );

  const handleSendChat = useCallback(async () => {
    const message = chatInput.trim();
    if (!message || isTyping) return;

    // Check if user has tokens before sending
    if (!tokenBalance || tokenBalance.availableTokens <= 0) {
      setError(
        "You have run out of tokens. Please purchase more tokens to continue chatting.",
      );
      addMessage(
        "bot",
        "You have run out of tokens. Please purchase more tokens to continue chatting.",
      );
      return;
    }

    addMessage("user", message);
    setChatInput("");
    setError(null);
    setIsTyping(true);

    try {
      const result = await sendRequest(message, false);
      addMessage("bot", result.response, result.tokensUsed);

      // Save conversation after successful exchange
      await saveConversation();
    } catch (chatError) {
      const msg =
        chatError instanceof Error
          ? chatError.message
          : "Failed to send message.";
      setError(msg);
      addMessage("bot", msg);
    } finally {
      setIsTyping(false);
    }
  }, [addMessage, chatInput, isTyping, sendRequest, tokenBalance]);

  const saveConversation = useCallback(async () => {
    if (!userId || !chatbotType || !sessionId || messages.length === 0) return;

    try {
      await fetch(`${API_BASE}/api/embed/chat-conversation`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": API_KEY,
        },
        body: JSON.stringify({
          userId,
          chatbotType,
          sessionId,
          messages,
        }),
      });
    } catch (error) {
      console.error("Failed to save conversation:", error);
    }
  }, [userId, chatbotType, sessionId, messages]);

  const handleGenerateQuiz = useCallback(async () => {
    if (!quizTopic.trim() || isTyping) return;

    // Check if user has tokens before generating quiz
    if (!tokenBalance || tokenBalance.availableTokens <= 0) {
      setError(
        "You have run out of tokens. Please purchase more tokens to continue.",
      );
      addMessage(
        "bot",
        "You have run out of tokens. Please purchase more tokens to continue.",
      );
      return;
    }

    const prompt = `Generate an MCQ quiz on ${quizTopic.trim()} for ${quizLevel} level${
      quizExam.trim() ? ` aligned to ${quizExam.trim()}` : ""
    }${quizContext.trim() ? `. Focus area: ${quizContext.trim()}` : ""}.`;

    addMessage("user", `Create a quiz: ${prompt}`);
    setError(null);
    setQuizData(null);
    setSelectedAnswers([]);
    setQuizSubmitted(false);
    setIsTyping(true);

    try {
      const result = await sendRequest(prompt, true);
      const parsed = parseQuizResponse(result.response);
      if (!parsed) throw new Error("The generated quiz format was invalid.");
      setQuizData(parsed);
      setSelectedAnswers(new Array(parsed.questions.length).fill(-1));
      addMessage(
        "bot",
        "Your quiz is ready in the Quiz tab.",
        result.tokensUsed,
      );
      setActiveTab("quiz");

      // Save conversation after successful quiz generation
      await saveConversation();
    } catch (quizError) {
      const msg =
        quizError instanceof Error
          ? quizError.message
          : "Failed to generate quiz.";
      setError(msg);
      addMessage("bot", msg);
    } finally {
      setIsTyping(false);
    }
  }, [
    addMessage,
    isTyping,
    quizContext,
    quizExam,
    quizLevel,
    quizTopic,
    sendRequest,
    tokenBalance,
    saveConversation,
  ]);

  const answeredCount = selectedAnswers.filter((value) => value !== -1).length;
  const score =
    quizSubmitted && quizData
      ? quizData.questions.reduce(
          (sum, question, index) =>
            sum + (selectedAnswers[index] === question.correctAnswer ? 1 : 0),
          0,
        )
      : 0;

  const botName = config?.name || "Education Bot";

  const wrapperStyle: React.CSSProperties =
    mode === "embed"
      ? {
          position: "fixed",
          inset: 0,
          overflow: "hidden",
          borderRadius: 24,
          background: "#fff",
          boxShadow: "0 24px 80px rgba(15,23,42,0.18)",
          border: "1px solid rgba(148,163,184,0.18)",
        }
      : {
          width: "100%",
          maxWidth: 480,
          height: "min(760px, 92vh)",
          overflow: "hidden",
          borderRadius: 28,
          background: "#fff",
          boxShadow: "0 30px 90px rgba(15,23,42,0.18)",
          border: "1px solid rgba(148,163,184,0.18)",
        };

  const renderTabs = () => (
    <div
      style={{
        display: "flex",
        borderBottom: "1px solid #e5e7eb",
        background: "#fff",
      }}
    >
      {(
        [
          ["chat", "Chat"],
          ["quiz", "Quiz"],
          ["faq", "FAQs"],
        ] as [Tab, string][]
      ).map(([tab, label]) => {
        const active = activeTab === tab;
        return (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            style={{
              flex: 1,
              border: "none",
              background: active ? `${primaryColor}10` : "transparent",
              color: active ? primaryColor : "#64748b",
              borderBottom: active
                ? `2px solid ${primaryColor}`
                : "2px solid transparent",
              padding: "12px 10px",
              fontSize: 13,
              fontWeight: active ? 700 : 600,
              cursor: "pointer",
            }}
          >
            {label}
          </button>
        );
      })}
    </div>
  );

  const renderHeader = () => (
    <div
      style={{
        padding: "16px 16px 14px",
        background: `linear-gradient(135deg, ${primaryColor}, ${primaryColor}cc)`,
        color: "#fff",
      }}
    >
      <div
        style={{ display: "flex", justifyContent: "space-between", gap: 12 }}
      >
        <div style={{ display: "flex", gap: 12 }}>
          <div
            style={{
              width: 42,
              height: 42,
              borderRadius: 14,
              background: "rgba(255,255,255,0.18)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              overflow: "hidden",
            }}
          >
            {config?.logoUrl ? (
              <img
                src={config.logoUrl}
                alt={botName}
                style={{ width: "100%", height: "100%", objectFit: "cover" }}
              />
            ) : (
              <svg width="22" height="22" viewBox="0 0 24 24" fill="white">
                <path d="M19 3H5c-1.1 0-2 .9-2 2v11c0 1.1.9 2 2 2h4l3 3 3-3h4c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-9 11H8v-2h2v2zm3 0h-2V7h2v7zm3 0h-2V10h2v4z" />
              </svg>
            )}
          </div>
          <div>
            <div style={{ fontSize: 16, fontWeight: 800 }}>{botName}</div>
            <div style={{ fontSize: 12, opacity: 0.92 }}>
              Doubts, quizzes, and FAQs
            </div>
          </div>
        </div>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "flex-end",
            gap: 4,
          }}
        >
          {tokenBalance && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                background: "rgba(255,255,255,0.15)",
                padding: "4px 8px",
                borderRadius: 12,
                fontSize: 11,
                fontWeight: 600,
              }}
            >
              <svg
                width="12"
                height="12"
                viewBox="0 0 24 24"
                fill="currentColor"
              >
                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
              </svg>
              {tokenBalance.availableTokens.toLocaleString()}
            </div>
          )}
          {mode === "embed" ? (
            <button
              onClick={() => setIsOpen(false)}
              style={{
                width: 34,
                height: 34,
                borderRadius: "50%",
                border: "none",
                background: "rgba(255,255,255,0.16)",
                color: "#fff",
                cursor: "pointer",
                fontSize: 18,
              }}
            >
              ×
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );

  const renderChatTab = () => (
    <>
      <div
        style={{
          flex: 1,
          overflowY: "auto",
          padding: "16px 14px",
          display: "flex",
          flexDirection: "column",
          gap: 12,
          background:
            "radial-gradient(circle at top right, rgba(37,99,235,0.08), transparent 34%), #f8fafc",
        }}
      >
        {messages.map((message) => {
          const isUser = message.role === "user";
          return (
            <div
              key={message.id}
              style={{
                display: "flex",
                justifyContent: isUser ? "flex-end" : "flex-start",
              }}
            >
              <div
                style={{
                  maxWidth: "84%",
                  borderRadius: isUser
                    ? "18px 18px 6px 18px"
                    : "18px 18px 18px 6px",
                  padding: "11px 13px",
                  fontSize: 13.5,
                  lineHeight: 1.6,
                  background: isUser ? primaryColor : "#fff",
                  color: isUser ? "#fff" : "#0f172a",
                  boxShadow: "0 6px 20px rgba(15,23,42,0.06)",
                  border: isUser ? "none" : "1px solid #e5e7eb",
                }}
              >
                {renderMultiline(message.content)}
              </div>
            </div>
          );
        })}
        {isTyping ? (
          <div
            style={{
              alignSelf: "flex-start",
              display: "inline-flex",
              gap: 6,
              padding: "12px 14px",
              background: "#fff",
              borderRadius: "18px 18px 18px 6px",
              border: "1px solid #e5e7eb",
            }}
          >
            {[0, 1, 2].map((dot) => (
              <span
                key={dot}
                style={{
                  width: 7,
                  height: 7,
                  borderRadius: "50%",
                  background: "#94a3b8",
                  display: "inline-block",
                }}
              />
            ))}
          </div>
        ) : null}
        <div ref={messagesEndRef} />
      </div>
      <div
        style={{
          borderTop: "1px solid #e5e7eb",
          padding: 10,
          background: "#fff",
        }}
      >
        <div style={{ display: "flex", gap: 8 }}>
          <input
            value={chatInput}
            onChange={(e) => setChatInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSendChat();
              }
            }}
            placeholder={
              !tokenBalance || tokenBalance.availableTokens > 0
                ? "Ask a study doubt..."
                : "Out of tokens - please purchase more to continue"
            }
            disabled={!tokenBalance || tokenBalance.availableTokens <= 0}
            style={{
              width: "100%",
              flex: 1,
              borderRadius: 14,
              border: "1px solid #dbe2ea",
              padding: "12px 14px",
              fontSize: 14,
              outline: "none",
              background:
                !tokenBalance || tokenBalance.availableTokens <= 0
                  ? "#f8fafc"
                  : "#fff",
              color:
                !tokenBalance || tokenBalance.availableTokens <= 0
                  ? "#94a3b8"
                  : "#0f172a",
              cursor:
                !tokenBalance || tokenBalance.availableTokens <= 0
                  ? "not-allowed"
                  : "text",
            }}
          />
          <button
            onClick={handleSendChat}
            disabled={
              !chatInput.trim() ||
              isTyping ||
              !tokenBalance ||
              tokenBalance.availableTokens <= 0
            }
            style={{
              width: 42,
              height: 42,
              border: "none",
              borderRadius: "50%",
              background:
                !chatInput.trim() ||
                isTyping ||
                !tokenBalance ||
                tokenBalance.availableTokens <= 0
                  ? "#cbd5e1"
                  : primaryColor,
              color: "#fff",
              cursor:
                !chatInput.trim() ||
                isTyping ||
                !tokenBalance ||
                tokenBalance.availableTokens <= 0
                  ? "not-allowed"
                  : "pointer",
            }}
          >
            ➜
          </button>
        </div>
      </div>
    </>
  );

  const renderQuizTab = () => (
    <div
      style={{ flex: 1, overflowY: "auto", padding: 16, background: "#f8fafc" }}
    >
      {!quizData ? (
        <div style={{ display: "grid", gap: 14 }}>
          <div
            style={{
              padding: 18,
              borderRadius: 20,
              background: `linear-gradient(135deg, ${primaryColor}18, rgba(255,255,255,0.9))`,
              border: "1px solid rgba(148,163,184,0.16)",
            }}
          >
            <div style={{ fontSize: 18, fontWeight: 800, color: "#0f172a" }}>
              Build a practice quiz
            </div>
            <div style={{ marginTop: 6, fontSize: 13, color: "#475569" }}>
              Generate a quick MCQ round for revision, concept checks, or exam
              prep.
            </div>
          </div>
          <input
            value={quizTopic}
            onChange={(e) => setQuizTopic(e.target.value)}
            placeholder={
              !tokenBalance || tokenBalance.availableTokens > 0
                ? "Topic, chapter, or concept"
                : "Out of tokens - please purchase more to continue"
            }
            disabled={!tokenBalance || tokenBalance.availableTokens <= 0}
            style={{
              width: "100%",
              borderRadius: 14,
              border: "1px solid #dbe2ea",
              padding: "12px 14px",
              fontSize: 14,
              outline: "none",
              background:
                !tokenBalance || tokenBalance.availableTokens <= 0
                  ? "#f8fafc"
                  : "#fff",
              color:
                !tokenBalance || tokenBalance.availableTokens <= 0
                  ? "#94a3b8"
                  : "#0f172a",
              cursor:
                !tokenBalance || tokenBalance.availableTokens <= 0
                  ? "not-allowed"
                  : "text",
            }}
          />
          <select
            value={quizLevel}
            onChange={(e) => setQuizLevel(e.target.value)}
            disabled={!tokenBalance || tokenBalance.availableTokens <= 0}
            style={{
              width: "100%",
              borderRadius: 14,
              border: "1px solid #dbe2ea",
              padding: "12px 14px",
              fontSize: 14,
              outline: "none",
              background:
                !tokenBalance || tokenBalance.availableTokens <= 0
                  ? "#f8fafc"
                  : "#fff",
              color:
                !tokenBalance || tokenBalance.availableTokens <= 0
                  ? "#94a3b8"
                  : "#0f172a",
              cursor:
                !tokenBalance || tokenBalance.availableTokens <= 0
                  ? "not-allowed"
                  : "pointer",
            }}
          >
            {["Beginner", "Intermediate", "Advanced", "Competitive Exam"].map(
              (level) => (
                <option key={level} value={level}>
                  {level}
                </option>
              ),
            )}
          </select>
          <input
            value={quizExam}
            onChange={(e) => setQuizExam(e.target.value)}
            disabled={!tokenBalance || tokenBalance.availableTokens <= 0}
            placeholder="Optional exam or board"
            style={{
              width: "100%",
              borderRadius: 14,
              border: "1px solid #dbe2ea",
              padding: "12px 14px",
              fontSize: 14,
              outline: "none",
              background:
                !tokenBalance || tokenBalance.availableTokens <= 0
                  ? "#f8fafc"
                  : "#fff",
              color:
                !tokenBalance || tokenBalance.availableTokens <= 0
                  ? "#94a3b8"
                  : "#0f172a",
              cursor:
                !tokenBalance || tokenBalance.availableTokens <= 0
                  ? "not-allowed"
                  : "text",
            }}
          />
          <textarea
            value={quizContext}
            onChange={(e) => setQuizContext(e.target.value)}
            disabled={!tokenBalance || tokenBalance.availableTokens <= 0}
            rows={4}
            placeholder="Optional focus area or instruction"
            style={{
              width: "100%",
              borderRadius: 14,
              border: "1px solid #dbe2ea",
              padding: "12px 14px",
              fontSize: 14,
              outline: "none",
              background:
                !tokenBalance || tokenBalance.availableTokens <= 0
                  ? "#f8fafc"
                  : "#fff",
              color:
                !tokenBalance || tokenBalance.availableTokens <= 0
                  ? "#94a3b8"
                  : "#0f172a",
              cursor:
                !tokenBalance || tokenBalance.availableTokens <= 0
                  ? "not-allowed"
                  : "text",
              resize: "vertical",
            }}
          />
          <button
            onClick={handleGenerateQuiz}
            disabled={
              !quizTopic.trim() ||
              isTyping ||
              !tokenBalance ||
              tokenBalance.availableTokens <= 0
            }
            style={{
              border: "none",
              borderRadius: 16,
              padding: "13px 16px",
              fontSize: 14,
              fontWeight: 700,
              color: "#fff",
              background:
                !quizTopic.trim() ||
                isTyping ||
                !tokenBalance ||
                tokenBalance.availableTokens <= 0
                  ? "#cbd5e1"
                  : primaryColor,
              cursor:
                !quizTopic.trim() ||
                isTyping ||
                !tokenBalance ||
                tokenBalance.availableTokens <= 0
                  ? "not-allowed"
                  : "pointer",
            }}
          >
            {isTyping ? "Generating..." : "Generate quiz"}
          </button>
        </div>
      ) : (
        <div style={{ display: "grid", gap: 14 }}>
          <div
            style={{
              padding: 16,
              borderRadius: 18,
              background: "#fff",
              border: "1px solid #e5e7eb",
            }}
          >
            <div style={{ fontSize: 18, fontWeight: 800, color: "#0f172a" }}>
              {quizData.title || `${quizTopic || "Practice"} Quiz`}
            </div>
            {quizData.description ? (
              <div style={{ marginTop: 6, fontSize: 13, color: "#475569" }}>
                {quizData.description}
              </div>
            ) : null}
            <div style={{ marginTop: 10, fontSize: 12, color: "#64748b" }}>
              Answered {answeredCount}/{quizData.questions.length}
            </div>
          </div>
          {quizData.questions.map((question, questionIndex) => (
            <div
              key={`${question.question}_${questionIndex}`}
              style={{
                padding: 16,
                borderRadius: 18,
                background: "#fff",
                border: "1px solid #e5e7eb",
              }}
            >
              <div style={{ fontSize: 14, fontWeight: 700, color: "#0f172a" }}>
                Q{questionIndex + 1}. {question.question}
              </div>
              <div style={{ display: "grid", gap: 10, marginTop: 12 }}>
                {question.options.map((option, optionIndex) => {
                  const selected =
                    selectedAnswers[questionIndex] === optionIndex;
                  const correct = question.correctAnswer === optionIndex;
                  const showCorrect = quizSubmitted && correct;
                  const showWrong = quizSubmitted && selected && !correct;
                  return (
                    <button
                      key={`${option}_${optionIndex}`}
                      onClick={() => {
                        if (quizSubmitted) return;
                        setSelectedAnswers((prev) => {
                          const next = [...prev];
                          next[questionIndex] = optionIndex;
                          return next;
                        });
                      }}
                      style={{
                        textAlign: "left",
                        borderRadius: 14,
                        border: `1px solid ${showCorrect ? "#16a34a" : showWrong ? "#dc2626" : selected ? primaryColor : "#dbe2ea"}`,
                        background: showCorrect
                          ? "#dcfce7"
                          : showWrong
                            ? "#fee2e2"
                            : selected
                              ? `${primaryColor}14`
                              : "#fff",
                        padding: "12px 14px",
                        cursor: quizSubmitted ? "default" : "pointer",
                      }}
                    >
                      {option}
                    </button>
                  );
                })}
              </div>
              {quizSubmitted && question.explanation ? (
                <div
                  style={{
                    marginTop: 12,
                    padding: 12,
                    borderRadius: 12,
                    background: "#f8fafc",
                    color: "#475569",
                    fontSize: 12.5,
                    lineHeight: 1.6,
                  }}
                >
                  {question.explanation}
                </div>
              ) : null}
            </div>
          ))}
          {!quizSubmitted ? (
            <button
              onClick={() => setQuizSubmitted(true)}
              disabled={answeredCount !== quizData.questions.length}
              style={{
                border: "none",
                borderRadius: 16,
                padding: "13px 16px",
                fontSize: 14,
                fontWeight: 700,
                color: "#fff",
                background:
                  answeredCount !== quizData.questions.length
                    ? "#cbd5e1"
                    : primaryColor,
                cursor:
                  answeredCount !== quizData.questions.length
                    ? "not-allowed"
                    : "pointer",
              }}
            >
              Submit answers
            </button>
          ) : (
            <div
              style={{
                display: "grid",
                gap: 12,
                padding: 16,
                borderRadius: 18,
                background: "#fff",
                border: "1px solid #e5e7eb",
              }}
            >
              <div style={{ fontSize: 18, fontWeight: 800, color: "#0f172a" }}>
                Score: {score}/{quizData.questions.length}
              </div>
              <div style={{ fontSize: 13, color: "#475569" }}>
                {score === quizData.questions.length
                  ? "Excellent work. You got every answer right."
                  : score >= Math.ceil(quizData.questions.length * 0.7)
                    ? "Nice job. Review the explanations and try one more round."
                    : "Good attempt. Review the explanations and use the FAQ tab for revision."}
              </div>
              <button
                onClick={() => {
                  setQuizData(null);
                  setSelectedAnswers([]);
                  setQuizSubmitted(false);
                  setQuizTopic("");
                  setQuizExam("");
                  setQuizContext("");
                  setQuizLevel("Intermediate");
                }}
                style={{
                  border: `1px solid ${primaryColor}`,
                  borderRadius: 14,
                  padding: "12px 14px",
                  fontSize: 13.5,
                  fontWeight: 700,
                  color: primaryColor,
                  background: "#fff",
                  cursor: "pointer",
                }}
              >
                Create another quiz
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );

  const renderFaqTab = () => (
    <div
      style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        background: "#fff",
      }}
    >
      <div style={{ padding: 14, borderBottom: "1px solid #e5e7eb" }}>
        <input
          value={faqSearch}
          onChange={(e) => setFaqSearch(e.target.value)}
          placeholder="Search FAQs"
          style={{
            width: "100%",
            borderRadius: 14,
            border: "1px solid #dbe2ea",
            padding: "12px 14px",
            fontSize: 14,
            outline: "none",
            background: "#fff",
          }}
        />
      </div>
      <div style={{ flex: 1, overflowY: "auto", padding: 14 }}>
        {filteredFAQ.length === 0 ? (
          <div
            style={{
              padding: 24,
              textAlign: "center",
              color: "#64748b",
              fontSize: 13,
            }}
          >
            {faqSearch
              ? "No FAQs match your search."
              : "No FAQs available yet. Use the chat tab to ask a question."}
          </div>
        ) : (
          filteredFAQ.map((faq, index) => {
            const isOpenFaq = openFaqIndex === index;
            return (
              <div
                key={`${faq.question}_${index}`}
                style={{
                  marginBottom: 10,
                  border: "1px solid #e5e7eb",
                  borderRadius: 16,
                  overflow: "hidden",
                }}
              >
                <button
                  onClick={() => setOpenFaqIndex(isOpenFaq ? null : index)}
                  style={{
                    width: "100%",
                    border: "none",
                    background: "#fff",
                    padding: "14px 16px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    textAlign: "left",
                    cursor: "pointer",
                  }}
                >
                  <div>
                    <div
                      style={{
                        fontSize: 13.5,
                        fontWeight: 700,
                        color: "#0f172a",
                      }}
                    >
                      {faq.question}
                    </div>
                    {faq.category ? (
                      <div
                        style={{
                          marginTop: 4,
                          fontSize: 11.5,
                          color: "#64748b",
                        }}
                      >
                        {faq.category}
                      </div>
                    ) : null}
                  </div>
                  <span style={{ color: "#94a3b8", fontSize: 16 }}>
                    {isOpenFaq ? "−" : "+"}
                  </span>
                </button>
                {isOpenFaq ? (
                  <div
                    style={{
                      padding: "0 16px 16px",
                      fontSize: 13,
                      color: "#475569",
                      lineHeight: 1.7,
                      background: "#f8fafc",
                    }}
                  >
                    {renderMultiline(faq.answer)}
                  </div>
                ) : null}
              </div>
            );
          })
        )}
      </div>
    </div>
  );

  const widget = (
    <div style={wrapperStyle}>
      <div style={{ height: "100%", display: "flex", flexDirection: "column" }}>
        {renderHeader()}
        {renderTabs()}
        <div
          style={{
            flex: 1,
            overflow: "hidden",
            display: "flex",
            flexDirection: "column",
          }}
        >
          {activeTab === "chat" ? renderChatTab() : null}
          {activeTab === "quiz" ? renderQuizTab() : null}
          {activeTab === "faq" ? renderFaqTab() : null}
        </div>
        {error ? (
          <div
            style={{
              padding: "0 14px 8px",
              color: "#dc2626",
              fontSize: 12,
              background: "#fff",
            }}
          >
            {error}
          </div>
        ) : null}
        <PoweredBy primaryColor={primaryColor} />
      </div>
    </div>
  );

  if (mode === "embed") {
    return isOpen ? (
      <div style={{ position: "fixed", inset: 0 }}>{widget}</div>
    ) : (
      <Bubble primaryColor={primaryColor} onOpen={() => setIsOpen(true)} />
    );
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        background:
          "linear-gradient(135deg, #eff6ff 0%, #f8fafc 55%, #eef2ff 100%)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
      }}
    >
      {widget}
    </div>
  );
}
