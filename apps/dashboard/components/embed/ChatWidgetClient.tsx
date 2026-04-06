"use client";
// apps/dashboard/components/embed/ChatWidgetClient.tsx
// The full chat UI that renders inside the customer's iframe.
// Uses your EXISTING /api/embed/chatbot endpoint — no new API needed.

import { useState, useEffect, useRef, useCallback } from "react";

const API_BASE = process.env.NEXT_PUBLIC_API_URL!;
const PARENT_ORIGIN = "*"; // We don't know the customer's domain

interface Message {
  id: string;
  role: "user" | "bot";
  text: string;
}

interface Config {
  name: string;
  welcomeMessage: string;
  primaryColor: string;
  logoUrl?: string;
  userId: string;
  chatbotType: string;
  filename?: string;
}

export default function ChatWidgetClient({
  chatbotId,
  originUrl,
}: {
  chatbotId: string;
  originUrl: string;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [config, setConfig] = useState<Config | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // ── Load public config from your existing embed API ────────────────────────
  // Uses: GET /api/embed/chatbot/config/:chatbotId
  // (add this endpoint — see Express section below)
  useEffect(() => {
    fetch(`${API_BASE}/api/embed/config/${encodeURIComponent(chatbotId)}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.success && data.data) {
          setConfig(data.data);
          setMessages([
            {
              id: "welcome",
              role: "bot",
              text: data.data.welcomeMessage || "Hi! How can I help you today?",
            },
          ]);
        } else {
          setError("Chatbot not found or inactive.");
        }
      })
      .catch(() => setError("Failed to load chatbot."));
  }, [chatbotId]);

  // ── Tell parent we're ready ────────────────────────────────────────────────
  useEffect(() => {
    window.parent.postMessage(
      { source: "rocketreplai-widget", type: "ready" },
      PARENT_ORIGIN,
    );
  }, []);

  // ── Listen for messages from parent ───────────────────────────────────────
  useEffect(() => {
    const handler = (event: MessageEvent) => {
      if (!event.data || event.data.source !== "rocketreplai-parent") return;
      if (event.data.type === "open") openWidget();
      if (event.data.type === "close") closeWidget();
    };
    window.addEventListener("message", handler);
    return () => window.removeEventListener("message", handler);
  }, []);

  // ── Auto scroll ────────────────────────────────────────────────────────────
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  const openWidget = useCallback(() => {
    setIsOpen(true);
    window.parent.postMessage(
      { source: "rocketreplai-widget", type: "open" },
      PARENT_ORIGIN,
    );
    setTimeout(() => inputRef.current?.focus(), 300);
  }, []);

  const closeWidget = useCallback(() => {
    setIsOpen(false);
    window.parent.postMessage(
      { source: "rocketreplai-widget", type: "close" },
      PARENT_ORIGIN,
    );
  }, []);

  // ── Send message — calls your EXISTING /api/embed/chatbot endpoint ─────────
  const sendMessage = useCallback(async () => {
    const text = input.trim();
    if (!text || isTyping || !config) return;

    const userMsg: Message = { id: `u_${Date.now()}`, role: "user", text };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsTyping(true);

    try {
      // This calls your EXISTING chatbot.controller.ts in apps/api/controllers/embed/
      const res = await fetch(`${API_BASE}/api/embed/chatbot`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-API-KEY": "your_32byte_encryption_key_here_12345",
        },
        body: JSON.stringify({
          userId: config.userId,
          agentId: config.chatbotType,
          userInput: text,
          fileData: config.filename || "",
        }),
      });

      const data = await res.json();
      const reply =
        data?.response?.response || "Sorry, I couldn't understand that.";

      setMessages((prev) => [
        ...prev,
        { id: `b_${Date.now()}`, role: "bot", text: reply },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: `err_${Date.now()}`,
          role: "bot",
          text: "I'm having trouble connecting right now. Please try again.",
        },
      ]);
    } finally {
      setIsTyping(false);
    }
  }, [input, isTyping, config]);

  const onKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
      }
    },
    [sendMessage],
  );

  const color = config?.primaryColor || "#ec4899";

  // ── Error state ────────────────────────────────────────────────────────────
  if (error) {
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
          padding: 20,
          textAlign: "center",
          fontSize: 13,
          color: "#666",
        }}
      >
        {error}
      </div>
    );
  }

  // ── Launcher button (collapsed state) ──────────────────────────────────────
  if (!isOpen) {
    return (
      <button
        onClick={openWidget}
        aria-label="Open chat support"
        style={{
          position: "fixed",
          bottom: 0,
          right: 0,
          width: 64,
          height: 64,
          borderRadius: "50%",
          background: color,
          border: "none",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          boxShadow: "0 4px 20px rgba(0,0,0,0.2)",
        }}
      >
        <svg width="28" height="28" viewBox="0 0 24 24" fill="white">
          <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z" />
        </svg>
      </button>
    );
  }

  // ── Full chat window (open state) ──────────────────────────────────────────
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        display: "flex",
        flexDirection: "column",
        fontFamily:
          "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
        fontSize: 14,
        background: "#fff",
        borderRadius: 16,
        overflow: "hidden",
      }}
    >
      {/* Header */}
      <div
        style={{
          background: color,
          color: "#fff",
          padding: "12px 16px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexShrink: 0,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div
            style={{
              width: 34,
              height: 34,
              borderRadius: "50%",
              background: "rgba(255,255,255,0.25)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="white">
              <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z" />
            </svg>
          </div>
          <div>
            <div style={{ fontWeight: 600, fontSize: 15, lineHeight: 1.2 }}>
              {config?.name || "Chat Support"}
            </div>
            <div style={{ fontSize: 11, opacity: 0.8 }}>
              Powered by RocketReplAI
            </div>
          </div>
        </div>
        <button
          onClick={closeWidget}
          aria-label="Close chat"
          style={{
            background: "rgba(255,255,255,0.2)",
            border: "none",
            borderRadius: "50%",
            width: 30,
            height: 30,
            cursor: "pointer",
            color: "#fff",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          ✕
        </button>
      </div>

      {/* Messages */}
      <div
        style={{
          flex: 1,
          overflowY: "auto",
          padding: "14px 12px",
          display: "flex",
          flexDirection: "column",
          gap: 10,
          background: "#f9fafb",
        }}
      >
        {messages.map((msg) => (
          <div
            key={msg.id}
            style={{
              display: "flex",
              justifyContent: msg.role === "user" ? "flex-end" : "flex-start",
            }}
          >
            <div
              style={{
                maxWidth: "78%",
                padding: "9px 13px",
                borderRadius:
                  msg.role === "user"
                    ? "18px 18px 4px 18px"
                    : "18px 18px 18px 4px",
                background: msg.role === "user" ? color : "#fff",
                color: msg.role === "user" ? "#fff" : "#111",
                boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
                lineHeight: 1.5,
                whiteSpace: "pre-wrap",
                wordBreak: "break-word",
                fontSize: 13.5,
              }}
            >
              {msg.text}
            </div>
          </div>
        ))}

        {isTyping && (
          <div style={{ display: "flex" }}>
            <div
              style={{
                padding: "10px 14px",
                background: "#fff",
                borderRadius: "18px 18px 18px 4px",
                boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
                display: "flex",
                gap: 4,
                alignItems: "center",
              }}
            >
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: "50%",
                    background: "#bbb",
                    animation: `typingDot 1.2s ${i * 0.2}s infinite`,
                  }}
                />
              ))}
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div
        style={{
          padding: "10px 12px",
          borderTop: "1px solid #e5e7eb",
          display: "flex",
          gap: 8,
          alignItems: "center",
          background: "#fff",
          flexShrink: 0,
        }}
      >
        <input
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder="Type a message..."
          disabled={isTyping || !config}
          style={{
            flex: 1,
            padding: "9px 12px",
            borderRadius: 20,
            border: "1px solid #e5e7eb",
            outline: "none",
            fontSize: 13.5,
            color: "#111",
            background: isTyping ? "#f9fafb" : "#fff",
          }}
        />
        <button
          onClick={sendMessage}
          disabled={!input.trim() || isTyping || !config}
          aria-label="Send"
          style={{
            width: 36,
            height: 36,
            borderRadius: "50%",
            background: !input.trim() || isTyping ? "#e5e7eb" : color,
            border: "none",
            cursor: !input.trim() || isTyping ? "not-allowed" : "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
            transition: "background 0.2s",
          }}
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="white">
            <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
          </svg>
        </button>
      </div>

      {/* Typing animation */}
      <style>{`
        @keyframes typingDot {
          0%, 80%, 100% { transform: translateY(0); opacity: 0.4; }
          40% { transform: translateY(-4px); opacity: 1; }
        }
      `}</style>
    </div>
  );
}
