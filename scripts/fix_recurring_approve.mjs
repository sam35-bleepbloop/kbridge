import { readFileSync, writeFileSync } from 'fs';
const path = 'C:/Users/samcv/projects/kbridge/app/api/recurring/[id]/approve/route.ts';
let content = readFileSync(path, 'utf8');

const old = `    db.auditLog.create({
      data: {
        taskId: setupTask?.id ?? null,
        action: 'RECURRING_FIRST_RUN_APPROVED',
        meta: {
          recurringId: id,
          label: recurring.label,
          approvedAt: now.toISOString(),
        },
      },
    }),`;

const neu = `    db.auditLog.create({
      data: {
        taskId:      setupTask?.id ?? null,
        actorId:     session.user.id,
        actorType:   "user",
        eventType:   "recurring_first_run_approved",
        payloadJson: {
          recurringId: id,
          approvedAt:  now.toISOString(),
        },
      },
    }),`;

if (content.includes(old)) {
  writeFileSync(path, content.replace(old, neu), 'utf8');
  console.log('SUCCESS');
} else {
  console.log('MATCH FAILED');
}