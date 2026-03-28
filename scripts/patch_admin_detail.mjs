import { readFileSync, writeFileSync } from 'fs';
const path = 'C:/Users/samcv/projects/kbridge/app/(admin)/admin/tasks/[id]/TaskDetailClient.tsx';
let content = readFileSync(path, 'utf8');
let changed = 0;

// 1. Add admin action state variables after existing state declarations
const oldState = `  const [adjustMsg,     setAdjustMsg]     = useState<string | null>(null);`;
const newState = `  const [adjustMsg,     setAdjustMsg]     = useState<string | null>(null);
  const [adminAction,   setAdminAction]   = useState<"cancel" | "complete" | "force_close" | null>(null);
  const [adminNote,     setAdminNote]     = useState("");
  const [adminActing,   setAdminActing]   = useState(false);
  const [adminMsg,      setAdminMsg]      = useState<string | null>(null);`;

if (content.includes(oldState)) { content = content.replace(oldState, newState); changed++; console.log('✓ state vars added'); }
else console.log('✗ state vars MATCH FAILED');

// 2. Add handler after handleTokenAdjust closing brace — find it by unique anchor
const oldAnchorEnd = `  async function handleUrgencyChange(`;
const newHandler = `  async function handleAdminAction() {
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
  async function handleUrgencyChange(`;
  
if (content.includes(oldAnchorEnd)) { content = content.replace(oldAnchorEnd, newHandler); changed++; console.log('✓ handleAdminAction added'); }
else console.log('✗ handleAdminAction anchor MATCH FAILED');

// 3. Insert admin action panel after the resolve panel closing divs
const oldAfterResolve = `                {canResolve && (
                  <div
                    className="mt-5 p-4 rounded-xl border"
                    style={{ background: "var(--status-warn-bg)", borderColor: "#FCD34D" }}
                  >
                    <div className="text-[12px] font-semibold text-[var(--status-warn-text)] mb-2">
                      ⚡ This task is assigned to you — resolve when done
                    </div>
                    <textarea
                      className="input text-[12px] resize-none mb-2"
                      style={{ minHeight: "80px", background: "white" }}
                      placeholder="Resolution notes — required. Describe what you did, any findings, and what happens next."
                      value={resolveNotes}
                      onChange={(e) => setResolveNotes(e.target.value)}
                    />
                    <button
                      onClick={handleResolve}
                      disabled={resolving || !resolveNotes.trim()}
                      className="btn-primary text-[12px] w-full"
                    >
                      {resolving ? "Resolving…" : "Mark resolved → return to AI"}
                    </button>
                  </div>
                )}
              </div>
            )}`;

const newAfterResolve = `                {canResolve && (
                  <div
                    className="mt-5 p-4 rounded-xl border"
                    style={{ background: "var(--status-warn-bg)", borderColor: "#FCD34D" }}
                  >
                    <div className="text-[12px] font-semibold text-[var(--status-warn-text)] mb-2">
                      ⚡ This task is assigned to you — resolve when done
                    </div>
                    <textarea
                      className="input text-[12px] resize-none mb-2"
                      style={{ minHeight: "80px", background: "white" }}
                      placeholder="Resolution notes — required. Describe what you did, any findings, and what happens next."
                      value={resolveNotes}
                      onChange={(e) => setResolveNotes(e.target.value)}
                    />
                    <button
                      onClick={handleResolve}
                      disabled={resolving || !resolveNotes.trim()}
                      className="btn-primary text-[12px] w-full"
                    >
                      {resolving ? "Resolving…" : "Mark resolved → return to AI"}
                    </button>
                  </div>
                )}

                {/* ── Admin action panel ─────────────────────────────── */}
                {isAdmin && !["COMPLETE", "CANCELLED"].includes(task.status) && (
                  <div className="mt-5 p-4 rounded-xl border border-gray-200">
                    <div className="text-[12px] font-semibold text-[var(--text-primary)] mb-3">
                      Admin controls
                    </div>
                    {/* Action selector */}
                    <div className="flex gap-2 mb-3">
                      {(["cancel", "complete", "force_close"] as const).map((a) => (
                        <button
                          key={a}
                          onClick={() => { setAdminAction(a === adminAction ? null : a); setAdminMsg(null); }}
                          className="text-[11px] px-2.5 py-1 rounded-lg border transition-colors"
                          style={{
                            background:   adminAction === a ? (a === "complete" ? "var(--status-success-bg)" : a === "cancel" ? "var(--status-danger-bg)" : "var(--status-warn-bg)") : "transparent",
                            borderColor:  adminAction === a ? (a === "complete" ? "var(--status-success-text)" : a === "cancel" ? "var(--status-danger-text)" : "#FCD34D") : "var(--border-default)",
                            color:        adminAction === a ? (a === "complete" ? "var(--status-success-text)" : a === "cancel" ? "var(--status-danger-text)" : "var(--status-warn-text)") : "var(--text-secondary)",
                            fontWeight:   adminAction === a ? 600 : 400,
                          }}
                        >
                          {a === "cancel" ? "Cancel task" : a === "complete" ? "Mark complete" : "Force close"}
                        </button>
                      ))}
                    </div>
                    {/* Note input — shown when action selected */}
                    {adminAction && (
                      <>
                        <textarea
                          className="input text-[12px] resize-none mb-2"
                          style={{ minHeight: "70px", background: "white" }}
                          placeholder={
                            adminAction === "cancel"      ? "Reason for cancellation — required" :
                            adminAction === "complete"    ? "Completion note — what was resolved?" :
                                                           "Force close reason — required. This bypasses normal state machine rules."
                          }
                          value={adminNote}
                          onChange={(e) => setAdminNote(e.target.value)}
                        />
                        <button
                          onClick={handleAdminAction}
                          disabled={adminActing || !adminNote.trim()}
                          className="text-[12px] w-full py-2 rounded-lg font-medium transition-colors"
                          style={{
                            background: adminAction === "complete" ? "var(--status-success-bg)"
                              : adminAction === "cancel" ? "var(--status-danger-bg)"
                              : "var(--status-warn-bg)",
                            color: adminAction === "complete" ? "var(--status-success-text)"
                              : adminAction === "cancel" ? "var(--status-danger-text)"
                              : "var(--status-warn-text)",
                            opacity: (adminActing || !adminNote.trim()) ? 0.5 : 1,
                          }}
                        >
                          {adminActing ? "Processing…" : adminAction === "cancel" ? "Cancel this task" : adminAction === "complete" ? "Mark as complete" : "Force close"}
                        </button>
                      </>
                    )}
                    {adminMsg && (
                      <div className="mt-2 text-[11px] text-[var(--status-success-text)]">{adminMsg}</div>
                    )}
                  </div>
                )}
              </div>
            )}`;

if (content.includes(oldAfterResolve)) { content = content.replace(oldAfterResolve, newAfterResolve); changed++; console.log('✓ admin panel inserted'); }
else console.log('✗ admin panel MATCH FAILED');

if (changed === 3) {
  writeFileSync(path, content, 'utf8');
  console.log('\nSUCCESS');
} else {
  console.log(`\nABORTED — only ${changed}/3 matched`);
}