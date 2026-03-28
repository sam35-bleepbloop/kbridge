import { readFileSync, writeFileSync } from 'fs';
const path = 'C:/Users/samcv/projects/kbridge/app/(admin)/admin/tasks/[id]/TaskDetailClient.tsx';
let lines = readFileSync(path, 'utf8').split('\n');

// Insert after line 419 (0-indexed: 418) — after the closing `            )}`  of the chat tab block
// Verify line 419 is what we expect
console.log('Line 417:', JSON.stringify(lines[416]));
console.log('Line 418:', JSON.stringify(lines[417]));
console.log('Line 419:', JSON.stringify(lines[418]));
console.log('Line 420:', JSON.stringify(lines[419]));

const insertAfterLine = 419; // 1-indexed — insert after this line

const adminPanel = `
                {/* Admin action panel */}
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
                )}`.split('\n');

lines.splice(insertAfterLine, 0, ...adminPanel);
writeFileSync(path, lines.join('\n'), 'utf8');
console.log('SUCCESS — admin panel inserted after line', insertAfterLine);