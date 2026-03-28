import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { resumeAfterHuman, transitionTask } from "@/lib/tasks/stateMachine";
import { streamChatResponse } from "@/lib/ai/chat";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const TERMINAL_STATUSES = ["COMPLETE", "CANCELLED", "FAILED"];

const ResolveSchema = z.object({
  notes: z.string().min(1, "Resolution notes are required"),
});

// POST /api/admin/assignments/[id]/resolve
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const employee = await db.employee.findUnique({
    where: { email: session.user.email },
  });
  if (!employee?.isActive) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;

  const body   = await req.json();
  const parsed = ResolveSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const assignment = await db.taskAssignment.findUnique({
    where: { id },
  });
  if (!assignment || assignment.employeeId !== employee.id) {
    return NextResponse.json({ error: "Not found or not yours" }, { status: 404 });
  }

  if (!assignment.taskId) {
    return NextResponse.json({ error: "Assignment has no associated task" }, { status: 422 });
  }

  const taskId = assignment.taskId;

  // Guard: refuse to resume a task that is already in a terminal state.
  // This happens when an employee tries to resolve an assignment for a task
  // that was already closed (e.g. via [TASK_COMPLETE] signal or manual close).
  const task = await db.task.findUnique({
    where:  { id: taskId },
    select: { status: true },
  });

  if (!task) {
    return NextResponse.json({ error: "Task not found" }, { status: 404 });
  }

  if (TERMINAL_STATUSES.includes(task.status)) {
    return NextResponse.json({
      error: `Task is already ${task.status.toLowerCase()} — nothing to resume.`,
      alreadyClosed: true,
    }, { status: 409 });
  }

  // Step 1: Resume the task — saves notes, transitions to AI_PROCESSING
  await resumeAfterHuman(taskId, employee.id, parsed.data.notes);

  // Step 2: Fire AI response in background — surfaces employee notes to user
  triggerResumeAiResponse(taskId, parsed.data.notes, employee.name).catch((e) => {
    console.error("[resolve] AI resume failed:", e);
  });

  return NextResponse.json({ ok: true });
}

// ─────────────────────────────────────────────────────────────────────────────
// AI RESUME TRIGGER
// ─────────────────────────────────────────────────────────────────────────────

async function triggerResumeAiResponse(
  taskId:        string,
  employeeNotes: string,
  employeeName:  string
): Promise<void> {
  const task = await db.task.findUnique({
    where:  { id: taskId },
    select: { chatHistoryJson: true, userId: true },
  });
  if (!task) return;

  const history: Array<{ role: "user" | "assistant"; content: string }> =
    Array.isArray(task.chatHistoryJson)
      ? (task.chatHistoryJson as any[]).map((m) => ({
          role:    m.role as "user" | "assistant",
          content: m.content as string,
        }))
      : [];

  // Inject the resume trigger as a synthetic user message
  const resumeMessage = {
    role:    "user" as const,
    content: `__RESUME_FROM_HUMAN__ EMPLOYEE_NOTES: ${employeeNotes}`,
  };

  const messagesForAi = [...history, resumeMessage];

  // Collect the full AI response (non-streaming for background use)
  const stream = await streamChatResponse(taskId, messagesForAi);
  const reader = stream.getReader();
  let fullResponse = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    fullResponse += value;
  }

  // Strip any signals from the resume response
  const cleanResponse = fullResponse
    .replace(/\[TASK_COMPLETE\]/g, "")
    .replace(/\[ESCALATE_TO_HUMAN:[^\]]*\]/g, "")
    .trim();

  if (!cleanResponse) return;

  // Persist the AI response to chat history
  const latestTask = await db.task.findUnique({
    where:  { id: taskId },
    select: { chatHistoryJson: true },
  });
  const latestHistory: any[] = Array.isArray(latestTask?.chatHistoryJson)
    ? latestTask.chatHistoryJson
    : [];

  await db.task.update({
    where: { id: taskId },
    data: {
      chatHistoryJson: [
        ...latestHistory,
        {
          role:      "assistant",
          content:   cleanResponse,
          timestamp: new Date().toISOString(),
        },
      ],
      lastActivityAt: new Date(),
    },
  });

  // Transition AI_PROCESSING → CLARIFYING so user can respond
  try {
    await transitionTask(taskId, "CLARIFYING", "system", "system", {
      reason: "AI resumed after human handoff",
    });
  } catch (e) {
    console.error("[resolve] transition to CLARIFYING failed:", e);
  }
}