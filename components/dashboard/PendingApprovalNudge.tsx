'use client'

/**
 * components/dashboard/PendingApprovalNudge.tsx
 *
 * Compact version of the approval notice shown on the main dashboard.
 * Shows a single summary line if there are any recurring payments awaiting
 * first-run approval. Links to /recurring for the full approval flow.
 *
 * Usage in dashboard — add below the token balance card:
 *
 *   import PendingApprovalNudge from '@/components/dashboard/PendingApprovalNudge'
 *   ...
 *   <PendingApprovalNudge count={pendingApprovalCount} />
 *
 * Pass `pendingApprovalCount` from your server component:
 *   const pendingApprovalCount = await db.recurring.count({
 *     where: { userId: session.user.id, isActive: true, firstRunApprovedAt: null }
 *   })
 */

type Props = {
  count: number
}

export default function PendingApprovalNudge({ count }: Props) {
  if (count === 0) return null

  return (
    <a
      href="/recurring"
      className="flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 hover:bg-amber-100 transition-colors group"
    >
      <div className="flex-shrink-0 w-7 h-7 rounded-full bg-amber-100 group-hover:bg-amber-200 flex items-center justify-center transition-colors">
        <svg className="w-4 h-4 text-amber-600" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
        </svg>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-amber-900">
          {count === 1
            ? '1 recurring payment needs your approval'
            : `${count} recurring payments need your approval`}
        </p>
        <p className="text-xs text-amber-600 mt-0.5">
          Payments won't process until you confirm the first run.
        </p>
      </div>
      <svg className="w-4 h-4 text-amber-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
      </svg>
    </a>
  )
}
