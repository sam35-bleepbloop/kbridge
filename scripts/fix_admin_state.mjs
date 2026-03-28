import { readFileSync, writeFileSync } from 'fs';
const path = 'C:/Users/samcv/projects/kbridge/app/(admin)/admin/tasks/[id]/TaskDetailClient.tsx';
let lines = readFileSync(path, 'utf8').split('\n');

// Line 176 (0-indexed: 175) is the adjustMsg state line
// Insert new state vars after it
console.log('Line 176:', JSON.stringify(lines[175]));
console.log('Line 177:', JSON.stringify(lines[176]));

if (lines[175].includes('adjustMsg') && lines[175].includes('useState')) {
  const newLines = [
    '  const [adminAction,   setAdminAction]   = useState<"cancel" | "complete" | "force_close" | null>(null);',
    '  const [adminNote,     setAdminNote]     = useState("");',
    '  const [adminActing,   setAdminActing]   = useState(false);',
    '  const [adminMsg,      setAdminMsg]      = useState<string | null>(null);',
  ];
  lines.splice(176, 0, ...newLines);
  writeFileSync(path, lines.join('\n'), 'utf8');
  console.log('SUCCESS — state vars inserted after line 176');
} else {
  console.log('MATCH FAILED — adjustMsg not on line 176');
}