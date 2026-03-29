import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { escalateToHuman } from "@/lib/tasks/stateMachine";
import { reserveTokens, burnTokens } from "@/lib/tokens/engine";
import { NextRequest, NextResponse } from "next/server";

const ESCALATION_COST = 3;

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: taskId } = await params;

  const task = await db.task.findUnique({
    where: { id: taskId },
    select: {
      userId: true,
      status: true,
      type: true,
      tokenReserved: true,
      tokenActual: true,
    },
  });

  if (!task || task.userId !== session.user.id) {
    return NextResponse.json({ error: "Task not found" }, { status: 404 });
  }

  if (!["OPEN", "CLARIFYING"].includes(task.status)) {
    return NextResponse.json(
      { error: "Task cannot be escalated in its current state" },
      { status: 400 }
    );
  }

  const isFree = task.type === "SUPPORT";

  if (!isFree) {
    const user = await db.user.findUnique({
      where: { id: session.user.id },
      select: { tokenBalance: true },
    });

    if (!user || user.tokenBalance < ESCALATION_COST) {
      return NextResponse.json(
        {
          error: "Insufficient tokens. You need " + ESCALATION_COST + " tokens to escalate.",
          required: ESCALATION_COST,
          balance: user?.tokenBalance ?? 0,
        },
        { status: 400 }
      );
    }

    const reservation = await reserveTokens(
      session.user.id,
      taskId,
      ESCALATION_COST,
      "Escalation uplift"
    );

    if (!reservation.success) {
      return NextResponse.json(
        { error: "Failed to reserve tokens for escalation" },
        { status: 400 }
      );
    }

    await burnTokens(
      session.user.id,
      taskId,
      ESCALATION_COST,
      "Escalation uplift"
    );
  }

  try {
    await escalateToHuman(taskId, "User-confirmed escalation via chat", "MEDIUM");
  } catch (e) {
    console.error("[escalate] escalateToHuman failed:", e);
    return NextResponse.json(
      { error: "Escalation failed. Please try again." },
      { status: 500 }
    );
  }

  const updatedUser = await db.user.findUnique({
    where: { id: session.user.id },
    select: { tokenBalance: true },
  });

  return NextResponse.json({
    success: true,
    newStatus: "PENDING_HUMAN",
    tokenBalance: updatedUser?.tokenBalance ?? 0,
    tokensBurned: isFree ? 0 : ESCALATION_COST,
  });
}