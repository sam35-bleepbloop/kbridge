'use client'

/**
 * app/(user)/recurring/RecurringPageClient.tsx
 *
 * Client shell for the recurring payments page.
 * Renders the pending-approval banner ABOVE the recurring list.
 *
 * If your existing recurring page is already a client component:
 * - Add `pendingApproval` and `tokenBalance` to your props type
 * - Import and render <PendingApprovalBanner> above your list
 *
 * If your existing page server-renders the list inline, use this
 * file as a thin client wrapper and pass data down as shown.
 */

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { formatDistanceToNow, format } from 'date-fns'
import PendingApprovalBanner from '@/components/recurring/PendingApprovalBanner'

type Vendor = { id: string; name: string } | null

type Recurring = {
  id: string
  label: string
  type: string
  amountUsd: string
  preferredDay: number
  gateway: string
  isActive: boolean
  pausedReason: string
  nextRunAt: string | null
  firstRunApprovedAt: string | null
  createdAt: string
  vendor: Vendor
}

type PendingRecurring = {
  id: string
  label: string
  amountUsd: string
  type: string
  preferredDay: number
  nextRunAt: string | null
}

type Props = {
  recurrings: Recurring[]
  pendingApproval: PendingRecurring[]
  tokenBalance: number
}

const PAUSED_REASON_LABELS: Record<string, string> = {
  INSUFFICIENT_TOKENS: 'Paused — insufficient tokens',
  PAYMENT_FAILED:      'Paused — payment failed',
  USER_PAUSED:         'Paused by you',
  ADMIN_PAUSED:        'Paused by admin',
  NONE:                '',
}

const TYPE_LABELS: Record<string, string> = {
  RENT:     'Rent',
  PHONE:    'Phone bill',
  DAYCARE:  'Daycare',
  UTILITY:  'Utility',
  OTHER:    'Other',
}

function ordinal(n: number) {
  const s = ['th', 'st', 'nd', 'rd']
  const v = n % 100
  return n + (s[(v - 20) % 10] || s[v] || s[0])
}

export default function RecurringPageClient({ recurrings, pendingApproval, tokenBalance }: Props) {
  const router = useRouter()
  const [toggling, setToggling] = useState<string | null>(null)

  const handleTogglePause = async (id: string, currentlyActive: boolean) => {
    setToggling(id)
    const endpoint = currentlyActive ? 'pause' : 'resume'
    await fetch(`/api/recurring/${id}/${endpoint}`, { method: 'POST' })
    setToggling(null)
    router.refresh()
  }

  const active   = recurrings.filter(r => r.isActive)
  const inactive = recurrings.filter(r => !r.isActive)

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Recurring Payments</h1>
        <p className="text-sm text-gray-500 mt-1">
          Automated payments that run on a monthly schedule.
        </p>
      </div>

      {/* +++  PENDING APPROVAL BANNERS — shown when firstRunApprovedAt is null */}
      <PendingApprovalBanner
        recurrings={pendingApproval}
        tokenBalance={tokenBalance}
        onApproved={() => router.refresh()}
      />

      {/* Active recurrings */}
      {active.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-sm font-medium text-gray-500 uppercase tracking-wide">Active</h2>
          {active.map(r => (
            <RecurringCard
              key={r.id}
              recurring={r}
              toggling={toggling === r.id}
              onToggle={() => handleTogglePause(r.id, r.isActive)}
            />
          ))}
        </section>
      )}

      {/* Paused / inactive recurrings */}
      {inactive.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-sm font-medium text-gray-500 uppercase tracking-wide">Paused</h2>
          {inactive.map(r => (
            <RecurringCard
              key={r.id}
              recurring={r}
              toggling={toggling === r.id}
              onToggle={() => handleTogglePause(r.id, r.isActive)}
            />
          ))}
        </section>
      )}

      {recurrings.length === 0 && (
        <div className="text-center py-16 text-gray-400">
          <p className="text-sm">No recurring payments set up yet.</p>
          <p className="text-sm mt-1">Start a new task from your dashboard to set one up.</p>
        </div>
      )}
    </div>
  )
}

// ─── Recurring card ────────────────────────────────────────────────────────

function RecurringCard({
  recurring,
  toggling,
  onToggle,
}: {
  recurring: Recurring
  toggling: boolean
  onToggle: () => void
}) {
  const isPendingApproval = recurring.isActive && !recurring.firstRunApprovedAt

  return (
    <div className={`bg-white border rounded-lg px-4 py-4 ${
      isPendingApproval ? 'border-amber-200' : 'border-gray-200'
    }`}>
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="font-medium text-gray-900">{recurring.label}</span>
            <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded">
              {TYPE_LABELS[recurring.type] ?? recurring.type}
            </span>
            {isPendingApproval && (
              <span className="text-xs text-amber-700 bg-amber-100 px-2 py-0.5 rounded font-medium">
                Awaiting approval
              </span>
            )}
          </div>

          <p className="text-sm text-gray-600">
            ${Number(recurring.amountUsd).toFixed(2)} · {ordinal(recurring.preferredDay)} of each month
            {' · '}{recurring.gateway === 'ACH_RECURRING' ? 'Bank transfer' : 'Card'}
          </p>

          {recurring.pausedReason && recurring.pausedReason !== 'NONE' && (
            <p className="text-xs text-amber-700">
              {PAUSED_REASON_LABELS[recurring.pausedReason] ?? recurring.pausedReason}
            </p>
          )}

          {recurring.nextRunAt && recurring.firstRunApprovedAt && (
            <p className="text-xs text-gray-400">
              Next run: {format(new Date(recurring.nextRunAt), 'MMM d, yyyy')}
              {' '}({formatDistanceToNow(new Date(recurring.nextRunAt), { addSuffix: true })})
            </p>
          )}

          {!recurring.firstRunApprovedAt && recurring.isActive && (
            <p className="text-xs text-amber-600">
              Approve the first payment above to start this schedule.
            </p>
          )}
        </div>

        {/* Pause / resume toggle */}
        <button
          onClick={onToggle}
          disabled={toggling}
          className="text-sm text-gray-500 hover:text-gray-700 disabled:opacity-50 whitespace-nowrap"
        >
          {toggling ? '…' : recurring.isActive ? 'Pause' : 'Resume'}
        </button>
      </div>
    </div>
  )
}
