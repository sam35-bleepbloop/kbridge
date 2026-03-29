import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic();

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: taskId } = await params;

  // Verify task belongs to this user
  const task = await db.task.findUnique({
    where: { id: taskId },
    select: {
      userId: true,
      label: true,
      type: true,
      chatHistoryJson: true,
    },
  });

  if (!task || task.userId !== session.user.id) {
    return NextResponse.json({ error: "Task not found" }, { status: 404 });
  }

  // If label already exists, skip — no need to regenerate
  if (task.label) {
    return NextResponse.json({ label: task.label });
  }

  // Extract first user message from chat history
  const history: { role: string; content: string }[] = Array.isArray(task.chatHistoryJson)
    ? (task.chatHistoryJson as { role: string; content: string }[])
    : [];

  const firstUserMessage = history.find((m) => m.role === "user")?.content;

  if (!firstUserMessage) {
    return NextResponse.json({ label: null });
  }

  try {
    const response = await anthropic.messages.create({
      model: process.env.ANTHROPIC_MODEL || "claude-sonnet-4-20250514",
      max_tokens: 30,
      messages: [
        {
          role: "user",
          content: `Generate a short task label (4-6 words maximum) that summarizes this user request. Return ONLY the label text, nothing else. No quotes, no punctuation at the end.

Task type: ${task.type.replace(/_/g, " ")}
User message: "${firstUserMessage.slice(0, 300)}"`,
        },
      ],
    });

    // Extract text from response
    const labelText =
      response.content[0]?.type === "text"
        ? response.content[0].text.trim()
        : null;

    if (labelText) {
      await db.task.update({
        where: { id: taskId },
        data: { label: labelText },
      });
    }

    return NextResponse.json({ label: labelText });
  } catch (e) {
    console.error("[label] AI label generation failed:", e);
    // Non-critical — task continues without a label
    return NextResponse.json({ label: null });
  }
}