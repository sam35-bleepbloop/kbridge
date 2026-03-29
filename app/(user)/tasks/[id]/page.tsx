"use client";

import { useParams } from "next/navigation";
import { useState, useEffect, useRef, useCallback } from "react";
import ReactMarkdown from "react-markdown";
import { EscalateOfferCard } from "@/components/tasks/EscalateOfferCard";

// ─── Types ─────────────────────────────────────────────────────────────────────

interface Message {
  role: "user" | "assistant";
  content: string;
  /** If true, the [ESCALATE_OFFER] signal was detected in this message */
  hasEscalateOffer?: boolean;
}

interface TaskData {
  id: string;
  type: string;
  status: string;
  label: string | null;
  chatHistoryJson: { role: string; content: string }[] | null;
}

// ─── Constants ─────────────────────────────────────────────────────────────────

const ESCALATE_SIGNAL = "[ESCALATE_OFFER]";

// Statuses where escalation card can appear (task is active, not yet handed off)
const ESCALATE_ELIGIBLE_STATUSES = ["OPEN", "CLARIFYING"];

// ─── Helpers ───────────────────────────────────────────────────────────────────

/** Strip [ESCALATE_OFFER] signal from message text for display */
function stripSignal(text: string): string {
  return text.replace(/\[ESCALATE_OFFER\]/g, "").trim();
}

/** Returns true if the text contains the escalate offer signal */
function hasSignal(text: string): boolean {
  return text.includes(ESCALATE_SIGNAL);
}

// ─── Component ─────────────────────────────────────────────────────────────────

