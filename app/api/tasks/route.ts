import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { estimateTokenCost } from "@/lib/ai/chat";
import { hasEnoughTokens, TASK_OPEN_COST, reserveTokens } from "@/lib/tokens/engine";
import { TaskType } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const CreateTaskSchema = z.object({
  type:        z.nativeEnum(TaskType),
  description: z.string().min(1).max(500),
});

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body   = await req.json();
  const parsed = CreateTaskSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { type, description } = parsed.data;
  const userId = session.user.id;
  const isSupport = type === TaskType.SUPPORT;

  // Get token estimate before creating task
  const { estimate, range } = await estimateTokenCost(type, description);

  // Support tasks are always free — skip token check entirely
  if (!isSupport) {
    const sufficient = await hasEnoughTokens(userId, TASK_OPEN_COST);
    if (!sufficient) {
      return NextResponse.json(
        { error: "insufficient_tokens", estimate, range },
        { status: 402 }
      );
    }
  }

  const task = await db.task.create({
    data: {
      userId,
      type,
      status:            "OPEN",
      tokenEstimate:     estimate,
      lastActivityAt:    new Date(),
      chatHistoryJson:   [],
      internalNotesJson: [{ note: `Initial description: ${description}`, timestamp: new Date().toISOString() }],
    },
  });

  // Deduct opening token deposit immediately (non-refundable, credited toward service fee)
  // Support tasks are always free — no deduction
  if (!isSupport) {
    await reserveTokens(
      userId,
      task.id,
      TASK_OPEN_COST,
      `Task opened: ${type} — non-refundable deposit`
    );
  }

  // Write audit log
  await db.auditLog.create({
    data: {
      taskId:      task.id,
      actorId:     userId,
      actorType:   "user",
      eventType:   "task_created",
      payloadJson: { type, description, tokenEstimate: estimate, range, openCost: isSupport ? 0 : TASK_OPEN_COST },
    },
  });

  // Fire async label generation — does not block response
  // Label appears on dashboard/task list once generated (~1–2s)
  // NOTE: Previously used fetch() to /api/tasks/[id]/label but that fails because
  // server-to-server calls don't carry the user's session cookie (workaround #125).
  // Now calls the AI directly — no auth needed for an internal background operation.
  generateLabel(task.id, description, type).catch(() => {
    /* non-critical — label stays null if this fails */
  });

  return NextResponse.json({ taskId: task.id, tokenEstimate: estimate, range });
}

/**
 * Generate an AI task label in the background.
 * Called directly from task creation — not via HTTP to avoid auth issues.
 */
async function generateLabel(taskId: string, description: string, type: string): Promise<void> {
  const Anthropic = (await import("@anthropic-ai/sdk")).default;
  const anthropic = new Anthropic();

  const response = await anthropic.messages.create({
    model: process.env.ANTHROPIC_MODEL || "claude-sonnet-4-20250514",
    max_tokens: 30,
    messages: [
      {
        role: "user",
        content: `Generate a short task label (4-6 words maximum) that summarizes this user request. Return ONLY the label text, nothing else. No quotes, no punctuation at the end.\n\nTask type: ${type.replace(/_/g, " ")}\nUser message: "${description.slice(0, 300)}"`,
      },
    ],
  });

  const labelText =
    response.content[0]?.type === "text"
      ? response.content[0].text.trim()
      : null;

  if (labelText) {
    await db.task.update({
      where: { id: taskId },
      data:  { label: labelText },
    });
  }
}

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");

  const tasks = await db.task.findMany({
    where: {
      userId: session.user.id,
      ...(status ? { status: status as any } : {}),
      // 12-month retention: exclude tasks with no activity in 12 months
      lastActivityAt: {
        gte: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000),
      },
    },
    orderBy: { lastActivityAt: "desc" },
    select: {
      id:             true,
      type:           true,
      status:         true,
      tokenEstimate:  true,
      tokenActual:    true,
      requiresHuman:  true,
      createdAt:      true,
      lastActivityAt: true,
      // Return only the last message for preview
      chatHistoryJson: true,
    },
  });

  return NextResponse.json({ tasks });
}
