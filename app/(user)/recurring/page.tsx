/**
 * app/(user)/recurring/page.tsx
 *
 * CHANGES FROM PREVIOUS VERSION:
 * 1. Added `firstRunApprovedAt` and `nextRunAt` to the recurring fetch shape
 * 2. Added `pendingApproval` filtering to separate unapproved recurrings
 * 3. Rendered <PendingApprovalBanner> above the recurring list
 * 4. Added `tokenBalance` prop pass-through from the user data fetch
 *
 * If you have an existing recurring page, apply these changes rather than
 * replacing the whole file. The key additions are marked with // +++ NEW
 */

import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { db } from '@/lib/db'
import RecurringPageClient from './RecurringPageClient'

export const metadata = { title: 'Recurring Payments — K-Bridge' }

export default async function RecurringPage() {
  const session = await auth()
  if (!session?.user?.id) redirect('/auth/login')

  const [recurrings, user] = await Promise.all([
    db.recurring.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        label: true,
        type: true,
        amountUsd: true,
        preferredDay: true,
        gateway: true,
        isActive: true,
        pausedReason: true,
        nextRunAt: true,
        firstRunApprovedAt: true, // +++ NEW
        createdAt: true,
        vendor: { select: { id: true, name: true } },
      },
    }),
    db.user.findUnique({
      where: { id: session.user.id },
      select: { tokenBalance: true },
    }),
  ])

  // +++ NEW: separate pending-approval recurrings for the banner
  const pendingApproval = recurrings
    .filter(r => r.isActive && !r.firstRunApprovedAt)
    .map(r => ({
      id: r.id,
      label: r.label,
      amountUsd: r.amountUsd.toString(),
      type: r.type,
      preferredDay: r.preferredDay,
      nextRunAt: r.nextRunAt?.toISOString() ?? null,
    }))

  return (
    <RecurringPageClient
      recurrings={recurrings.map(r => ({
        ...r,
        amountUsd: r.amountUsd.toString(),
        nextRunAt: r.nextRunAt?.toISOString() ?? null,
        firstRunApprovedAt: r.firstRunApprovedAt?.toISOString() ?? null, // +++ NEW
        createdAt: r.createdAt.toISOString(),
        vendor: r.vendor,
      }))}
      pendingApproval={pendingApproval}        // +++ NEW
      tokenBalance={user?.tokenBalance ?? 0}   // +++ NEW
    />
  )
}
