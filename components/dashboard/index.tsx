"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { TaskType } from "@prisma/client";

// ─── NewTaskButton + Modal ───────────────────────────────────────────────────

const TASK_TYPES: {
  type:    TaskType;
  label:   string;
  desc:    string;
  tokens:  string;
  iconBg:  string;
  icon:    React.ReactNode;
}[] = [
  {
    type:   "RECURRING_SETUP",
    label:  "Recurring payment",
    desc:   "Rent, phone, daycare, utilities",
    tokens: "Setup: 10 tokens · Each run: 3",
    iconBg: "#E1F5EE",
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <path d="M2 8a6 6 0 1 1 1.5 4" stroke="#0F6E56" strokeWidth="1.3" strokeLinecap="round"/>
        <path d="M2 12V8h4" stroke="#0F6E56" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ),
  },
  {
    type:   "ONE_OFF_PAYMENT",
    label:  "One-off payment",
    desc:   "Traffic tickets, ad-hoc bills",
    tokens: "Typically 5–20 tokens",
    iconBg: "#FAEEDA",
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <rect x="2" y="4" width="12" height="8" rx="1.5" stroke="#854F0B" strokeWidth="1.3"/>
        <path d="M2 7h12" stroke="#854F0B" strokeWidth="1.3"/>
        <circle cx="5.5" cy="10" r="0.8" fill="#854F0B"/>
      </svg>
    ),
  },
  {
    type:   "INQUIRY",
    label:  "Inquiry",
    desc:   "Quotes, vendor info, price check",
    tokens: "1–3 tokens",
    iconBg: "#EEEDFE",
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <circle cx="8" cy="8" r="5.5" stroke="#534AB7" strokeWidth="1.3"/>
        <path d="M8 9v.5m0-4.5c0 1.5-2 1.5-2 3" stroke="#534AB7" strokeWidth="1.3" strokeLinecap="round"/>
      </svg>
    ),
  },
  {
    type:   "SUPPORT",
    label:  "Get help / Support",
    desc:   "Account issues, stuck tasks, billing questions",
    tokens: "Always free",
    iconBg: "#E8F4FD",
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <circle cx="8" cy="8" r="5.5" stroke="#1A6FA8" strokeWidth="1.3"/>
        <path d="M6 6.5C6 5.4 6.9 4.5 8 4.5s2 .9 2 2c0 1-.7 1.5-1.3 1.9C8.3 8.7 8 9 8 9.5" stroke="#1A6FA8" strokeWidth="1.3" strokeLinecap="round"/>
        <circle cx="8" cy="11.5" r="0.7" fill="#1A6FA8"/>
      </svg>
    ),
  },
];

