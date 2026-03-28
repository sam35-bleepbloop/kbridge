import { readFileSync, writeFileSync } from 'fs';
const path = 'C:/Users/samcv/projects/kbridge/components/dashboard/index.tsx';
let content = readFileSync(path, 'utf8');

const start = content.indexOf('export function TaskCard({ task }: { task: any }) {');
const end   = content.indexOf('\n// ', start); // finds the "// ─── RecurringCard" comment

if (start === -1 || end === -1) {
  console.log('ANCHOR NOT FOUND', { start, end });
  process.exit(1);
}

const replacement = `export function TaskCard({ task }: { task: any }) {
  const cfg     = STATUS_CONFIG[task.status] ?? { label: task.status, badgeClass: "badge-neutral" };
  const history = Array.isArray(task.chatHistoryJson) ? task.chatHistoryJson : [];

  // Attention indicator: CLARIFYING but last message is from AI — ball is in user's court.
  // This fires after an employee handoff returns the task to the user for follow-up.
  const lastChatMsg    = history.at(-1);
  const needsAttention = task.status === "CLARIFYING" && lastChatMsg?.role === "assistant";

  // Title: prefer AI-generated label, fall back to type label
  const title      = task.label ?? TYPE_LABELS[task.type] ?? "Task";
  const isPriority = task.status === "PENDING_USER" || needsAttention;

  return (
    
      href={\`/tasks/\${task.id}\`}
      className="card card-hover flex items-center gap-3 px-4 py-3 no-underline"
      style={{ borderLeft: isPriority ? \`3px solid var(--kb-navy)\` : undefined }}
    >
      <div className="flex-1 min-w-0">
        <div className="text-[13px] font-medium text-[var(--text-primary)] truncate">{title}</div>
        <div className="text-[11px] text-[var(--text-secondary)] mt-0.5">
          {TYPE_LABELS[task.type]} &middot; {new Date(task.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
        </div>
      </div>
      <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
        {needsAttention ? (
          <span className="badge badge-navy" style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <svg width="7" height="7" viewBox="0 0 7 7" fill="currentColor">
              <circle cx="3.5" cy="3.5" r="3.5"/>
            </svg>
            Your response needed
          </span>
        ) : (
          <span className={\`badge \${cfg.badgeClass}\`}>{cfg.label}</span>
        )}
        {task.tokenEstimate && (
          <span className="text-[10px] text-[var(--text-tertiary)]">~{task.tokenEstimate} tokens</span>
        )}
      </div>
    </a>
  );
}

`;

const result = content.slice(0, start) + replacement + content.slice(end + 1);
writeFileSync(path, result, 'utf8');
console.log('SUCCESS');