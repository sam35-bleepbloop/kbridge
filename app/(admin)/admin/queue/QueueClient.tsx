"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const URGENCY_CONFIG = {
  CRITICAL: { label: "Critical", color: "#7A1010", bg: "#F9EAEA", dot: "var(--kb-red)" },
  HIGH:     { label: "High",     color: "#633806", bg: "#FAEEDA", dot: "#EF9F27" },
  MEDIUM:   { label: "Medium",   color: "var(--text-secondary)", bg: "var(--surface-page)", dot: "#B4B2A9" },
  LOW:      { label: "Low",      color: "var(--text-tertiary)",  bg: "var(--surface-page)", dot: "#D3D1C7" },
};

const TASK_TYPE_LABELS: Record<string, string> = {
  RECURRING_SETUP:     "Recurring setup",
  RECURRING_EXECUTION: "Recurring execution",
  ONE_OFF_PAYMENT:     "One-off payment",
  SERVICE_BOOKING:     "Service booking",
  INQUIRY:             "Inquiry",
  OTHER:               "Other",
};

interface Assignment {
  id:          string;
  urgency:     keyof typeof URGENCY_CONFIG;
  status:      string;
  notes:       string | null;
  assignedAt:  string;
  employeeId:  string;
  employee:    { name: string };
  task: {
    id:               string;
    type:             string;
    status:           string;
    escalationReason: string | null;
    tokenEstimate:    number | null;
    createdAt:        string;
    user: {
      displayName: string | null;
      email:       string | null;
    };
  };
}

