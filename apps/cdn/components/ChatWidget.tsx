"use client";

// apps/cdn/components/ChatWidget.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Self-contained chat widget rendered inside the CDN iframe.
// Supports two modes:
//   "embed"   → shows a floating toggle button; opened/closed via postMessage
//   "landing" → always open, full-page layout for the shareable link
//
// Features:
//   • 3 bottom tabs: Chat | Knowledge Base (FAQ) | Book Appointment
//   • Chat: AI conversation with full session history for memory
//   • FAQ: searchable accordion matching BotPenguin Knowledge Base UX
//   • Appointment: conversational Q→A flow → inline calendar → time slots
//   • Validates email format and 10-digit phone before accepting
//   • Restart button clears full state and restarts welcome message
//   • Disabled input while bot is typing or during date/time selection
//   • "How may I help you? 👋" bubble shown when widget is closed
//   • "Powered by RocketReplAI ⚡" footer on every screen
//   • Fully responsive: full screen on mobile, fixed size on desktop
// ─────────────────────────────────────────────────────────────────────────────

import React, { useState, useEffect, useRef, useCallback, memo } from "react";

// ─── ENV ──────────────────────────────────────────────────────────────────────

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL || "https://api.rocketreplai.com";
const API_KEY = process.env.NEXT_PUBLIC_API_KEY || "";

// ─── Types ────────────────────────────────────────────────────────────────────

type Tab = "chat" | "faq" | "appointment";
type MsgRole = "user" | "bot";

interface ChatMessage {
  id: string;
  role: MsgRole;
  content: string;
  timestamp: Date;
  tokensUsed?: number;
}

interface ConvMsg {
  role: "user" | "assistant";
  content: string;
}

interface FAQItem {
  id: string;
  question: string;
  answer: string;
  category?: string;
}

interface ApptQuestion {
  id: string;
  question: string;
  type: "text" | "email" | "tel" | "date" | "select" | "textarea";
  required: boolean;
  options?: string[];
}

interface BotConfig {
  name: string;
  welcomeMessage: string;
  primaryColor: string;
  logoUrl?: string | null;
  userId: string;
  chatbotType: string;
  filename?: string;
}

interface TokenBalance {
  availableTokens: number;
  freeTokensRemaining: number;
  purchasedTokensRemaining: number;
  totalTokensUsed: number;
}

// ─── Static data ──────────────────────────────────────────────────────────────

const DAYS_SHORT = ["S", "M", "T", "W", "T", "F", "S"];
const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];
const DAYS_FULL = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS_SHORT = MONTHS.map((m) => m.slice(0, 3));

// ─── Utilities ────────────────────────────────────────────────────────────────

function uid(): string {
  return `${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

function todayStr(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate(),
  ).padStart(2, "0")}`;
}

function formatDateDisplay(dateStr: string): string {
  if (!dateStr) return "dd/mm/yyyy";
  const d = new Date(dateStr + "T00:00:00");
  return `${DAYS_FULL[d.getDay()]} ${MONTHS_SHORT[d.getMonth()]} ${d.getDate()} ${d.getFullYear()}`;
}

function generateTimeSlots(dateStr: string): string[] {
  const d = new Date(dateStr + "T00:00:00");
  const day = d.getDay(); // 0=Sun,6=Sat
  const isWeekend = day === 0 || day === 6;
  const startH = isWeekend ? 10 : 9;
  const endH = isWeekend ? 15 : 17;
  const slots: string[] = [];
  for (let h = startH; h < endH; h++) {
    for (let m = 0; m < 60; m += 15) {
      const h12 = h % 12 === 0 ? 12 : h % 12;
      const ampm = h < 12 ? "AM" : "PM";
      slots.push(
        `${String(h12).padStart(2, "0")}:${String(m).padStart(2, "0")} ${ampm}`,
      );
    }
  }
  return slots;
}

function validateField(type: string, value: string): string | null {
  const v = value.trim();
  if (!v) return "This field is required.";
  if (type === "email") {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v))
      return "Err! The email is not valid.";
  }
  if (type === "tel") {
    const digits = v.replace(/[\s\-+()]/g, "");
    if (!/^\d{10}$/.test(digits))
      return "Err! Please enter a valid 10-digit phone number.";
  }
  return null;
}

function isMobileDevice(): boolean {
  return window.innerWidth <= 768;
}

// ─── CalendarPicker ───────────────────────────────────────────────────────────

