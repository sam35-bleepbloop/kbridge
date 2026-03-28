import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

// POST /api/admin/assignments/[id]/claim
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const employee = await db.employee.findUnique({
    where: { email: session.user.email },
  });
  if (!employee?.isActive) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;

  await db.$transaction(async (tx) => {
    // Mark previous assignment as reassigned if it exists
    await tx.taskAssignment.updateMany({
      where:  { id, status: "ASSIGNED" },
      data:   { status: "REASSIGNED" },
    });

    // Create new assignment for this employee
    const prev = await tx.taskAssignment.findUnique({ where: { id } });
    if (!prev) throw new Error("Assignment not found");

    await tx.taskAssignment.create({
      data: {
        taskId:     prev.taskId,
        employeeId: employee.id,
        status:     "IN_PROGRESS",
        urgency:    prev.urgency,
        notes:      `Claimed from ${prev.employeeId}`,
      },
    });

    await tx.task.update({
      where: { id: prev.taskId ?? undefined },
      data:  { assignedEmployeeId: employee.id },
    });

    await tx.auditLog.create({
      data: {
        taskId:      prev.taskId,
        actorId:     employee.id,
        actorType:   "employee",
        eventType:   "assignment_claimed",
        payloadJson: { previousEmployeeId: prev.employeeId, newEmployeeId: employee.id },
      },
    });
  });

  return NextResponse.json({ ok: true });
}
