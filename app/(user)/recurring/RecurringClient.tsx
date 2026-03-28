"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const PAUSED_LABELS: Record<string, string> = {
  INSUFFICIENT_TOKENS: "Paused — low tokens",
  PAYMENT_FAILED:      "Paused — payment failed",
  USER_PAUSED:         "Paused by you",
  ADMIN_PAUSED:        "Paused by admin",
};

const TYPE_ICONS: Record<string, React.ReactNode> = {
  RENT:    <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M2 6.5L7 2l5 4.5V12a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V6.5z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round"/></svg>,
  PHONE:   <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><rect x="4" y="1" width="6" height="12" rx="1.5" stroke="currentColor" strokeWidth="1.2"/><circle cx="7" cy="10.5" r="0.7" fill="currentColor"/></svg>,
  DAYCARE: <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><circle cx="7" cy="5" r="2.5" stroke="currentColor" strokeWidth="1.2"/><path d="M2 12c0-2.5 2.2-4 5-4s5 1.5 5 4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/></svg>,
  UTILITY: <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M7 1v4l2.5 1.5L7 8v5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/><path d="M4 4.5L7 5l1.5-3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/></svg>,
  OTHER:   <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><circle cx="4" cy="7" r="1" fill="currentColor"/><circle cx="7" cy="7" r="1" fill="currentColor"/><circle cx="10" cy="7" r="1" fill="currentColor"/></svg>,
};

export default function RecurringClient({
  recurrings,
  tokenBalance,
}: {
  recurrings:   any[];
  tokenBalance: number;
}) {
  const router   = useRouter();
  const [busy, setBusy] = useState<string | null>(null);

  async function togglePause(id: string, currentlyActive: boolean) {
    setBusy(id);
    await fetch(`/api/recurring/${id}/pause`, {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ pause: currentlyActive }),
    });
    setBusy(null);
    router.refresh();
  }

  if (recurrings.length === 0) {
    return (
      <div className="card p-12 text-center">
        <div className="text-[var(--text-tertiary)] text-sm mb-2">No recurring payments set up yet</div>
        <div className="text-[var(--text-secondary)] text-xs">
          Start a new task from the dashboard and choose "Recurring payment"
        </div>
      </div>
    );
  }

  const active  = recurrings.filter((r) => r.isActive);
  const paused  = recurrings.filter((r) => !r.isActive);

  return (
    <div className="flex flex-col gap-6">
      {active.length > 0 && (
        <section>
          <div className="section-label">Active ({active.length})</div>
          <div className="flex flex-col gap-2">
            {active.map((r) => (
              <RecurringRow
                key={r.id}
                r={r}
                tokenBalance={tokenBalance}
                busy={busy}
                onToggle={togglePause}
              />
            ))}
          </div>
        </section>
      )}

      {paused.length > 0 && (
        <section>
          <div className="section-label">Paused ({paused.length})</div>
          <div className="flex flex-col gap-2">
            {paused.map((r) => (
              <RecurringRow
                key={r.id}
                r={r}
                tokenBalance={tokenBalance}
                busy={busy}
                onToggle={togglePause}
              />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function RecurringRow({
  r,
  tokenBalance,
  busy,
  onToggle,
}: {
  r:            any;
  tokenBalance: number;
  busy:         string | null;
  onToggle:     (id: string, active: boolean) => void;
}) {
  const isLowToken  = r.isActive && tokenBalance < 3;
  const isPaused    = !r.isActive;
  const pauseLabel  = PAUSED_LABELS[r.pausedReason] ?? "Paused";
  const nextDate    = r.nextRunAt ? new Date(r.nextRunAt) : null;
  const amount      = parseFloat(r.amountUsd.toString());

  return (
    <div
      className="card p-4 flex items-center gap-4"
      style={{ borderColor: isLowToken ? "#E9B3B3" : isPaused ? "rgba(0,0,0,0.06)" : undefined,
               opacity: isPaused ? 0.75 : 1 }}
    >
      {/* Type icon */}
      <div
        className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
        style={{ background: "var(--kb-navy-light)", color: "var(--kb-navy)" }}
      >
        {TYPE_ICONS[r.type] ?? TYPE_ICONS.OTHER}
      </div>

      {/* Details */}
      <div className="flex-1 min-w-0">
        <div className="text-[13px] font-medium text-[var(--text-primary)] truncate">{r.label}</div>
        <div className="flex items-center gap-2 mt-0.5">
          <span className="text-[11px] text-[var(--text-secondary)]">
            {r.gateway === "ACH_RECURRING" ? "Bank transfer" : "Card"} · Day {r.preferredDay} of month
          </span>
          {nextDate && r.isActive && (
            <>
              <span className="text-[var(--text-tertiary)] text-[11px]">·</span>
              <span className="text-[11px] text-[var(--text-secondary)]">
                Next: {nextDate.toLocaleDateString("en-US", { month: "short", day: "numeric" })}
              </span>
            </>
          )}
        </div>
        {isPaused && (
          <div className="text-[11px] mt-0.5" style={{ color: "var(--kb-red)" }}>
            {pauseLabel}
            {r.pausedReason === "INSUFFICIENT_TOKENS" && (
              <a href="/tokens" className="ml-2 font-medium underline">
                Top up →
              </a>
            )}
          </div>
        )}
        {isLowToken && (
          <div className="text-[11px] mt-0.5" style={{ color: "var(--kb-red)" }}>
            Low tokens — top up before {nextDate?.toLocaleDateString("en-US", { month: "short", day: "numeric" })}
          </div>
        )}
      </div>

      {/* Amount */}
      <div className="text-[14px] font-semibold text-[var(--text-primary)] flex-shrink-0">
        ${amount.toLocaleString("en-US", { minimumFractionDigits: 2 })}
        <span className="text-[10px] font-normal text-[var(--text-tertiary)] ml-1">/mo</span>
      </div>

      {/* Pause/resume toggle */}
      <button
        onClick={() => onToggle(r.id, r.isActive)}
        disabled={busy === r.id}
        className="text-[12px] px-3 py-1.5 rounded-lg border transition-all disabled:opacity-50 flex-shrink-0"
        style={{
          borderColor: "rgba(0,0,0,0.12)",
          color:       isPaused ? "var(--kb-navy)" : "var(--text-secondary)",
          background:  isPaused ? "var(--kb-navy-light)" : "transparent",
          fontWeight:  isPaused ? 500 : 400,
        }}
      >
        {busy === r.id ? "…" : isPaused ? "Resume" : "Pause"}
      </button>
    </div>
  );
}
