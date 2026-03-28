import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { EmployeeRole } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

// GET /api/admin/employees/[id]
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const requestingEmployee = await db.employee.findUnique({
    where:  { email: session.user.email },
    select: { id: true, role: true, isActive: true },
  });
  if (!requestingEmployee?.isActive || requestingEmployee.role !== "ADMIN") {
    return NextResponse.json({ error: "Admin only" }, { status: 403 });
  }

  const { id } = await params;

  const employee = await db.employee.findUnique({
    where: { id },
    include: {
      assignments: {
        orderBy: { assignedAt: "desc" },
        take: 30,
        include: {
          task: {
            select: {
              id:     true,
              type:   true,
              status: true,
              user:   { select: { displayName: true, email: true } },
            },
          },
        },
      },
    },
  });

  if (!employee) {
    return NextResponse.json({ error: "Employee not found" }, { status: 404 });
  }

  return NextResponse.json({ employee });
}

// PATCH /api/admin/employees/[id]
const PatchSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("edit"),
    name:   z.string().min(1).max(100).optional(),
    role:   z.nativeEnum(EmployeeRole).optional(),
  }),
  z.object({
    action: z.literal("deactivate"),
    reason: z.string().min(1).max(300),
  }),
  z.object({
    action: z.literal("reactivate"),
  }),
]);

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const requestingEmployee = await db.employee.findUnique({
    where:  { email: session.user.email },
    select: { id: true, role: true, isActive: true },
  });
  if (!requestingEmployee?.isActive || requestingEmployee.role !== "ADMIN") {
    return NextResponse.json({ error: "Admin only" }, { status: 403 });
  }

  const { id } = await params;

  // Prevent self-deactivation
  if (id === requestingEmployee.id) {
    return NextResponse.json({ error: "You cannot modify your own account here" }, { status: 400 });
  }

  const body   = await req.json();
  const parsed = PatchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const target = await db.employee.findUnique({
    where:  { id },
    select: { id: true, name: true, email: true, role: true, isActive: true },
  });
  if (!target) {
    return NextResponse.json({ error: "Employee not found" }, { status: 404 });
  }

  if (parsed.data.action === "edit") {
    const { action, ...fields } = parsed.data;
    await db.employee.update({
      where: { id },
      data:  fields,
    });

    await db.auditLog.create({
      data: {
        actorId:     requestingEmployee.id,
        actorType:   "employee",
        eventType:   "employee_edited",
        payloadJson: { targetId: id, changes: fields, adminEmail: session.user.email },
      },
    });

    return NextResponse.json({ ok: true });
  }

  if (parsed.data.action === "deactivate") {
    await db.employee.update({
      where: { id },
      data:  { isActive: false },
    });

    await db.taskAssignment.updateMany({
      where: { employeeId: id, status: { in: ["ASSIGNED", "IN_PROGRESS"] } },
      data:  { status: "REASSIGNED" },
    });

    await db.auditLog.create({
      data: {
        actorId:     requestingEmployee.id,
        actorType:   "employee",
        eventType:   "employee_deactivated",
        payloadJson: {
          targetId:    id,
          targetEmail: target.email,
          reason:      parsed.data.reason,
          adminEmail:  session.user.email,
        },
      },
    });

    return NextResponse.json({ ok: true });
  }

  if (parsed.data.action === "reactivate") {
    await db.employee.update({
      where: { id },
      data:  { isActive: true },
    });

    await db.auditLog.create({
      data: {
        actorId:     requestingEmployee.id,
        actorType:   "employee",
        eventType:   "employee_reactivated",
        payloadJson: { targetId: id, targetEmail: target.email, adminEmail: session.user.email },
      },
    });

    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
