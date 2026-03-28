import { readFileSync, writeFileSync } from 'fs';
const path = 'C:/Users/samcv/projects/kbridge/app/(admin)/admin/tasks/[id]/TaskDetailClient.tsx';
let content = readFileSync(path, 'utf8');
let changed = 0;

// 1. Insert handleAdminAction before handleUrgencyChange using index
const anchor1 = '  async function handleUrgencyChange(';
const idx1 = content.indexOf(anchor1);
if (idx1 === -1) { console.log('✗ handleUrgencyChange not found'); }
else {
  const insertion = `  async function handleAdminAction() {
    if (!adminAction || !adminNote.trim()) return;
    setAdminActing(true);
    setAdminMsg(null);
    try {
      const res  = await fetch(\`/api/admin/tasks/\${task.id}\`, {
        method:  "PATCH",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ action: adminAction, note: adminNote }),
      });
      const data = await res.json();
      if (data.ok) {
        setAdminMsg(\`Done — task \${adminAction.replace(/_/g, " ")}\`);
        setAdminNote("");
        setAdminAction(null);
        router.refresh();
      } else {
        setAdminMsg(data.error ?? "Action failed");
      }
    } finally {
      setAdminActing(false);
    }
  }
  `;
  content = content.slice(0, idx1) + insertion + content.slice(idx1);
  changed++;
  console.log('✓ handleAdminAction inserted');
}

// 2. Insert admin panel after the canResolve closing </div> + </div> + )} using index
// Find the unique end of the resolve panel block
const anchor2 = '                {canResolve && (';
const idx2 = content.indexOf(anchor2);
if (idx2 === -1) { console.log('✗ canResolve block not found'); }
else {
  // Find the closing )} of the canResolve block
  const resolveEnd = content.indexOf('                )}\n              </div>\n            )}', idx2);
  if (resolveEnd === -1) { console.log('✗ canResolve closing block not found'); }
  else {
    const closingBlock = '                )}\n              </div>\n            )}';
    const insertAfter = resolveEnd + closingBlock.length;
    
    const adminPanel = `

                {/* ── Admin action panel ─────────────────────────────── */}
                {isAdmin && !["COMPLETE", "CANCELLED"].includes(task.status) && (
                  <div className="mt-5 p-4 rounded-xl border border-gray-200">
                    <div className="text-[12px] font-semibold text-[var(--text-primary)] mb-3">
                      Admin controls
                    </div>
                    <div className="flex gap-2 mb-3">
                      {(["cancel", "complete", "force_close"] as const).map((a) => (
                        <button
                          key={a}
                          onClick={() => { setAdminAction(a === adminAction ? null : a); setAdminMsg(null); }}
                          className="text-[11px] px-2.5 py-1 rounded-lg border transition-colors"
                          style={{
                            background:  adminAction === a ? (a === "complete" ? "var(--status-success-bg)" : a === "cancel" ? "var(--status-danger-bg)" : "var(--status-warn-bg)") : "transparent",
                            borderColor: adminAction === a ? (a === "complete" ? "var(--status-success-text)" : a === "cancel" ? "var(--status-danger-text)" : "#FCD34D") : "var(--border-default)",
                            color:       adminAction === a ? (a === "complete" ? "var(--status-success-text)" : a === "cancel" ? "var(--status-danger-text)" : "var(--status-warn-text)") : "var(--text-secondary)",
                            fontWeight:  adminAction === a ? 600 : 400,
                          }}
                        >
                          {a === "cancel" ? "Cancel task" : a === "complete" ? "Mark complete" : "Force close"}
                        </button>
                      ))}
                    </div>
                    {adminAction && (
                      <>
                        <textarea
                          className="input text-[12px] resize-none mb-2"
                          style={{ minHeight: "70px", background: "white" }}
                          placeholder={
                            adminAction === "cancel"   ? "Reason for cancellation — required" :
                            adminAction === "complete" ? "Completion note — what was resolved?" :
                                                        "Force close reason — required."
                          }
                          value={adminNote}
                          onChange={(e) => setAdminNote(e.target.value)}
                        />
                        <button
                          onClick={handleAdminAction}
                          disabled={adminActing || !adminNote.trim()}
                          className="text-[12px] w-full py-2 rounded-lg font-medium transition-colors"
                          style={{
                            background: adminAction === "complete" ? "var(--status-success-bg)" : adminAction === "cancel" ? "var(--status-danger-bg)" : "var(--status-warn-bg)",
                            color:      adminAction === "complete" ? "var(--status-success-text)" : adminAction === "cancel" ? "var(--status-danger-text)" : "var(--status-warn-text)",
                            opacity:    (adminActing || !adminNote.trim()) ? 0.5 : 1,
                          }}
                        >
                          {adminActing ? "Processing..." : adminAction === "cancel" ? "Cancel this task" : adminAction === "complete" ? "Mark as complete" : "Force close"}
                        </button>
                      </>
                    )}
                    {adminMsg && (
                      <div className="mt-2 text-[11px] text-[var(--status-success-text)]">{adminMsg}</div>
                    )}
                  </div>
                )}`;

    content = content.slice(0, insertAfter) + adminPanel + content.slice(insertAfter);
    changed++;
    console.log('✓ admin panel inserted');
  }
}

if (changed === 2) {
  writeFileSync(path, content, 'utf8');
  console.log('\nSUCCESS');
} else {
  console.log(`\nABORTED — only ${changed}/2 changes applied`);
}