const CalendarPicker = memo(function CalendarPicker({
  onSelect,
  selectedDate,
  primaryColor,
}: {
  onSelect: (dateStr: string) => void;
  selectedDate: string;
  primaryColor: string;
}) {
  const today = todayStr();
  const todayDate = new Date();
  const [viewYear, setViewYear] = useState(todayDate.getFullYear());
  const [viewMonth, setViewMonth] = useState(todayDate.getMonth());

  const firstDayOfMonth = new Date(viewYear, viewMonth, 1).getDay();
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();

  function prevMonth() {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear((y) => y - 1);
    } else {
      setViewMonth((m) => m - 1);
    }
  }

  function nextMonth() {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear((y) => y + 1);
    } else {
      setViewMonth((m) => m + 1);
    }
  }

  const cells: (number | null)[] = [];
  for (let i = 0; i < firstDayOfMonth; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  return (
    <div
      style={{
        background: "#fff",
        borderRadius: 16,
        border: "1px solid #e5e7eb",
        boxShadow: "0 4px 20px rgba(0,0,0,0.08)",
        padding: "12px 10px",
        marginTop: 8,
        marginLeft: 4,
        marginRight: 4,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 10,
          paddingLeft: 4,
          paddingRight: 4,
        }}
      >
        <button
          onClick={prevMonth}
          style={{
            width: 28,
            height: 28,
            borderRadius: "50%",
            border: "none",
            background: "transparent",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 18,
            color: "#6b7280",
            transition: "background 0.15s",
          }}
          onMouseEnter={(e) =>
            ((e.currentTarget as HTMLButtonElement).style.background =
              "#f3f4f6")
          }
          onMouseLeave={(e) =>
            ((e.currentTarget as HTMLButtonElement).style.background =
              "transparent")
          }
        >
          ‹
        </button>

        <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
          <span style={{ fontSize: 14, fontWeight: 700, color: "#1f2937" }}>
            {MONTHS[viewMonth]} {viewYear}
          </span>
          <span style={{ fontSize: 11, color: "#9ca3af" }}>▾</span>
        </div>

        <button
          onClick={nextMonth}
          style={{
            width: 28,
            height: 28,
            borderRadius: "50%",
            border: "none",
            background: "transparent",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 18,
            color: "#6b7280",
            transition: "background 0.15s",
          }}
          onMouseEnter={(e) =>
            ((e.currentTarget as HTMLButtonElement).style.background =
              "#f3f4f6")
          }
          onMouseLeave={(e) =>
            ((e.currentTarget as HTMLButtonElement).style.background =
              "transparent")
          }
        >
          ›
        </button>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(7, 1fr)",
          marginBottom: 4,
        }}
      >
        {DAYS_SHORT.map((d, i) => (
          <div
            key={i}
            style={{
              textAlign: "center",
              fontSize: 11,
              fontWeight: 600,
              color: "#9ca3af",
              paddingBottom: 2,
            }}
          >
            {d}
          </div>
        ))}
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(7, 1fr)",
          gap: 2,
        }}
      >
        {cells.map((day, i) => {
          if (!day) return <div key={i} />;

          const ds = `${viewYear}-${String(viewMonth + 1).padStart(2, "0")}-${String(
            day,
          ).padStart(2, "0")}`;
          const isToday = ds === today;
          const isSel = ds === selectedDate;
          const isPast = ds < today;

          return (
            <button
              key={i}
              disabled={isPast}
              onClick={() => !isPast && onSelect(ds)}
              style={{
                width: 32,
                height: 32,
                margin: "0 auto",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 12,
                fontWeight: isSel || isToday ? 700 : 400,
                borderRadius: "50%",
                border:
                  isToday && !isSel
                    ? `1.5px solid ${primaryColor}`
                    : "1.5px solid transparent",
                background: isSel ? primaryColor : "transparent",
                color: isPast
                  ? "#d1d5db"
                  : isSel
                    ? "#fff"
                    : isToday
                      ? primaryColor
                      : "#374151",
                cursor: isPast ? "not-allowed" : "pointer",
                transition: "background 0.15s",
              }}
              onMouseEnter={(e) => {
                if (!isPast && !isSel)
                  (e.currentTarget as HTMLButtonElement).style.background =
                    "#f3f4f6";
              }}
              onMouseLeave={(e) => {
                if (!isSel)
                  (e.currentTarget as HTMLButtonElement).style.background =
                    "transparent";
              }}
            >
              {day}
            </button>
          );
        })}
      </div>
    </div>
  );
});

// ─── TimeSlotsGrid ────────────────────────────────────────────────────────────

const TimeSlotsGrid = memo(function TimeSlotsGrid({
  slots,
  onSelect,
  selectedTime,
  primaryColor,
}: {
  slots: string[];
  onSelect: (t: string) => void;
  selectedTime: string;
  primaryColor: string;
}) {
  return (
    <div
      style={{
        background: "#fff",
        borderRadius: 16,
        border: "1px solid #e5e7eb",
        boxShadow: "0 4px 20px rgba(0,0,0,0.08)",
        padding: "12px 10px",
        marginTop: 8,
        marginLeft: 4,
        marginRight: 4,
      }}
    >
      <p
        style={{
          margin: "0 0 10px",
          fontSize: 12,
          fontWeight: 700,
          color: "#374151",
        }}
      >
        Choose a time slot:
      </p>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: 6,
          maxHeight: 200,
          overflowY: "auto",
        }}
      >
        {slots.map((slot) => {
          const isSel = slot === selectedTime;
          return (
            <button
              key={slot}
              onClick={() => onSelect(slot)}
              style={{
                padding: "7px 4px",
                fontSize: 11,
                fontWeight: 500,
                borderRadius: 8,
                border: `1.5px solid ${isSel ? primaryColor : "#bfdbfe"}`,
                background: isSel ? primaryColor : "transparent",
                color: isSel ? "#fff" : primaryColor,
                cursor: "pointer",
                transition: "all 0.15s",
              }}
            >
              {slot}
            </button>
          );
        })}
      </div>
    </div>
  );
});

// ─── ChatBubble (closed state) ────────────────────────────────────────────────

function ChatBubble({
  primaryColor,
  onOpen,
  showBubble,
}: {
  primaryColor: string;
  onOpen: () => void;
  showBubble: boolean;
}) {
  return (
    <div
      style={{
        position: "fixed",
        bottom: 0,
        right: 0,
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        alignItems: "flex-end",
        justifyContent: "flex-end",
        padding: "0 12px 12px 0",
        pointerEvents: "none",
      }}
    >
      {showBubble && (
        <div
          onClick={onOpen}
          style={{
            background: "#fff",
            color: "#1f2937",
            padding: "9px 14px",
            borderRadius: "16px 16px 4px 16px",
            fontSize: 13,
            fontWeight: 500,
            boxShadow: "0 4px 20px rgba(0,0,0,0.12)",
            border: "1px solid #e5e7eb",
            marginBottom: 10,
            whiteSpace: "nowrap",
            cursor: "pointer",
            pointerEvents: "all",
            animation: "bubbleFloat 3s ease-in-out infinite",
          }}
        >
          How may I help you? 👋
        </div>
      )}

      <button
        onClick={onOpen}
        aria-label="Open chat"
        style={{
          width: 60,
          height: 60,
          borderRadius: "50%",
          background: `linear-gradient(135deg, ${primaryColor} 0%, ${primaryColor}bb 100%)`,
          border: "none",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          boxShadow: `0 4px 20px ${primaryColor}55, 0 2px 8px rgba(0,0,0,0.15)`,
          pointerEvents: "all",
          animation: "pulseRing 2.5s infinite",
          transition: "transform 0.2s, box-shadow 0.2s",
          flexShrink: 0,
        }}
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLButtonElement).style.transform =
            "scale(1.08)";
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLButtonElement).style.transform = "scale(1)";
        }}
      >
        <svg width="28" height="28" viewBox="0 0 24 24" fill="white">
          <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z" />
        </svg>
      </button>
    </div>
  );
}

// ─── PoweredBy ────────────────────────────────────────────────────────────────

