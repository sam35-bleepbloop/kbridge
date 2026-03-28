import { readFileSync, writeFileSync } from 'fs';
const path = 'C:/Users/samcv/projects/kbridge/components/dashboard/index.tsx';
let lines = readFileSync(path, 'utf8').split('\n');

// Find the line with just "  return (" in the TaskCard function
// and check if the next non-empty line starts with "href" (missing the <a tag)
for (let i = 0; i < lines.length; i++) {
  if (lines[i].trim() === 'return (' && lines[i+1] && lines[i+1].trim().startsWith('href=')) {
    console.log('Found at line', i+1, ':', JSON.stringify(lines[i]));
    console.log('Next line:', JSON.stringify(lines[i+1]));
    // Insert <a after return (
    lines.splice(i + 1, 0, '    <a');
    writeFileSync(path, lines.join('\n'), 'utf8');
    console.log('SUCCESS');
    process.exit(0);
  }
}
console.log('PATTERN NOT FOUND');