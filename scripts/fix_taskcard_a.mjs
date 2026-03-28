import { readFileSync, writeFileSync } from 'fs';
const path = 'C:/Users/samcv/projects/kbridge/components/dashboard/index.tsx';
let content = readFileSync(path, 'utf8');

const old = `  return (
      href={\`/tasks/\${task.id}\`}`;

const neu = `  return (
    
      href={\`/tasks/\${task.id}\`}`;

if (content.includes(old)) {
  writeFileSync(path, content.replace(old, neu), 'utf8');
  console.log('SUCCESS');
} else {
  console.log('MATCH FAILED');
}