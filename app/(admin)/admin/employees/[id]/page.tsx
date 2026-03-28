"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";

// ─── Types ────────────────────────────────────────────────────────────────────

interface AssignmentRow {
  id:         string;
  status:     string;
  urgency:    string;
  notes:      string | null;
  assignedAt: string;
  resolvedAt: string | null;
  task: {
    id:     string;
    type:   string;
    status: string;
    user:   { displayName: string | null; email: string | null };
  } | null;
}

interface EmployeeDetail {
  id:          string;
  name:        string;
  email:       string;
  role:        string;
  isActive:    boolean;
  createdAt:   string;
  assignments: AssignmentRow[];
}

// ─── Config ───────────────────────────────────────────────────────────────────

const ROLE_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  ADMIN:        { label: "Admin",        color: "#1B3A6B", bg: "#E8EEF7" },
  SENIOR_AGENT: { label: "Senior agent", color: "#534AB7", bg: "#EEEDFE" },
  AGENT:        { label: "Agent",        color: "#374151", bg: "#F3F4F6" },
};

const URGENCY_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  CRITICAL: { label: "Critical", color: "#7A1010", bg: "#F9EAEA" },
  HIGH:     { label: "High",     color: "#633806", bg: "#FAEEDA" },
  MEDIUM:   { label: "Medium",   color: "#374151", bg: "#F3F4F6" },
  LOW:      { label: "Low",      color: "#6B7280", bg: "var(--surface-page)" },
};

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  ASSIGNED:    { label: "Assigned",    color: "#633806", bg: "#FAEEDA" },
  IN_PROGRESS: { label: "In progress", color: "#1B3A6B", bg: "#E8EEF7" },
  RESOLVED:    { label: "Resolved",    color: "#085041", bg: "#E1F5EE" },
  REASSIGNED:  { label: "Reassigned",  color: "#6B7280", bg: "#F3F4F6" },
};

const TYPE_LABELS: Record<string, string> = {
  RECURRING_SETUP:     "Recurring setup",
  RECURRING_EXECUTION: "Recurring execution",
  ONE_OFF_PAYMENT:     "One-off payment",
  SERVICE_BOOKING:     "Service booking",
  INQUIRY:             "Inquiry",
  OTHER:               "Other",
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmt(d: string) {
  return new Date(d).toLocaleString("en-US", {
    month: "short", day: "numeric", hour: "numeric", minute: "2-digit",
  });
}

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-[10px] font-semibold text-[var(--text-tertiary)] uppercase tracking-wider mb-2">
      {children}
    </div>
  );
}

