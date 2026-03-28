import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { EmployeeRole } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

// GET /api/admin/employees
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const employee = await db.employee.findUnique({
    where:  { email: session.user.email },
    select: { id: true, role: true, isActive: true },
  });
  if (!employee?.isActive || employee.role !== "ADMIN") {
    return NextResponse.json({ error: "Admin only" }, { status: 403 });
  }

  const employees = await db.employee.findMany({
    orderBy: [{ isActive: "desc" }, { createdAt: "asc" }],
    include: {
      _count: {
        select: { assignments: true },
      },
      // Get counts by status for quick stats
      assignments: {
        select: { status: true },
      },
    },
  });

  return NextResponse.json({ employees });
}

// POST /api/admin/employees — create new employee
const CreateSchema = z.object({
  name:  z.string().min(1).max(100),
  email: z.string().email(),
  role:  z.nativeEnum(EmployeeRole),
});

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const employee = await db.employee.findUnique({
    where:  { email: session.user.email },
    select: { id: true, role: true, isActive: true },
  });
  if (!employee?.isActive || employee.role !== "ADMIN") {
    return NextResponse.json({ error: "Admin only" }, { status: 403 });
  }

  const body   = await req.json();
  const parsed = CreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  // Check for duplicate email
  const existing = await db.employee.findUnique({
    where: { email: parsed.data.email },
  });
  if (existing) {
    return NextResponse.json({ error: "An employee with this email already exists" }, { status: 409 });
  }

  const newEmployee = await db.employee.create({
    data: {
      name:     parsed.data.name,
      email:    parsed.data.email,
      role:     parsed.data.role,
      isActive: true,
    },
  });

  await db.auditLog.create({
    data: {
      actorId:     employee.id,
      actorType:   "employee",
      eventType:   "employee_created",
      payloadJson: {
        newEmployeeId:    newEmployee.id,
        newEmployeeEmail: newEmployee.email,
        role:             newEmployee.role,
        createdBy:        session.user.email,
      },
    },
  });

  return NextResponse.json({ employee: newEmployee });
}
