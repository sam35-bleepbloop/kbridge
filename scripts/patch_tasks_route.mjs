import { readFileSync, writeFileSync } from 'fs';
const path = 'C:/Users/samcv/projects/kbridge/app/api/tasks/route.ts';
let content = readFileSync(path, 'utf8');

const oldImports = `import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { estimateTokenCost } from "@/lib/ai/chat";
import { hasEnoughTokens } from "@/lib/tokens/engine";
import { TaskType } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";`;

const newImports = `import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { estimateTokenCost } from "@/lib/ai/chat";
import { hasEnoughTokens, TASK_OPEN_COST, reserveTokens } from "@/lib/tokens/engine";
import { TaskType } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";`;

const oldPost = `  const { type, description } = parsed.data;
  const userId = session.user.id;
  // Get token estimate before creating task
  const { estimate, range } = await estimateTokenCost(type, description);
  // Check user has at least 1 token to enter the chat
  // Full task cost is estimated and confirmed during the conversation
  const sufficient = await hasEnoughTokens(userId, 1);
  if (!sufficient) {
    return NextResponse.json(
      { error: "insufficient_tokens", estimate, range },
      { status: 402 }
    );
  }
  const task = await db.task.create({
    data: {
      userId,
      type,
      status:         "OPEN",
      tokenEstimate:  estimate,
      chatHistoryJson: [],
      // Seed the chat with the user's initial description
      internalNotesJson: [{ note: \`Initial description: \${description}\`, timestamp: new Date().toISOString() }],
    },
  });
  // Write audit log
  await db.auditLog.create({
    data: {
      taskId:      task.id,
      actorId:     userId,
      actorType:   "user",
      eventType:   "task_created",
      payloadJson: { type, description, tokenEstimate: estimate, range },
    },
  });
  return NextResponse.json({ taskId: task.id, tokenEstimate: estimate, range });`;

const newPost = `  const { type, description } = parsed.data;
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
      internalNotesJson: [{ note: \`Initial description: \${description}\`, timestamp: new Date().toISOString() }],
    },
  });

  // Deduct opening token deposit immediately (non-refundable, credited toward service fee)
  // Support tasks are always free — no deduction
  if (!isSupport) {
    await reserveTokens(
      userId,
      task.id,
      TASK_OPEN_COST,
      \`Task opened: \${type} — non-refundable deposit\`
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
  fetch(\`\${process.env.NEXT_PUBLIC_APP_URL}/api/tasks/\${task.id}/label\`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ description, type }),
  }).catch(() => { /* non-critical — label will stay null if this fails */ });

  return NextResponse.json({ taskId: task.id, tokenEstimate: estimate, range });`;

let result = content.replace(oldImports, newImports);
if (!result.includes('TASK_OPEN_COST')) {
  console.log('IMPORT MATCH FAILED'); process.exit(1);
}
result = result.replace(oldPost, newPost);
if (!result.includes('isSupport')) {
  console.log('POST BODY MATCH FAILED'); process.exit(1);
}
writeFileSync(path, result, 'utf8');
console.log('SUCCESS');