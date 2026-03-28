import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Verify admin/employee
  const employee = await db.employee.findUnique({
    where: { email: session.user.email },
    select: { id: true, role: true, isActive: true },
  })
  if (!employee || !employee.isActive) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { searchParams } = new URL(req.url)
  const page   = Math.max(1, parseInt(searchParams.get('page')  ?? '1'))
  const limit  = Math.min(100, parseInt(searchParams.get('limit') ?? '25'))
  const search = searchParams.get('search')?.trim() ?? ''
  const status = searchParams.get('status') ?? ''
  const type   = searchParams.get('type')   ?? ''

  // Build where clause
  const where: Record<string, unknown> = {}

  if (status) where.status = status
  if (type)   where.type   = type

  if (search) {
    // Search by task ID suffix or user email
    where.OR = [
      { id: { contains: search, mode: 'insensitive' } },
      { user: { email: { contains: search, mode: 'insensitive' } } },
      { user: { displayName: { contains: search, mode: 'insensitive' } } },
    ]
  }

  const [tasks, total] = await Promise.all([
    db.task.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { lastActivityAt: 'desc' },
      select: {
        id: true,
        type: true,
        status: true,
        tokenEstimate: true,
        tokenActual: true,
        requiresHuman: true,
        createdAt: true,
        closedAt: true,
        lastActivityAt: true,
        assignedEmployeeId: true,
        user: {
          select: { email: true, displayName: true },
        },
      },
    }),
    db.task.count({ where }),
  ])

  // Resolve assigned employee names in one query
  const employeeIds = [...new Set(tasks.map(t => t.assignedEmployeeId).filter(Boolean))] as string[]
  const employees = employeeIds.length > 0
    ? await db.employee.findMany({
        where: { id: { in: employeeIds } },
        select: { id: true, name: true },
      })
    : []
  const empMap = Object.fromEntries(employees.map(e => [e.id, e]))

  const enriched = tasks.map(t => ({
    ...t,
    assignedEmployee: t.assignedEmployeeId ? empMap[t.assignedEmployeeId] ?? null : null,
  }))

  return NextResponse.json({
    tasks: enriched,
    meta: {
      total,
      page,
      pages: Math.ceil(total / limit),
    },
  })
}
