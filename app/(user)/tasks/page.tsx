// app/(user)/tasks/page.tsx
// My Tasks — full task list with active / history / token history tabs

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import Link from "next/link";

// ── Constants ─────────────────────────────────────────────────────────────────

const ACTIVE_STATUSES = [
  "OPEN",
  "CLARIFYING",
  "AI_PROCESSING",
  "PENDING_HUMAN",
  "PENDING_USER",
  "PAYMENT_PENDING",
] as const;

const TERMINAL_STATUSES = ["COMPLETE", "CANCELLED", "FAILED"] as const;

const STATUS_CONFIG: Record<string, { label: string; badgeClass: string }> = {
  OPEN:            { label: "Open",            badgeClass: "badge-neutral" },
  CLARIFYING:      { label: "AI chatting",     badgeClass: "badge-neutral" },
  AI_PROCESSING:   { label: "AI processing",   badgeClass: "badge-neutral" },
  PENDING_HUMAN:   { label: "Employee review", badgeClass: "badge-warn"    },
  PENDING_USER:    { label: "Your action",     badgeClass: "badge-navy"    },
  PAYMENT_PENDING: { label: "Payment sending", badgeClass: "badge-neutral" },
  COMPLETE:        { label: "Complete",        badgeClass: "badge-success" },
  CANCELLED:       { label: "Cancelled",       badgeClass: "badge-neutral" },
  FAILED:          { label: "Failed",          badgeClass: "badge-danger"  },
};

const TYPE_LABELS: Record<string, string> = {
  RECURRING_SETUP:     "Recurring setup",
  RECURRING_EXECUTION: "Recurring payment",
  ONE_OFF_PAYMENT:     "One-off payment",
  SERVICE_BOOKING:     "Service booking",
  INQUIRY:             "Inquiry",
  OTHER:               "Task",
};

const TX_LABELS: Record<string, string> = {
  PURCHASE:             "Purchase",
  BURN:                 "Task",
  BONUS:                "Bonus",
  REFUND:               "Refund",
  RESERVATION:          "Reserved",
  RESERVATION_RELEASE:  "Released",
  ADMIN_ADJUSTMENT:     "Adjustment",
};

const TX_BADGE: Record<string, string> = {
  PURCHASE:             "badge-navy",
  BURN:                 "badge-neutral",
  BONUS:                "badge-success",
  REFUND:               "badge-success",
  RESERVATION:          "badge-neutral",
  RESERVATION_RELEASE:  "badge-neutral",
  ADMIN_ADJUSTMENT:     "badge-warn",
};

// ── Page ───────────────────────────────────────────────────────────────────────

