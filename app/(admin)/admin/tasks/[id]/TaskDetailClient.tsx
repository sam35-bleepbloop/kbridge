"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import ReactMarkdown from "react-markdown";

// ─── Types ────────────────────────────────────────────────────────────────────

interface TaskUser {
  id:              string;
  displayName:     string | null;
  email:           string | null;
  tokenBalance:    number;
  sofaDeclaration: string;
  derosDate:       string | null;
  phoneKr:         string | null;
  phoneUs:         string | null;
  addressJson:     Record<string, string> | null;
  createdAt:       string;
}

interface Payment {
  id:          string;
  gateway:     string;
  routeType:   string;
  amountUsd:   string;
  feeUsd:      string;
  feePct:      string;
  amountKrw:   string;
  fxRate:      string;
  status:      string;
  memo:        string;
  gatewayRef:  string | null;
  initiatedAt: string;
  confirmedAt: string | null;
}

interface Assignment {
  id:         string;
  status:     string;
  urgency:    string;
  notes:      string | null;
  assignedAt: string;
  resolvedAt: string | null;
  employeeId: string;
  employee:   { name: string; email: string; role: string };
}

interface TokenEntry {
  id:          string;
  txType:      string;
  amount:      number;
  balanceAfter: number;
  description: string;
  createdAt:   string;
}

interface AuditEntry {
  id:          string;
  actorId:     string;
  actorType:   string;
  eventType:   string;
  payloadJson: Record<string, unknown>;
  createdAt:   string;
}

interface Task {
  id:                string;
  type:              string;
  status:            string;
  tokenEstimate:     number | null;
  tokenActual:       number | null;
  tokenReserved:     number | null;
  requiresHuman:     boolean;
  escalationReason:  string | null;
  assignedEmployeeId: string | null;
  chatHistoryJson:   Array<{ role: string; content: string; timestamp: string }>;
  internalNotesJson: Array<{ employeeId: string | null; notes: string; resolvedAt: string | null }>;
  outcomeJson:       Record<string, unknown> | null;
  createdAt:         string;
  closedAt:          string | null;
  lastActivityAt:    string;
  user:              TaskUser;
  payments:          Payment[];
  assignments:       Assignment[];
  tokenLedger:       TokenEntry[];
  auditLog:          AuditEntry[];
}

// ─── Config ───────────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  OPEN:            { label: "Open",            color: "#374151", bg: "#F3F4F6" },
  CLARIFYING:      { label: "Clarifying",      color: "#374151", bg: "#F3F4F6" },
  AI_PROCESSING:   { label: "AI processing",   color: "#1B3A6B", bg: "#E8EEF7" },
  PENDING_HUMAN:   { label: "Pending human",   color: "#633806", bg: "#FAEEDA" },
  PENDING_USER:    { label: "Pending user",    color: "#1B3A6B", bg: "#E8EEF7" },
  PAYMENT_PENDING: { label: "Payment pending", color: "#633806", bg: "#FAEEDA" },
  COMPLETE:        { label: "Complete",        color: "#085041", bg: "#E1F5EE" },
  CANCELLED:       { label: "Cancelled",       color: "#6B7280", bg: "#F3F4F6" },
  FAILED:          { label: "Failed",          color: "#7A1010", bg: "#F9EAEA" },
};

const URGENCY_CONFIG: Record<string, { label: string; color: string; bg: string; dot: string }> = {
  CRITICAL: { label: "Critical", color: "#7A1010", bg: "#F9EAEA",            dot: "#C0272D" },
  HIGH:     { label: "High",     color: "#633806", bg: "#FAEEDA",            dot: "#EF9F27" },
  MEDIUM:   { label: "Medium",   color: "#374151", bg: "#F3F4F6",            dot: "#9CA3AF" },
  LOW:      { label: "Low",      color: "#6B7280", bg: "var(--surface-page)", dot: "#D1D5DB" },
};

