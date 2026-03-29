import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { transitionTask } from "@/lib/tasks/stateMachine";
import { releaseReservation, creditTokens } from "@/lib/tokens/engine";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

// ─────────────────────────────────────────────────────────────────────────────
// AUTH GUARD — verify request is from an active employee
// ─────────────────────────────────────────────────────────────────────────────

async function requireEmployee() {
  const session = await auth();
  if (!session?.user?.email) return null;

  const employee = await db.employee.findUnique({
    where: { email: session.user.email },
    select: { id: true, role: true, isActive: true, name: true },
  });

  if (!employee?.isActive) return null;
  return employee;
}

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/admin/tasks/[id] — full task detail for admin view
// ─────────────────────────────────────────────────────────────────────────────

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const employee = await requireEmployee();
  if (!employee) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const task = await db.task.findUnique({
    where: { id },
    include: {
      user: {
        select: {
          id: true,
          displayName: true,
          email: true,
          tokenBalance: true,
          sofaDeclaration: true,
          derosDate: true,
          phoneKr: true,
          phoneUs: true,
          addressJson: true,
          createdAt: true,
        },
      },
      payments: { orderBy: { initiatedAt: "desc" } },
      assignments: {
        include: { employee: { select: { name: true, email: true, role: true } } },
        orderBy: { assignedAt: "desc" },
      },
      tokenLedger: { orderBy: { createdAt: "desc" }, take: 20 },
      auditLog: { orderBy: { createdAt: "desc" }, take: 50 },
    },
  });

  if (!task) {
    return NextResponse.json({ error: "Task not found" }, { status: 404 });
  }

  return NextResponse.json({ task });
}

// ─────────────────────────────────────────────────────────────────────────────
// PATCH /api/admin/tasks/[id] — admin actions on a task
//
// Supported actions:
//   { action: "cancel",         note: "..." }
//   { action: "mark_complete",  note: "..." }
//   { action: "force_close",    note: "..." }
//   { action: "adjust_tokens",  amount: number, reason: "..." }
//   { action: "set_urgency",    urgency: "LOW"|"MEDIUM"|"HIGH"|"CRITICAL", assignmentId: "..." }
// ─────────────────────────────────────────────────────────────────────────────

const TERMINAL_STATUSES = ["COMPLETE", "CANCELLED", "FAILED"];

const PatchSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("cancel"),
    note:   z.string().min(1, "Note required"),
  }),
  z.object({
    action: z.literal("mark_complete"),
    note:   z.string().min(1, "Note required"),
  }),
  z.object({
    action: z.literal("force_close"),
    note:   z.string().min(1, "Note required"),
  }),
  z.object({
    action: z.literal("adjust_tokens"),
    amount: z.number().int().refine((n) => n !== 0, "Amount must be non-zero"),
    reason: z.string().min(1, "Reason required"),
  }),
  z.object({
    action:       z.literal("set_urgency"),
    urgency:      z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]),
    assignmentId: z.string().min(1),
  }),
]);

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const employee = await requireEmployee();
  if (!employee) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Only ADMIN role can perform admin actions
  if (employee.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden — ADMIN role required" }, { status: 403 });
  }

  const { id: taskId } = await params;

  const body   = await req.json();
  const parsed = PatchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const task = await db.task.findUnique({
    where:  { id: taskId },
    select: { id: true, status: true, userId: true, tokenReserved: true, type: true },
  });

  if (!task) {
    return NextResponse.json({ error: "Task not found" }, { status: 404 });
  }

  const { action } = parsed.data;

  // ── Cancel ──────────────────────────────────────────────────────────────
  if (action === "cancel") {
    if (TERMINAL_STATUSES.includes(task.status)) {
      return NextResponse.json({ error: `Task is already ${task.status.toLowerCase()}` }, { status: 409 });
    }

    const { note } = parsed.data;

    // Release any token reservation
    if (task.tokenReserved && task.tokenReserved > 0) {
      await releaseReservation(task.userId, taskId, `Admin cancelled — ${note}`);
    }

    // Append admin note to internalNotesJson (read/spread/write — workaround #10)
    const existing = await db.task.findUnique({
      where:  { id: taskId },
      select: { internalNotesJson: true },
    });
    const existingNotes = Array.isArray(existing?.internalNotesJson) ? existing.internalNotesJson : [];

    await db.task.update({
      where: { id: taskId },
      data: {
        internalNotesJson: [
          ...existingNotes,
          { note: `Admin cancelled: ${note}`, by: employee.name, timestamp: new Date().toISOString() },
        ],
      },
    });

    await transitionTask(taskId, "CANCELLED", employee.id, "employee", { reason: note, adminAction: "cancel" });

    return NextResponse.json({ ok: true, newStatus: "CANCELLED" });
  }

  // ── Mark Complete ───────────────────────────────────────────────────────
  if (action === "mark_complete") {
    if (TERMINAL_STATUSES.includes(task.status)) {
      return NextResponse.json({ error: `Task is already ${task.status.toLowerCase()}` }, { status: 409 });
    }

    const { note } = parsed.data;

    const existing = await db.task.findUnique({
      where:  { id: taskId },
      select: { internalNotesJson: true },
    });
    const existingNotes = Array.isArray(existing?.internalNotesJson) ? existing.internalNotesJson : [];

    await db.task.update({
      where: { id: taskId },
      data: {
        internalNotesJson: [
          ...existingNotes,
          { note: `Admin marked complete: ${note}`, by: employee.name, timestamp: new Date().toISOString() },
        ],
      },
    });

    await transitionTask(taskId, "COMPLETE", employee.id, "employee", { reason: note, adminAction: "mark_complete" });

    return NextResponse.json({ ok: true, newStatus: "COMPLETE" });
  }

  // ── Force Close ─────────────────────────────────────────────────────────
  if (action === "force_close") {
    const { note } = parsed.data;

    // Force close can override terminal states — used for edge cases
    const existing = await db.task.findUnique({
      where:  { id: taskId },
      select: { internalNotesJson: true },
    });
    const existingNotes = Array.isArray(existing?.internalNotesJson) ? existing.internalNotesJson : [];

    // Release any held tokens
    if (task.tokenReserved && task.tokenReserved > 0) {
      await releaseReservation(task.userId, taskId, `Admin force closed — ${note}`);
    }

    await db.task.update({
      where: { id: taskId },
      data: {
        status:   "CANCELLED",
        closedAt: new Date(),
        internalNotesJson: [
          ...existingNotes,
          { note: `Admin force closed: ${note}`, by: employee.name, timestamp: new Date().toISOString() },
        ],
      },
    });

    await db.auditLog.create({
      data: {
        taskId,
        actorId:     employee.id,
        actorType:   "employee",
        eventType:   "admin_force_close",
        payloadJson: { reason: note, previousStatus: task.status },
      },
    });

    return NextResponse.json({ ok: true, newStatus: "CANCELLED" });
  }

  // ── Adjust Tokens ───────────────────────────────────────────────────────
  if (action === "adjust_tokens") {
    const { amount, reason } = parsed.data;

    const result = await creditTokens(
      task.userId,
      amount,
      "ADMIN_ADJUSTMENT",
      `Admin (${employee.name}): ${reason}`,
      taskId,
      true // skipCapCheck — admin can override wallet cap
    );

    await db.auditLog.create({
      data: {
        taskId,
        actorId:     employee.id,
        actorType:   "employee",
        eventType:   "admin_token_adjustment",
        payloadJson: { amount, reason, newBalance: result.newBalance },
      },
    });

    return NextResponse.json({ ok: true, newBalance: result.newBalance });
  }

  // ── Set Urgency ─────────────────────────────────────────────────────────
  if (action === "set_urgency") {
    const { urgency, assignmentId } = parsed.data;

    await db.taskAssignment.update({
      where: { id: assignmentId },
      data:  { urgency: urgency as any },
    });

    await db.auditLog.create({
      data: {
        taskId,
        actorId:     employee.id,
        actorType:   "employee",
        eventType:   "urgency_changed",
        payloadJson: { assignmentId, urgency },
      },
    });

    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