function PoweredBy({ primaryColor }: { primaryColor: string }) {
  return (
    <div
      style={{
        textAlign: "center",
        paddingBottom: 5,
      }}
    >
      <a
        href="https://rocketreplai.com"
        target="_blank"
        rel="noopener noreferrer"
        style={{
          fontSize: 11,
          color: "#9ca3af",
          textDecoration: "none",
          display: "inline-flex",
          alignItems: "center",
          gap: 3,
        }}
      >
        Chat{" "}
        <span style={{ color: primaryColor, fontWeight: 800, fontSize: 13 }}>
          ⚡
        </span>{" "}
        by{" "}
        <span style={{ fontWeight: 700, color: primaryColor }}>
          RocketReplAI
        </span>
      </a>
    </div>
  );
}

// ─── TypingIndicator ──────────────────────────────────────────────────────────

function TypingIndicator({ primaryColor }: { primaryColor: string }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "flex-end",
        gap: 6,
        animation: "fadeIn 0.2s ease",
      }}
    >
      <div
        style={{
          width: 28,
          height: 28,
          borderRadius: "50%",
          background: `linear-gradient(135deg, ${primaryColor}, ${primaryColor}bb)`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="white">
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
        </svg>
      </div>
      <div
        style={{
          padding: "10px 14px",
          background: "#fff",
          borderRadius: "18px 18px 18px 4px",
          boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
          border: "1px solid #e5e7eb",
          display: "flex",
          gap: 4,
          alignItems: "center",
        }}
      >
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            style={{
              width: 7,
              height: 7,
              borderRadius: "50%",
              background: "#9ca3af",
              display: "inline-block",
              animation: `typingDot 1.3s ${i * 0.2}s infinite`,
            }}
          />
        ))}
      </div>
    </div>
  );
}

// ─── MessageBubble ────────────────────────────────────────────────────────────