export default function TaskChatPage() {
  const params = useParams();
  const taskId = params.id as string;

  const [task, setTask] = useState<TaskData | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [tokenBalance, setTokenBalance] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Track which message index showed the escalate card, and whether it's been
  // acted on (confirmed or dismissed) so we only show it once.
  const [escalateCardMsgIndex, setEscalateCardMsgIndex] = useState<number | null>(null);
  const [escalateCardDone, setEscalateCardDone] = useState(false);

  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  // Guard against double-greeting (workaround #109)
  const greetingFired = useRef(false);

  // ── Scroll to bottom ──────────────────────────────────────────────────────

  const scrollToBottom = useCallback(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  // ── Load task + token balance ─────────────────────────────────────────────

  useEffect(() => {
    async function load() {
      try {
        const [taskRes, tokenRes] = await Promise.all([
          fetch(`/api/tasks/${taskId}`),
          fetch("/api/tokens"),
        ]);

        if (!taskRes.ok) {
          setError("Task not found.");
          setLoading(false);
          return;
        }

        // FIX (Issue A): API returns { task: { ... } } — must unwrap.
        // Also, the DB field is `chatHistoryJson`, not `messages`.
        const resJson = await taskRes.json();
        const taskData: TaskData = resJson.task;
        const tokenData = await tokenRes.json();

        setTask(taskData);
        setTokenBalance(tokenData.balance ?? 0);

        // Hydrate message history — detect any prior escalate offer signals
        const rawHistory = Array.isArray(taskData.chatHistoryJson) ? taskData.chatHistoryJson : [];
        const hydrated: Message[] = rawHistory.map((m) => ({
          role: m.role as "user" | "assistant",
          content: m.content,
          hasEscalateOffer: m.role === "assistant" && hasSignal(m.content),
        }));
        setMessages(hydrated);

        // If the last assistant message had an escalate offer AND the task
        // is still active (OPEN or CLARIFYING — not already escalated), show the card
        // FIX (Issue B): was checking only "OPEN" — task transitions to CLARIFYING
        // on first user message, so by the time an escalation offer appears the
        // task is always CLARIFYING. Must check both statuses.
        const lastAssistant = [...hydrated].reverse().find((m) => m.role === "assistant");
        if (lastAssistant?.hasEscalateOffer && ESCALATE_ELIGIBLE_STATUSES.includes(taskData.status)) {
          const lastIdx = hydrated.lastIndexOf(lastAssistant);
          if (lastIdx !== -1) {
            setEscalateCardMsgIndex(lastIdx);
          }
        }
      } catch {
        setError("Failed to load task.");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [taskId]);

  // ── Trigger AI greeting on new task (no messages yet) ────────────────────

  useEffect(() => {
    if (loading) return;
    if (messages.length > 0) return;
    if (greetingFired.current) return;
    if (!task) return;
    greetingFired.current = true;

    triggerGreeting();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, task]);

  async function triggerGreeting() {
    setStreaming(true);
    try {
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          taskId,
          messages: [{ role: "user", content: "__GREETING__" }],
        }),
      });

      if (!res.ok || !res.body) {
        setStreaming(false);
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let assistantText = "";

      setMessages([{ role: "assistant", content: "", hasEscalateOffer: false }]);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        assistantText += decoder.decode(value, { stream: true });
        setMessages([{
          role: "assistant",
          content: assistantText,
          hasEscalateOffer: hasSignal(assistantText),
        }]);
      }
    } catch {
      // Greeting failed silently — user can still type
    } finally {
      setStreaming(false);
      inputRef.current?.focus();
    }
  }

  // ── Send message ──────────────────────────────────────────────────────────

  const sendMessage = useCallback(
    async (text: string) => {
      if (!text.trim() || streaming) return;

      const userMsg: Message = { role: "user", content: text.trim() };
      const updatedMessages = [
        ...messages.map((m) => ({ role: m.role, content: m.content })),
        { role: "user" as const, content: text.trim() },
      ];

      setMessages((prev) => [...prev, userMsg]);
      setInput("");
      setStreaming(true);
      setError(null);

      // Reset escalate card state for new turn
      setEscalateCardDone(false);
      setEscalateCardMsgIndex(null);

      try {
        const res = await fetch("/api/ai/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ taskId, messages: updatedMessages }),
        });

        if (!res.ok || !res.body) {
          const errText = await res.text().catch(() => "");
          setError("Failed to send message.");
          console.error("[chat] API error:", res.status, errText);
          setStreaming(false);
          return;
        }

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let assistantText = "";

        // Add empty assistant message to stream into
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: "", hasEscalateOffer: false },
        ]);

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          assistantText += decoder.decode(value, { stream: true });

          const signalDetected = hasSignal(assistantText);
          setMessages((prev) => {
            const next = [...prev];
            next[next.length - 1] = {
              role: "assistant",
              content: assistantText,
              hasEscalateOffer: signalDetected,
            };
            return next;
          });
        }

        // Stream complete — wire up escalate card if signal present
        // FIX (Issue B): 
        //   1. Check ESCALATE_ELIGIBLE_STATUSES instead of just "OPEN"
        //   2. Set escalateCardMsgIndex outside setMessages to avoid
        //      unreliable nested state update
        if (hasSignal(assistantText) && ESCALATE_ELIGIBLE_STATUSES.includes(task?.status ?? "")) {
          // Get current message count to find the assistant message index
          // The assistant message we just streamed is the last one
          setMessages((prev) => {
            // Use a microtask to set the card index AFTER this state update commits
            const idx = prev.length - 1;
            // Schedule outside this callback to avoid nested state update issues
            queueMicrotask(() => setEscalateCardMsgIndex(idx));
            return prev;
          });
        }

        // Refresh token balance after AI response
        fetch("/api/tokens")
          .then((r) => r.json())
          .then((d) => setTokenBalance(d.balance ?? 0))
          .catch(() => {});
      } catch {
        setError("Something went wrong. Please try again.");
      } finally {
        setStreaming(false);
        inputRef.current?.focus();
      }
    },
    [streaming, taskId, task?.status, messages]
  );

  // ── Escalate card handlers ────────────────────────────────────────────────

  function handleEscalateConfirmed() {
    setEscalateCardDone(true);
    setEscalateCardMsgIndex(null);

    // Refresh task status and token balance
    Promise.all([
      fetch(`/api/tasks/${taskId}`).then((r) => r.json()),
      fetch("/api/tokens").then((r) => r.json()),
    ]).then(([resJson, tokenData]) => {
      setTask(resJson.task);
      setTokenBalance(tokenData.balance ?? 0);
    });

    // Show a confirmation message inline
    setMessages((prev) => [
      ...prev,
      {
        role: "assistant",
        content:
          "✅ You're all set — a K-Bridge team member has been notified and will take it from here. We'll update you as soon as there's progress.",
      },
    ]);
  }

  function handleEscalateDismissed() {
    setEscalateCardDone(true);
    setEscalateCardMsgIndex(null);

    // Send a "No thanks" message to the AI so it can continue naturally
    sendMessage("No thanks, I don't want to escalate.");
  }

  // ── Task summary for the card ─────────────────────────────────────────────

  const taskSummary =
    task?.label ??
    messages.find((m) => m.role === "user")?.content.slice(0, 120) ??
    "";

  // ── Keyboard handler ──────────────────────────────────────────────────────

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  }

  // ── Derive task-done state ────────────────────────────────────────────────

  const taskDone = task
    ? ["COMPLETE", "CANCELLED", "FAILED", "PENDING_HUMAN"].includes(task.status)
    : false;

  // ── Render ────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center text-gray-400 text-sm">
        Loading…
      </div>
    );
  }

  if (error && !task) {
    return (
      <div className="flex h-full items-center justify-center text-red-600 text-sm">
        {error}
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col bg-[#F5F6F8]">
      {/* ── Centered content wrapper ── */}
      <div className="flex flex-1 flex-col min-h-0 mx-auto w-full max-w-3xl">
      {/* ── Header ── */}
      <div className="shrink-0 border-b border-gray-200 bg-white px-6 py-3">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-[#1B3A6B] truncate max-w-xs">
              {task?.label ?? "Task"}
            </p>
            <p className="text-xs text-gray-400 capitalize">{task?.type?.replace(/_/g, " ").toLowerCase()}</p>
          </div>
          <div className="flex items-center gap-1.5 rounded-full bg-[#E8EEF7] px-3 py-1">
            <span className="text-xs text-[#1B3A6B] font-medium">{tokenBalance}</span>
            <span className="text-xs text-[#2D5499]">tokens</span>
          </div>
        </div>

        {/* Status badge */}
        {taskDone && (
          <div className="mt-2">
            <StatusBadge status={task?.status ?? ""} />
          </div>
        )}
      </div>

      {/* ── Message list ── */}
      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
        {messages.map((msg, idx) => {
          const isUser = msg.role === "user";
          const displayContent = stripSignal(msg.content);

          return (
            <div key={idx}>
              {/* Message bubble */}
              <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                    isUser
                      ? "bg-[#1B3A6B] text-white rounded-br-sm"
                      : "bg-white border border-gray-200 text-gray-800 rounded-bl-sm shadow-sm"
                  }`}
                >
                  {isUser ? (
                    <p className="whitespace-pre-wrap">{displayContent}</p>
                  ) : (
                    <div className="prose prose-sm max-w-none prose-p:my-1 prose-ul:my-1 prose-li:my-0">
                      <ReactMarkdown>{displayContent}</ReactMarkdown>
                    </div>
                  )}
                </div>
              </div>

              {/* Escalate offer card — shown inline after the triggering AI message */}
              {!isUser &&
                idx === escalateCardMsgIndex &&
                !escalateCardDone &&
                ESCALATE_ELIGIBLE_STATUSES.includes(task?.status ?? "") && (
                  <EscalateOfferCard
                    taskId={taskId}
                    taskSummary={taskSummary}
                    tokenBalance={tokenBalance}
                    onConfirm={handleEscalateConfirmed}
                    onDismiss={handleEscalateDismissed}
                  />
                )}
            </div>
          );
        })}

        {/* Streaming indicator */}
        {streaming && (
          <div className="flex justify-start">
            <div className="bg-white border border-gray-200 rounded-2xl rounded-bl-sm px-4 py-2.5 shadow-sm">
              <TypingIndicator />
            </div>
          </div>
        )}

        {/* Error */}
        {error && (
          <p className="text-center text-xs text-red-600">{error}</p>
        )}

        <div ref={bottomRef} />
      </div>

      {/* ── Input ── */}
      <div className="shrink-0 border-t border-gray-200 bg-white px-6 py-3">
        {taskDone ? (
          <p className="text-center text-xs text-gray-400">
            {task?.status === "PENDING_HUMAN"
              ? "This task has been handed off to a team member."
              : "This task is closed."}
          </p>
        ) : (
          <div className="flex items-end gap-2">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type a message…"
              rows={1}
              className="flex-1 resize-none rounded-xl border border-gray-300 bg-gray-50 px-3 py-2 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#1B3A6B]/30 focus:border-[#1B3A6B] transition-colors"
              style={{ maxHeight: "120px", overflowY: "auto" }}
              disabled={streaming}
            />
            <button
              onClick={() => sendMessage(input)}
              disabled={streaming || !input.trim()}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#1B3A6B] text-white transition-opacity hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <line x1="22" y1="2" x2="11" y2="13" />
                <polygon points="22 2 15 22 11 13 2 9 22 2" />
              </svg>
            </button>
          </div>
        )}
      </div>
      </div>{/* end max-w-3xl wrapper */}
    </div>
  );
}

// ─── Sub-components ─────────────────────────────────────────────────────────────

function TypingIndicator() {
  return (
    <div className="flex items-center gap-1 py-0.5">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="block h-1.5 w-1.5 rounded-full bg-gray-400 animate-bounce"
          style={{ animationDelay: `${i * 0.15}s` }}
        />
      ))}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const config: Record<string, { label: string; className: string }> = {
    COMPLETE: { label: "Completed", className: "bg-green-100 text-green-700" },
    CANCELLED: { label: "Cancelled", className: "bg-gray-100 text-gray-500" },
    FAILED: { label: "Failed", className: "bg-red-50 text-red-600" },
    PENDING_HUMAN: {
      label: "Handed off to team",
      className: "bg-blue-50 text-blue-700",
    },
  };
  const c = config[status];
  if (!c) return null;
  return (
    <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${c.className}`}>
      {c.label}
    </span>
  );
}
