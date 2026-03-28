import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import QueueClient from "./QueueClient";

export default async function QueuePage() {
  const session = await auth();
  if (!session?.user?.email) redirect("/auth/login");

  const employee = await db.employee.findUnique({
    where:  { email: session.user.email },
    select: { id: true, role: true },
  });
  if (!employee) redirect("/dashboard");

  // Fetch all pending-human tasks with their assignments.
  // Filter out assignments whose task is already in a terminal state —
  // a completed/cancelled task can still have an IN_PROGRESS assignment
  // if the employee resolved it via the AI handoff path.
  const assignments = await db.taskAssignment.findMany({
    where: {
      status: { in: ["ASSIGNED", "IN_PROGRESS"] },
      // Only show tasks that are actually awaiting human action
      task: {
        status: { in: ["PENDING_HUMAN", "OPEN", "CLARIFYING", "AI_PROCESSING"] },
      },
      // Agents only see their own + unassigned; admins see all
      ...(employee.role === "ADMIN" ? {} : { employeeId: employee.id }),
    },
    include: {
      task: {
        include: {
          user: { select: { displayName: true, email: true } },
        },
      },
      employee: { select: { name: true } },
    },
    orderBy: [
      { urgency: "desc" }, // CRITICAL > HIGH > MEDIUM > LOW
      { assignedAt: "asc" }, // Oldest first within same urgency
    ],
  });

  // Stats for the header
  const stats = {
    total:    assignments.length,
    critical: assignments.filter((a) => a.urgency === "CRITICAL").length,
    high:     assignments.filter((a) => a.urgency === "HIGH").length,
    mine:     assignments.filter((a) => a.employeeId === employee.id).length,
  };

  return (
    <div className="p-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-[var(--text-primary)]">Task queue</h1>
          <p className="text-sm text-[var(--text-secondary)] mt.0.5">
            Tasks requiring employee action
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-3 mb-6">
        {[
          { label: "Total open",     value: stats.total,    color: "var(--text-primary)" },
          { label: "Critical",       value: stats.critical, color: "var(--kb-red)" },
          { label: "High",           value: stats.high,     color: "#854F0B" },
          { label: "Assigned to me", value: stats.mine,     color: "var(--kb-navy)" },
        ].map((s) => (
          <div key={s.label} className="card p-4">
            <div className="text-[11px] text-[var(--text-tertiary)] mb-1">{s.label}</div>
            <div className="text-2xl font-semibold" style={{ color: s.color }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Queue */}
      <QueueClient
        assignments={JSON.parse(JSON.stringify(assignments))}
        employeeId={employee.id}
        isAdmin={employee.role === "ADMIN"}
      />
    </div>
  );
}
