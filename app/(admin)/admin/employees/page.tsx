"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

interface Assignment {
  status: string;
}

interface EmployeeRow {
  id:          string;
  name:        string;
  email:       string;
  role:        string;
  isActive:    boolean;
  createdAt:   string;
  _count:      { assignments: number };
  assignments: Assignment[];
}

const ROLE_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  ADMIN:        { label: "Admin",        color: "#1B3A6B", bg: "#E8EEF7" },
  SENIOR_AGENT: { label: "Senior agent", color: "#534AB7", bg: "#EEEDFE" },
  AGENT:        { label: "Agent",        color: "#374151", bg: "#F3F4F6" },
};

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export default function AdminEmployeesPage() {
  const router = useRouter();
  const [employees,  setEmployees]  = useState<EmployeeRow[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [filter,     setFilter]     = useState<"ALL" | "ACTIVE" | "INACTIVE">("ACTIVE");

  async function load() {
    setLoading(true);
    const res  = await fetch("/api/admin/employees");
    const data = await res.json();
    setEmployees(data.employees ?? []);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  const filtered = employees.filter((e) => {
    if (filter === "ACTIVE")   return e.isActive;
    if (filter === "INACTIVE") return !e.isActive;
    return true;
  });

  // Stats
  const totalActive    = employees.filter((e) => e.isActive).length;
  const totalInactive  = employees.filter((e) => !e.isActive).length;
  const openAssignments = employees.reduce((sum, e) =>
    sum + e.assignments.filter((a) => ["ASSIGNED", "IN_PROGRESS"].includes(a.status)).length, 0
  );

  return (
    <div className="p-6 max-w-4xl mx-auto">

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-[var(--text-primary)]">Employees</h1>
          <p className="text-sm text-[var(--text-secondary)] mt-0.5">
            {totalActive} active · {totalInactive} inactive
          </p>
        </div>
        <button onClick={() => setShowCreate(true)} className="btn-primary text-[13px]">
          + Add employee
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        {[
          { label: "Active employees", value: totalActive,     color: "var(--text-primary)" },
          { label: "Inactive",         value: totalInactive,   color: "var(--text-tertiary)" },
          { label: "Open assignments", value: openAssignments, color: openAssignments > 0 ? "var(--status-warn-text)" : "var(--text-primary)" },
        ].map((s) => (
          <div key={s.label} className="card p-4">
            <div className="text-[11px] text-[var(--text-tertiary)] mb-1">{s.label}</div>
            <div className="text-2xl font-semibold" style={{ color: s.color }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Filter tabs */}
      <div className="flex items-center gap-1 mb-4">
        {(["ACTIVE", "INACTIVE", "ALL"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className="px-3 py-1.5 rounded-lg text-[12px] transition-all"
            style={{
              background: filter === f ? "var(--kb-navy)" : "white",
              color:      filter === f ? "white" : "var(--text-secondary)",
              border:     `0.5px solid ${filter === f ? "transparent" : "rgba(0,0,0,0.12)"}`,
              fontWeight: filter === f ? 500 : 400,
            }}
          >
            {f.charAt(0) + f.slice(1).toLowerCase()}
          </button>
        ))}
      </div>

      {/* Employee list */}
      <div className="card overflow-hidden">
        <table className="w-full">
          <thead>
            <tr style={{ borderBottom: "1px solid rgba(0,0,0,0.07)", background: "var(--surface-page)" }}>
              {["Employee", "Role", "Status", "Assignments", "Open now", "Joined"].map((h) => (
                <th key={h} className="text-left px-4 py-2.5 text-[11px] font-semibold text-[var(--text-tertiary)] uppercase tracking-wider">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <tr key={i} style={{ borderBottom: "0.5px solid rgba(0,0,0,0.06)" }}>
                  {Array.from({ length: 6 }).map((_, j) => (
                    <td key={j} className="px-4 py-3">
                      <div className="h-3 rounded animate-pulse"
                        style={{ background: "var(--surface-page)", width: j === 0 ? "140px" : "60px" }} />
                    </td>
                  ))}
                </tr>
              ))
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-12 text-center text-[13px] text-[var(--text-tertiary)]">
                  No employees found
                </td>
              </tr>
            ) : (
              filtered.map((emp) => {
                const roleCfg    = ROLE_CONFIG[emp.role] ?? ROLE_CONFIG.AGENT;
                const openCount  = emp.assignments.filter(
                  (a) => ["ASSIGNED", "IN_PROGRESS"].includes(a.status)
                ).length;

                return (
                  <tr
                    key={emp.id}
                    onClick={() => router.push(`/admin/employees/${emp.id}`)}
                    className="cursor-pointer transition-colors"
                    style={{
                      borderBottom: "0.5px solid rgba(0,0,0,0.06)",
                      opacity: emp.isActive ? 1 : 0.55,
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = "var(--kb-navy-pale)")}
                    onMouseLeave={(e) => (e.currentTarget.style.background = "")}
                  >
                    {/* Employee */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <div
                          className="w-8 h-8 rounded-full flex items-center justify-center text-[12px] font-semibold text-white flex-shrink-0"
                          style={{ background: emp.isActive ? "var(--kb-navy)" : "var(--text-tertiary)" }}
                        >
                          {emp.name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <div className="text-[13px] font-medium text-[var(--text-primary)]">{emp.name}</div>
                          <div className="text-[11px] text-[var(--text-tertiary)]">{emp.email}</div>
                        </div>
                      </div>
                    </td>

                    {/* Role */}
                    <td className="px-4 py-3">
                      <span
                        className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                        style={{ background: roleCfg.bg, color: roleCfg.color }}
                      >
                        {roleCfg.label}
                      </span>
                    </td>

                    {/* Status */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        <div
                          className="w-2 h-2 rounded-full"
                          style={{ background: emp.isActive ? "var(--status-success-text)" : "var(--text-tertiary)" }}
                        />
                        <span className="text-[12px]"
                          style={{ color: emp.isActive ? "var(--status-success-text)" : "var(--text-tertiary)" }}>
                          {emp.isActive ? "Active" : "Inactive"}
                        </span>
                      </div>
                    </td>

                    {/* Total assignments */}
                    <td className="px-4 py-3">
                      <span className="text-[13px] text-[var(--text-primary)]">{emp._count.assignments}</span>
                    </td>

                    {/* Open now */}
                    <td className="px-4 py-3">
                      <span
                        className="text-[13px] font-semibold"
                        style={{ color: openCount > 0 ? "var(--status-warn-text)" : "var(--text-tertiary)" }}
                      >
                        {openCount > 0 ? openCount : "—"}
                      </span>
                    </td>

                    {/* Joined */}
                    <td className="px-4 py-3">
                      <span className="text-[12px] text-[var(--text-secondary)]">{fmtDate(emp.createdAt)}</span>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Create modal */}
      {showCreate && (
        <CreateEmployeeModal
          onClose={() => setShowCreate(false)}
          onCreated={() => { setShowCreate(false); load(); }}
        />
      )}
    </div>
  );
}

// ─── Create Employee Modal ────────────────────────────────────────────────────

function CreateEmployeeModal({
  onClose,
  onCreated,
}: {
  onClose:   () => void;
  onCreated: () => void;
}) {
  const [form,   setForm]   = useState({ name: "", email: "", role: "AGENT" });
  const [saving, setSaving] = useState(false);
  const [error,  setError]  = useState("");

  async function handleSubmit() {
    if (!form.name.trim() || !form.email.trim()) {
      setError("Name and email are required");
      return;
    }
    setSaving(true);
    setError("");

    const res  = await fetch("/api/admin/employees", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({
        name:  form.name.trim(),
        email: form.email.trim().toLowerCase(),
        role:  form.role,
      }),
    });
    const data = await res.json();

    if (!res.ok) {
      setError(data.error ?? "Failed to create employee");
      setSaving(false);
      return;
    }
    onCreated();
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.4)" }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-white rounded-xl border border-black/[0.08] p-5 w-full max-w-md">
        <div className="text-[15px] font-semibold text-[var(--text-primary)] mb-1">Add employee</div>
        <p className="text-[12px] text-[var(--text-secondary)] mb-4">
          The employee will be able to log in using this email address once they have a K-Bridge account.
        </p>

        <div className="flex flex-col gap-3">
          <div>
            <label className="label">Full name *</label>
            <input
              className="input"
              placeholder="e.g. Sarah Kim"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </div>
          <div>
            <label className="label">Email address *</label>
            <input
              className="input"
              type="email"
              placeholder="e.g. sarah@kbridge.com"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
          </div>
          <div>
            <label className="label">Role</label>
            <select
              className="input"
              value={form.role}
              onChange={(e) => setForm({ ...form, role: e.target.value })}
            >
              <option value="AGENT">Agent</option>
              <option value="SENIOR_AGENT">Senior agent</option>
              <option value="ADMIN">Admin</option>
            </select>
          </div>

          {/* Role descriptions */}
          <div
            className="rounded-lg p-3 text-[11px] text-[var(--text-secondary)] leading-relaxed"
            style={{ background: "var(--surface-page)" }}
          >
            {form.role === "AGENT" && "Can view and claim unassigned tasks, resolve their own assignments."}
            {form.role === "SENIOR_AGENT" && "Same as Agent. Senior designation is informational — used for escalation routing."}
            {form.role === "ADMIN" && "Full access. Can view all tasks, adjust tokens, manage vendors, users, and employees."}
          </div>
        </div>

        {error && (
          <div className="alert-danger mt-3 text-[12px]"><span>{error}</span></div>
        )}

        <div className="flex items-center justify-between mt-5">
          <button onClick={onClose} className="btn-secondary">Cancel</button>
          <button onClick={handleSubmit} disabled={saving} className="btn-primary">
            {saving ? "Creating…" : "Create employee"}
          </button>
        </div>
      </div>
    </div>
  );
}
