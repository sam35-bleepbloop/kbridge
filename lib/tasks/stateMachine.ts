import { TaskStatus, TaskType } from "@prisma/client";
import { db } from "@/lib/db";

// ─────────────────────────────────────────────────────────────────────────────
// VALID TRANSITIONS — REVISED v4.0
// Added DRAFT and PENDING_PARTNER statuses.
// Every status change must go through transitionTask().
// Direct DB writes that skip this are not permitted.
// ─────────────────────────────────────────────────────────────────────────────

const VALID_TRANSITIONS: Record<TaskStatus, TaskStatus[]> = {
  DRAFT:           ["OPEN", "CANCELLED"],                                      // Pre-arrival → activates on SOFA Tier 1 cert
  OPEN:            ["CLARIFYING", "AI_PROCESSING", "PENDING_HUMAN", "CANCELLED"],
  CLARIFYING:      ["AI_PROCESSING", "PENDING_HUMAN", "CANCELLED"],
  AI_PROCESSING:   ["PENDING_USER", "PENDING_HUMAN", "PENDING_PARTNER", "CANCELLED"],
  PENDING_HUMAN:   ["AI_PROCESSING", "PENDING_USER", "CANCELLED", "FAILED"],
  PENDING_PARTNER: ["AI_PROCESSING", "PENDING_USER", "CANCELLED"],             // Partner resolved → AI_PROCESSING or straight to PENDING_USER
  PENDING_USER:    ["PAYMENT_PENDING", "AI_PROCESSING", "CANCELLED"],
  PAYMENT_PENDING: ["COMPLETE", "FAILED"],
  COMPLETE:        [],  // Terminal
  CANCELLED:       [],  // Terminal
  FAILED:          ["AI_PROCESSING", "CANCELLED"],  // Can retry
};

export class InvalidTransitionError extends Error {
  constructor(from: TaskStatus, to: TaskStatus) {
    super(`Invalid task transition: ${from} → ${to}`);
    this.name = "InvalidTransitionError";
  }
}

/**
 * Transition a task to a new status.
 * Validates the transition, updates the DB, and writes an audit log entry.
 */
export async function transitionTask(
  taskId:    string,
  newStatus: TaskStatus,
  actorId:   string,
  actorType: "user" | "employee" | "ai" | "system",
  metadata?: Record<string, unknown>
): Promise<void> {
  const task = await db.task.findUniqueOrThrow({
    where:  { id: taskId },
    select: { status: true, userId: true },
  });

  const allowed = VALID_TRANSITIONS[task.status];
  if (!allowed.includes(newStatus)) {
    throw new InvalidTransitionError(task.status, newStatus);
  }

  const now = new Date();

  await db.$transaction(async (tx) => {
    await tx.task.update({
      where: { id: taskId },
      data: {
        status:         newStatus,
        lastActivityAt: now,
        closedAt:
          newStatus === "COMPLETE" ||
          newStatus === "CANCELLED" ||
          newStatus === "FAILED"
            ? now
            : undefined,
      },
    });

    await tx.auditLog.create({
      data: {
        taskId,
        actorId,
        actorType,
        eventType:   "status_changed",
        payloadJson: {
          from:     task.status,
          to:       newStatus,
          ...metadata,
        },
      },
    });
  });
}

/**
 * Escalate a task to human review.
 * Creates a task assignment and transitions to PENDING_HUMAN.
 */
export async function escalateToHuman(
  taskId:  string,
  reason:  string,
  urgency: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL" = "MEDIUM"
): Promise<void> {
  const employee = await db.employee.findFirst({
    where:   { isActive: true, role: { in: ["AGENT", "SENIOR_AGENT"] } },
    orderBy: { createdAt: "asc" },
  });

  await db.$transaction(async (tx) => {
    await tx.task.update({
      where: { id: taskId },
      data:  {
        requiresHuman:      true,
        escalationReason:   reason,
        assignedEmployeeId: employee?.id ?? null,
        lastActivityAt:     new Date(),
      },
    });

    await tx.taskAssignment.create({
      data: {
        taskId,
        employeeId: employee?.id ?? (await getAdminId(tx)),
        status:     "ASSIGNED",
        urgency,
        notes:      reason,
      },
    });

    await tx.auditLog.create({
      data: {
        taskId,
        actorId:     "system",
        actorType:   "system",
        eventType:   "escalated_to_human",
        payloadJson: { reason, urgency, assignedTo: employee?.id },
      },
    });
  });

  await transitionTask(taskId, "PENDING_HUMAN", "system", "system", {
    reason,
    urgency,
  });
}

/**
 * Route a task to the Partners Portal queue.
 * Creates a PartnerTask record and transitions to PENDING_PARTNER.
 */
export async function routeToPartner(
  taskId:      string,
  partnerOrgId: string,
  payloadJson:  Record<string, unknown>
): Promise<void> {
  await db.$transaction(async (tx) => {
    await tx.partnerTask.create({
      data: {
        taskId,
        partnerOrgId,
        payloadJson: payloadJson as any,
        status: "PENDING",
      },
    });

    await tx.auditLog.create({
      data: {
        taskId,
        actorId:     "system",
        actorType:   "system",
        eventType:   "routed_to_partner",
        payloadJson: { partnerOrgId },
      },
    });
  });

  await transitionTask(taskId, "PENDING_PARTNER", "system", "system", {
    partnerOrgId,
  });
}

/**
 * Activate all DRAFT tasks for a user when they complete SOFA Tier 1 certification.
 * DRAFT → OPEN. Does NOT auto-execute — user must finalise each task individually.
 */
export async function activateDraftTasks(userId: string): Promise<number> {
  const drafts = await db.task.findMany({
    where:  { userId, status: "DRAFT" },
    select: { id: true },
  });

  for (const task of drafts) {
    await transitionTask(task.id, "OPEN", "system", "system", {
      reason: "SOFA Tier 1 certification completed",
    });
  }

  return drafts.length;
}

async function getAdminId(tx: Parameters<Parameters<typeof db.$transaction>[0]>[0]): Promise<string> {
  const admin = await tx.employee.findFirstOrThrow({
    where: { role: "ADMIN", isActive: true },
  });
  return admin.id;
}

/**
 * Return a task to AI processing after employee resolution.
 */
export async function resumeAfterHuman(
  taskId:     string,
  employeeId: string,
  notes:      string
): Promise<void> {
  await db.taskAssignment.updateMany({
    where: { taskId, employeeId, status: "IN_PROGRESS" },
    data:  { status: "RESOLVED", resolvedAt: new Date(), notes },
  });

  // Read existing notes, append new entry, write full array back.
  // Prisma JSONB { push } does not reliably append to arrays — see workaround #10.
  const task = await db.task.findUniqueOrThrow({
    where:  { id: taskId },
    select: { internalNotesJson: true },
  });

  const existingNotes = Array.isArray(task.internalNotesJson)
    ? task.internalNotesJson
    : [];

  const updatedNotes = [
    ...existingNotes,
    { employeeId, notes, resolvedAt: new Date().toISOString() },
  ];

  await db.task.update({
    where: { id: taskId },
    data:  {
      requiresHuman:     false,
      internalNotesJson: updatedNotes,
    },
  });

  await transitionTask(taskId, "AI_PROCESSING", employeeId, "employee", {
    notes,
  });
}
