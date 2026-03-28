"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";

// ─── Types ────────────────────────────────────────────────────────────────────

interface TaskRow {
  id:             string;
  type:           string;
  status:         string;
  tokenEstimate:  number | null;
  tokenActual:    number | null;
  requiresHuman:  boolean;
  createdAt:      string;
  closedAt:       string | null;
  lastActivityAt: string;
}

interface TokenEntry {
  id:           string;
  txType:       string;
  amount:       number;
  balanceAfter: number;
  description:  string;
  createdAt:    string;
}

interface PaymentRow {
  id:          string;
  amountUsd:   string;
  feeUsd:      string;
  status:      string;
  gateway:     string;
  routeType:   string;
  memo:        string;
  initiatedAt: string;
  confirmedAt: string | null;
}

interface UserDetail {
  id:               string;
  displayName:      string | null;
  email:            string | null;
  tokenBalance:     number;
  sofaDeclaration:  string;
  derosDate:        string | null;
  phoneKr:          string | null;
  phoneUs:          string | null;
  addressJson:      Record<string, string> | null;
  preferencesJson:  Record<string, boolean> | null;
  consentFlagsJson: Record<string, boolean> | null;
  referralCode:     string | null;
  referredByCode:   string | null;
  stripeCustomerId: string | null;
  createdAt:        string;
  lastActiveAt:     string;
  tasks:            TaskRow[];
  tokenLedger:      TokenEntry[];
  payments:         PaymentRow[];
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

const SOFA_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  US_BASED:     { label: "Not verified", color: "#633806", bg: "#FAEEDA" },
  PENDING_SOFA:  { label: "Pending SOFA", color: "#854D0E", bg: "#FEF9C3" },
  VERIFIED_SOFA: { label: "Verified",     color: "#085041", bg: "#E1F5EE" },
};

const TX_CONFIG: Record<string, { label: string; color: string }> = {
  PURCHASE:             { label: "Purchase",   color: "#085041" },
  BURN:                 { label: "Burn",       color: "#7A1010" },
  RESERVATION:          { label: "Reserved",  color: "#633806" },
  RESERVATION_RELEASE:  { label: "Released",  color: "#085041" },
  REFUND:               { label: "Refund",    color: "#085041" },
  ADMIN_ADJUSTMENT:     { label: "Admin adj", color: "#1B3A6B" },
  BONUS:                { label: "Bonus",     color: "#085041" },
};

