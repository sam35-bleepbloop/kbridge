import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { reserveTokens, TOKEN_COSTS } from '@/lib/tokens/engine'

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params

  const recurring = await db.recurring.findUnique({
    where: { id },
    include: { user: { select: { id: true, tokenBalance: true } } },
  })

  if (!recurring) {
    return NextResponse.json({ error: 'Recurring not found.' }, { status: 404 })
  }

  if (recurring.userId !== session.user.id) {
    return NextResponse.json({ error: 'Forbidden.' }, { status: 403 })
  }

  if (recurring.firstRunApprovedAt) {
    return NextResponse.json({ error: 'First run already approved.' }, { status: 409 })
  }

  if (!recurring.isActive) {
    return NextResponse.json({ error: 'Recurring is not active.' }, { status: 400 })
  }

  const executionCost = TOKEN_COSTS.RECURRING_EXECUTION
  if (recurring.user.tokenBalance < executionCost) {
    return NextResponse.json(
      {
        error: 'Insufficient tokens.',
        required: executionCost,
        balance: recurring.user.tokenBalance,
      },
      { status: 402 }
    )
  }

  const setupTask = await db.task.findFirst({
    where: {
      userId: session.user.id,
      type: 'RECURRING_SETUP',
      status: 'COMPLETE',
    },
    orderBy: { createdAt: 'desc' },
    select: { id: true },
  })

  const now = new Date()

  const [updatedRecurring] = await db.$transaction([
    db.recurring.update({
      where: { id },
      data: { firstRunApprovedAt: now },
    }),
    db.auditLog.create({
      data: {
        taskId:      setupTask?.id ?? null,
        actorId:     session.user.id,
        actorType:   "user",
        eventType:   "recurring_first_run_approved",
        payloadJson: {
          recurringId: id,
          approvedAt:  now.toISOString(),
        },
      },
    }),
  ])

  return NextResponse.json({
    ok: true,
    firstRunApprovedAt: updatedRecurring.firstRunApprovedAt,
    nextRunAt: updatedRecurring.nextRunAt,
  })
}