const TYPE_LABELS: Record<string, string> = {
  RECURRING_SETUP:     "Recurring setup",
  RECURRING_EXECUTION: "Recurring execution",
  ONE_OFF_PAYMENT:     "One-off payment",
  SERVICE_BOOKING:     "Service booking",
  INQUIRY:             "Inquiry",
  OTHER:               "Other",
};

const TX_CONFIG: Record<string, { label: string; color: string }> = {
  PURCHASE:             { label: "Purchase",    color: "#085041" },
  BURN:                 { label: "Burn",        color: "#7A1010" },
  RESERVATION:          { label: "Reserved",   color: "#633806" },
  RESERVATION_RELEASE:  { label: "Released",   color: "#085041" },
  REFUND:               { label: "Refund",     color: "#085041" },
  ADMIN_ADJUSTMENT:     { label: "Admin adj",  color: "#1B3A6B" },
  BONUS:                { label: "Bonus",      color: "#085041" },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmt(date: string) {
  return new Date(date).toLocaleString("en-US", {
    month: "short", day: "numeric", hour: "numeric", minute: "2-digit",
  });
}

function fmtDate(date: string) {
  return new Date(date).toLocaleDateString("en-US", {
    month: "short", day: "numeric", year: "numeric",
  });
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-[10px] font-semibold text-[var(--text-tertiary)] uppercase tracking-wider mb-2">
      {children}
    </div>
  );
}

