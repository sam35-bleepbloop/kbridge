import { db } from "@/lib/db";

const INACTIVITY_DAYS = 7;

/**
 * Auto-archives tasks with no user activity for 7+ days.
 * Called daily by the cron job.
 *
 * Rules:
 * - Only cancels tasks in active statuses (not already terminal)
 * - Opening token deposit is already burned — no refund issued
 * - Task appears in history as CANCELLED with auto-archive reason
 * - User notification (email/in-app) deferred to Phase 2 when Resend is wired
 */
export async function archiveInactiveTasks(): Promise<number> {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - INACTIVITY_DAYS);

  // Only archive tasks in non-terminal, non-system statuses
  // RECURRING_EXECUTION is system-initiated — never auto-archived
  // PAYMENT_PENDING is in-flight — never auto-archived
  const archivableStatuses = [
    "OPEN",
    "CLARIFYING",
    "AI_PROCESSING",
    "PENDING_HUMAN",
    "PENDING_PARTNER",
    "PENDING_USER",
  ] as const;

  const staleTasks = await db.task.findMany({
    where: {
      status:         { in: [...archivableStatuses] },
      lastActivityAt: { lt: cutoff },
    },
    select: {
      id:     true,
      userId: true,
      type:   true,
      status: true,
    },
  });

  if (staleTasks.length === 0) return 0;

  const now = new Date();

  await db.$transaction(
    staleTasks.map((task) =>
      db.task.update({
        where: { id: task.id },
        data: {
          status:     "CANCELLED",
          closedAt:   now,
          // Append auto-archive note to internalNotesJson
          internalNotesJson: {
            push: {
              note:      `Auto-archived by cron: no user activity for ${INACTIVITY_DAYS} days. Opening token deposit already burned — no refund.`,
              timestamp: now.toISOString(),
              source:    "cron",
            },
          },
        },
      })
    )
  );

  // Write audit logs outside the transaction to avoid bloating it
  await db.auditLog.createMany({
    data: staleTasks.map((task) => ({
      taskId:      task.id,
      actorId:     "SYSTEM",
      actorType:   "system",
      eventType:   "task_auto_archived",
      payloadJson: {
        reason:          `No activity for ${INACTIVITY_DAYS} days`,
        previousStatus:  task.status,
        cutoffDate:      cutoff.toISOString(),
      },
    })),
  });

  console.log(`[inactivityArchive] Archived ${staleTasks.length} task(s):`, staleTasks.map(t => t.id));
  return staleTasks.length;
}