export function NewTaskButton() {
  const [open,        setOpen]        = useState(false);
  const [selected,    setSelected]    = useState<TaskType | null>(null);
  const [description, setDescription] = useState("");
  const [loading,     setLoading]     = useState(false);
  const router = useRouter();

  async function handleStart() {
    if (!selected) return;
    setLoading(true);
    try {
      const res = await fetch("/api/tasks", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ type: selected, description: description || "New task" }),
      });
      const data = await res.json();
      if (res.status === 402) {
        alert("Not enough tokens. Please top up first.");
        router.push("/tokens");
        return;
      }
      if (data.taskId) {
        router.push(`/tasks/${data.taskId}`);
      }
    } finally {
      setLoading(false);
      setOpen(false);
    }
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="btn-primary flex items-center gap-1.5"
      >
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
          <path d="M7 2v10M2 7h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
        </svg>
        New task
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.4)" }}
          onClick={(e) => e.target === e.currentTarget && setOpen(false)}
        >
          <div className="bg-white rounded-xl border border-black/[0.08] p-5 w-full max-w-[460px] animate-fade-in">
            <div className="text-[15px] font-semibold text-[var(--text-primary)] mb-0.5">
              Start a new task
            </div>
            <div className="text-[13px] text-[var(--text-secondary)] mb-4">
              What do you need help with?
            </div>

            <div className="grid grid-cols-2 gap-2 mb-4">
              {TASK_TYPES.filter(t => t.type !== "OTHER").map((item) => (
                <button
                  key={item.type}
                  onClick={() => setSelected(item.type)}
                  className="text-left p-3 rounded-lg border transition-all duration-100"
                  style={{
                    borderWidth: selected === item.type ? "2px" : "0.5px",
                    borderColor: selected === item.type ? "var(--kb-navy)" : "rgba(0,0,0,0.12)",
                    background:  selected === item.type ? "var(--kb-navy-pale)" : "white",
                  }}
                >
                  <div
                    className="w-7 h-7 rounded-md flex items-center justify-center mb-2"
                    style={{ background: item.iconBg }}
                  >
                    {item.icon}
                  </div>
                  <div className="text-[13px] font-medium text-[var(--text-primary)]">{item.label}</div>
                  <div className="text-[11px] text-[var(--text-secondary)] mt-0.5">{item.desc}</div>
                  <div className="text-[10px] text-[var(--text-tertiary)] mt-1.5">{item.tokens}</div>
                </button>
              ))}
            </div>

            {/* Brief description */}
            {selected && (
              <div className="mb-4 animate-fade-in">
                <label className="label">Brief description (optional)</label>
                <input
                  className="input"
                  placeholder="e.g. Set up monthly rent payment to my landlord"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  maxLength={200}
                />
              </div>
            )}

            <div className="flex items-center justify-between">
              <button onClick={() => setOpen(false)} className="btn-secondary">Cancel</button>
              <button
                onClick={handleStart}
                disabled={!selected || loading}
                className="btn-primary"
              >
                {loading ? "Starting…" : "Continue →"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default NewTaskButton;

// ─── LowTokenAlert ───────────────────────────────────────────────────────────

export function LowTokenAlert({
  balance,
  affectedPayments,
}: {
  balance: number;
  affectedPayments: { label: string; dueDate: Date }[];
}) {
  return (
    <div className="alert-danger mb-5">
      <div className="w-2 h-2 rounded-full mt-1 flex-shrink-0" style={{ background: "var(--kb-red)" }} />
      <div className="flex-1 text-[12px]">
        <span className="font-medium">Low token balance ({balance} token{balance !== 1 ? "s" : ""}).</span>{" "}
        {affectedPayments.length === 1
          ? `Your ${affectedPayments[0].label} payment on ${new Date(affectedPayments[0].dueDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })} needs 3 tokens to run.`
          : `${affectedPayments.length} upcoming payments need at least 3 tokens each.`
        }{" "}
        Top up to avoid missed payments.
      </div>
      <a
        href="/tokens"
        className="text-[12px] font-semibold flex-shrink-0 self-center pl-2 whitespace-nowrap"
        style={{ color: "var(--kb-red)" }}
      >
        Top up →
      </a>
    </div>
  );
}

// ─── TaskCard ────────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<string, { label: string; badgeClass: string }> = {
  OPEN:            { label: "Open",            badgeClass: "badge-neutral" },
  CLARIFYING:      { label: "AI chatting",     badgeClass: "badge-neutral" },
  AI_PROCESSING:   { label: "AI processing",   badgeClass: "badge-neutral" },
  PENDING_HUMAN:   { label: "With our team",   badgeClass: "badge-warn" },
  PENDING_USER:    { label: "Your action",     badgeClass: "badge-navy" },
  PAYMENT_PENDING: { label: "Payment sending", badgeClass: "badge-neutral" },
};

const TYPE_LABELS: Record<string, string> = {
  RECURRING_SETUP:      "Recurring setup",
  RECURRING_EXECUTION:  "Recurring payment",
  ONE_OFF_PAYMENT:      "One-off payment",
  SERVICE_BOOKING:      "Service booking",
  INQUIRY:              "Inquiry",
  OTHER:                "Task",
};

