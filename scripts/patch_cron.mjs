import { readFileSync, writeFileSync } from 'fs';
const path = 'C:/Users/samcv/projects/kbridge/app/api/cron/recurring/route.ts';
let content = readFileSync(path, 'utf8');

const oldImports = `import { checkLowTokenAlerts, runDueRecurrings } from "@/lib/recurring/scheduler";
import { NextRequest, NextResponse } from "next/server";`;

const newImports = `import { checkLowTokenAlerts, runDueRecurrings } from "@/lib/recurring/scheduler";
import { archiveInactiveTasks } from "@/lib/tasks/inactivityArchive";
import { NextRequest, NextResponse } from "next/server";`;

const oldSteps = `    // Step 2: Execute due recurring payments
    await runDueRecurrings();
    console.log("[CRON] Recurring executions complete");

    return NextResponse.json({ ok: true, ran: new Date().toISOString() });`;

const newSteps = `    // Step 2: Execute due recurring payments
    await runDueRecurrings();
    console.log("[CRON] Recurring executions complete");

    // Step 3: Auto-archive tasks with no user activity for 7+ days
    const archived = await archiveInactiveTasks();
    console.log(\`[CRON] Inactivity archive complete — \${archived} task(s) archived\`);

    return NextResponse.json({ ok: true, ran: new Date().toISOString(), archivedInactive: archived });`;

let changed = 0;

if (content.includes(oldImports)) {
  content = content.replace(oldImports, newImports);
  changed++;
  console.log('✓ Import added');
} else {
  console.log('✗ Import MATCH FAILED');
}

if (content.includes(oldSteps)) {
  content = content.replace(oldSteps, newSteps);
  changed++;
  console.log('✓ Step 3 added');
} else {
  console.log('✗ Steps MATCH FAILED');
}

if (changed === 2) {
  writeFileSync(path, content, 'utf8');
  console.log('\nSUCCESS');
} else {
  console.log(`\nABORTED — only ${changed}/2 matched`);
}