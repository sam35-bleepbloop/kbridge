import { readFileSync, writeFileSync } from 'fs';

function patch(filePath, oldStr, newStr, label) {
  const content = readFileSync(filePath, 'utf8');
  if (content.includes(oldStr)) {
    writeFileSync(filePath, content.replace(oldStr, newStr), 'utf8');
    console.log('✓', label);
  } else {
    console.log('✗ MATCH FAILED:', label);
  }
}

const base = 'C:/Users/samcv/projects/kbridge/';

// 1. assignments/claim — null vs undefined
patch(
  base + 'app/api/admin/assignments/[id]/claim/route.ts',
  'where: { id: prev.taskId },',
  'where: { id: prev.taskId ?? undefined },',
  'assignments/claim — taskId null fix'
);

// 2. knowledge route — session possibly null
patch(
  base + 'app/api/admin/knowledge/route.ts',
  'createdById: session.user.id!,',
  'createdById: session!.user.id!,',
  'knowledge route — session null fix'
);

// 3. prices/[id] — notes field doesn't exist on PriceReference
patch(
  base + 'app/api/admin/prices/[id]/route.ts',
  'notes: notes ?? null,',
  '// notes field removed — not in PriceReference schema',
  'prices/[id] — remove notes field'
);

// 4a. prices/route — label in orderBy
patch(
  base + 'app/api/admin/prices/route.ts',
  "orderBy: [{ category: 'asc' }, { label: 'asc' }],",
  "orderBy: [{ category: 'asc' }, { name: 'asc' }],",
  'prices/route — orderBy label→name'
);

// 4b. prices/route — label in create
patch(
  base + 'app/api/admin/prices/route.ts',
  '      label,\n',
  '      name: label,\n',
  'prices/route — create label→name'
);

// 5. vendors/route — null not assignable to NullableJsonNullValueInput
patch(
  base + 'app/api/admin/vendors/route.ts',
  'bankDetailsJson: bankDetailsJson ?? null,',
  'bankDetailsJson: bankDetailsJson ?? undefined,',
  'vendors/route — bankDetailsJson null→undefined'
);

// 6. recurring/approve — userId not in AuditLog schema
patch(
  base + 'app/api/recurring/[id]/approve/route.ts',
  '        userId: session.user.id,\n',
  '',
  'recurring/approve — remove invalid userId field'
);

// 7. stateMachine — payloadJson type
patch(
  base + 'lib/tasks/stateMachine.ts',
  '        payloadJson,',
  '        payloadJson: payloadJson as any,',
  'stateMachine — payloadJson cast'
);