export default function QueueClient({
  assignments,
  employeeId,
  isAdmin,
}: {
  assignments: Assignment[];
  employeeId:  string;
  isAdmin:     boolean;
}) {
  const router   = useRouter();
  const [filter, setFilter] = useState<"all" | "mine">("all");
  const [resolving, setResolving] = useState<string | null>(null);
  const [notes,     setNotes]     = useState<Record<string, string>>({});

  const filtered = filter === "mine"
    ? assignments.filter((a) => a.employeeId === employeeId)
    : assignments;

  async function claimTask(assignmentId: string) {
    await fetch(`/api/admin/assignments/${assignmentId}/claim`, { method: "POST" });
    router.refresh();
  }

  async function resolveTask(assignmentId: string, taskId: string) {
    const note = notes[assignmentId] ?? "";
    if (!note.trim()) {
      alert("Please add a resolution note before marking as resolved.");
      return;
    }
    setResolving(assignmentId);
    await fetch(`/api/admin/assignments/${assignmentId}/resolve`, {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ notes: note }),
    });
    setResolving(null);
    router.refresh();
  }

  if (filtered.length === 0) {
    return (
      <div className="card p-12 text-center">
        <div className="text-[var(--text-tertiary)] text-sm">No tasks in the queue</div>
        <div className="text-[var(--text-secondary)] text-xs mt-1">
          {filter === "mine" ? "No tasks assigned to you" : "All clear — nothing pending"}
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Filter tabs */}
      <div className="flex gap-2 mb-4">
        {(["all", "mine"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className="px-4 py-1.5 rounded-lg text-[13px] transition-all duration-100"
            style={{
              background: filter === f ? "var(--kb-navy)" : "white",
              color:      filter === f ? "white" : "var(--text-secondary)",
              border:     `0.5px solid ${filter === f ? "transparent" : "rgba(0,0,0,0.12)"}`,
              fontWeight: filter === f ? 500 : 400,
            }}
          >
            {f === "all" ? `All tasks (${assignments.length})` : `My tasks (${assignments.filter(a => a.employeeId === employeeId).length})`}
          </button>
        ))}
      </div>

      {/* Assignment cards */}
      <div className="flex flex-col gap-3">
        {filtered.map((assignment) => {
          const urg     = URGENCY_CONFIG[assignment.urgency];
          const isMine  = assignment.employeeId === employeeId;
          const isActive = assignment.status === "IN_PROGRESS";
          const ageMs   = Date.now() - new Date(assignment.assignedAt).getTime();
          const ageHrs  = Math.floor(ageMs / (1000 * 60 * 60));

          return (
            <div
              key={assignment.id}
              className="card p-4"
              style={{ borderLeft: `3px solid ${urg.dot}` }}
            >
              {/* Top row */}
              <div className="flex items-start justify-between gap-4 mb-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span
                      className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                      style={{ background: urg.bg, color: urg.color }}
                    >
                      {urg.label}
                    </span>
                    <span className="text-[11px] text-[var(--text-tertiary)]">
                      {TASK_TYPE_LABELS[assignment.task.type] ?? assignment.task.type}
                    </span>
                    <span className="text-[11px] text-[var(--text-tertiary)]">·</span>
                    <span className="text-[11px] text-[var(--text-tertiary)]">
                      {ageHrs < 1 ? "< 1hr ago" : `${ageHrs}hr ago`}
                    </span>
                  </div>
                  <div className="text-[13px] font-medium text-[var(--text-primary)]">
                    {assignment.task.user.displayName ?? assignment.task.user.email ?? "Unknown user"}
                  </div>
                  {assignment.task.escalationReason && (
                    <div className="text-[12px] text-[var(--text-secondary)] mt-1">
                      {assignment.task.escalationReason}
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2 flex-shrink-0">
                  {/* View task button */}
                  <a
                    href={`/admin/tasks/${assignment.task.id}`}
                    className="text-[12px] px-3 py-1.5 rounded-lg border transition-all"
                    style={{
                      color:        "var(--text-secondary)",
                      borderColor:  "rgba(0,0,0,0.12)",
                      background:   "transparent",
                    }}
                  >
                    View task →
                  </a>

                  {/* Claim if not mine */}
                  {!isMine && (
                    <button
                      onClick={() => claimTask(assignment.id)}
                      className="text-[12px] px-3 py-1.5 rounded-lg transition-all"
                      style={{
                        background: "var(--kb-navy-light)",
                        color:      "var(--kb-navy)",
                        fontWeight: 500,
                      }}
                    >
                      Claim
                    </button>
                  )}
                </div>
              </div>

              {/* Resolution section — only shown for owned tasks */}
              {isMine && (
                <div
                  className="mt-3 pt-3"
                  style={{ borderTop: "0.5px solid rgba(0,0,0,0.08)" }}
                >
                  <div className="text-[11px] font-medium text-[var(--text-secondary)] mb-1.5">
                    Resolution notes (required before resolving)
                  </div>
                  <textarea
                    className="w-full text-[12px] rounded-lg border border-black/[0.12] px-3 py-2 resize-none focus:outline-none focus:ring-2 mb-2"
                    style={{ minHeight: "64px", focusRingColor: "var(--kb-navy)" } as any}
                    placeholder="e.g. Called local authority — confirmed ticket amount ₩45,000. No additional tickets found. Customer can proceed."
                    value={notes[assignment.id] ?? ""}
                    onChange={(e) =>
                      setNotes((prev) => ({ ...prev, [assignment.id]: e.target.value }))
                    }
                  />
                  <div className="flex justify-end">
                    <button
                      onClick={() => resolveTask(assignment.id, assignment.task.id)}
                      disabled={!!resolving}
                      className="text-[12px] px-4 py-1.5 rounded-lg font-medium transition-all disabled:opacity-50"
                      style={{ background: "var(--kb-navy)", color: "white" }}
                    >
                      {resolving === assignment.id ? "Resolving…" : "Mark resolved → return to AI"}
                    </button>
                  </div>
                </div>
              )}

              {/* Assigned to (for admins viewing others' tasks) */}
              {isAdmin && !isMine && (
                <div className="text-[11px] text-[var(--text-tertiary)] mt-2">
                  Assigned to {assignment.employee.name} · {isActive ? "In progress" : "Assigned"}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
