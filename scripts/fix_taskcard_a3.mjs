import { readFileSync, writeFileSync } from 'fs';
const path = 'C:/Users/samcv/projects/kbridge/components/dashboard/index.tsx';
let lines = readFileSync(path, 'utf8').split('\n');

// Line 286 (0-indexed: 285) is blank spaces, line 287 (0-indexed: 286) is href=
// Replace the blank line with 
console.log('Line 285:', JSON.stringify(lines[284]));
console.log('Line 286:', JSON.stringify(lines[285]));
console.log('Line 287:', JSON.stringify(lines[286]));

if (lines[285].trim() === '' && lines[286].trim().startsWith('href=')) {
  lines[285] = '    <a';
  writeFileSync(path, lines.join('\n'), 'utf8');
  console.log('SUCCESS');
} else {
  console.log('PATTERN NOT MATCHED — check lines above');
}