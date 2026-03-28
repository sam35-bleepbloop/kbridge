'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

type PendingRecurring = {
  id: string
  label: string
  amountUsd: string | number
  type: string
  preferredDay: number
  nextRunAt: string | null
}

type Props = {
  recurrings: PendingRecurring[]
  tokenBalance: number
  onApproved?: () => void
}

const EXECUTION_COST = 3 // TOKEN_COSTS.RECURRING_EXECUTION

function formatAmount(amount: string | number) {
  return `$${Number(amount).toFixed(2)}`
}

function ordinal(n: number) {
  const s = ['th', 'st', 'nd', 'rd']
  const v = n % 100
  return n + (s[(v - 20) % 10] || s[v] || s[0])
}

export default function PendingApprovalBanner({ recurrings, tokenBalance, onApproved }: Props) {
  const router = useRouter()
  const [approvingId, setApprovingId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [dismissed, setDismissed] = useState<Set<string>>(new Set())

  if (recurrings.length === 0) return null

  const visible = recurrings.filter(r => !dismissed.has(r.id))
  if (visible.length === 0) return null

  const hasEnoughTokens = tokenBalance >= EXECUTION_COST

  const handleApprove = async (id: string) => {
    setError(null)
    setApprovingId(id)
    try {
      const res = await fetch(`/api/recurring/${id}/approve`, { method: 'POST' })
      const data = await res.json()
      if (!res.ok) {
        if (res.status === 402) {
          setError(`You need at least ${EXECUTION_COST} tokens to approve a recurring payment. You have ${data.balance}.`)
        } else {
          setError(data.error ?? 'Something went wrong.')
        }
      } else {
        setDismissed(prev => new Set(prev).add(id))
        onApproved?.()
        router.refresh()
      }
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setApprovingId(null)
    }
  }

  return (
    <div className="space-y-3">
      {visible.map(r => (
        <div
          key={r.id}
          className="border border-amber-200 bg-amber-50 rounded-lg px-4 py-4"
        >
          <div className="flex items-start justify-between gap-4">
            <div className="flex gap-3 items-start">
              {/* Icon */}
              <div className="mt-0.5 flex-shrink-0 w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center">
                <svg className="w-4 h-4 text-amber-600" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
                </svg>
              </div>

              {/* Content */}
              <div>
                <p className="text-sm font-semibold text-amber-900">
                  Approval needed — {r.label}
                </p>
                <p className="text-sm text-amber-700 mt-0.5">
                  {formatAmount(r.amountUsd)} · runs on the {ordinal(r.preferredDay)} of each month.
                  {' '}Your first payment won't process until you confirm below.
                </p>
                <p className="text-xs text-amber-600 mt-1">
                  Each execution costs {EXECUTION_COST} tokens. You currently have{' '}
                  <span className={hasEnoughTokens ? 'font-semibold text-amber-800' : 'font-semibold text-red-700'}>
                    {tokenBalance} token{tokenBalance !== 1 ? 's' : ''}
                  </span>.
                </p>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2 flex-shrink-0">
              {!hasEnoughTokens ? (
                <a
                  href="/tokens"
                  className="px-3 py-1.5 bg-[#1B3A6B] text-white text-sm font-medium rounded-md hover:bg-[#2D5499] transition-colors whitespace-nowrap"
                >
                  Add tokens
                </a>
              ) : (
                <button
                  onClick={() => handleApprove(r.id)}
                  disabled={approvingId === r.id}
                  className="px-3 py-1.5 bg-[#1B3A6B] text-white text-sm font-medium rounded-md hover:bg-[#2D5499] disabled:opacity-60 transition-colors whitespace-nowrap"
                >
                  {approvingId === r.id ? 'Approving…' : 'Approve first payment'}
                </button>
              )}
            </div>
          </div>

          {error && approvingId === null && (
            <p className="mt-2 text-sm text-red-700 bg-red-50 rounded px-3 py-2">{error}</p>
          )}
        </div>
      ))}
    </div>
  )
}
