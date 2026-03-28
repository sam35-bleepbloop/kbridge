import { auth } from "@/lib/auth";
import { streamChatResponse } from "@/lib/ai/chat";
import { transitionTask, escalateToHuman } from "@/lib/tasks/stateMachine";
import { burnTokens, reserveTokens, TASK_OPEN_COST, TOKEN_COSTS } from "@/lib/tokens/engine";
import { db } from "@/lib/db";
import { NextRequest } from "next/server";

// ─────────────────────────────────────────────────────────────────────────────
// SIGNAL DETECTION
// Parse structured signals the AI embeds in its response text.
// These are stripped from the text before sending to the client.
// ─────────────────────────────────────────────────────────────────────────────

const TASK_COMPLETE_SIGNAL = /\[TASK_COMPLETE\]/g;
const ESCALATE_SIGNAL      = /\[ESCALATE_TO_HUMAN:\s*([^\]]+)\]/;

interface ParsedSignals {
  taskComplete:   boolean;
  escalateReason: string | null;
  cleanText:      string;
}

function parseSignals(text: string): ParsedSignals {
  const escalateMatch = text.match(ESCALATE_SIGNAL);
  return {
    taskComplete:   TASK_COMPLETE_SIGNAL.test(text),
    escalateReason: escalateMatch ? escalateMatch[1].trim() : null,
    cleanText:      text
      .replace(/\[TASK_COMPLETE\]/g, "")
      .replace(/\[ESCALATE_TO_HUMAN:[^\]]*\]/g, "")
      .trim(),
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// TOKEN BURN ON COMPLETION
// Handles both cases:
//   A) Task had a prior reservation (tokenReserved > 0) → burnTokens confirms it
//   B) No reservation (inquiry tasks close without one) → reserve + burn together
// ─────────────────────────────────────────────────────────────────────────────

async function handleTokenBurnOnComplete(taskId: string, userId: string): Promise<void> {
  const task = await db.task.findUnique({
    where:  { id: taskId },
    select: {
      tokenReserved: true,
      tokenActual:   true,
      type:          true,
    },
  });
  if (!task) return;

  // Already burned — don't double-burn
  if (task.tokenActual !== null && task.tokenActual > 0) return;

  // SUPPORT tasks are always free — never burn
  if (task.type === "SUPPORT") return;

  // Determine additional completion cost based on task type (v31 model).
  // The 1-token opener was already deducted at task creation and is NOT
  // refunded. Completion burns the additional service fee only.
  // For inquiry tasks this is 0 (opener covers the full cost).
  const additionalCost = TOKEN_COSTS[
    task.type === "RECURRING_SETUP"     ? "RECURRING_SETUP"     :
    task.type === "RECURRING_EXECUTION" ? "RECURRING_EXECUTION" :
    task.type === "ONE_OFF_PAYMENT"     ? "ONE_OFF_AI_ONLY"     :
    task.type === "SERVICE_BOOKING"     ? "ONE_OFF_AI_ONLY"     :
    task.type === "INQUIRY"             ? "INQUIRY_SIMPLE"      :
                                          "INQUIRY_SIMPLE"
  ] ?? 0;

  if (additionalCost === 0) {
    // Inquiry or fully-covered-by-opener task — just clear the reservation
    await db.task.update({
      where: { id: taskId },
      data:  { tokenReserved: 0, tokenActual: TASK_OPEN_COST },
    });
    return;
  }

  // Reserve and burn the additional completion cost
  const reservation = await reserveTokens(
    userId,
    taskId,
    additionalCost,
    `Service fee (completion) — ${task.type.replace(/_/g, " ").toLowerCase()}`
  );

  if (!reservation.success) {
    console.warn(`[tokens] Insufficient balance for completion burn on task ${taskId} — burning available`);
    // Still close cleanly — mark tokenActual as opener only
    await db.task.update({
      where: { id: taskId },
      data:  { tokenReserved: 0, tokenActual: TASK_OPEN_COST },
    });
    return;
  }

  await burnTokens(
    userId,
    taskId,
    additionalCost,
    `Service fee — ${task.type.replace(/_/g, " ").toLowerCase()}`
  );
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return new Response("Unauthorized", { status: 401 });
  }

  const { taskId, messages } = await req.json();

  // Verify task belongs to this user
  const task = await db.task.findUnique({
    where:  { id: taskId },
    select: { userId: true, status: true, chatHistoryJson: true },
  });

  if (!task || task.userId !== session.user.id) {
    return new Response("Not found", { status: 404 });
  }

  // Transition to CLARIFYING if still OPEN
  if (task.status === "OPEN") {
    await transitionTask(taskId, "CLARIFYING", session.user.id, "user");
  }

  const isGreeting = messages.length === 1 && messages[0]?.content === "__GREETING__";

  // Persist user message (skip for greeting)
  const existingHistory: any[] = Array.isArray(task.chatHistoryJson) ? task.chatHistoryJson : [];

  if (!isGreeting) {
    const userMessage = messages[messages.length - 1];
    const historyWithUser = [
      ...existingHistory,
      { ...userMessage, timestamp: new Date().toISOString() },
    ];
    await db.task.update({
      where: { id: taskId },
      data: {
        chatHistoryJson: historyWithUser,
        lastActivityAt:  new Date(),
      },
    });
  }

  // Stream AI response
  const aiStream = await streamChatResponse(taskId, messages);
  const [streamForClient, streamForPersist] = aiStream.tee();

  // ─────────────────────────────────────────────────────────────────────────
  // BACKGROUND: Collect full response → parse signals → persist → act
  // ─────────────────────────────────────────────────────────────────────────
  (async () => {
    let fullResponse = "";
    const reader = streamForPersist.getReader();
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      fullResponse += value;
    }

    const { taskComplete, escalateReason, cleanText } = parseSignals(fullResponse);

    // Re-fetch latest history to avoid race conditions
    const latest = await db.task.findUnique({
      where:  { id: taskId },
      select: { chatHistoryJson: true },
    });
    const latestHistory: any[] = Array.isArray(latest?.chatHistoryJson) ? latest.chatHistoryJson : [];

    // Persist assistant reply (cleaned — no signal tokens)
    await db.task.update({
      where: { id: taskId },
      data: {
        chatHistoryJson: [
          ...latestHistory,
          {
            role:      "assistant",
            content:   cleanText,
            timestamp: new Date().toISOString(),
          },
        ],
        lastActivityAt: new Date(),
      },
    });

    // Act on signals — escalation takes priority over completion
    if (escalateReason) {
      try {
        // FIX: escalateToHuman(taskId, reason, urgency?) — DO NOT pass userId
        // Third param is urgency: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL"
        await escalateToHuman(taskId, escalateReason, "MEDIUM");
      } catch (e) {
        console.error("[chat/route] escalateToHuman failed:", e);
      }
    } else if (taskComplete) {
      try {
        // Burn tokens BEFORE closing the task
        await handleTokenBurnOnComplete(taskId, session.user.id);

        // Close the task
        await db.task.update({
          where: { id: taskId },
          data: {
            status:         "COMPLETE",
            closedAt:       new Date(),
            lastActivityAt: new Date(),
          },
        });
      } catch (e) {
        console.error("[chat/route] task completion failed:", e);
      }
    }
  })();

  // ─────────────────────────────────────────────────────────────────────────
  // CLIENT STREAM: strip signal tokens before they reach the browser
  // ─────────────────────────────────────────────────────────────────────────
  const transformedStream = new TransformStream<string, string>({
    transform(chunk, controller) {
      const cleaned = chunk
        .replace(/\[TASK_COMPLETE\]/g, "")
        .replace(/\[ESCALATE_TO_HUMAN:[^\]]*\]/g, "");
      if (cleaned) controller.enqueue(cleaned);
    },
  });

  const clientStream = streamForClient.pipeThrough(transformedStream);

  return new Response(clientStream as unknown as BodyInit, {
    headers: {
      "Content-Type":           "text/plain; charset=utf-8",
      "Transfer-Encoding":      "chunked",
      "X-Content-Type-Options": "nosniff",
    },
  });
}