function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={`card p-4 ${className}`}>{children}</div>;
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function AdminEmployeeDetailPage() {
  const params     = useParams();
  const employeeId = params.id as string;

  const [employee,        setEmployee]        = useState<EmployeeDetail | null>(null);
  const [loading,         setLoading]         = useState(true);
  const [editing,         setEditing]         = useState(false);
  const [saving,          setSaving]          = useState(false);
  const [saveMsg,         setSaveMsg]         = useState<string | null>(null);
  const [deactivating,    setDeactivating]    = useState(false);
  const [confirmDeactive, setConfirmDeactive] = useState(false);
  const [deactiveReason,  setDeactiveReason]  = useState("");
  const [reactivating,    setReactivating]    = useState(false);
  const [statusFilter,    setStatusFilter]    = useState<"ALL" | "OPEN" | "RESOLVED">("ALL");

  // Edit form
  const [form, setForm] = useState({ name: "", role: "AGENT" });

  useEffect(() => {
    fetch(`/api/admin/employees/${employeeId}`)
      .then((r) => r.json())
      .then((d) => {
        setEmployee(d.employee);
        setForm({ name: d.employee.name, role: d.employee.role });
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [employeeId]);

  async function reload() {
    const res  = await fetch(`/api/admin/employees/${employeeId}`);
    const data = await res.json();
    setEmployee(data.employee);
    setForm({ name: data.employee.name, role: data.employee.role });
  }

  async function handleSave() {
    setSaving(true);
    setSaveMsg(null);
    const res = await fetch(`/api/admin/employees/${employeeId}`, {
      method:  "PATCH",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ action: "edit", name: form.name.trim(), role: form.role }),
    });
    if (res.ok) {
      setSaveMsg("Saved");
      setEditing(false);
      await reload();
    }
    setSaving(false);
  }

  async function handleDeactivate() {
    if (!deactiveReason.trim()) return;
    setDeactivating(true);
    await fetch(`/api/admin/employees/${employeeId}`, {
      method:  "PATCH",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ action: "deactivate", reason: deactiveReason }),
    });
    setConfirmDeactive(false);
    setDeactiveReason("");
    setDeactivating(false);
    await reload();
  }

  async function handleReactivate() {
    setReactivating(true);
    await fetch(`/api/admin/employees/${employeeId}`, {
      method:  "PATCH",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ action: "reactivate" }),
    });
    setReactivating(false);
    await reload();
  }

  // ── Loading ────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <div className="text-[13px] text-[var(--text-tertiary)] animate-pulse">Loading employee…</div>
      </div>
    );
  }

  if (!employee) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <div className="text-[13px] text-[var(--kb-red)]">Employee not found.</div>
      </div>
    );
  }

  const roleCfg       = ROLE_CONFIG[employee.role] ?? ROLE_CONFIG.AGENT;
  const openCount     = employee.assignments.filter(
    (a) => ["ASSIGNED", "IN_PROGRESS"].includes(a.status)
  ).length;
  const resolvedCount = employee.assignments.filter((a) => a.status === "RESOLVED").length;

  const filteredAssignments = employee.assignments.filter((a) => {
    if (statusFilter === "OPEN")     return ["ASSIGNED", "IN_PROGRESS"].includes(a.status);
    if (statusFilter === "RESOLVED") return a.status === "RESOLVED";
    return true;
  });

  return (
    <div className="p-6 max-w-4xl mx-auto">

      {/* Breadcrumb */}
      <div className="flex items-center gap-2 mb-5 text-[12px]">
        <a href="/admin/employees"
          className="text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] transition-colors">
          Employees
        </a>
        <span style={{ color: "rgba(0,0,0,0.2)" }}>/</span>
        <span className="text-[var(--text-secondary)] font-medium">{employee.name}</span>
      </div>

      <div className="flex gap-5 items-start">

        {/* ── LEFT: main content ──────────────────────────────────────────── */}
        <div className="flex-1 min-w-0 flex flex-col gap-4">

          {/* Profile header */}
          <Card>
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div
                  className="w-12 h-12 rounded-full flex items-center justify-center text-[16px] font-bold text-white flex-shrink-0"
                  style={{ background: employee.isActive ? "var(--kb-navy)" : "var(--text-tertiary)" }}
                >
                  {employee.name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase()}
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <h2 className="text-[16px] font-semibold text-[var(--text-primary)]">{employee.name}</h2>
                    <span
                      className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                      style={{ background: roleCfg.bg, color: roleCfg.color }}
                    >
                      {roleCfg.label}
                    </span>
                    <span
                      className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                      style={{
                        background: employee.isActive ? "var(--status-success-bg)" : "#F3F4F6",
                        color:      employee.isActive ? "var(--status-success-text)" : "var(--text-tertiary)",
                      }}
                    >
                      {employee.isActive ? "Active" : "Inactive"}
                    </span>
                  </div>
                  <div className="text-[12px] text-[var(--text-secondary)]">{employee.email}</div>
                  <div className="text-[11px] text-[var(--text-tertiary)] mt-0.5">
                    Member since {fmtDate(employee.createdAt)}
                  </div>
                </div>
              </div>

              <button
                onClick={() => { setEditing(!editing); setSaveMsg(null); }}
                className="btn-secondary text-[12px] flex-shrink-0"
              >
                {editing ? "Cancel" : "Edit"}
              </button>
            </div>

            {/* Edit form */}
            {editing && (
              <div
                className="mt-4 pt-4 flex flex-col gap-3"
                style={{ borderTop: "0.5px solid rgba(0,0,0,0.07)" }}
              >
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="label">Full name</label>
                    <input
                      className="input text-[13px]"
                      value={form.name}
                      onChange={(e) => setForm({ ...form, name: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="label">Role</label>
                    <select
                      className="input text-[13px]"
                      value={form.role}
                      onChange={(e) => setForm({ ...form, role: e.target.value })}
                    >
                      <option value="AGENT">Agent</option>
                      <option value="SENIOR_AGENT">Senior agent</option>
                      <option value="ADMIN">Admin</option>
                    </select>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {saveMsg && (
                    <span className="text-[11px] text-[var(--status-success-text)]">{saveMsg}</span>
                  )}
                  <button
                    onClick={handleSave}
                    disabled={saving}
                    className="btn-primary text-[13px] ml-auto"
                  >
                    {saving ? "Saving…" : "Save changes"}
                  </button>
                </div>
              </div>
            )}
          </Card>

          {/* Assignment history */}
          <Card className="overflow-hidden p-0">
            <div
              className="flex items-center justify-between px-4 py-3 border-b"
              style={{ borderColor: "rgba(0,0,0,0.08)", background: "var(--surface-page)" }}
            >
              <span className="text-[13px] font-semibold text-[var(--text-primary)]">
                Assignment history ({employee.assignments.length})
              </span>
              <div className="flex items-center gap-1">
                {(["ALL", "OPEN", "RESOLVED"] as const).map((f) => (
                  <button
                    key={f}
                    onClick={() => setStatusFilter(f)}
                    className="px-2.5 py-1 rounded-lg text-[11px] transition-all"
                    style={{
                      background: statusFilter === f ? "var(--kb-navy)" : "transparent",
                      color:      statusFilter === f ? "white" : "var(--text-tertiary)",
                      fontWeight: statusFilter === f ? 500 : 400,
                    }}
                  >
                    {f === "ALL" ? `All (${employee.assignments.length})`
                      : f === "OPEN" ? `Open (${openCount})`
                      : `Resolved (${resolvedCount})`}
                  </button>
                ))}
              </div>
            </div>

            <div className="p-4">
              {filteredAssignments.length === 0 ? (
                <div className="text-[13px] text-[var(--text-tertiary)] text-center py-8">
                  No assignments found
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  {filteredAssignments.map((a) => {
                    const statusCfg = STATUS_CONFIG[a.status] ?? STATUS_CONFIG.ASSIGNED;
                    const urgCfg    = URGENCY_CONFIG[a.urgency] ?? URGENCY_CONFIG.MEDIUM;
                    return (
                      <a
                        key={a.id}
                        href={a.task ? `/admin/tasks/${a.task.id}` : "#"}
                        className="flex items-center gap-3 p-3 rounded-lg border transition-colors"
                        style={{ borderColor: "rgba(0,0,0,0.07)" }}
                        onMouseEnter={(e) => (e.currentTarget.style.borderColor = "var(--kb-navy-light)")}
                        onMouseLeave={(e) => (e.currentTarget.style.borderColor = "rgba(0,0,0,0.07)")}
                      >
                        {/* Status + urgency */}
                        <div className="flex items-center gap-1.5 flex-shrink-0">
                          <span
                            className="text-[9px] font-semibold px-1.5 py-0.5 rounded"
                            style={{ background: statusCfg.bg, color: statusCfg.color }}
                          >
                            {statusCfg.label}
                          </span>
                          <span
                            className="text-[9px] font-semibold px-1.5 py-0.5 rounded"
                            style={{ background: urgCfg.bg, color: urgCfg.color }}
                          >
                            {urgCfg.label}
                          </span>
                        </div>

                        {/* Task info */}
                        <div className="flex-1 min-w-0">
                          <div className="text-[12px] font-medium text-[var(--text-primary)] truncate">
                            {a.task ? (TYPE_LABELS[a.task.type] ?? a.task.type) : "Task not found"}
                          </div>
                          {a.task?.user && (
                            <div className="text-[11px] text-[var(--text-tertiary)]">
                              {a.task.user.displayName ?? a.task.user.email ?? "Unknown user"}
                            </div>
                          )}
                        </div>

                        {/* Notes preview */}
                        {a.notes && (
                          <div className="text-[11px] text-[var(--text-secondary)] max-w-[200px] truncate flex-shrink-0">
                            {a.notes}
                          </div>
                        )}

                        {/* Timestamps */}
                        <div className="text-right flex-shrink-0">
                          <div className="text-[10px] text-[var(--text-tertiary)]">{fmt(a.assignedAt)}</div>
                          {a.resolvedAt && (
                            <div className="text-[10px] text-[var(--status-success-text)]">
                              Resolved {fmt(a.resolvedAt)}
                            </div>
                          )}
                        </div>

                        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" className="flex-shrink-0">
                          <path d="M4 9l3-3-3-3" stroke="var(--text-tertiary)" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      </a>
                    );
                  })}
                </div>
              )}
            </div>
          </Card>
        </div>

        {/* ── RIGHT: actions sidebar ───────────────────────────────────────── */}
        <div className="w-[220px] flex-shrink-0 flex flex-col gap-4">

          {/* Quick stats */}
          <Card>
            <SectionLabel>Stats</SectionLabel>
            <div className="flex flex-col gap-2">
              {[
                ["Total assignments", String(employee.assignments.length)],
                ["Open now",          String(openCount)],
                ["Resolved",          String(resolvedCount)],
              ].map(([label, value]) => (
                <div key={label} className="flex items-center justify-between">
                  <span className="text-[11px] text-[var(--text-tertiary)]">{label}</span>
                  <span
                    className="text-[13px] font-semibold"
                    style={{ color: label === "Open now" && openCount > 0 ? "var(--status-warn-text)" : "var(--text-primary)" }}
                  >
                    {value}
                  </span>
                </div>
              ))}
            </div>
          </Card>

          {/* Activate / Deactivate */}
          <Card>
            <SectionLabel>Account status</SectionLabel>
            {employee.isActive ? (
              <>
                {!confirmDeactive ? (
                  <button
                    onClick={() => setConfirmDeactive(true)}
                    className="w-full text-[12px] py-2 rounded-lg font-medium transition-all"
                    style={{
                      background: "var(--status-danger-bg)",
                      color:      "var(--status-danger-text)",
                      border:     "1px solid #FCA5A5",
                    }}
                  >
                    Deactivate account
                  </button>
                ) : (
                  <div>
                    <div className="text-[11px] text-[var(--status-danger-text)] mb-2 font-medium">
                      Open assignments will be unassigned. Enter reason:
                    </div>
                    <textarea
                      className="input text-[12px] resize-none mb-2"
                      style={{ minHeight: "60px" }}
                      placeholder="Reason…"
                      value={deactiveReason}
                      onChange={(e) => setDeactiveReason(e.target.value)}
                    />
                    <div className="flex gap-1.5">
                      <button
                        onClick={() => setConfirmDeactive(false)}
                        className="btn-secondary text-[11px] flex-1 h-8"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleDeactivate}
                        disabled={deactivating || !deactiveReason.trim()}
                        className="text-[11px] flex-1 h-8 rounded-lg font-medium transition-all disabled:opacity-50"
                        style={{ background: "var(--kb-red)", color: "white" }}
                      >
                        {deactivating ? "…" : "Confirm"}
                      </button>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <button
                onClick={handleReactivate}
                disabled={reactivating}
                className="w-full text-[12px] py-2 rounded-lg font-medium transition-all disabled:opacity-50"
                style={{
                  background: "var(--status-success-bg)",
                  color:      "var(--status-success-text)",
                  border:     "1px solid #6EE7B7",
                }}
              >
                {reactivating ? "Reactivating…" : "Reactivate account"}
              </button>
            )}
          </Card>

        </div>
      </div>
    </div>
  );
}
