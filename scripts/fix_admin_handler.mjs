import { readFileSync, writeFileSync } from 'fs';
const path = 'C:/Users/samcv/projects/kbridge/app/(admin)/admin/tasks/[id]/TaskDetailClient.tsx';
let lines = readFileSync(path, 'utf8').split('\n');

// Find handleUrgencyChange line
const idx = lines.findIndex(l => l.includes('async function handleUrgencyChange('));
console.log('handleUrgencyChange at line:', idx + 1);

if (idx === -1) { console.log('NOT FOUND'); process.exit(1); }

const handler = [
  '  async function handleAdminAction() {',
  '    if (!adminAction || !adminNote.trim()) return;',
  '    setAdminActing(true);',
  '    setAdminMsg(null);',
  '    try {',
  '      const res  = await fetch(`/api/admin/tasks/${task.id}`, {',
  '        method:  "PATCH",',
  '        headers: { "Content-Type": "application/json" },',
  '        body:    JSON.stringify({ action: adminAction, note: adminNote }),',
  '      });',
  '      const data = await res.json();',
  '      if (data.ok) {',
  '        setAdminMsg(`Done — task ${adminAction.replace(/_/g, " ")}`);',
  '        setAdminNote("");',
  '        setAdminAction(null);',
  '        router.refresh();',
  '      } else {',
  '        setAdminMsg(data.error ?? "Action failed");',
  '      }',
  '    } finally {',
  '      setAdminActing(false);',
  '    }',
  '  }',
  '',
];

lines.splice(idx, 0, ...handler);
writeFileSync(path, lines.join('\n'), 'utf8');
console.log('SUCCESS — handleAdminAction inserted before handleUrgencyChange');