export default async function TasksPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/auth/login");

  const userId = session.user.id;
  const params = await searchParams;
  const filter =
    params.filter === "history"
      ? "history"
      : params.filter === "tokens"
      ? "tokens"
      : "active";

  const isActive  = filter === "active";
  const isHistory = filter === "history";
  const isTokens  = filter === "tokens";

  // Fetch tasks (skipped on tokens tab)
  const [tasks, activeCount, historyCount] = await Promise.all([
    isTokens
      ? Promise.resolve([])
      : db.task.findMany({
          where: {
            userId,
            status: { in: isActive ? [...ACTIVE_STATUSES] : [...TERMINAL_STATUSES] },
          },
          orderBy: { lastActivityAt: "desc" },
          select: {
            id:              true,
            type:            true,
            status:          true,
            tokenEstimate:   true,
            tokenActual:     true,
            chatHistoryJson: true,
            createdAt:       true,
            closedAt:        true,
            requiresHuman:   true,
            payments: isHistory
              ? {
                  where:  { status: "CONFIRMED" },
                  select: { amountUsd: true, feeUsd: true, routeType: true },
                  take:   1,
                }
              : false,
          },
        }),
    db.task.count({ where: { userId, status: { in: [...ACTIVE_STATUSES] } } }),
    db.task.count({ where: { userId, status: { in: [...TERMINAL_STATUSES] } } }),
  ]);

  // Fetch ledger (tokens tab only)
  const ledgerEntries = isTokens
    ? await db.tokenLedger.findMany({
        where:   { userId },
        orderBy: { createdAt: "desc" },
        take:    100,
      })
    : [];

  return (
    <div className="p-6 max-w-4xl mx-auto animate-fade-in">
      {/* Header */}
      <div className="mb-5">
        <h1 className="text-xl font-semibold text-[var(--text-primary)]">My tasks</h1>
        <p className="text-sm text-[var(--text-secondary)] mt-0.5">
          All your K-Bridge requests in one place
        </p>
      </div>

      {/* Filter tabs */}
      <div
        className="flex gap-1 mb-5 p-1 rounded-lg w-fit"
        style={{ background: "var(--surface-page)" }}
      >
        <Link
          href="/tasks?filter=active"
          className="flex items-center gap-2 px-3 py-1.5 rounded-md text-[13px] font-medium transition-all duration-100"
          style={{
            background: isActive ? "var(--surface-card)" : "transparent",
            color:      isActive ? "var(--text-primary)" : "var(--text-secondary)",
            boxShadow:  isActive ? "0 1px 2px rgba(0,0,0,0.06)" : "none",
          }}
        >
          Active
          {activeCount > 0 && (
            <span
              className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full"
              style={{
                background: isActive ? "var(--kb-navy)" : "rgba(0,0,0,0.08)",
                color:      isActive ? "#fff" : "var(--text-tertiary)",
              }}
            >
              {activeCount}
            </span>
          )}
        </Link>

        <Link
          href="/tasks?filter=history"
          className="flex items-center gap-2 px-3 py-1.5 rounded-md text-[13px] font-medium transition-all duration-100"
          style={{
            background: isHistory ? "var(--surface-card)" : "transparent",
            color:      isHistory ? "var(--text-primary)" : "var(--text-secondary)",
            boxShadow:  isHistory ? "0 1px 2px rgba(0,0,0,0.06)" : "none",
          }}
        >
          History
          {historyCount > 0 && (
            <span
              className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full"
              style={{
                background: isHistory ? "var(--kb-navy)" : "rgba(0,0,0,0.08)",
                color:      isHistory ? "#fff" : "var(--text-tertiary)",
              }}
            >
              {historyCount}
            </span>
          )}
        </Link>

        <Link
          href="/tasks?filter=tokens"
          className="flex items-center gap-2 px-3 py-1.5 rounded-md text-[13px] font-medium transition-all duration-100"
          style={{
            background: isTokens ? "var(--surface-card)" : "transparent",
            color:      isTokens ? "var(--text-primary)" : "var(--text-secondary)",
            boxShadow:  isTokens ? "0 1px 2px rgba(0,0,0,0.06)" : "none",
          }}
        >
          Token history
        </Link>
      </div>

      {/* ── Task list (active + history tabs) ─────────────────────────────── */}
      {!isTokens && (
        <>
          {tasks.length === 0 ? (
            <EmptyState filter={filter} />
          ) : (
            <div className="flex flex-col gap-2">
              {tasks.map((task) => (
                <TaskRow key={task.id} task={task} isHistory={isHistory} />
              ))}
            </div>
          )}
        </>
      )}

      {/* ── Token history tab ─────────────────────────────────────────────── */}
      {isTokens && (
        <>
          {ledgerEntries.length === 0 ? (
            <div className="card p-10 text-center">
              <div className="text-[var(--text-tertiary)] text-sm">No token activity yet</div>
              <div className="text-[var(--text-secondary)] text-xs mt-1">
                Purchases, task usage, and bonuses will appear here
              </div>
            </div>
          ) : (
            <div className="card overflow-hidden p-0">
              <table className="w-full text-[13px]">
                <thead>
                  <tr
                    className="border-b text-[11px] uppercase tracking-wide"
                    style={{
                      borderColor: "var(--border-subtle)",
                      color:       "var(--text-tertiary)",
                    }}
                  >
                    <th className="text-left px-4 py-2.5 font-medium">Date</th>
                    <th className="text-left px-4 py-2.5 font-medium">Description</th>
                    <th className="text-left px-3 py-2.5 font-medium">Type</th>
                    <th className="text-right px-4 py-2.5 font-medium">Tokens</th>
                    <th className="text-right px-4 py-2.5 font-medium">Balance</th>
                  </tr>
                </thead>
                <tbody>
                  {ledgerEntries.map((entry, i) => {
                    const isCredit = entry.amount > 0;
                    const isLast   = i === ledgerEntries.length - 1;
                    return (
                      <tr
                        key={entry.id}
                        className="transition-colors"
                        style={{
                          borderBottom: isLast ? "none" : "1px solid var(--border-subtle)",
                        }}
                      >
                        <td className="px-4 py-3 whitespace-nowrap" style={{ color: "var(--text-tertiary)" }}>
                          {new Date(entry.createdAt).toLocaleDateString("en-US", {
                            month: "short",
                            day:   "numeric",
                            year:  "numeric",
                          })}
                        </td>
                        <td className="px-4 py-3" style={{ color: "var(--text-primary)" }}>
                          {entry.description ?? "—"}
                        </td>
                        <td className="px-3 py-3">
                          <span className={`badge ${TX_BADGE[entry.txType] ?? "badge-neutral"}`}>
                            {TX_LABELS[entry.txType] ?? entry.txType}
                          </span>
                        </td>
                        <td
                          className="px-4 py-3 text-right font-medium tabular-nums"
                          style={{
                            color: isCredit ? "var(--color-success, #16a34a)" : "var(--text-primary)",
                          }}
                        >
                          {isCredit ? "+" : ""}{entry.amount}
                        </td>
                        <td
                          className="px-4 py-3 text-right tabular-nums"
                          style={{ color: "var(--text-tertiary)" }}
                        >
                          {entry.balanceAfter}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ── TaskRow ────────────────────────────────────────────────────────────────────

function TaskRow({ task, isHistory }: { task: any; isHistory: boolean }) {
  const cfg        = STATUS_CONFIG[task.status] ?? { label: task.status, badgeClass: "badge-neutral" };
  const history    = Array.isArray(task.chatHistoryJson) ? task.chatHistoryJson : [];
  const lastUser   = history.filter((m: any) => m.role === "user").at(-1);
  const preview    = lastUser?.content?.slice(0, 80) ?? TYPE_LABELS[task.type] ?? "Task";
  const isPriority = task.status === "PENDING_USER";
  const isFailed   = task.status === "FAILED";
  const isComplete = task.status === "COMPLETE";

  const dateToShow = isComplete && task.closedAt
    ? new Date(task.closedAt)
    : new Date(task.createdAt);
  const dateLabel = isComplete ? "Completed" : "Started";

  const payment   = isHistory && task.payments?.[0];
  const amountUsd = payment ? parseFloat(payment.amountUsd.toString()) : null;
  const feeUsd    = payment ? parseFloat(payment.feeUsd.toString()) : null;

  return (
    <a
      href={`/tasks/${task.id}`}
      className="card card-hover flex items-center gap-3 px-4 py-3 no-underline"
      style={{
        borderLeft: isPriority
          ? "3px solid var(--kb-navy)"
          : isFailed
          ? "3px solid var(--kb-red)"
          : undefined,
      }}
    >
      <div className="flex-1 min-w-0">
        <div className="text-[13px] font-medium text-[var(--text-primary)] truncate">
          {preview}
        </div>
        <div className="text-[11px] text-[var(--text-secondary)] mt-0.5">
          {TYPE_LABELS[task.type] ?? task.type}
          {" · "}
          {dateLabel}{" "}
          {dateToShow.toLocaleDateString("en-US", { month: "short", day: "numeric" })}
          {task.requiresHuman && task.status !== "COMPLETE" && (
            <span style={{ color: "var(--kb-navy)" }}> · Staff involved</span>
          )}
        </div>

        {amountUsd != null && feeUsd != null && (
          <div className="text-[11px] mt-0.5" style={{ color: "var(--kb-navy-mid)" }}>
            ${amountUsd.toFixed(2)} paid · ${feeUsd.toFixed(2)} fee
            {" · "}
            {payment.routeType === "ACH_RECURRING" ? "Bank transfer" : payment.routeType === "DIRECT_CARD" ? "Card payment" : "Token purchase"}
          </div>
        )}
      </div>

      <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
        <span className={`badge ${cfg.badgeClass}`}>{cfg.label}</span>
        {task.tokenActual != null ? (
          <span className="text-[10px] text-[var(--text-tertiary)]">
            {task.tokenActual} token{task.tokenActual !== 1 ? "s" : ""} used
          </span>
        ) : task.tokenEstimate != null ? (
          <span className="text-[10px] text-[var(--text-tertiary)]">
            ~{task.tokenEstimate} tokens
          </span>
        ) : null}
      </div>
    </a>
  );
}

// ── EmptyState ─────────────────────────────────────────────────────────────────

function EmptyState({ filter }: { filter: string }) {
  if (filter === "history") {
    return (
      <div className="card p-10 text-center">
        <div className="text-[var(--text-tertiary)] text-sm">No completed tasks yet</div>
        <div className="text-[var(--text-secondary)] text-xs mt-1">
          Finished tasks will appear here
        </div>
      </div>
    );
  }
  return (
    <div className="card p-10 text-center">
      <div className="text-[var(--text-tertiary)] text-sm">No active tasks</div>
      <div className="text-[var(--text-secondary)] text-xs mt-1 mb-4">
        Head to the dashboard to start a new task
      </div>
      <Link href="/dashboard" className="btn-primary inline-flex">
        Go to dashboard
      </Link>
    </div>
  );
}