function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`card p-4 ${className}`}>
      {children}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function TaskDetailClient({
  task,
  employee,
}: {
  task:     Task;
  employee: { id: string; role: string; name: string };
}) {
  const router = useRouter();
  const [activeTab,     setActiveTab]     = useState<"chat" | "notes" | "audit">("chat");
  const [resolveNotes,  setResolveNotes]  = useState("");
  const [resolving,     setResolving]     = useState(false);
  const [tokenAmount,   setTokenAmount]   = useState("");
  const [tokenReason,   setTokenReason]   = useState("");
  const [adjusting,     setAdjusting]     = useState(false);
  const [adjustMsg,     setAdjustMsg]     = useState<string | null>(null);
  const [adminAction,   setAdminAction]   = useState<"cancel" | "complete" | "force_close" | null>(null);
  const [adminNote,     setAdminNote]     = useState("");
  const [adminActing,   setAdminActing]   = useState(false);
  const [adminMsg,      setAdminMsg]      = useState<string | null>(null);

  const isAdmin           = employee.role === "ADMIN";
  const activeAssignment  = task.assignments.find(
    (a) => a.status === "IN_PROGRESS" && a.employeeId === employee.id
  );
  const canResolve        = !!activeAssignment && task.status === "PENDING_HUMAN";
  const statusCfg         = STATUS_CONFIG[task.status] ?? { label: task.status, color: "#374151", bg: "#F3F4F6" };

  // ── Actions ──────────────────────────────────────────────────────────────

  async function handleResolve() {
    if (!resolveNotes.trim() || !activeAssignment) return;
    setResolving(true);
    try {
      await fetch(`/api/admin/assignments/${activeAssignment.id}/resolve`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ notes: resolveNotes }),
      });
      router.refresh();
    } finally {
      setResolving(false);
    }
  }

  async function handleTokenAdjust() {
    const amount = parseInt(tokenAmount);
    if (isNaN(amount) || amount === 0 || !tokenReason.trim()) return;
    setAdjusting(true);
    setAdjustMsg(null);
    try {
      const res  = await fetch(`/api/admin/tasks/${task.id}`, {
        method:  "PATCH",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ action: "adjust_tokens", amount, reason: tokenReason }),
      });
      const data = await res.json();
      if (data.ok) {
        setAdjustMsg(`Done — new balance: ${data.newBalance} tokens`);
        setTokenAmount("");
        setTokenReason("");
        router.refresh();
      }
    } finally {
      setAdjusting(false);
    }
  }

  async function handleAdminAction() {
    if (!adminAction || !adminNote.trim()) return;
    setAdminActing(true);
    setAdminMsg(null);
    try {
      const res  = await fetch(`/api/admin/tasks/${task.id}`, {
        method:  "PATCH",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ action: adminAction, note: adminNote }),
      });
      const data = await res.json();
      if (data.ok) {
        setAdminMsg(`Done — task ${adminAction.replace(/_/g, " ")}`);
        setAdminNote("");
        setAdminAction(null);
        router.refresh();
      } else {
        setAdminMsg(data.error ?? "Action failed");
      }
    } finally {
      setAdminActing(false);
    }
  }

  async function handleUrgencyChange(assignmentId: string, urgency: string) {
    await fetch(`/api/admin/tasks/${task.id}`, {
      method:  "PATCH",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ action: "set_urgency", urgency, assignmentId }),
    });
    router.refresh();
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col h-full">
      {/* ── Top bar ────────────────────────────────────────────────────────── */}
      <div
        className="flex items-center gap-3 px-6 py-3.5 border-b flex-shrink-0 bg-white"
        style={{ borderColor: "rgba(0,0,0,0.08)" }}
      >
        <a
          href="/admin/queue"
          className="flex items-center gap-1.5 text-[12px] text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] transition-colors"
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M9 11L5 7l4-4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          Queue
        </a>
        <span style={{ color: "rgba(0,0,0,0.2)" }}>/</span>
        <span className="text-[12px] text-[var(--text-secondary)] font-medium">
          Task {task.id.slice(-8).toUpperCase()}
        </span>

        <div className="flex items-center gap-2 ml-auto">
          {/* Status badge */}
          <span
            className="text-[11px] font-semibold px-2.5 py-1 rounded-full"
            style={{ background: statusCfg.bg, color: statusCfg.color }}
          >
            {statusCfg.label}
          </span>
          {/* Type badge */}
          <span className="badge badge-neutral text-[11px]">
            {TYPE_LABELS[task.type] ?? task.type}
          </span>
        </div>
      </div>

      {/* ── Body ───────────────────────────────────────────────────────────── */}
      <div className="flex flex-1 overflow-hidden">

        {/* ── LEFT PANEL ─────────────────────────────────────────────────── */}
        <div className="flex flex-col flex-1 overflow-hidden border-r" style={{ borderColor: "rgba(0,0,0,0.07)" }}>

          {/* Tab bar */}
          <div
            className="flex gap-0 border-b flex-shrink-0 px-4 bg-white"
            style={{ borderColor: "rgba(0,0,0,0.08)" }}
          >
            {(["chat", "notes", "audit"] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className="px-4 py-3 text-[12px] font-medium capitalize transition-all relative"
                style={{
                  color: activeTab === tab ? "var(--kb-navy)" : "var(--text-tertiary)",
                  borderBottom: activeTab === tab ? "2px solid var(--kb-navy)" : "2px solid transparent",
                }}
              >
                {tab === "notes" ? `Notes (${task.internalNotesJson.length})` : tab === "audit" ? `Audit (${task.auditLog.length})` : "Chat"}
              </button>
            ))}
          </div>

          {/* Tab content */}
          <div className="flex-1 overflow-y-auto">

            {/* ── Chat tab ──────────────────────────────────────────────── */}
            {activeTab === "chat" && (
              <div className="p-5 flex flex-col gap-3">
                {task.chatHistoryJson.length === 0 ? (
                  <div className="text-center text-[var(--text-tertiary)] text-[13px] py-12">
                    No chat history yet
                  </div>
                ) : (
                  task.chatHistoryJson.map((msg, i) => (
                    <div
                      key={i}
                      className={`flex gap-2.5 ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                    >
                      {msg.role === "assistant" && (
                        <div
                          className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5"
                          style={{ background: "var(--kb-navy-light)" }}
                        >
                          <svg width="11" height="11" viewBox="0 0 11 11" fill="none">
                            <circle cx="5.5" cy="5.5" r="4" stroke="var(--kb-navy)" strokeWidth="1.1"/>
                            <path d="M3.5 5.5h4M5.5 3.5v4" stroke="var(--kb-navy)" strokeWidth="1.1" strokeLinecap="round"/>
                          </svg>
                        </div>
                      )}
                      <div
                        className="max-w-[72%] rounded-xl px-3.5 py-2.5 text-[12.5px] leading-relaxed"
                        style={{
                          background:   msg.role === "user" ? "var(--kb-navy)" : "white",
                          color:        msg.role === "user" ? "white" : "var(--text-primary)",
                          border:       msg.role === "assistant" ? "0.5px solid rgba(0,0,0,0.08)" : undefined,
                          borderRadius: msg.role === "user" ? "14px 14px 3px 14px" : "14px 14px 14px 3px",
                        }}
                      >
                        {msg.role === "assistant" ? (
                          <div className="prose prose-sm max-w-none [&>p]:mb-1.5 [&>ul]:pl-4 [&>ul]:mb-1.5">
                            <ReactMarkdown>{msg.content}</ReactMarkdown>
                          </div>
                        ) : (
                          msg.content
                        )}
                        <div
                          className="text-[10px] mt-1.5 opacity-50"
                          style={{ textAlign: msg.role === "user" ? "right" : "left" }}
                        >
                          {fmt(msg.timestamp)}
                        </div>
                      </div>
                      {msg.role === "user" && (
                        <div
                          className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 text-[9px] font-bold text-white"
                          style={{ background: "var(--kb-navy-mid)" }}
                        >
                          {(task.user.displayName ?? task.user.email ?? "U")[0].toUpperCase()}
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            )}

            {/* ── Notes tab ─────────────────────────────────────────────── */}
            {activeTab === "notes" && (
              <div className="p-5">
                {task.internalNotesJson.length === 0 ? (
                  <div className="text-center text-[var(--text-tertiary)] text-[13px] py-12">
                    No internal notes yet
                  </div>
                ) : (
                  <div className="flex flex-col gap-3">
                    {task.internalNotesJson.map((note, i) => (
                      <div
                        key={i}
                        className="card p-4"
                        style={{ borderLeft: "3px solid var(--kb-navy-light)" }}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="text-[11px] font-medium text-[var(--text-secondary)]">
                            Employee {note.employeeId ? note.employeeId.slice(-6).toUpperCase() : "Unknown"}
                          </div>
                          <div className="text-[10px] text-[var(--text-tertiary)]">
                            {note.resolvedAt ? fmt(note.resolvedAt) : "—"}
                          </div>
                        </div>
                        <div className="text-[13px] text-[var(--text-primary)] leading-relaxed">
                          {note.notes}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Resolve panel — shown if this employee has an active assignment */}
                {canResolve && (
                  <div
                    className="mt-5 p-4 rounded-xl border"
                    style={{ background: "var(--status-warn-bg)", borderColor: "#FCD34D" }}
                  >
                    <div className="text-[12px] font-semibold text-[var(--status-warn-text)] mb-2">
                      ⚡ This task is assigned to you — resolve when done
                    </div>
                    <textarea
                      className="input text-[12px] resize-none mb-2"
                      style={{ minHeight: "80px", background: "white" }}
                      placeholder="Resolution notes — required. Describe what you did, any findings, and what happens next."
                      value={resolveNotes}
                      onChange={(e) => setResolveNotes(e.target.value)}
                    />
                    <button
                      onClick={handleResolve}
                      disabled={resolving || !resolveNotes.trim()}
                      className="btn-primary text-[12px] w-full"
                    >
                      {resolving ? "Resolving…" : "Mark resolved → return to AI"}
                    </button>
                  </div>
                )}
              </div>
            )}

                {/* Admin action panel */}
                {isAdmin && !["COMPLETE", "CANCELLED"].includes(task.status) && (
                  <div className="mt-5 p-4 rounded-xl border border-gray-200">
                    <div className="text-[12px] font-semibold text-[var(--text-primary)] mb-3">
                      Admin controls
                    </div>
                    <div className="flex gap-2 mb-3">
                      {(["cancel", "complete", "force_close"] as const).map((a) => (
                        <button
                          key={a}
                          onClick={() => { setAdminAction(a === adminAction ? null : a); setAdminMsg(null); }}
                          className="text-[11px] px-2.5 py-1 rounded-lg border transition-colors"
                          style={{
                            background:  adminAction === a ? (a === "complete" ? "var(--status-success-bg)" : a === "cancel" ? "var(--status-danger-bg)" : "var(--status-warn-bg)") : "transparent",
                            borderColor: adminAction === a ? (a === "complete" ? "var(--status-success-text)" : a === "cancel" ? "var(--status-danger-text)" : "#FCD34D") : "var(--border-default)",
                            color:       adminAction === a ? (a === "complete" ? "var(--status-success-text)" : a === "cancel" ? "var(--status-danger-text)" : "var(--status-warn-text)") : "var(--text-secondary)",
                            fontWeight:  adminAction === a ? 600 : 400,
                          }}
                        >
                          {a === "cancel" ? "Cancel task" : a === "complete" ? "Mark complete" : "Force close"}
                        </button>
                      ))}
                    </div>
                    {adminAction && (
                      <>
                        <textarea
                          className="input text-[12px] resize-none mb-2"
                          style={{ minHeight: "70px", background: "white" }}
                          placeholder={
                            adminAction === "cancel"   ? "Reason for cancellation — required" :
                            adminAction === "complete" ? "Completion note — what was resolved?" :
                                                        "Force close reason — required."
                          }
                          value={adminNote}
                          onChange={(e) => setAdminNote(e.target.value)}
                        />
                        <button
                          onClick={handleAdminAction}
                          disabled={adminActing || !adminNote.trim()}
                          className="text-[12px] w-full py-2 rounded-lg font-medium transition-colors"
                          style={{
                            background: adminAction === "complete" ? "var(--status-success-bg)" : adminAction === "cancel" ? "var(--status-danger-bg)" : "var(--status-warn-bg)",
                            color:      adminAction === "complete" ? "var(--status-success-text)" : adminAction === "cancel" ? "var(--status-danger-text)" : "var(--status-warn-text)",
                            opacity:    (adminActing || !adminNote.trim()) ? 0.5 : 1,
                          }}
                        >
                          {adminActing ? "Processing..." : adminAction === "cancel" ? "Cancel this task" : adminAction === "complete" ? "Mark as complete" : "Force close"}
                        </button>
                      </>
                    )}
                    {adminMsg && (
                      <div className="mt-2 text-[11px] text-[var(--status-success-text)]">{adminMsg}</div>
                    )}
                  </div>
                )}

            {/* ── Audit tab ─────────────────────────────────────────────── */}
            {activeTab === "audit" && (
              <div className="p-5">
                {task.auditLog.length === 0 ? (
                  <div className="text-center text-[var(--text-tertiary)] text-[13px] py-12">
                    No audit events yet
                  </div>
                ) : (
                  <div className="relative">
                    {/* Timeline line */}
                    <div
                      className="absolute left-[7px] top-2 bottom-2 w-px"
                      style={{ background: "rgba(0,0,0,0.08)" }}
                    />
                    <div className="flex flex-col gap-0">
                      {task.auditLog.map((entry) => (
                        <div key={entry.id} className="flex gap-3 pb-4 relative">
                          {/* Dot */}
                          <div
                            className="w-3.5 h-3.5 rounded-full flex-shrink-0 mt-0.5 relative z-10 border-2 border-white"
                            style={{
                              background: entry.actorType === "employee" ? "var(--kb-navy)"
                                : entry.actorType === "user" ? "var(--kb-navy-mid)"
                                : "var(--text-tertiary)",
                            }}
                          />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-0.5">
                              <span className="text-[12px] font-medium text-[var(--text-primary)]">
                                {entry.eventType.replace(/_/g, " ")}
                              </span>
                              <span
                                className="text-[10px] px-1.5 py-0.5 rounded"
                                style={{
                                  background: entry.actorType === "employee" ? "var(--kb-navy-light)"
                                    : entry.actorType === "user" ? "#F3F4F6"
                                    : "var(--surface-page)",
                                  color: entry.actorType === "employee" ? "var(--kb-navy)" : "var(--text-secondary)",
                                }}
                              >
                                {entry.actorType}
                              </span>
                            </div>
                            <div className="text-[11px] text-[var(--text-tertiary)] mb-1">
                              {fmt(entry.createdAt)}
                            </div>
                            {Object.keys(entry.payloadJson).length > 0 && (
                              <div
                                className="text-[11px] font-mono rounded px-2 py-1.5"
                                style={{ background: "var(--surface-page)", color: "var(--text-secondary)" }}
                              >
                                {JSON.stringify(entry.payloadJson, null, 0).slice(0, 200)}
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* ── RIGHT PANEL ────────────────────────────────────────────────── */}
        <div className="w-[320px] flex-shrink-0 overflow-y-auto p-4 flex flex-col gap-4" style={{ background: "var(--surface-page)" }}>

          {/* Task metadata */}
          <Card>
            <SectionLabel>Task info</SectionLabel>
            <div className="flex flex-col gap-2">
              {[
                ["ID",       task.id.slice(-10).toUpperCase()],
                ["Created",  fmtDate(task.createdAt)],
                ["Updated",  fmt(task.lastActivityAt)],
                task.closedAt ? ["Closed", fmt(task.closedAt)] : null,
                ["Est. tokens", task.tokenEstimate != null ? `${task.tokenEstimate}` : "—"],
                ["Actual tokens", task.tokenActual != null ? `${task.tokenActual}` : "—"],
                task.tokenReserved ? ["Reserved", `${task.tokenReserved}`] : null,
                task.escalationReason ? ["Escalation", task.escalationReason] : null,
              ].filter((row): row is string[] => row !== null).map(([label, value]) => (
                <div key={label} className="flex items-start justify-between gap-2">
                  <span className="text-[11px] text-[var(--text-tertiary)] flex-shrink-0">{label}</span>
                  <span className="text-[11px] text-[var(--text-primary)] text-right font-medium break-all">{value}</span>
                </div>
              ))}
            </div>
          </Card>

          {/* User info */}
          <Card>
            <SectionLabel>User</SectionLabel>
            <div className="flex items-center gap-2.5 mb-3">
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center text-[12px] font-semibold text-white flex-shrink-0"
                style={{ background: "var(--kb-navy)" }}
              >
                {(task.user.displayName ?? task.user.email ?? "?")[0].toUpperCase()}
              </div>
              <div className="min-w-0">
                <div className="text-[13px] font-medium text-[var(--text-primary)] truncate">
                  {task.user.displayName ?? "No name"}
                </div>
                <div className="text-[11px] text-[var(--text-secondary)] truncate">{task.user.email}</div>
              </div>
            </div>
            <div className="flex flex-col gap-1.5">
              {[
                ["SOFA",    task.user.sofaDeclaration],
                ["DEROS",   task.user.derosDate ? fmtDate(task.user.derosDate) : "—"],
                ["KR phone", task.user.phoneKr ?? "—"],
                ["US phone", task.user.phoneUs ?? "—"],
                ["Member since", fmtDate(task.user.createdAt)],
              ].map(([label, value]) => (
                <div key={label} className="flex items-center justify-between">
                  <span className="text-[11px] text-[var(--text-tertiary)]">{label}</span>
                  <span
                    className="text-[11px] font-medium"
                    style={{
                      color: label === "SOFA" && value === "VERIFIED_SOFA" ? "var(--status-success-text)"
                        : label === "SOFA" && value === "US_BASED" ? "var(--status-danger-text)"
                        : "var(--text-primary)",
                    }}
                  >
                    {value}
                  </span>
                </div>
              ))}
            </div>
            <a
              href={`/admin/users/${task.user.id}`}
              className="mt-3 text-[11px] font-medium block text-center py-1.5 rounded-lg border transition-colors"
              style={{ color: "var(--kb-navy)", borderColor: "var(--kb-navy-light)", background: "var(--kb-navy-pale)" }}
            >
              View full user profile →
            </a>
          </Card>

          {/* Token ledger */}
          <Card>
            <div className="flex items-center justify-between mb-2">
              <SectionLabel>Token activity</SectionLabel>
              <span className="text-[11px] font-semibold" style={{ color: "var(--kb-navy)" }}>
                Balance: {task.user.tokenBalance}
              </span>
            </div>
            {task.tokenLedger.length === 0 ? (
              <div className="text-[11px] text-[var(--text-tertiary)]">No token activity</div>
            ) : (
              <div className="flex flex-col gap-1.5">
                {task.tokenLedger.map((entry) => {
                  const cfg = TX_CONFIG[entry.txType] ?? { label: entry.txType, color: "#374151" };
                  return (
                    <div key={entry.id} className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span
                          className="text-[9px] font-semibold px-1.5 py-0.5 rounded flex-shrink-0"
                          style={{ background: "var(--surface-page)", color: cfg.color }}
                        >
                          {cfg.label}
                        </span>
                        <span className="text-[11px] text-[var(--text-secondary)] truncate">
                          {entry.description.slice(0, 35)}
                        </span>
                      </div>
                      <span
                        className="text-[11px] font-semibold flex-shrink-0"
                        style={{ color: entry.amount >= 0 ? "var(--status-success-text)" : "var(--status-danger-text)" }}
                      >
                        {entry.amount >= 0 ? "+" : ""}{entry.amount}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Admin token adjustment */}
            {isAdmin && (
              <div
                className="mt-3 pt-3"
                style={{ borderTop: "0.5px solid rgba(0,0,0,0.08)" }}
              >
                <div className="text-[10px] font-semibold text-[var(--text-tertiary)] uppercase tracking-wider mb-2">
                  Admin adjustment
                </div>
                <div className="flex gap-1.5 mb-1.5">
                  <input
                    type="number"
                    className="input text-[12px] h-8"
                    style={{ width: "70px" }}
                    placeholder="±0"
                    value={tokenAmount}
                    onChange={(e) => setTokenAmount(e.target.value)}
                  />
                  <input
                    className="input text-[12px] h-8 flex-1"
                    placeholder="Reason"
                    value={tokenReason}
                    onChange={(e) => setTokenReason(e.target.value)}
                  />
                </div>
                {adjustMsg && (
                  <div className="text-[11px] text-[var(--status-success-text)] mb-1.5">{adjustMsg}</div>
                )}
                <button
                  onClick={handleTokenAdjust}
                  disabled={adjusting || !tokenAmount || !tokenReason.trim()}
                  className="btn-secondary text-[11px] w-full h-8"
                >
                  {adjusting ? "Applying…" : "Apply adjustment"}
                </button>
              </div>
            )}
          </Card>

          {/* Payments */}
          {task.payments.length > 0 && (
            <Card>
              <SectionLabel>Payments ({task.payments.length})</SectionLabel>
              <div className="flex flex-col gap-3">
                {task.payments.map((p) => (
                  <div key={p.id} style={{ borderTop: "0.5px solid rgba(0,0,0,0.07)", paddingTop: "10px" }}
                    className="first:border-0 first:pt-0"
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span
                        className="text-[10px] font-semibold px-1.5 py-0.5 rounded"
                        style={{
                          background: p.status === "CONFIRMED" ? "var(--status-success-bg)"
                            : p.status === "FAILED" ? "var(--status-danger-bg)"
                            : "var(--status-warn-bg)",
                          color: p.status === "CONFIRMED" ? "var(--status-success-text)"
                            : p.status === "FAILED" ? "var(--status-danger-text)"
                            : "var(--status-warn-text)",
                        }}
                      >
                        {p.status}
                      </span>
                      <span className="text-[10px] text-[var(--text-tertiary)]">{p.gateway}</span>
                    </div>
                    {[
                      ["Amount", `$${parseFloat(p.amountUsd).toFixed(2)}`],
                      ["Fee",    `$${parseFloat(p.feeUsd).toFixed(2)} (${(parseFloat(p.feePct) * 100).toFixed(1)}%)`],
                      ["KRW",    `₩${parseInt(p.amountKrw).toLocaleString()}`],
                      ["Memo",   p.memo],
                      p.gatewayRef ? ["Ref", p.gatewayRef] : null,
                      ["Initiated", fmt(p.initiatedAt)],
                      p.confirmedAt ? ["Confirmed", fmt(p.confirmedAt)] : null,
                    ].filter((row): row is string[] => row !== null).map(([label, value]) => (
                      <div key={label} className="flex items-center justify-between gap-2">
                        <span className="text-[10px] text-[var(--text-tertiary)]">{label}</span>
                        <span className="text-[10px] font-medium text-[var(--text-primary)] text-right break-all">
                          {value}
                        </span>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* Assignments */}
          {task.assignments.length > 0 && (
            <Card>
              <SectionLabel>Assignment history</SectionLabel>
              <div className="flex flex-col gap-2.5">
                {task.assignments.map((a) => {
                  const urg = URGENCY_CONFIG[a.urgency] ?? URGENCY_CONFIG.MEDIUM;
                  const isActive = a.status === "IN_PROGRESS" || a.status === "ASSIGNED";
                  return (
                    <div
                      key={a.id}
                      className="p-2.5 rounded-lg"
                      style={{
                        background: isActive ? "var(--kb-navy-pale)" : "var(--surface-page)",
                        border: isActive ? "1px solid var(--kb-navy-light)" : "1px solid rgba(0,0,0,0.06)",
                      }}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[12px] font-medium text-[var(--text-primary)]">
                          {a.employee.name}
                        </span>
                        <div className="flex items-center gap-1.5">
                          <span
                            className="text-[9px] font-semibold px-1.5 py-0.5 rounded"
                            style={{ background: urg.bg, color: urg.color }}
                          >
                            {urg.label}
                          </span>
                          {/* Urgency selector for active admin */}
                          {isAdmin && isActive && (
                            <select
                              className="text-[9px] rounded border border-black/[0.10] px-1 py-0.5 bg-white"
                              value={a.urgency}
                              onChange={(e) => handleUrgencyChange(a.id, e.target.value)}
                            >
                              {["LOW", "MEDIUM", "HIGH", "CRITICAL"].map((u) => (
                                <option key={u} value={u}>{u}</option>
                              ))}
                            </select>
                          )}
                        </div>
                      </div>
                      <div className="text-[10px] text-[var(--text-tertiary)] mb-1">
                        {a.status} · Assigned {fmt(a.assignedAt)}
                        {a.resolvedAt && ` · Resolved ${fmt(a.resolvedAt)}`}
                      </div>
                      {a.notes && (
                        <div className="text-[11px] text-[var(--text-secondary)] leading-snug">
                          {a.notes}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </Card>
          )}

          {/* Outcome */}
          {task.outcomeJson && Object.keys(task.outcomeJson).length > 0 && (
            <Card>
              <SectionLabel>Outcome</SectionLabel>
              <pre className="text-[10px] text-[var(--text-secondary)] whitespace-pre-wrap break-all font-mono leading-relaxed">
                {JSON.stringify(task.outcomeJson, null, 2)}
              </pre>
            </Card>
          )}

        </div>
      </div>
    </div>
  );
}
