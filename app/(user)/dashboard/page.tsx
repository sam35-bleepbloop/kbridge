import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import Link from "next/link";

import { NewTaskButton, LowTokenAlert, TaskCard, RecurringCard, ReferralCard } from "@/components/dashboard";
import PendingApprovalNudge from "@/components/dashboard/PendingApprovalNudge";
import { addDays } from "date-fns";

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/auth/login");

  const userId = session.user.id;

  // Fetch all dashboard data in parallel
  const [user, activeTasks, upcomingRecurrings, pendingApprovalCount] = await Promise.all([
    db.user.findUnique({
      where:  { id: userId },
      select: { tokenBalance: true, displayName: true, referralCode: true },
    }),
    db.task.findMany({
      where: {
        userId,
        status: { in: ["OPEN", "CLARIFYING", "AI_PROCESSING", "PENDING_HUMAN", "PENDING_USER", "PAYMENT_PENDING"] },
      },
      orderBy: { lastActivityAt: "desc" },
      take: 10,
    }),
    db.recurring.findMany({
      where: {
        userId,
        isActive: true,
        nextRunAt: { lte: addDays(new Date(), 30) },
      },
      orderBy: { nextRunAt: "asc" },
      take: 5,
    }),
    db.recurring.count({
      where: {
        userId,
        isActive: true,
        firstRunApprovedAt: null,
      },
    }),
  ]);

  // Check for low-token warnings on upcoming recurrings
  const lowTokenWarnings = upcomingRecurrings.filter(
    () => (user?.tokenBalance ?? 0) < 3
  );

  const tasksNeedingAttention = activeTasks.filter(
    (t) => t.status === "PENDING_USER"
  );

  return (
    <div className="p-6 max-w-4xl mx-auto animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-[var(--text-primary)]">
            {user?.displayName ? `Welcome back, ${user.displayName.split(" ")[0]}` : "Dashboard"}
          </h1>
          <p className="text-sm text-[var(--text-secondary)] mt-0.5">
            Camp Humphreys · K-Bridge
          </p>
        </div>
        <NewTaskButton />
      </div>

      {/* Low token alert */}
      {lowTokenWarnings.length > 0 && (
        <LowTokenAlert
          balance={user?.tokenBalance ?? 0}
          affectedPayments={lowTokenWarnings.map((r) => ({
            label:   r.label,
            dueDate: r.nextRunAt!,
          }))}
        />
      )}

      {/* Pending first-run approval nudge */}
      <PendingApprovalNudge count={pendingApprovalCount} />

      {/* Metrics row */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <div className="bg-[var(--surface-card)] rounded-lg border border-black/[0.08] p-4">
          <div className="text-[11px] text-[var(--text-tertiary)] mb-1">Active tasks</div>
          <div className="text-2xl font-semibold text-[var(--text-primary)]">{activeTasks.length}</div>
          {tasksNeedingAttention.length > 0 && (
            <div className="text-[11px] text-[var(--kb-red)] mt-1 font-medium">
              {tasksNeedingAttention.length} need{tasksNeedingAttention.length === 1 ? "s" : ""} your input
            </div>
          )}
        </div>

        <div className="bg-[var(--surface-card)] rounded-lg border border-black/[0.08] p-4">
          <div className="text-[11px] text-[var(--text-tertiary)] mb-1">Token balance</div>
          <div className="text-2xl font-semibold text-[var(--text-primary)]">
            {user?.tokenBalance ?? 0}
          </div>
          <div className="text-[11px] text-[var(--text-secondary)] mt-0.5">$1.50 per token</div>
          <Link
            href="/tokens"
            className="text-[11px] font-medium mt-1 inline-block"
            style={{ color: "var(--kb-navy)" }}
          >
            Add tokens →
          </Link>
        </div>

        <div className="bg-[var(--surface-card)] rounded-lg border border-black/[0.08] p-4">
          <div className="text-[11px] text-[var(--text-tertiary)] mb-1">Upcoming payments</div>
          <div className="text-2xl font-semibold text-[var(--text-primary)]">
            {upcomingRecurrings.length}
          </div>
          {upcomingRecurrings[0]?.nextRunAt && (
            <div className="text-[11px] text-[var(--text-secondary)] mt-1">
              Next: {new Date(upcomingRecurrings[0].nextRunAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
              {" · "}${parseFloat(upcomingRecurrings[0].amountUsd.toString()).toFixed(0)}
            </div>
          )}
        </div>
      </div>

      {/* Active tasks */}
      {activeTasks.length > 0 && (
        <section className="mb-6">
          <div className="text-[11px] font-semibold text-[var(--text-tertiary)] uppercase tracking-wider mb-3">
            Active tasks
          </div>
          <div className="flex flex-col gap-2">
            {activeTasks.map((task) => (
              <TaskCard key={task.id} task={task} />
            ))}
          </div>
        </section>
      )}

      {activeTasks.length === 0 && (
        <div className="bg-[var(--surface-card)] rounded-lg border border-black/[0.08] p-8 text-center mb-6">
          <div className="text-[var(--text-tertiary)] text-sm">No active tasks</div>
          <div className="text-[var(--text-secondary)] text-xs mt-1">
            Use the button above to start a new task
          </div>
        </div>
      )}

      {/* Upcoming recurrings */}
      {upcomingRecurrings.length > 0 && (
        <section className="mb-6">
          <div className="text-[11px] font-semibold text-[var(--text-tertiary)] uppercase tracking-wider mb-3">
            Upcoming recurring payments
          </div>
          <div className="flex flex-col gap-2">
            {upcomingRecurrings.map((r) => (
              <RecurringCard
                key={r.id}
                recurring={r}
                tokenBalance={user?.tokenBalance ?? 0}
              />
            ))}
          </div>
        </section>
      )}

      {/* Referral card — always shown if code exists */}
      {user?.referralCode && (
        <section>
          <div className="text-[11px] font-semibold text-[var(--text-tertiary)] uppercase tracking-wider mb-3">
            Refer a friend
          </div>
          <ReferralCard referralCode={user.referralCode} />
        </section>
      )}
    </div>
  );
}