export function TaskCard({ task }: { task: any }) {
  const cfg     = STATUS_CONFIG[task.status] ?? { label: task.status, badgeClass: "badge-neutral" };
  const history = Array.isArray(task.chatHistoryJson) ? task.chatHistoryJson : [];

  // ── Attention logic ─────────────────────────────────────────────────────
  // Priority 1: CLARIFYING + last message from AI = user needs to respond
  // Priority 2: PENDING_HUMAN = task is with our team (not waiting on user)
  // Priority 3: AI_PROCESSING = employee just resolved, AI is preparing response
  const lastChatMsg    = history.at(-1);
  const needsUserReply = task.status === "CLARIFYING" && lastChatMsg?.role === "assistant";
  const withTeam       = task.status === "PENDING_HUMAN";
  const aiProcessing   = task.status === "AI_PROCESSING";

  // Left border accent for tasks that need the user's attention
  const isPriority = task.status === "PENDING_USER" || needsUserReply;

  // Title: prefer AI-generated label, fall back to type label
  const title = task.label ?? TYPE_LABELS[task.type] ?? "Task";

  return (
    <a
      href={`/tasks/${task.id}`}
      className="card card-hover flex items-center gap-3 px-4 py-3 no-underline"
      style={{ borderLeft: isPriority ? `3px solid var(--kb-navy)` : undefined }}
    >
      <div className="flex-1 min-w-0">
        <div className="text-[13px] font-medium text-[var(--text-primary)] truncate">{title}</div>
        <div className="text-[11px] text-[var(--text-secondary)] mt-0.5">
          {TYPE_LABELS[task.type]} &middot; {new Date(task.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
        </div>
      </div>
      <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
        {needsUserReply ? (
          /* User needs to respond — highest visual priority */
          <span className="badge badge-navy" style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <svg width="7" height="7" viewBox="0 0 7 7" fill="currentColor">
              <circle cx="3.5" cy="3.5" r="3.5"/>
            </svg>
            Your response needed
          </span>
        ) : withTeam ? (
          /* Task is with an employee — user doesn't need to do anything */
          <span className="badge badge-warn" style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <svg width="7" height="7" viewBox="0 0 7 7" fill="currentColor">
              <circle cx="3.5" cy="3.5" r="3.5"/>
            </svg>
            With our team
          </span>
        ) : aiProcessing ? (
          /* Brief transition state — employee resolved, AI preparing response */
          <span className="badge badge-neutral" style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <svg width="7" height="7" viewBox="0 0 7 7" fill="currentColor" opacity="0.5">
              <circle cx="3.5" cy="3.5" r="3.5"/>
            </svg>
            Preparing update
          </span>
        ) : (
          <span className={`badge ${cfg.badgeClass}`}>{cfg.label}</span>
        )}
        {task.tokenEstimate && (
          <span className="text-[10px] text-[var(--text-tertiary)]">~{task.tokenEstimate} tokens</span>
        )}
      </div>
    </a>
  );
}

// ─── RecurringCard ───────────────────────────────────────────────────────────

export function RecurringCard({
  recurring,
  tokenBalance,
}: {
  recurring: any;
  tokenBalance: number;
}) {
  const isLowToken = tokenBalance < 3;
  const isPaused   = recurring.pausedReason !== "NONE";
  const dueDate    = recurring.nextRunAt ? new Date(recurring.nextRunAt) : null;
  const amount     = parseFloat(recurring.amountUsd.toString());

  return (
    <div
      className="card flex items-center gap-3 px-4 py-3"
      style={{ borderColor: isLowToken ? "#E9B3B3" : undefined }}
    >
      {/* Date badge */}
      <div
        className="w-10 h-10 rounded-lg flex flex-col items-center justify-center flex-shrink-0"
        style={{
          background: isLowToken ? "var(--kb-red-light)" : "var(--kb-navy-light)",
        }}
      >
        <span
          className="text-[14px] font-semibold leading-none"
          style={{ color: isLowToken ? "var(--kb-red)" : "var(--kb-navy)" }}
        >
          {dueDate?.getDate() ?? "—"}
        </span>
        <span
          className="text-[9px] uppercase mt-0.5"
          style={{ color: isLowToken ? "var(--kb-red-mid)" : "var(--kb-navy-mid)" }}
        >
          {dueDate?.toLocaleDateString("en-US", { month: "short" }) ?? ""}
        </span>
      </div>

      {/* Details */}
      <div className="flex-1 min-w-0">
        <div className="text-[13px] font-medium text-[var(--text-primary)] truncate">{recurring.label}</div>
        <div className="text-[11px] text-[var(--text-secondary)] mt-0.5">
          {recurring.gateway === "ACH_RECURRING" ? "Bank transfer" : "Card"}
        </div>
      </div>

      {/* Amount + warning */}
      <div className="flex flex-col items-end gap-1 flex-shrink-0">
        <span className="text-[13px] font-semibold text-[var(--text-primary)]">
          ${amount.toLocaleString("en-US", { minimumFractionDigits: 2 })}
        </span>
        {isLowToken && (
          <span className="text-[10px] font-semibold" style={{ color: "var(--kb-red)" }}>
            Low tokens
          </span>
        )}
        {isPaused && !isLowToken && (
          <span className="badge badge-warn text-[10px]">Paused</span>
        )}
      </div>
    </div>
  );
}

// ─── ReferralCard ────────────────────────────────────────────────────────────

export function ReferralCard({ referralCode }: { referralCode: string }) {
  const [copied, setCopied] = useState(false);

  function handleCopy() {
    navigator.clipboard.writeText(referralCode).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <div
      className="card px-4 py-4"
      style={{ background: "var(--kb-navy-light)", border: "1px solid var(--kb-navy-pale, #c8d8f0)" }}
    >
      {/* Header */}
      <div className="flex items-center gap-2 mb-3">
        <div
          className="w-7 h-7 rounded-md flex items-center justify-center flex-shrink-0"
          style={{ background: "var(--kb-navy)" }}
        >
          {/* Gift icon */}
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <rect x="1.5" y="5.5" width="11" height="7" rx="1" stroke="white" strokeWidth="1.2"/>
            <path d="M1.5 7.5h11" stroke="white" strokeWidth="1.2"/>
            <path d="M7 5.5V13" stroke="white" strokeWidth="1.2"/>
            <path d="M7 5.5C7 5.5 5 5.5 5 3.5C5 2.5 5.9 2 7 2C8.1 2 9 2.5 9 3.5C9 5.5 7 5.5 7 5.5Z" stroke="white" strokeWidth="1.2" strokeLinejoin="round"/>
          </svg>
        </div>
        <div>
          <div className="text-[13px] font-semibold" style={{ color: "var(--kb-navy)" }}>
            Refer a friend
          </div>
          <div className="text-[11px]" style={{ color: "var(--kb-navy-mid)" }}>
            You earn 5 tokens for every friend who joins
          </div>
        </div>
      </div>

      {/* Code + copy button */}
      <div className="flex items-center gap-2">
        <div
          className="flex-1 rounded-lg px-3 py-2 text-center font-mono font-semibold tracking-widest text-[15px]"
          style={{
            background: "white",
            border:     "1px solid var(--kb-navy-pale, #c8d8f0)",
            color:      "var(--kb-navy)",
            letterSpacing: "0.12em",
          }}
        >
          {referralCode}
        </div>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-[12px] font-medium transition-all flex-shrink-0"
          style={{
            background: copied ? "#e6f4ee" : "var(--kb-navy)",
            color:      copied ? "#0F6E56" : "white",
            border:     "none",
          }}
        >
          {copied ? (
            <>
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                <path d="M2 6l3 3 5-5" stroke="#0F6E56" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              Copied!
            </>
          ) : (
            <>
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                <rect x="4" y="4" width="6.5" height="6.5" rx="1" stroke="white" strokeWidth="1.2"/>
                <path d="M4 8H2.5A1 1 0 0 1 1.5 7V2.5A1 1 0 0 1 2.5 1.5H7A1 1 0 0 1 8 2.5V4" stroke="white" strokeWidth="1.2"/>
              </svg>
              Copy
            </>
          )}
        </button>
      </div>
    </div>
  );
}
