import { db } from "@/lib/db";
import { hasEnoughTokens, TOKEN_COSTS } from "@/lib/tokens/engine";
import { transitionTask } from "@/lib/tasks/stateMachine";
import { addMonths, setDate, isAfter, isBefore, addDays } from "date-fns";

// ─────────────────────────────────────────────────────────────────────────────
// LOW-TOKEN ALERT CHECK
// Runs daily. Checks all active recurrings due within N days.
// Sends alert if user balance < 3 (RECURRING_EXECUTION cost).
// ─────────────────────────────────────────────────────────────────────────────

export async function checkLowTokenAlerts(): Promise<void> {
  const daysAhead  = parseInt(process.env.LOW_TOKEN_ALERT_DAYS_BEFORE ?? "5");
  const alertWindow = addDays(new Date(), daysAhead);

  const upcomingRecurrings = await db.recurring.findMany({
    where: {
      isActive:    true,
      pausedReason: "NONE",
      nextRunAt:   { lte: alertWindow },
    },
    include: {
      user: { select: { id: true, email: true, displayName: true, tokenBalance: true } },
    },
  });

  for (const recurring of upcomingRecurrings) {
    const { user } = recurring;
    const requiredTokens = TOKEN_COSTS.RECURRING_EXECUTION;

    if (user.tokenBalance < requiredTokens) {
      // Only alert once per alert window (check if alert sent in last 4 days)
      const recentlyAlerted =
        recurring.lowTokenAlertSentAt &&
        isAfter(
          recurring.lowTokenAlertSentAt,
          addDays(new Date(), -(daysAhead - 1))
        );

      if (!recentlyAlerted) {
        // Send alert email
        await sendLowTokenAlert({
          userId:       user.id,
          userEmail:    user.email!,
          userName:     user.displayName ?? "there",
          currentBalance: user.tokenBalance,
          required:     requiredTokens,
          recurringLabel: recurring.label,
          dueDate:      recurring.nextRunAt!,
        });

        // Update alert sent timestamp
        await db.recurring.update({
          where: { id: recurring.id },
          data:  { lowTokenAlertSentAt: new Date() },
        });
      }
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// RECURRING EXECUTION
// Runs daily. Executes all recurrings where nextRunAt <= now.
// ─────────────────────────────────────────────────────────────────────────────

export async function runDueRecurrings(): Promise<void> {
  const now = new Date();

  const dueRecurrings = await db.recurring.findMany({
    where: {
      isActive:    true,
      pausedReason: "NONE",
      nextRunAt:   { lte: now },
      firstRunApprovedAt: { not: null }, // First run must have been approved
    },
    include: {
      user:   { select: { id: true, email: true, displayName: true, tokenBalance: true } },
      vendor: true,
    },
  });

  for (const recurring of dueRecurrings) {
    await executeRecurring(recurring);
  }
}

async function executeRecurring(
  recurring: Awaited<ReturnType<typeof db.recurring.findMany>>[number] & {
    user:   { id: string; email: string | null; displayName: string | null; tokenBalance: number };
    vendor: { id: string } | null;
  }
): Promise<void> {
  const requiredTokens = TOKEN_COSTS.RECURRING_EXECUTION;

  // Check token balance
  if (recurring.user.tokenBalance < requiredTokens) {
    // Pause the recurring
    await db.recurring.update({
      where: { id: recurring.id },
      data:  { pausedReason: "INSUFFICIENT_TOKENS" },
    });

    // The low-token alert should have already fired — but fire again if not
    await sendLowTokenAlert({
      userId:         recurring.user.id,
      userEmail:      recurring.user.email!,
      userName:       recurring.user.displayName ?? "there",
      currentBalance: recurring.user.tokenBalance,
      required:       requiredTokens,
      recurringLabel: recurring.label,
      dueDate:        recurring.nextRunAt!,
      isExecutionAlert: true,
    });
    return;
  }

  // Create a RECURRING_EXECUTION task
  const task = await db.task.create({
    data: {
      userId:        recurring.user.id,
      type:          "RECURRING_EXECUTION",
      status:        "AI_PROCESSING",
      tokenEstimate: requiredTokens,
      chatHistoryJson: [],
      outcomeJson:   {
        recurringId: recurring.id,
        label:       recurring.label,
        amountUsd:   recurring.amountUsd,
        gateway:     recurring.gateway,
      },
    },
  });

  // Initiate payment (delegated to payment orchestration layer)
  const { initiateRecurringPayment } = await import("@/lib/payments/orchestrator");

  const result = await initiateRecurringPayment({
    taskId:     task.id,
    userId:     recurring.user.id,
    recurring,
  });

  if (result.success) {
    // Advance nextRunAt to next month on the preferred day
    const next = computeNextRunDate(recurring.preferredDay);
    await db.recurring.update({
      where: { id: recurring.id },
      data:  { nextRunAt: next, lowTokenAlertSentAt: null },
    });
    await transitionTask(task.id, "COMPLETE", "system", "system");
  } else {
    // Pause and notify
    await db.recurring.update({
      where: { id: recurring.id },
      data:  { pausedReason: "PAYMENT_FAILED" },
    });
    await transitionTask(task.id, "FAILED", "system", "system", {
      reason: result.error,
    });
    await sendPaymentFailureAlert({
      userId:    recurring.user.id,
      userEmail: recurring.user.email!,
      userName:  recurring.user.displayName ?? "there",
      label:     recurring.label,
      error:     result.error ?? "Unknown error",
    });
  }
}

function computeNextRunDate(preferredDay: number): Date {
  const today = new Date();
  const next  = addMonths(today, 1);
  // Clamp to last day of month if preferredDay > days in month
  const daysInMonth = new Date(next.getFullYear(), next.getMonth() + 1, 0).getDate();
  const day         = Math.min(preferredDay, daysInMonth);
  return setDate(next, day);
}

// ─────────────────────────────────────────────────────────────────────────────
// NOTIFICATION STUBS
// Full implementations in lib/notifications/ — these are called from here
// ─────────────────────────────────────────────────────────────────────────────

async function sendLowTokenAlert(params: {
  userId:           string;
  userEmail:        string;
  userName:         string;
  currentBalance:   number;
  required:         number;
  recurringLabel:   string;
  dueDate:          Date;
  isExecutionAlert?: boolean;
}): Promise<void> {
  // TODO: implement in lib/notifications/email.ts
  console.log("[LOW TOKEN ALERT]", params);
}

async function sendPaymentFailureAlert(params: {
  userId:    string;
  userEmail: string;
  userName:  string;
  label:     string;
  error:     string;
}): Promise<void> {
  // TODO: implement in lib/notifications/email.ts
  console.log("[PAYMENT FAILURE ALERT]", params);
}
