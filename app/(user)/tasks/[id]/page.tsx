"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useParams } from "next/navigation";
import ReactMarkdown from "react-markdown";

interface Message {
  role:      "user" | "assistant";
  content:   string;
  timestamp: string;
}

const STATUS_LABELS: Record<string, string> = {
  OPEN:            "Starting…",
  CLARIFYING:      "AI is asking questions",
  AI_PROCESSING:   "AI is working",
  PENDING_HUMAN:   "With our team",
  PENDING_USER:    "Waiting for you",
  PAYMENT_PENDING: "Payment sending",
  COMPLETE:        "Complete",
  CANCELLED:       "Cancelled",
  FAILED:          "Failed",
};

export default function TaskChatPage() {
  const params  = useParams();
  const taskId  = params.id as string;

  const [messages,  setMessages]  = useState<Message[]>([]);
  const [input,     setInput]     = useState("");
  const [streaming, setStreaming] = useState(false);
  const [task,      setTask]      = useState<any>(null);
  const [loading,   setLoading]   = useState(true);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef  = useRef<HTMLTextAreaElement>(null);

  // Load task + history
  useEffect(() => {
    async function load() {
      const res  = await fetch(`/api/tasks/${taskId}`);
      const data = await res.json();
      setTask(data.task);
      const history = Array.isArray(data.task?.chatHistoryJson) ? data.task.chatHistoryJson : [];
      setMessages(history);
      setLoading(false);

      // Only trigger greeting if there are truly no messages saved
      if (history.length === 0) {
        await triggerAiGreeting(data.task?.type);
      }
    }
    load();
  }, [taskId]);

  // Auto-scroll to bottom
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function triggerAiGreeting(taskType: string) {
  setStreaming(true);
  const greetingMsg: Message = { role: "assistant", content: "", timestamp: new Date().toISOString() };
  setMessages([greetingMsg]);

  try {
    const res = await fetch("/api/ai/chat", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({
        taskId,
        messages: [{ role: "user", content: "__GREETING__", timestamp: new Date().toISOString() }],
      }),
    });
    if (!res.ok || !res.body) throw new Error("Stream failed");

    const reader  = res.body.getReader();
    const decoder = new TextDecoder();
    let fullText  = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      fullText += decoder.decode(value, { stream: true });
      setMessages([{ role: "assistant", content: fullText, timestamp: greetingMsg.timestamp }]);
    }
  } finally {
    setStreaming(false);
  }
}

  const sendMessage = useCallback(async () => {
    const text = input.trim();
    if (!text || streaming) return;

    const userMsg: Message = { role: "user", content: text, timestamp: new Date().toISOString() };
    // Include ALL current messages (including greeting) in what we send
    const newMessages = [...messages, userMsg];

    setMessages(newMessages);
    setInput("");
    setStreaming(true);

    // Add empty assistant message to stream into
    setMessages((prev) => [...prev, { role: "assistant", content: "", timestamp: new Date().toISOString() }]);

    try {
      const res = await fetch("/api/ai/chat", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ taskId, messages: newMessages }),
      });

      if (!res.ok || !res.body) throw new Error("Stream failed");

      const reader  = res.body.getReader();
      const decoder = new TextDecoder();
      let fullText  = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        fullText += decoder.decode(value, { stream: true });
        setMessages((prev) => {
          const updated = [...prev];
          updated[updated.length - 1] = {
            ...updated[updated.length - 1],
            content: fullText,
          };
          return updated;
        });
      }
    } catch (err) {
      setMessages((prev) => {
        const updated = [...prev];
        updated[updated.length - 1] = {
          ...updated[updated.length - 1],
          content: "Something went wrong. Please try again.",
        };
        return updated;
      });
    } finally {
      setStreaming(false);
      inputRef.current?.focus();
    }
  }, [input, messages, streaming, taskId]);

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-[var(--text-tertiary)] text-sm animate-pulse">Loading task…</div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col max-w-3xl mx-auto">
      {/* Task header */}
      <div className="flex items-center gap-3 px-6 py-4 border-b border-black/[0.07] bg-white flex-shrink-0">
        <a href="/dashboard" className="text-[var(--text-tertiary)] hover:text-[var(--text-secondary)]">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M10 12L6 8l4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </a>
        <div className="flex-1">
          <div className="text-[13px] font-medium text-[var(--text-primary)]">
            {task?.type?.replace(/_/g, " ").toLowerCase().replace(/\b\w/g, (c: string) => c.toUpperCase())}
          </div>
          <div className="text-[11px] text-[var(--text-secondary)]">
            {STATUS_LABELS[task?.status] ?? task?.status}
            {task?.tokenEstimate && ` · ~${task.tokenEstimate} tokens`}
          </div>
        </div>
        {task?.status === "PENDING_HUMAN" && (
          <div className="badge badge-warn text-[11px]">With our team</div>
        )}
        {task?.status === "PENDING_USER" && (
          <div className="badge badge-navy text-[11px]">Action needed</div>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-6 py-4 flex flex-col gap-3">
        {messages.length === 0 && (
          <div className="text-center text-[var(--text-tertiary)] text-sm mt-8">
            Starting your conversation…
          </div>
        )}

        {messages.map((msg, i) => (
          <div
            key={i}
            className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"} animate-fade-in`}
          >
            {msg.role === "assistant" && (
              <div
                className="w-7 h-7 rounded-full flex items-center justify-center mr-2 flex-shrink-0 mt-0.5"
                style={{ background: "var(--kb-navy-light)" }}
              >
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <circle cx="7" cy="7" r="5" stroke="var(--kb-navy)" strokeWidth="1.2"/>
                  <path d="M4.5 7h5M7 4.5v5" stroke="var(--kb-navy)" strokeWidth="1.2" strokeLinecap="round"/>
                </svg>
              </div>
            )}

            <div
              className="max-w-[75%] rounded-xl px-4 py-2.5 text-[13px] leading-relaxed"
              style={{
                background:   msg.role === "user" ? "var(--kb-navy)" : "white",
                color:        msg.role === "user" ? "white" : "var(--text-primary)",
                border:       msg.role === "assistant" ? "0.5px solid rgba(0,0,0,0.08)" : undefined,
                borderRadius: msg.role === "user" ? "16px 16px 4px 16px" : "16px 16px 16px 4px",
              }}
            >
              {msg.content ? (
                msg.role === "assistant" ? (
                  <div className="prose prose-sm max-w-none [&>p]:mb-2 [&>ul]:mb-2 [&>ul]:pl-4 [&>li]:mb-0.5 [&>strong]:font-semibold">
                    <ReactMarkdown>{msg.content}</ReactMarkdown>
                  </div>
                ) : msg.content
              ) : (
                <span className="animate-pulse text-[var(--text-tertiary)]">●●●</span>
              )}
            </div>
          </div>
        ))}

        {task?.status === "PENDING_HUMAN" && (
          <div
            className="text-center text-[12px] py-3 px-4 rounded-lg mx-auto"
            style={{ background: "var(--status-warn-bg)", color: "var(--status-warn-text)", maxWidth: "80%" }}
          >
            One of our bilingual team members is handling this step. You'll hear back within 2 business hours.
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input area */}
      <div className="px-6 py-4 bg-white border-t border-black/[0.07] flex-shrink-0">
        <div className="flex items-end gap-2">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={
              task?.status === "PENDING_HUMAN"
                ? "Waiting for our team…"
                : "Type your message…"
            }
            disabled={streaming || task?.status === "PENDING_HUMAN"}
            rows={1}
            className="flex-1 resize-none rounded-xl border border-black/[0.12] px-4 py-2.5 text-[13px]
                       focus:outline-none focus:ring-2 focus:border-brand-navy
                       disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ minHeight: "42px", maxHeight: "120px" }}
            onInput={(e) => {
              const t = e.target as HTMLTextAreaElement;
              t.style.height = "auto";
              t.style.height = Math.min(t.scrollHeight, 120) + "px";
            }}
          />
          <button
            onClick={sendMessage}
            disabled={!input.trim() || streaming || task?.status === "PENDING_HUMAN"}
            className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 transition-all duration-100 disabled:opacity-40"
            style={{ background: "var(--kb-navy)" }}
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M13 8H3M9 4l4 4-4 4" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        </div>
        <div className="text-[10px] text-[var(--text-tertiary)] mt-2 text-center">
          Press Enter to send · Shift+Enter for new line
        </div>
      </div>
    </div>
  );
}