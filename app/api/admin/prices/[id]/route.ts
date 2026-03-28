import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'

async function getEmployee(email: string) {
  return db.employee.findUnique({
    where: { email },
    select: { id: true, role: true, isActive: true, name: true },
  })
}

// PATCH /api/admin/prices/[id]
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const emp = await getEmployee(session.user.email)
  if (!emp || !emp.isActive) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { id } = await params

  const existing = await db.priceReference.findUnique({ where: { id } })
  if (!existing) return NextResponse.json({ error: 'Not found.' }, { status: 404 })

  const body = await req.json()
  const { category, subCategory, lowKrw, highKrw, confidence, source } = body

  if (highKrw != null && lowKrw != null && highKrw < lowKrw) {
    return NextResponse.json({ error: 'highKrw must be >= lowKrw.' }, { status: 400 })
  }

  const updated = await db.priceReference.update({
    where: { id },
    data: {
      ...(category    != null && { category }),
      ...(subCategory != null && { subCategory }),
      ...(lowKrw      != null && { lowKrw }),
      ...(highKrw     != null && { highKrw }),
      ...(confidence  != null && { confidence }),
      ...(source      != null && { source }),
      lastUpdatedAt: new Date(),
    },
  })

  return NextResponse.json(updated)
}

// DELETE /api/admin/prices/[id]
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const emp = await getEmployee(session.user.email)
  if (!emp || !emp.isActive) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { id } = await params

  const existing = await db.priceReference.findUnique({ where: { id } })
  if (!existing) return NextResponse.json({ error: 'Not found.' }, { status: 404 })

  await db.priceReference.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
