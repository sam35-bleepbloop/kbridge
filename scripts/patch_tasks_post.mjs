import { readFileSync, writeFileSync } from 'fs';
const path = 'C:/Users/samcv/projects/kbridge/app/api/tasks/route.ts';
let content = readFileSync(path, 'utf8');

// Find start and end by unique anchors
const start = content.indexOf('  const { type, description } = parsed.data;');
const end = content.indexOf('  return NextResponse.json({ taskId: task.id, tokenEstimate: estimate, range });');
const endFull = end + '  return NextResponse.json({ taskId: task.id, tokenEstimate: estimate, range });'.length;

if (start === -1 || end === -1) {
  console.log('ANCHOR NOT FOUND');
  console.log('start:', start, 'end:', end);
  process.exit(1);
}

const replacement = `  const { type, description } = parsed.data;
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
  }).catch(() => { /* non-critical — label stays null if this fails */ });

  return NextResponse.json({ taskId: task.id, tokenEstimate: estimate, range });`;

const result = content.slice(0, start) + replacement + content.slice(endFull);
writeFileSync(path, result, 'utf8');
console.log('SUCCESS');
console.log('Replaced chars', start, 'to', endFull);