const TYPE_LABELS: Record<string, string> = {
  RECURRING_SETUP:     "Recurring setup",
  RECURRING_EXECUTION: "Recurring execution",
  ONE_OFF_PAYMENT:     "One-off payment",
  SERVICE_BOOKING:     "Service booking",
  INQUIRY:             "Inquiry",
  OTHER:               "Other",
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmt(d: string) {
  return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function fmtTime(d: string) {
  return new Date(d).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-[10px] font-semibold text-[var(--text-tertiary)] uppercase tracking-wider mb-2">
      {children}
    </div>
  );
}

function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={`card p-4 ${className}`}>{children}</div>;
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function AdminUserDetailPage() {
  const params = useParams();
  const router = useRouter();
  const userId = params.id as string;

  const [user,        setUser]        = useState<UserDetail | null>(null);
  const [loading,     setLoading]     = useState(true);
  const [activeTab,   setActiveTab]   = useState<"tasks" | "tokens" | "payments">("tasks");

  // Admin actions state
  const [tokenAmount,   setTokenAmount]   = useState("");
  const [tokenReason,   setTokenReason]   = useState("");
  const [adjusting,     setAdjusting]     = useState(false);
  const [adjustMsg,     setAdjustMsg]     = useState<string | null>(null);
  const [sofaUpdating,  setSofaUpdating]  = useState(false);
  const [suspendReason, setSuspendReason] = useState("");
  const [suspending,    setSuspending]    = useState(false);
  const [confirmSuspend, setConfirmSuspend] = useState(false);

  useEffect(() => {
    fetch(`/api/admin/users/${userId}`)
      .then((r) => r.json())
      .then((d) => { setUser(d.user); setLoading(false); })
      .catch(() => setLoading(false));
  }, [userId]);

  async function reload() {
    const res  = await fetch(`/api/admin/users/${userId}`);
    const data = await res.json();
    setUser(data.user);
  }

  async function handleTokenAdjust() {
    const amount = parseInt(tokenAmount);
    if (isNaN(amount) || amount === 0 || !tokenReason.trim()) return;
    setAdjusting(true);
    setAdjustMsg(null);
    const res  = await fetch(`/api/admin/users/${userId}`, {
      method:  "PATCH",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ action: "adjust_tokens", amount, reason: tokenReason }),
    });
    const data = await res.json();
    if (data.ok) {
      setAdjustMsg(`Done — new balance: ${data.newBalance} tokens`);
      setTokenAmount("");
      setTokenReason("");
      await reload();
    }
    setAdjusting(false);
  }

  async function handleSofaChange(status: string) {
    setSofaUpdating(true);
    await fetch(`/api/admin/users/${userId}`, {
      method:  "PATCH",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ action: "set_sofa", status }),
    });
    await reload();
    setSofaUpdating(false);
  }

  async function handleSuspend() {
    if (!suspendReason.trim()) return;
    setSuspending(true);
    await fetch(`/api/admin/users/${userId}`, {
      method:  "PATCH",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ action: "suspend", reason: suspendReason }),
    });
    setConfirmSuspend(false);
    setSuspendReason("");
    setSuspending(false);
    await reload();
  }

  // ── Loading ────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="p-6 max-w-5xl mx-auto">
        <div className="text-[13px] text-[var(--text-tertiary)] animate-pulse">Loading user…</div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="p-6 max-w-5xl mx-auto">
        <div className="text-[13px] text-[var(--kb-red)]">User not found.</div>
      </div>
    );
  }

  const sofaCfg         = SOFA_CONFIG[user.sofaDeclaration] ?? SOFA_CONFIG.US_BASED;
  const derosExpired    = user.derosDate && new Date(user.derosDate) < new Date();
  const activeTasks     = user.tasks.filter((t) => !["COMPLETE", "CANCELLED", "FAILED"].includes(t.status));
  const completedTasks  = user.tasks.filter((t) => t.status === "COMPLETE");
  const address         = user.addressJson as Record<string, string> | null;
  const prefs           = user.preferencesJson ?? {};
  const consent         = user.consentFlagsJson ?? {};

  return (
    <div className="p-6 max-w-5xl mx-auto">

      {/* ── Breadcrumb ──────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-2 mb-5 text-[12px]">
        <a
          href="/admin/users"
          className="text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] transition-colors"
        >
          Users
        </a>
        <span style={{ color: "rgba(0,0,0,0.2)" }}>/</span>
        <span className="text-[var(--text-secondary)] font-medium">
          {user.displayName ?? user.email ?? user.id.slice(-8).toUpperCase()}
        </span>
      </div>

      <div className="flex gap-5 items-start">

        {/* ── LEFT: main content ──────────────────────────────────────────── */}
        <div className="flex-1 min-w-0 flex flex-col gap-4">

          {/* Profile header */}
          <Card>
            <div className="flex items-start gap-3">
              <div
                className="w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold text-white flex-shrink-0"
                style={{ background: "var(--kb-navy)" }}
              >
                {(user.displayName ?? user.email ?? "?")[0].toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-[16px] font-semibold text-[var(--text-primary)]">
                    {user.displayName ?? <span className="text-[var(--text-tertiary)]">No name set</span>}
                  </h2>
                  <span
                    className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                    style={{ background: sofaCfg.bg, color: sofaCfg.color }}
                  >
                    SOFA {sofaCfg.label}
                  </span>
                </div>
                <div className="text-[12px] text-[var(--text-secondary)] mt-0.5">{user.email}</div>
                <div className="flex items-center gap-3 mt-2 flex-wrap">
                  <span className="text-[11px] text-[var(--text-tertiary)]">
                    Joined {fmt(user.createdAt)}
                  </span>
                  <span className="text-[11px] text-[var(--text-tertiary)]">·</span>
                  <span className="text-[11px] text-[var(--text-tertiary)]">
                    Last active {fmtTime(user.lastActiveAt)}
                  </span>
                  <span className="text-[11px] text-[var(--text-tertiary)]">·</span>
                  <span
                    className="text-[11px] font-semibold"
                    style={{ color: user.tokenBalance < 3 ? "var(--kb-red)" : "var(--kb-navy)" }}
                  >
                    {user.tokenBalance} tokens
                  </span>
                </div>
              </div>
            </div>
          </Card>

          {/* Profile details */}
          <Card>
            <SectionLabel>Profile details</SectionLabel>
            <div className="grid grid-cols-2 gap-x-6 gap-y-2">
              {[
                ["Phone (KR)",  user.phoneKr ?? "—"],
                ["Phone (US)",  user.phoneUs ?? "—"],
                ["DEROS",       user.derosDate ? `${fmt(user.derosDate)}${derosExpired ? " ⚠ expired" : ""}` : "—"],
                ["Base",        address?.base ?? "—"],
                ["Address",     address?.street ? `${address.street}, ${address.city ?? ""}` : "—"],
                ["Referral code", user.referralCode ?? "—"],
                ["Referred by",   user.referredByCode ?? "—"],
                ["Stripe ID",     user.stripeCustomerId ? user.stripeCustomerId.slice(0, 18) + "…" : "—"],
              ].map(([label, value]) => (
                <div key={label} className="flex flex-col">
                  <span className="text-[10px] text-[var(--text-tertiary)] mb-0.5">{label}</span>
                  <span
                    className="text-[12px] font-medium"
                    style={{ color: (label === "DEROS" && derosExpired) ? "var(--kb-red)" : "var(--text-primary)" }}
                  >
                    {value}
                  </span>
                </div>
              ))}
            </div>

            {/* Consent + preferences */}
            <div className="mt-4 pt-3" style={{ borderTop: "0.5px solid rgba(0,0,0,0.07)" }}>
              <div className="flex items-center gap-4 flex-wrap">
                {[
                  ["Data retention", consent.dataRetention],
                  ["Personalisation", consent.usePreferences],
                  ["Marketing", consent.marketing],
                  ["Has kids", prefs.hasKids],
                  ["Has pets", prefs.hasPets],
                ].map(([label, val]) => (
                  <div key={label as string} className="flex items-center gap-1.5">
                    <div
                      className="w-2 h-2 rounded-full"
                      style={{ background: val ? "var(--status-success-text)" : "var(--text-tertiary)" }}
                    />
                    <span className="text-[11px] text-[var(--text-secondary)]">{label as string}</span>
                  </div>
                ))}
              </div>
            </div>
          </Card>

          {/* Tasks / Tokens / Payments tabs */}
          <Card className="overflow-hidden p-0">
            {/* Tab bar */}
            <div
              className="flex border-b"
              style={{ borderColor: "rgba(0,0,0,0.08)", background: "var(--surface-page)" }}
            >
              {([
                ["tasks",    `Tasks (${user.tasks.length})`],
                ["tokens",   `Token history (${user.tokenLedger.length})`],
                ["payments", `Payments (${user.payments.length})`],
              ] as const).map(([tab, label]) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className="px-4 py-3 text-[12px] font-medium transition-all"
                  style={{
                    color:        activeTab === tab ? "var(--kb-navy)" : "var(--text-tertiary)",
                    borderBottom: activeTab === tab ? "2px solid var(--kb-navy)" : "2px solid transparent",
                    background:   activeTab === tab ? "white" : "transparent",
                  }}
                >
                  {label}
                </button>
              ))}
            </div>

            <div className="p-4">

              {/* Tasks tab */}
              {activeTab === "tasks" && (
                <div>
                  {user.tasks.length === 0 ? (
                    <div className="text-[13px] text-[var(--text-tertiary)] text-center py-8">No tasks yet</div>
                  ) : (
                    <div className="flex flex-col gap-2">
                      {user.tasks.map((task) => {
                        const sc = STATUS_CONFIG[task.status] ?? STATUS_CONFIG.OPEN;
                        return (
                          <a
                            key={task.id}
                            href={`/admin/tasks/${task.id}`}
                            className="flex items-center gap-3 p-3 rounded-lg border transition-colors hover:border-[var(--kb-navy-light)]"
                            style={{ borderColor: "rgba(0,0,0,0.07)" }}
                          >
                            <span
                              className="text-[10px] font-semibold px-2 py-0.5 rounded-full flex-shrink-0"
                              style={{ background: sc.bg, color: sc.color }}
                            >
                              {sc.label}
                            </span>
                            <span className="text-[12px] text-[var(--text-secondary)] flex-shrink-0">
                              {TYPE_LABELS[task.type] ?? task.type}
                            </span>
                            <span className="text-[11px] text-[var(--text-tertiary)] flex-1 text-right">
                              {fmtTime(task.lastActivityAt)}
                            </span>
                            {task.tokenActual != null && (
                              <span className="text-[11px] text-[var(--text-tertiary)]">
                                {task.tokenActual}t
                              </span>
                            )}
                            {task.requiresHuman && (
                              <span className="text-[10px] px-1.5 py-0.5 rounded" style={{ background: "#FAEEDA", color: "#633806" }}>
                                Human
                              </span>
                            )}
                            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" className="flex-shrink-0">
                              <path d="M4 9l3-3-3-3" stroke="var(--text-tertiary)" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                          </a>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* Token history tab */}
              {activeTab === "tokens" && (
                <div>
                  {user.tokenLedger.length === 0 ? (
                    <div className="text-[13px] text-[var(--text-tertiary)] text-center py-8">No token history</div>
                  ) : (
                    <div className="flex flex-col gap-1.5">
                      {user.tokenLedger.map((entry) => {
                        const cfg = TX_CONFIG[entry.txType] ?? { label: entry.txType, color: "#374151" };
                        return (
                          <div
                            key={entry.id}
                            className="flex items-center gap-3 py-2 px-3 rounded-lg"
                            style={{ background: "var(--surface-page)" }}
                          >
                            <span
                              className="text-[9px] font-semibold px-1.5 py-0.5 rounded flex-shrink-0"
                              style={{ background: "white", color: cfg.color, border: "0.5px solid rgba(0,0,0,0.1)" }}
                            >
                              {cfg.label}
                            </span>
                            <span className="text-[12px] text-[var(--text-secondary)] flex-1 truncate">
                              {entry.description}
                            </span>
                            <span className="text-[11px] text-[var(--text-tertiary)] flex-shrink-0">
                              {fmtTime(entry.createdAt)}
                            </span>
                            <span
                              className="text-[12px] font-semibold flex-shrink-0 w-10 text-right"
                              style={{ color: entry.amount >= 0 ? "var(--status-success-text)" : "var(--status-danger-text)" }}
                            >
                              {entry.amount >= 0 ? "+" : ""}{entry.amount}
                            </span>
                            <span className="text-[11px] text-[var(--text-tertiary)] flex-shrink-0 w-12 text-right">
                              → {entry.balanceAfter}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* Payments tab */}
              {activeTab === "payments" && (
                <div>
                  {user.payments.length === 0 ? (
                    <div className="text-[13px] text-[var(--text-tertiary)] text-center py-8">No payments</div>
                  ) : (
                    <div className="flex flex-col gap-2">
                      {user.payments.map((p) => (
                        <div
                          key={p.id}
                          className="flex items-center gap-3 p-3 rounded-lg border"
                          style={{ borderColor: "rgba(0,0,0,0.07)" }}
                        >
                          <span
                            className="text-[10px] font-semibold px-1.5 py-0.5 rounded flex-shrink-0"
                            style={{
                              background: p.status === "CONFIRMED" ? "var(--status-success-bg)"
                                : p.status === "FAILED" ? "var(--status-danger-bg)" : "var(--status-warn-bg)",
                              color: p.status === "CONFIRMED" ? "var(--status-success-text)"
                                : p.status === "FAILED" ? "var(--status-danger-text)" : "var(--status-warn-text)",
                            }}
                          >
                            {p.status}
                          </span>
                          <span className="text-[13px] font-semibold text-[var(--text-primary)]">
                            ${parseFloat(p.amountUsd).toFixed(2)}
                          </span>
                          <span className="text-[11px] text-[var(--text-tertiary)]">+${parseFloat(p.feeUsd).toFixed(2)} fee</span>
                          <span className="text-[11px] text-[var(--text-secondary)] flex-1">{p.gateway} · {p.memo}</span>
                          <span className="text-[11px] text-[var(--text-tertiary)]">{fmtTime(p.initiatedAt)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </Card>
        </div>

        {/* ── RIGHT: admin actions sidebar ────────────────────────────────── */}
        <div className="w-[260px] flex-shrink-0 flex flex-col gap-4">

          {/* Quick stats */}
          <Card>
            <SectionLabel>Account stats</SectionLabel>
            <div className="grid grid-cols-2 gap-2">
              {[
                ["Balance",   `${user.tokenBalance} tokens`],
                ["Tasks",     String(user.tasks.length)],
                ["Active",    String(activeTasks.length)],
                ["Completed", String(completedTasks.length)],
              ].map(([label, value]) => (
                <div key={label} className="p-2.5 rounded-lg" style={{ background: "var(--surface-page)" }}>
                  <div className="text-[10px] text-[var(--text-tertiary)] mb-0.5">{label}</div>
                  <div className="text-[15px] font-semibold text-[var(--text-primary)]">{value}</div>
                </div>
              ))}
            </div>
          </Card>

          {/* SOFA status */}
          <Card>
            <SectionLabel>SOFA status</SectionLabel>
            <div
              className="text-[11px] font-semibold px-2.5 py-1.5 rounded-lg text-center mb-3"
              style={{ background: sofaCfg.bg, color: sofaCfg.color }}
            >
              Currently: {sofaCfg.label}
            </div>
            <div className="flex flex-col gap-1.5">
              {["US_BASED", "PENDING_SOFA", "VERIFIED_SOFA"].map((status) => {
                const cfg = SOFA_CONFIG[status];
                const isCurrent = user.sofaDeclaration === status;
                return (
                  <button
                    key={status}
                    onClick={() => !isCurrent && handleSofaChange(status)}
                    disabled={isCurrent || sofaUpdating}
                    className="w-full text-[12px] py-2 rounded-lg font-medium transition-all disabled:cursor-not-allowed"
                    style={{
                      background:  isCurrent ? cfg.bg : "var(--surface-page)",
                      color:       isCurrent ? cfg.color : "var(--text-secondary)",
                      border:      `1px solid ${isCurrent ? "transparent" : "rgba(0,0,0,0.08)"}`,
                      opacity:     sofaUpdating ? 0.6 : 1,
                    }}
                  >
                    {isCurrent ? `✓ ${cfg.label}` : `Set ${cfg.label}`}
                  </button>
                );
              })}
            </div>
          </Card>

          {/* Token adjustment */}
          <Card>
            <SectionLabel>Token adjustment</SectionLabel>
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
          </Card>

          {/* Danger zone */}
          <Card>
            <SectionLabel>Danger zone</SectionLabel>
            {!confirmSuspend ? (
              <button
                onClick={() => setConfirmSuspend(true)}
                className="w-full text-[12px] py-2 rounded-lg font-medium transition-all"
                style={{ background: "var(--status-danger-bg)", color: "var(--status-danger-text)", border: "1px solid #FCA5A5" }}
              >
                Suspend account
              </button>
            ) : (
              <div>
                <div className="text-[11px] text-[var(--status-danger-text)] mb-2 font-medium">
                  This will pause all active recurring payments. Enter reason:
                </div>
                <textarea
                  className="input text-[12px] resize-none mb-2"
                  style={{ minHeight: "60px" }}
                  placeholder="Reason for suspension…"
                  value={suspendReason}
                  onChange={(e) => setSuspendReason(e.target.value)}
                />
                <div className="flex gap-1.5">
                  <button
                    onClick={() => setConfirmSuspend(false)}
                    className="btn-secondary text-[11px] flex-1 h-8"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSuspend}
                    disabled={suspending || !suspendReason.trim()}
                    className="text-[11px] flex-1 h-8 rounded-lg font-medium transition-all disabled:opacity-50"
                    style={{ background: "var(--kb-red)", color: "white" }}
                  >
                    {suspending ? "Suspending…" : "Confirm"}
                  </button>
                </div>
              </div>
            )}
          </Card>

        </div>
      </div>
    </div>
  );
}