function MessageBubble({
  msg,
  primaryColor,
}: {
  msg: ChatMessage;
  primaryColor: string;
}) {
  const isUser = msg.role === "user";
  return (
    <div
      style={{
        display: "flex",
        justifyContent: isUser ? "flex-end" : "flex-start",
        alignItems: "flex-end",
        gap: 6,
        animation: "fadeIn 0.2s ease",
      }}
    >
      {!isUser && (
        <div
          style={{
            width: 28,
            height: 28,
            borderRadius: "50%",
            background: `linear-gradient(135deg, ${primaryColor}, ${primaryColor}bb)`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
            marginBottom: 2,
          }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="white">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
          </svg>
        </div>
      )}
      <div
        style={{
          maxWidth: "76%",
          padding: "10px 14px",
          borderRadius: isUser ? "18px 18px 4px 18px" : "18px 18px 18px 4px",
          background: isUser ? primaryColor : "#fff",
          color: isUser ? "#fff" : "#1f2937",
          fontSize: 13.5,
          lineHeight: 1.55,
          boxShadow: isUser
            ? `0 2px 8px ${primaryColor}44`
            : "0 1px 4px rgba(0,0,0,0.06)",
          whiteSpace: "pre-wrap",
          wordBreak: "break-word",
          border: isUser ? "none" : "1px solid #e5e7eb",
        }}
      >
        {msg.content}
      </div>
    </div>
  );
}

// ─── Main ChatWidget ──────────────────────────────────────────────────────────

export default function ChatWidget({
  userId,
  chatbotType,
  mode = "embed",
}: {
  userId: string;
  chatbotType: string;
  mode?: "embed" | "landing";
}) {
  // ── Core state ─────────────────────────────────────────────────────────────
  const [isOpen, setIsOpen] = useState(mode === "landing");
  const [showBubble, setShowBubble] = useState(true);
  const [tab, setTab] = useState<Tab>("chat");
  const [isMobile, setIsMobile] = useState(false);

  // ── Loading / config ───────────────────────────────────────────────────────
  const [isLoadingConfig, setIsLoadingConfig] = useState(true);
  const [config, setConfig] = useState<BotConfig | null>(null);

  // ── Chat messages + history for memory ────────────────────────────────────
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [convHistory, setConvHistory] = useState<ConvMsg[]>([]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);

  // ── Token management ──────────────────────────────────────────────────────
  const [tokenBalance, setTokenBalance] = useState<TokenBalance | null>(null);
  const [sessionId, setSessionId] = useState<string>("");
  const [visitorId, setVisitorId] = useState<string>("");

  // ── FAQ ────────────────────────────────────────────────────────────────────
  const [faqItems, setFaqItems] = useState<FAQItem[]>([]);
  const [faqSearch, setFaqSearch] = useState("");
  const [openFaqId, setOpenFaqId] = useState<string | null>(null);

  // ── Appointment ────────────────────────────────────────────────────────────
  const [apptQuestions, setApptQuestions] = useState<ApptQuestion[]>([]);
  const [apptStarted, setApptStarted] = useState(false);
  const [apptStep, setApptStep] = useState(0);
  const [apptData, setApptData] = useState<Record<string, string>>({});
  const [apptPhase, setApptPhase] = useState<
    "questions" | "date" | "time" | "done"
  >("questions");
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedTime, setSelectedTime] = useState("");
  const [timeSlots, setTimeSlots] = useState<string[]>([]);
  const [conversationSaved, setConversationSaved] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // ── Check mobile on mount and resize ──────────────────────────────────────
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(isMobileDevice());
    };
    checkMobile();
    window.addEventListener("resize", checkMobile);
    window.addEventListener("orientationchange", checkMobile);
    return () => {
      window.removeEventListener("resize", checkMobile);
      window.removeEventListener("orientationchange", checkMobile);
    };
  }, []);

  // ── Generate session ID and visitor ID ────────────────────────────────────
  useEffect(() => {
    const generateIds = () => {
      let session = localStorage.getItem(
        `chat_session_${userId}_${chatbotType}`,
      );
      if (!session) {
        session = uid();
        localStorage.setItem(`chat_session_${userId}_${chatbotType}`, session);
      }
      setSessionId(session);

      let visitor = localStorage.getItem("chat_visitor_id");
      if (!visitor) {
        visitor = uid();
        localStorage.setItem("chat_visitor_id", visitor);
      }
      setVisitorId(visitor);
    };

    generateIds();
  }, [userId, chatbotType]);

  // ── Init: fetch config + FAQ + appointment questions + token balance ──────
  useEffect(() => {
    if (!userId || !chatbotType || !sessionId) return;

    const init = async () => {
      try {
        const [cfgRes, faqRes, apptRes, tokenRes] = await Promise.allSettled([
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
          chatbotType === "chatbot-lead-generation"
            ? fetch(`${API_BASE}/api/embed/webappquestion`, {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  "x-api-key": API_KEY,
                },
                body: JSON.stringify({ userId, chatbotType }),
              })
            : Promise.resolve(null),
          fetch(
            `${API_BASE}/api/embed/token/balance?userId=${encodeURIComponent(userId)}`,
            {
              method: "GET",
              headers: {
                "Content-Type": "application/json",
                "x-api-key": API_KEY,
              },
            },
          ),
        ]);

        if (cfgRes.status === "fulfilled" && cfgRes.value.ok) {
          const d = await cfgRes.value.json();
          if (d.success && d.data) setConfig(d.data);
        }

        if (faqRes.status === "fulfilled" && faqRes.value.ok) {
          const d = await faqRes.value.json();
          if (d.success) {
            setFaqItems(d.data?.questions || d.faq?.questions || []);
          }
        }

        if (apptRes.status === "fulfilled" && apptRes.value) {
          const r = apptRes.value as Response;
          if (r.ok) {
            const d = await r.json();
            if (d.success) {
              setApptQuestions(
                d.data?.appointmentQuestions?.questions ||
                  d.data?.questions ||
                  [],
              );
            }
          }
        }

        if (tokenRes.status === "fulfilled" && tokenRes.value.ok) {
          const d = await tokenRes.value.json();
          if (d.success && d.data) {
            setTokenBalance(d.data);
          }
        }
      } catch (err) {
        console.error("[RocketReplAI] init error:", err);
      } finally {
        setIsLoadingConfig(false);
      }
    };

    init();
  }, [userId, chatbotType, sessionId]);

  // ── Add welcome message once config loads ─────────────────────────────────
  useEffect(() => {
    if (config && messages.length === 0) {
      addBotMsg(config.welcomeMessage || "Hi! How can I help you today?");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [config]);

  // ── Auto-scroll ────────────────────────────────────────────────────────────
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping, apptPhase, tab]);

  // ── postMessage bridge (embed mode) ───────────────────────────────────────
  useEffect(() => {
    if (mode !== "embed") return;

    const handler = (e: MessageEvent) => {
      if (!e.data || e.data.source !== "rocketreplai-parent") return;
      if (e.data.type === "open") handleOpen();
      if (e.data.type === "close") handleClose();
    };

    window.addEventListener("message", handler);
    window.parent.postMessage({ source: "rocketreplai", type: "ready" }, "*");

    return () => window.removeEventListener("message", handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode]);

  // ─── Message helpers ───────────────────────────────────────────────────────

  function addBotMsg(content: string): ChatMessage {
    const msg: ChatMessage = {
      id: uid(),
      role: "bot",
      content,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, msg]);
    return msg;
  }

  function addUserMsg(content: string): ChatMessage {
    const msg: ChatMessage = {
      id: uid(),
      role: "user",
      content,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, msg]);
    return msg;
  }

  // ─── Save conversation ────────────────────────────────────────────────────

  const saveConversation = useCallback(async () => {
    if (!config || messages.length === 0 || conversationSaved || apptStarted)
      return;

    try {
      await fetch(`${API_BASE}/api/embed/chat-conversation`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": API_KEY,
        },
        body: JSON.stringify({
          chatbotType: config.chatbotType,
          userId: config.userId,
          sessionId,
          visitorId,
          messages: messages.map((m) => ({
            id: m.id,
            role: m.role,
            content: m.content,
            timestamp: m.timestamp,
            tokensUsed: m.tokensUsed,
          })),
          totalTokensUsed: messages.reduce(
            (sum, m) => sum + (m.tokensUsed || 0),
            0,
          ),
          hasAppointment: conversationSaved,
          status: "active",
        }),
      });
    } catch (error) {
      console.error("[RocketReplAI] save conversation error:", error);
    }
  }, [config, messages, sessionId, visitorId, conversationSaved, apptStarted]);

  // ─── Auto-save conversation when messages change ─────────────────────────
  useEffect(() => {
    if (messages.length > 1 && !apptStarted) {
      // Save after first exchange
      const timeoutId = setTimeout(saveConversation, 2000); // Debounce saves
      return () => clearTimeout(timeoutId);
    }
  }, [messages, saveConversation, apptStarted]);

  // ─── Open / close ──────────────────────────────────────────────────────────

  const handleOpen = useCallback(() => {
    setIsOpen(true);
    setShowBubble(false);
    if (mode === "embed") {
      window.parent.postMessage({ source: "rocketreplai", type: "open" }, "*");
    }
    setTimeout(() => inputRef.current?.focus(), 350);
  }, [mode]);

  const handleClose = useCallback(() => {
    setIsOpen(false);
    setShowBubble(true);
    if (mode === "embed") {
      window.parent.postMessage({ source: "rocketreplai", type: "close" }, "*");
    }
  }, [mode]);

  // ─── Restart ───────────────────────────────────────────────────────────────

  const restartChat = useCallback(() => {
    setMessages([]);
    setConvHistory([]);
    setInput("");
    setApptStarted(false);
    setApptStep(0);
    setApptData({});
    setApptPhase("questions");
    setSelectedDate("");
    setSelectedTime("");
    setTimeSlots([]);
    setConversationSaved(false);
    setTab("chat");
    if (config) {
      setTimeout(
        () =>
          addBotMsg(config.welcomeMessage || "Hi! How can I help you today?"),
        80,
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [config]);

  // ─── Send chat message ─────────────────────────────────────────────────────

  const sendMessage = useCallback(async () => {
    const text = input.trim();
    if (!text || isTyping || !config) return;

    // Check token balance before sending
    if (tokenBalance && tokenBalance.availableTokens <= 0) {
      addBotMsg(
        "I'm sorry, but you've run out of tokens. Please contact the website owner to purchase more tokens or tell them to add tokens to continue chatting.",
      );
      return;
    }

    setInput("");
    addUserMsg(text);

    if (
      tab === "appointment" &&
      apptStarted &&
      apptPhase === "questions" &&
      apptQuestions.length > 0
    ) {
      await handleApptTextAnswer(text);
      return;
    }

    const newHistory: ConvMsg[] = [
      ...convHistory,
      { role: "user", content: text },
    ];
    setConvHistory(newHistory);
    setIsTyping(true);

    try {
      const res = await fetch(`${API_BASE}/api/embed/chatbot`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": API_KEY,
        },
        body: JSON.stringify({
          userInput: text,
          userId: config.userId,
          agentId: config.chatbotType,
          fileData: config.filename || "",
          conversationHistory: newHistory.slice(0, -1),
          sessionId,
          visitorId,
        }),
      });

      if (res.status === 402) {
        addBotMsg(
          "I'm unable to process your request due to insufficient tokens. Please contact the website owner to purchase more tokens.",
        );
        setIsTyping(false);
        return;
      }

      const data = await res.json();
      const reply =
        data?.data?.response ||
        data?.response ||
        "Sorry, I couldn't process that. Please try again.";

      // Update token balance
      if (data?.data) {
        setTokenBalance({
          availableTokens:
            data.data.remainingTokens || data.data.availableTokens || 0,
          freeTokensRemaining: data.data.freeTokensRemaining || 0,
          purchasedTokensRemaining: data.data.purchasedTokensRemaining || 0,
          totalTokensUsed: data.data.totalTokensUsed || 0,
        });
      }

      setConvHistory((prev) => [
        ...prev,
        { role: "assistant", content: reply },
      ]);
      addBotMsg(reply);
    } catch {
      addBotMsg(
        "I'm having trouble connecting right now. Please try again shortly.",
      );
    } finally {
      setIsTyping(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    input,
    isTyping,
    config,
    tab,
    apptStarted,
    apptPhase,
    apptQuestions,
    convHistory,
    sessionId,
    visitorId,
    tokenBalance,
  ]);

  // ─── Appointment: handle a text answer from the user ──────────────────────

  const handleApptTextAnswer = useCallback(
    async (answer: string) => {
      const currentQ = apptQuestions[apptStep];
      if (!currentQ) return;

      const err = currentQ.required
        ? validateField(currentQ.type, answer)
        : null;
      if (err) {
        setIsTyping(true);
        setTimeout(() => {
          setIsTyping(false);
          addBotMsg(err);
          setTimeout(() => {
            addBotMsg(currentQ.question + (currentQ.required ? " ✦" : ""));
          }, 600);
        }, 600);
        return;
      }

      const updatedData = { ...apptData, [currentQ.id]: answer };
      setApptData(updatedData);

      const nextStep = apptStep + 1;

      if (nextStep < apptQuestions.length) {
        const nextQ = apptQuestions[nextStep];
        setApptStep(nextStep);

        if (nextQ.type === "date") {
          setApptPhase("date");
          setTimeout(
            () =>
              addBotMsg(
                "Got it! 📅 When would you like to schedule your appointment? Please select a date and time.",
              ),
            400,
          );
        } else {
          setTimeout(
            () => addBotMsg(nextQ.question + (nextQ.required ? " ✦" : "")),
            400,
          );
        }
      } else {
        setApptPhase("date");
        setTimeout(
          () =>
            addBotMsg(
              "Got it! 📅 When would you like to schedule your appointment? Please select a date and time.",
            ),
          400,
        );
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [apptQuestions, apptStep, apptData],
  );

  // ─── Appointment: user picks a date ───────────────────────────────────────

  const handleDateSelect = useCallback(
    (dateStr: string) => {
      setSelectedDate(dateStr);
      addUserMsg(formatDateDisplay(dateStr));
      const slots = generateTimeSlots(dateStr);
      setTimeSlots(slots);
      setApptPhase("time");
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  // ─── Appointment: user picks a time slot ──────────────────────────────────

  const handleTimeSelect = useCallback(
    async (time: string) => {
      setSelectedTime(time);
      const formattedDT = `${formatDateDisplay(selectedDate)} ${time}`;
      addUserMsg(formattedDT);
      setIsTyping(true);
      setApptPhase("done");

      try {
        const formData = apptQuestions.map((q) => ({
          question: q.question,
          answer: apptData[q.id] || "",
        }));
        formData.push({
          question: "Preferred Date & Time",
          answer: formattedDT,
        });

        let customerName = "Anonymous";
        let customerEmail = "";

        apptQuestions.forEach((q, idx) => {
          const ans = apptData[q.id] || "";
          if (idx === 0 && ans) customerName = ans;
          if (q.type === "email" && ans) customerEmail = ans;
        });

        await fetch(`${API_BASE}/api/embed/chat-conversation`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-api-key": API_KEY,
          },
          body: JSON.stringify({
            chatbotType: config?.chatbotType || chatbotType,
            userId: config?.userId || userId,
            sessionId,
            visitorId,
            customerName,
            customerEmail,
            messages: messages.map((m) => ({
              id: m.id,
              role: m.role,
              content: m.content,
              timestamp: m.timestamp,
            })),
            totalTokensUsed: messages.reduce(
              (sum, m) => sum + (m.tokensUsed || 0),
              0,
            ),
            hasAppointment: true,
            status: "completed",
          }),
        });

        setConversationSaved(true);
      } catch (err) {
        console.error("[RocketReplAI] save conversation error:", err);
      }

      setTimeout(() => {
        setIsTyping(false);
        addBotMsg(
          "Thanks a lot for providing your details! 🎉\nEverything is set, and you'll receive a confirmation soon. Have a fantastic day! Keep smiling 😁 🌟 👋",
        );
      }, 1200);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [selectedDate, apptQuestions, apptData, messages, chatbotType, userId],
  );

  // ─── Start appointment flow ────────────────────────────────────────────────

  const startApptFlow = useCallback(() => {
    if (apptStarted) return;
    setApptStarted(true);
    setApptStep(0);
    setApptPhase("questions");

    setTimeout(() => {
      addBotMsg(
        "I'd love to help you book an appointment! Let me gather some details. 📋",
      );
      setTimeout(() => {
        if (apptQuestions.length > 0) {
          const q = apptQuestions[0];
          if (q.type === "date") {
            setApptPhase("date");
            addBotMsg(
              "Got it! 📅 When would you like to schedule your appointment? Please select a date and time.",
            );
          } else {
            addBotMsg(q.question + (q.required ? " ✦" : ""));
          }
        } else {
          setApptPhase("date");
          addBotMsg(
            "Got it! 📅 When would you like to schedule your appointment? Please select a date and time.",
          );
        }
      }, 900);
    }, 300);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [apptStarted, apptQuestions]);

  // ─── Tab switch ────────────────────────────────────────────────────────────

  const handleTabChange = useCallback(
    (newTab: Tab) => {
      setTab(newTab);
      if (newTab === "appointment" && !apptStarted) {
        startApptFlow();
      }
    },
    [apptStarted, startApptFlow],
  );

  // ─── Keyboard handler ──────────────────────────────────────────────────────

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  // ─── Derived values ────────────────────────────────────────────────────────

  const pc = config?.primaryColor || "#1a56db";

  const isInputDisabled =
    isTyping ||
    !config ||
    apptPhase === "date" ||
    apptPhase === "time" ||
    apptPhase === "done";

  const inputPlaceholder =
    apptPhase === "date"
      ? "Select a date above ↑"
      : apptPhase === "time"
        ? "Select a time above ↑"
        : apptPhase === "done"
          ? "Appointment booked ✓"
          : isTyping
            ? "Bot is typing…"
            : tab === "appointment" && apptStarted
              ? "Type your answer…"
              : "Type your message…";

  const filteredFAQ = faqItems.filter(
    (f) =>
      !faqSearch ||
      f.question.toLowerCase().includes(faqSearch.toLowerCase()) ||
      f.answer.toLowerCase().includes(faqSearch.toLowerCase()),
  );

  // ─── Loading state ─────────────────────────────────────────────────────────

  if (isLoadingConfig) {
    if (mode === "embed") {
      return (
        <div
          style={{
            position: "fixed",
            inset: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "#fff",
            borderRadius: 16,
          }}
        >
          <div
            style={{
              width: 28,
              height: 28,
              border: `3px solid ${pc}`,
              borderTopColor: "transparent",
              borderRadius: "50%",
              animation: "spin 0.8s linear infinite",
            }}
          />
        </div>
      );
    }
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background:
            "linear-gradient(135deg, #eff6ff 0%, #f5f3ff 50%, #fce7f3 100%)",
        }}
      >
        <div
          style={{
            width: 36,
            height: 36,
            border: `3px solid ${pc}`,
            borderTopColor: "transparent",
            borderRadius: "50%",
            animation: "spin 0.8s linear infinite",
          }}
        />
      </div>
    );
  }

  // ─── Embed closed state ────────────────────────────────────────────────────

  if (mode === "embed" && !isOpen) {
    return (
      <ChatBubble
        primaryColor={pc}
        onOpen={handleOpen}
        showBubble={showBubble}
      />
    );
  }

  // ─── Responsive chat window styles ─────────────────────────────────────────

  const chatWindowStyles: React.CSSProperties = {
    display: "flex",
    flexDirection: "column",
    width: "100%",
    height: "100%",
    background: "#fff",
    borderRadius: mode === "embed" && !isMobile ? 20 : 0,
    overflow: "hidden",
    fontFamily:
      "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    animation:
      mode === "embed" && !isMobile
        ? "scaleIn 0.25s cubic-bezier(0.4,0,0.2,1)"
        : undefined,
  };

  // ─── The chat window ───────────────────────────────────────────────────────

  const chatWindow = (
    <div style={chatWindowStyles}>
      {/* ════ HEADER ════ */}
      <div
        style={{
          background: `linear-gradient(135deg, ${pc} 0%, ${pc}bb 100%)`,
          padding: isMobile ? "16px 15px" : "13px 15px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexShrink: 0,
          boxShadow: "0 2px 12px rgba(0,0,0,0.1)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {config?.logoUrl ? (
            <img
              src={config.logoUrl}
              alt=""
              style={{
                width: 40,
                height: 40,
                borderRadius: "50%",
                objectFit: "cover",
                border: "2px solid rgba(255,255,255,0.4)",
              }}
            />
          ) : (
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: "50%",
                background: "rgba(255,255,255,0.25)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                border: "2px solid rgba(255,255,255,0.4)",
                flexShrink: 0,
              }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="white">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
              </svg>
            </div>
          )}
          <div>
            <div
              style={{
                fontWeight: 700,
                fontSize: isMobile ? 16 : 15,
                color: "#fff",
                lineHeight: 1.2,
              }}
            >
              {config?.name || "Chat Support"}
            </div>
            <div
              style={{
                fontSize: 11,
                color: "rgba(255,255,255,0.8)",
                marginTop: 2,
                display: "flex",
                alignItems: "center",
                gap: 4,
              }}
            >
              <span>🕐</span>
              <span>Usual reply time: 2 to 3 Minutes</span>
            </div>
          </div>
        </div>

        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
          <button
            onClick={restartChat}
            title="Restart conversation"
            style={{
              background: "rgba(255,255,255,0.2)",
              border: "none",
              borderRadius: "50%",
              width: 30,
              height: 30,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              transition: "background 0.15s",
            }}
            onMouseEnter={(e) =>
              ((e.currentTarget as HTMLButtonElement).style.background =
                "rgba(255,255,255,0.35)")
            }
            onMouseLeave={(e) =>
              ((e.currentTarget as HTMLButtonElement).style.background =
                "rgba(255,255,255,0.2)")
            }
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="white">
              <path d="M17.65 6.35C16.2 4.9 14.21 4 12 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08c-.82 2.33-3.04 4-5.65 4-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z" />
            </svg>
          </button>

          {mode === "embed" && (
            <button
              onClick={handleClose}
              title="Close chat"
              style={{
                background: "rgba(255,255,255,0.2)",
                border: "none",
                borderRadius: "50%",
                width: 30,
                height: 30,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                transition: "background 0.15s",
              }}
              onMouseEnter={(e) =>
                ((e.currentTarget as HTMLButtonElement).style.background =
                  "rgba(255,255,255,0.35)")
              }
              onMouseLeave={(e) =>
                ((e.currentTarget as HTMLButtonElement).style.background =
                  "rgba(255,255,255,0.2)")
              }
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="white">
                <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* ════ BODY ════ */}
      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
      >
        {(tab === "chat" || tab === "appointment") && (
          <div
            style={{
              flex: 1,
              overflowY: "auto",
              padding: isMobile ? "16px 12px 8px" : "14px 12px 8px",
              background: "#f9fafb",
              display: "flex",
              flexDirection: "column",
              gap: 10,
            }}
          >
            {messages.map((msg) => (
              <MessageBubble key={msg.id} msg={msg} primaryColor={pc} />
            ))}

            {isTyping && <TypingIndicator primaryColor={pc} />}

            {tab === "appointment" && apptPhase === "date" && (
              <div style={{ animation: "fadeIn 0.3s ease" }}>
                <CalendarPicker
                  onSelect={handleDateSelect}
                  selectedDate={selectedDate}
                  primaryColor={pc}
                />
              </div>
            )}

            {tab === "appointment" &&
              apptPhase === "time" &&
              timeSlots.length > 0 && (
                <div style={{ animation: "fadeIn 0.3s ease" }}>
                  <TimeSlotsGrid
                    slots={timeSlots}
                    onSelect={handleTimeSelect}
                    selectedTime={selectedTime}
                    primaryColor={pc}
                  />
                </div>
              )}

            <div ref={messagesEndRef} />
          </div>
        )}

        {tab === "faq" && (
          <div
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              overflow: "hidden",
              background: "#fff",
            }}
          >
            <div
              style={{
                padding: "12px 14px",
                borderBottom: "1px solid #f3f4f6",
                background: "#fafafa",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  background: "#fff",
                  border: "1px solid #e5e7eb",
                  borderRadius: 10,
                  padding: "8px 12px",
                }}
              >
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="#9ca3af"
                  style={{ flexShrink: 0 }}
                >
                  <path d="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z" />
                </svg>
                <input
                  type="text"
                  placeholder="Search categories"
                  value={faqSearch}
                  onChange={(e) => setFaqSearch(e.target.value)}
                  style={{
                    flex: 1,
                    border: "none",
                    outline: "none",
                    fontSize: 13,
                    background: "transparent",
                    color: "#374151",
                  }}
                />
              </div>
            </div>

            {!faqSearch && (
              <div
                style={{
                  padding: "10px 16px 6px",
                  fontSize: 15,
                  fontWeight: 700,
                  color: "#1f2937",
                  borderBottom: "1px solid #f3f4f6",
                }}
              >
                Categories
              </div>
            )}

            <div style={{ flex: 1, overflowY: "auto", padding: "8px 12px" }}>
              {filteredFAQ.length === 0 ? (
                <div
                  style={{
                    textAlign: "center",
                    padding: "40px 20px",
                    color: "#9ca3af",
                    fontSize: 13,
                  }}
                >
                  {faqSearch
                    ? "No results found."
                    : "No FAQ articles yet. Ask us anything in the Chat tab!"}
                </div>
              ) : (
                filteredFAQ.map((faq) => {
                  const isExp = openFaqId === faq.id;
                  return (
                    <div
                      key={faq.id}
                      style={{
                        marginBottom: 6,
                        animation: "fadeIn 0.2s ease",
                      }}
                    >
                      <button
                        onClick={() => setOpenFaqId(isExp ? null : faq.id)}
                        style={{
                          width: "100%",
                          display: "flex",
                          alignItems: "center",
                          gap: 10,
                          padding: "12px 14px",
                          background: "#fff",
                          border: "1px solid #e5e7eb",
                          borderRadius: isExp ? "10px 10px 0 0" : 10,
                          cursor: "pointer",
                          textAlign: "left",
                          transition: "background 0.15s",
                        }}
                        onMouseEnter={(e) =>
                          ((
                            e.currentTarget as HTMLButtonElement
                          ).style.background = "#f9fafb")
                        }
                        onMouseLeave={(e) =>
                          ((
                            e.currentTarget as HTMLButtonElement
                          ).style.background = "#fff")
                        }
                      >
                        <div
                          style={{
                            width: 34,
                            height: 34,
                            borderRadius: 8,
                            background: `${pc}18`,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            flexShrink: 0,
                          }}
                        >
                          <svg
                            width="17"
                            height="17"
                            viewBox="0 0 24 24"
                            fill={pc}
                          >
                            <path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z" />
                          </svg>
                        </div>

                        <div style={{ flex: 1 }}>
                          <div
                            style={{
                              fontSize: 13.5,
                              fontWeight: 600,
                              color: "#1f2937",
                            }}
                          >
                            {faq.question}
                          </div>
                          {faq.category && (
                            <div
                              style={{
                                fontSize: 11,
                                color: "#9ca3af",
                                marginTop: 1,
                              }}
                            >
                              {faq.category}
                            </div>
                          )}
                        </div>

                        <svg
                          width="14"
                          height="14"
                          viewBox="0 0 24 24"
                          fill="#9ca3af"
                          style={{
                            transform: isExp ? "rotate(90deg)" : "rotate(0deg)",
                            transition: "transform 0.2s",
                            flexShrink: 0,
                          }}
                        >
                          <path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z" />
                        </svg>
                      </button>

                      {isExp && (
                        <div
                          style={{
                            padding: "12px 16px",
                            background: "#f9fafb",
                            border: "1px solid #e5e7eb",
                            borderTop: "none",
                            borderRadius: "0 0 10px 10px",
                            fontSize: 13,
                            color: "#374151",
                            lineHeight: 1.65,
                            animation: "slideUp 0.2s ease",
                          }}
                        >
                          {faq.answer}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}
      </div>

      {/* ════ INPUT AREA ════ */}
      <div
        style={{
          borderTop: "1px solid #e5e7eb",
          background: "#fff",
          flexShrink: 0,
        }}
      >
        <div
          style={{
            padding: isMobile ? "10px 10px 4px" : "8px 10px 4px",
            display: "flex",
            alignItems: "center",
            gap: 6,
          }}
        >
          {tab === "appointment" &&
          (apptPhase === "date" || apptPhase === "time") ? (
            <div
              style={{
                flex: 1,
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: "8px 12px",
                border: "1px solid #e5e7eb",
                borderRadius: 12,
                background: "#f9fafb",
                fontSize: 13,
                color: "#6b7280",
              }}
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill={pc}
                style={{ flexShrink: 0 }}
              >
                <path d="M17 12h-5v5h5v-5zM16 1v2H8V1H6v2H5c-1.11 0-1.99.9-1.99 2L3 19c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2h-1V1h-2zm3 18H5V8h14v11z" />
              </svg>
              <span style={{ fontSize: 12, color: pc, fontWeight: 700 }}>
                Select Date
              </span>
              <span style={{ color: "#d1d5db" }}>|</span>
              <span style={{ flex: 1, fontSize: 12 }}>
                {selectedDate
                  ? `${formatDateDisplay(selectedDate)}${
                      selectedTime ? " " + selectedTime : ""
                    }`
                  : "dd/mm/yyyy"}
              </span>
            </div>
          ) : (
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={onKeyDown}
              placeholder={inputPlaceholder}
              disabled={isInputDisabled}
              style={{
                flex: 1,
                padding: isMobile ? "11px 13px" : "9px 13px",
                border: "1px solid #e5e7eb",
                borderRadius: 12,
                fontSize: 13.5,
                outline: "none",
                color: "#1f2937",
                background: isInputDisabled ? "#f9fafb" : "#fff",
                transition: "border-color 0.15s",
              }}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = pc;
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = "#e5e7eb";
              }}
            />
          )}

          {(tab === "chat" ||
            (tab === "appointment" && apptPhase === "questions")) && (
            <button
              onClick={sendMessage}
              disabled={isInputDisabled || !input.trim()}
              aria-label="Send message"
              style={{
                width: isMobile ? 44 : 36,
                height: isMobile ? 44 : 36,
                borderRadius: "50%",
                background: isInputDisabled || !input.trim() ? "#e5e7eb" : pc,
                border: "none",
                cursor:
                  isInputDisabled || !input.trim() ? "not-allowed" : "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
                transition: "background 0.2s, transform 0.1s",
              }}
              onMouseEnter={(e) => {
                if (!isInputDisabled && input.trim())
                  (e.currentTarget as HTMLButtonElement).style.transform =
                    "scale(1.08)";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLButtonElement).style.transform =
                  "scale(1)";
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="white">
                <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
              </svg>
            </button>
          )}
        </div>

        {/* Token Display */}
        {tokenBalance && (
          <div
            style={{
              padding: "4px 16px",
              textAlign: "center",
              fontSize: 11,
              color:
                tokenBalance.availableTokens <= 100 ? "#dc2626" : "#6b7280",
              borderTop: "1px solid #f3f4f6",
            }}
          >
            {tokenBalance.availableTokens <= 100 ? (
              <>
                <span style={{ color: "#dc2626", fontWeight: 600 }}>
                  ⚠️ {tokenBalance.availableTokens} tokens left
                </span>
                {tokenBalance.availableTokens === 0 && (
                  <div style={{ marginTop: 4 }}>
                    <a
                      href="#"
                      onClick={(e) => {
                        e.preventDefault();
                        alert(
                          "Please contact the website owner to purchase more tokens.",
                        );
                      }}
                      style={{
                        color: pc,
                        textDecoration: "underline",
                        fontWeight: 600,
                      }}
                    >
                      Contact owner to purchase tokens →
                    </a>
                  </div>
                )}
              </>
            ) : (
              `${tokenBalance.availableTokens} tokens available`
            )}
          </div>
        )}

        <PoweredBy primaryColor={pc} />
      </div>

      {/* ════ BOTTOM TABS ════ */}
      <div
        style={{
          display: "flex",
          borderTop: "1px solid #f3f4f6",
          background: "#fff",
          flexShrink: 0,
        }}
      >
        {(
          [
            {
              key: "chat" as Tab,
              label: "Chat",
              icon: (
                <svg
                  width={isMobile ? 21 : 19}
                  height={isMobile ? 21 : 19}
                  viewBox="0 0 24 24"
                  fill="currentColor"
                >
                  <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z" />
                </svg>
              ),
            },
            {
              key: "faq" as Tab,
              label: "Knowledge Base",
              icon: (
                <svg
                  width={isMobile ? 21 : 19}
                  height={isMobile ? 21 : 19}
                  viewBox="0 0 24 24"
                  fill="currentColor"
                >
                  <path d="M18 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-2 14H8v-2h8v2zm0-4H8v-2h8v2zm0-4H8V6h8v2z" />
                </svg>
              ),
            },
            {
              key: "appointment" as Tab,
              label: "Appointment",
              icon: (
                <svg
                  width={isMobile ? 21 : 19}
                  height={isMobile ? 21 : 19}
                  viewBox="0 0 24 24"
                  fill="currentColor"
                >
                  <path d="M17 12h-5v5h5v-5zM16 1v2H8V1H6v2H5c-1.11 0-1.99.9-1.99 2L3 19c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2h-1V1h-2zm3 18H5V8h14v11z" />
                </svg>
              ),
            },
          ] as { key: Tab; label: string; icon: React.ReactNode }[]
        ).map(({ key, label, icon }) => {
          const active = tab === key;
          return (
            <button
              key={key}
              onClick={() => handleTabChange(key)}
              style={{
                flex: 1,
                padding: isMobile ? "12px 4px 9px" : "9px 4px 7px",
                border: "none",
                borderTop: active
                  ? `2.5px solid ${pc}`
                  : "2.5px solid transparent",
                background: "transparent",
                cursor: "pointer",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 3,
                color: active ? pc : "#9ca3af",
                fontSize: isMobile ? 11 : 10,
                fontWeight: active ? 700 : 400,
                transition: "color 0.15s, border-color 0.15s",
              }}
            >
              {icon}
              {label}
            </button>
          );
        })}
      </div>
    </div>
  );

  // ─── Render ────────────────────────────────────────────────────────────────

  if (mode === "embed") {
    // For embed mode on mobile, full screen; on desktop, fixed size
    if (isMobile) {
      return <div style={{ position: "fixed", inset: 0 }}>{chatWindow}</div>;
    }
    return <div style={{ position: "fixed", inset: 0 }}>{chatWindow}</div>;
  }

  // Landing page mode — responsive centered card
  return (
    <div
      style={{
        minHeight: "100vh",
        background:
          "linear-gradient(135deg, #eff6ff 0%, #f5f3ff 50%, #fce7f3 100%)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: isMobile ? 0 : 16,
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: isMobile ? "100%" : 480,
          height: isMobile ? "100vh" : "min(700px, 92vh)",
          borderRadius: isMobile ? 0 : 24,
          overflow: "hidden",
          boxShadow: isMobile ? "none" : "0 25px 70px rgba(0,0,0,0.14)",
        }}
      >
        {chatWindow}
      </div>
    </div>
  );
}
