import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'

async function getEmployee(email: string) {
  return db.employee.findUnique({
    where: { email },
    select: { id: true, role: true, isActive: true, name: true },
  })
}

// GET /api/admin/prices — list all price references
export async function GET() {
  const session = await auth()
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const emp = await getEmployee(session.user.email)
  if (!emp || !emp.isActive) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const prices = await db.priceReference.findMany({
    orderBy: [{ category: 'asc' }, { subCategory: 'asc' }],
  })

  return NextResponse.json(prices)
}

// POST /api/admin/prices — create a new price reference
export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const emp = await getEmployee(session.user.email)
  if (!emp || !emp.isActive) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await req.json()
  const { category, subCategory, lowKrw, highKrw, confidence, source } = body

  if (!category || !subCategory || !source || lowKrw == null || highKrw == null) {
    return NextResponse.json({ error: 'Missing required fields.' }, { status: 400 })
  }
  if (highKrw < lowKrw) {
    return NextResponse.json({ error: 'highKrw must be >= lowKrw.' }, { status: 400 })
  }

  const price = await db.priceReference.create({
    data: {
      category,
      subCategory,
      lowKrw,
      highKrw,
      source,
      confidence: confidence ?? 'MEDIUM',
    },
  })

  return NextResponse.json(price, { status: 201 })
}
