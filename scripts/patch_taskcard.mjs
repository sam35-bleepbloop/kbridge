import { readFileSync, writeFileSync } from 'fs';
const path = 'C:/Users/samcv/projects/kbridge/components/dashboard/index.tsx';
let content = readFileSync(path, 'utf8');
let changed = 0;

// 1. Update STATUS_CONFIG — add SUPPORT, DRAFT, PENDING_PARTNER, and attention variant for CLARIFYING
const oldConfig = `const STATUS_CONFIG: Record<string, { label: string; badgeClass: string }> = {
  OPEN:            { label: "Open",            badgeClass: "badge-neutral" },
  CLARIFYING:      { label: "AI chatting",     badgeClass: "badge-neutral" },
  AI_PROCESSING:   { label: "AI processing",   badgeClass: "badge-neutral" },
  PENDING_HUMAN:   { label: "Employee review", badgeClass: "badge-warn" },
  PENDING_USER:    { label: "Your action",     badgeClass: "badge-navy" },
  PAYMENT_PENDING: { label: "Payment sending", badgeClass: "badge-neutral" },
};`;

const newConfig = `const STATUS_CONFIG: Record<string, { label: string; badgeClass: string }> = {
  DRAFT:           { label: "Queued",           badgeClass: "badge-neutral" },
  OPEN:            { label: "Open",             badgeClass: "badge-neutral" },
  CLARIFYING:      { label: "AI chatting",      badgeClass: "badge-neutral" },
  AI_PROCESSING:   { label: "AI processing",    badgeClass: "badge-neutral" },
  PENDING_HUMAN:   { label: "Employee review",  badgeClass: "badge-warn" },
  PENDING_PARTNER: { label: "Partner action",   badgeClass: "badge-warn" },
  PENDING_USER:    { label: "Your action",      badgeClass: "badge-navy" },
  PAYMENT_PENDING: { label: "Payment sending",  badgeClass: "badge-neutral" },
  SUPPORT:         { label: "Support",          badgeClass: "badge-neutral" },
};`;

if (content.includes(oldConfig)) { content = content.replace(oldConfig, newConfig); changed++; console.log('✓ STATUS_CONFIG updated'); }
else console.log('✗ STATUS_CONFIG MATCH FAILED');

// 2. Update TYPE_LABELS — add SUPPORT
const oldTypes = `const TYPE_LABELS: Record<string, string> = {
  RECURRING_SETUP:      "Recurring setup",
  RECURRING_EXECUTION:  "Recurring payment",
  ONE_OFF_PAYMENT:      "One-off payment",
  SERVICE_BOOKING:      "Service booking",
  INQUIRY:              "Inquiry",
  OTHER:                "Task",
};`;

const newTypes = `const TYPE_LABELS: Record<string, string> = {
  RECURRING_SETUP:      "Recurring setup",
  RECURRING_EXECUTION:  "Recurring payment",
  ONE_OFF_PAYMENT:      "One-off payment",
  SERVICE_BOOKING:      "Service booking",
  INQUIRY:              "Inquiry",
  SUPPORT:              "Support",
  OTHER:                "Task",
};`;

if (content.includes(oldTypes)) { content = content.replace(oldTypes, newTypes); changed++; console.log('✓ TYPE_LABELS updated'); }
else console.log('✗ TYPE_LABELS MATCH FAILED');

// 3. Replace TaskCard body — add label display, needsAttention logic, attention badge
const oldCard = `export function TaskCard({ task }: { task: any }) {
  const cfg     = STATUS_CONFIG[task.status] ?? { label: task.status, badgeClass: "badge-neutral" };
  const history = Array.isArray(task.chatHistoryJson) ? task.chatHistoryJson : [];
  const lastMsg = history.filter((m: any) => m.role === "user").at(-1);
  const preview = lastMsg?.content?.slice(0, 80) ?? TYPE_LABELS[task.type] ?? "Task";
  const isPriority = task.status === "PENDING_USER";
  return (
    
      href={\`/tasks/\${task.id}\`}
      className="card card-hover flex items-center gap-3 px-4 py-3 no-underline"
      style={{ borderLeft: isPriority ? \`3px solid var(--kb-navy)\` : undefined }}
    >
      <div className="flex-1 min-w-0">
        <div className="text-[13px] font-medium text-[var(--text-primary)] truncate">{preview}</div>
        <div className="text-[11px] text-[var(--text-secondary)] mt-0.5">
          {TYPE_LABELS[task.type]} · {new Date(task.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
        </div>
      </div>
      <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
        <span className={\`badge \${cfg.badgeClass}\`}>{cfg.label}</span>
        {task.tokenEstimate && (
          <span className="text-[10px] text-[var(--text-tertiary)]">~{task.tokenEstimate} tokens</span>
        )}
      </div>
    </a>
  );
}`;

const newCard = `export function TaskCard({ task }: { task: any }) {
  const cfg     = STATUS_CONFIG[task.status] ?? { label: task.status, badgeClass: "badge-neutral" };
  const history = Array.isArray(task.chatHistoryJson) ? task.chatHistoryJson : [];

  // Attention indicator: CLARIFYING but last message is from AI — ball is in user's court.
  // This fires after an employee handoff returns the task to the user for follow-up.
  const lastChatMsg  = history.at(-1);
  const needsAttention = task.status === "CLARIFYING" && lastChatMsg?.role === "assistant";

  // Title: prefer AI-generated label, fall back to type label
  const title   = task.label ?? TYPE_LABELS[task.type] ?? "Task";
  const isPriority = task.status === "PENDING_USER" || needsAttention;

  return (
    
      href={\`/tasks/\${task.id}\`}
      className="card card-hover flex items-center gap-3 px-4 py-3 no-underline"
      style={{ borderLeft: isPriority ? \`3px solid var(--kb-navy)\` : undefined }}
    >
      <div className="flex-1 min-w-0">
        <div className="text-[13px] font-medium text-[var(--text-primary)] truncate">{title}</div>
        <div className="text-[11px] text-[var(--text-secondary)] mt-0.5">
          {TYPE_LABELS[task.type]} · {new Date(task.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
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
}`;

if (content.includes(oldCard)) { content = content.replace(oldCard, newCard); changed++; console.log('✓ TaskCard updated'); }
else console.log('✗ TaskCard MATCH FAILED');

if (changed === 3) {
  writeFileSync(path, content, 'utf8');
  console.log('\nSUCCESS');
} else {
  console.log(`\nABORTED — only ${changed}/3 matched`);
}