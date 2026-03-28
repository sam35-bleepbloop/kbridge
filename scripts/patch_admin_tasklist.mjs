import { readFileSync, writeFileSync } from 'fs';
const path = 'C:/Users/samcv/projects/kbridge/app/(admin)/admin/tasks/TasksListClient.tsx';
let content = readFileSync(path, 'utf8');
let changed = 0;

// 1. Add SUPPORT to TASK_TYPES and TASK_STATUSES
const oldTypes = `const TASK_TYPES = [
  'RECURRING_SETUP', 'RECURRING_EXECUTION', 'ONE_OFF_PAYMENT',
  'SERVICE_BOOKING', 'INQUIRY', 'OTHER',
]`;
const newTypes = `const TASK_TYPES = [
  'RECURRING_SETUP', 'RECURRING_EXECUTION', 'ONE_OFF_PAYMENT',
  'SERVICE_BOOKING', 'INQUIRY', 'SUPPORT', 'OTHER',
]`;
if (content.includes(oldTypes)) { content = content.replace(oldTypes, newTypes); changed++; console.log('✓ TASK_TYPES updated'); }
else console.log('✗ TASK_TYPES MATCH FAILED');

// 2. Add label to Task type
const oldTaskType = `type Task = {
  id: string
  type: string
  status: string
  tokenEstimate: number | null
  tokenActual: number | null
  requiresHuman: boolean
  createdAt: string
  closedAt: string | null
  lastActivityAt: string
  user: { email: string; displayName: string | null } | null
  assignedEmployee: { name: string } | null
  _count: { chatHistory: number }
}`;
const newTaskType = `type Task = {
  id: string
  type: string
  status: string
  label: string | null
  tokenEstimate: number | null
  tokenActual: number | null
  requiresHuman: boolean
  createdAt: string
  closedAt: string | null
  lastActivityAt: string
  user: { email: string; displayName: string | null } | null
  assignedEmployee: { name: string } | null
  _count: { chatHistory: number }
}`;
if (content.includes(oldTaskType)) { content = content.replace(oldTaskType, newTaskType); changed++; console.log('✓ Task type updated'); }
else console.log('✗ Task type MATCH FAILED');

// 3. Replace requiresHuman cell with waitingOn indicator
const oldCell = `                  <td className="px-4 py-3">
                    {task.requiresHuman
                      ? <span className="text-orange-600 font-medium">Yes</span>
                      : <span className="text-gray-400">No</span>}
                  </td>`;
const newCell = `                  <td className="px-4 py-3 whitespace-nowrap">
                    {task.status === 'PENDING_HUMAN' && !task.assignedEmployee ? (
                      <span className="inline-flex items-center gap-1.5 text-xs text-orange-600 font-medium">
                        <span className="w-1.5 h-1.5 rounded-full bg-orange-500 inline-block"/>
                        Unassigned
                      </span>
                    ) : task.status === 'PENDING_HUMAN' ? (
                      <span className="inline-flex items-center gap-1.5 text-xs text-orange-600">
                        <span className="w-1.5 h-1.5 rounded-full bg-orange-400 inline-block"/>
                        With employee
                      </span>
                    ) : task.status === 'CLARIFYING' || task.status === 'PENDING_USER' ? (
                      <span className="inline-flex items-center gap-1.5 text-xs text-blue-600">
                        <span className="w-1.5 h-1.5 rounded-full bg-blue-500 inline-block"/>
                        Waiting on user
                      </span>
                    ) : task.status === 'PENDING_PARTNER' ? (
                      <span className="inline-flex items-center gap-1.5 text-xs text-purple-600">
                        <span className="w-1.5 h-1.5 rounded-full bg-purple-500 inline-block"/>
                        With partner
                      </span>
                    ) : (
                      <span className="text-gray-400 text-xs">—</span>
                    )}
                  </td>`;
if (content.includes(oldCell)) { content = content.replace(oldCell, newCell); changed++; console.log('✓ waitingOn cell updated'); }
else console.log('✗ waitingOn cell MATCH FAILED');

if (changed === 3) {
  writeFileSync(path, content, 'utf8');
  console.log('\nSUCCESS');
} else {
  console.log(`\nABORTED — only ${changed}/3 matched`);
}