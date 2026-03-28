import { readFileSync, writeFileSync } from 'fs';
const path = 'C:/Users/samcv/projects/kbridge/lib/tokens/engine.ts';
let content = readFileSync(path, 'utf8');

const bad = `// ─────────────────────────────────────────────────────────────────────────────\n// ─────────────────────────────────────────────────────────────────────────────`;
const good = `// ─────────────────────────────────────────────────────────────────────────────`;

if (content.includes(bad)) {
  writeFileSync(path, content.replace(bad, good), 'utf8');
  console.log('SUCCESS');
} else {
  console.log('MATCH FAILED');
}