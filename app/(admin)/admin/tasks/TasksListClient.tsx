'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { formatDistanceToNow } from 'date-fns'

const TASK_STATUSES = [
  'DRAFT', 'OPEN', 'CLARIFYING', 'AI_PROCESSING', 'PENDING_HUMAN', 'PENDING_PARTNER',
  'PENDING_USER', 'PAYMENT_PENDING', 'COMPLETE', 'CANCELLED', 'FAILED',
]

const TASK_TYPES = [
  'RECURRING_SETUP', 'RECURRING_EXECUTION', 'ONE_OFF_PAYMENT',
  'SERVICE_BOOKING', 'INQUIRY', 'SUPPORT', 'OTHER',
]

const STATUS_STYLES: Record<string, string> = {
  OPEN:            'bg-blue-50 text-blue-700',
  CLARIFYING:      'bg-purple-50 text-purple-700',
  AI_PROCESSING:   'bg-indigo-50 text-indigo-700',
  PENDING_HUMAN:   'bg-orange-50 text-orange-700',
  PENDING_USER:    'bg-yellow-50 text-yellow-700',
  PAYMENT_PENDING:  'bg-cyan-50 text-cyan-700',
  PENDING_PARTNER: 'bg-purple-50 text-purple-700',
  DRAFT:           'bg-gray-50 text-gray-500',
  COMPLETE:        'bg-green-50 text-green-700',
  CANCELLED:       'bg-gray-100 text-gray-600',
  FAILED:          'bg-red-50 text-red-700',
}

const PAGE_SIZE = 25

type Task = {
  id: string
  type: string
  status: string
  label: string | null
  tokenEstimate: number | null
  tokenActual: number | null
  requiresHuman: boolean
  createdAt: string
  closedAt: string | null
  lastActivityAt: string
  user: { email: string; displayName: string | null } | null
  assignedEmployee: { name: string } | null
  _count: { chatHistory: number }
}

type Meta = { total: number; page: number; pages: number }

export default function TasksListClient() {
  const router = useRouter()
  const [tasks, setTasks] = useState<Task[]>([])
  const [meta, setMeta] = useState<Meta>({ total: 0, page: 1, pages: 1 })
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const [page, setPage] = useState(1)

  const fetch = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams({ page: String(page), limit: String(PAGE_SIZE) })
    if (search)       params.set('search', search)
    if (statusFilter) params.set('status', statusFilter)
    if (typeFilter)   params.set('type', typeFilter)

    const res = await window.fetch(`/api/admin/tasks?${params}`)
    if (res.ok) {
      const data = await res.json()
      setTasks(data.tasks)
      setMeta(data.meta)
    }
    setLoading(false)
  }, [page, search, statusFilter, typeFilter])

  useEffect(() => { fetch() }, [fetch])

  // Reset page when filters change
  useEffect(() => { setPage(1) }, [search, statusFilter, typeFilter])

  const fmtType = (t: string) => t.replace(/_/g, ' ')

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <input
          type="text"
          placeholder="Search by task ID or user email…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="border border-gray-300 rounded-md px-3 py-2 text-sm w-72 focus:outline-none focus:ring-2 focus:ring-[#1B3A6B]"
        />
        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
          className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1B3A6B]"
        >
          <option value="">All statuses</option>
          {TASK_STATUSES.map(s => (
            <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>
          ))}
        </select>
        <select
          value={typeFilter}
          onChange={e => setTypeFilter(e.target.value)}
          className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1B3A6B]"
        >
          <option value="">All types</option>
          {TASK_TYPES.map(t => (
            <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>
          ))}
        </select>
        <span className="ml-auto text-sm text-gray-500">
          {meta.total} task{meta.total !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                <th className="px-4 py-3">ID</th>
                <th className="px-4 py-3">User</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Tokens</th>
                <th className="px-4 py-3">Waiting on</th>
                <th className="px-4 py-3">Assigned To</th>
                <th className="px-4 py-3">Last Activity</th>
                <th className="px-4 py-3">Created</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan={9} className="px-4 py-8 text-center text-gray-400">Loading…</td>
                </tr>
              ) : tasks.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-8 text-center text-gray-400">No tasks found.</td>
                </tr>
              ) : tasks.map(task => (
                <tr
                  key={task.id}
                  onClick={() => router.push(`/admin/tasks/${task.id}`)}
                  className="hover:bg-gray-50 cursor-pointer transition-colors"
                >
                  <td className="px-4 py-3 font-mono text-xs text-gray-500">
                    …{task.id.slice(-8)}
                  </td>
                  <td className="px-4 py-3">
                    <div className="font-medium text-gray-900 truncate max-w-[160px]">
                      {task.user?.displayName || '—'}
                    </div>
                    <div className="text-xs text-gray-400 truncate max-w-[160px]">
                      {task.user?.email || '—'}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-600 whitespace-nowrap">
                    {fmtType(task.type)}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${STATUS_STYLES[task.status] ?? 'bg-gray-100 text-gray-600'}`}>
                      {task.status.replace(/_/g, ' ')}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-600 whitespace-nowrap">
                    {task.tokenActual != null
                      ? <span className="font-medium">{task.tokenActual}</span>
                      : task.tokenEstimate != null
                      ? <span className="text-gray-400">{task.tokenEstimate} est.</span>
                      : '—'}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    {task.status === 'PENDING_HUMAN' && !task.assignedEmployee ? (
                      <span className="inline-flex items-center gap-1.5 text-xs text-orange-600 font-medium">
                        <span className="w-1.5 h-1.5 rounded-full bg-orange-500 inline-block"/>
                        Unassigned
                      </span>
                    ) : task.status === 'PENDING_HUMAN' ? (
                      <span className="inline-flex items-center gap-1.5 text-xs text-orange-600">
                        <span className="w-1.5 h-1.5 rounded-full bg-orange-400 inline-block"/>
                        With employee
                      </span>
                    ) : task.status === 'AI_PROCESSING' ? (
                      <span className="inline-flex items-center gap-1.5 text-xs text-indigo-600">
                        <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 inline-block"/>
                        AI preparing response
                      </span>
                    ) : task.status === 'CLARIFYING' || task.status === 'PENDING_USER' ? (
                      <span className="inline-flex items-center gap-1.5 text-xs text-blue-600">
                        <span className="w-1.5 h-1.5 rounded-full bg-blue-500 inline-block"/>
                        Waiting on user
                      </span>
                    ) : task.status === 'PENDING_PARTNER' ? (
                      <span className="inline-flex items-center gap-1.5 text-xs text-purple-600">
                        <span className="w-1.5 h-1.5 rounded-full bg-purple-500 inline-block"/>
                        With partner
                      </span>
                    ) : (
                      <span className="text-gray-400 text-xs">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {task.assignedEmployee?.name || <span className="text-gray-400">—</span>}
                  </td>
                  <td className="px-4 py-3 text-gray-500 whitespace-nowrap text-xs">
                    {formatDistanceToNow(new Date(task.lastActivityAt), { addSuffix: true })}
                  </td>
                  <td className="px-4 py-3 text-gray-500 whitespace-nowrap text-xs">
                    {formatDistanceToNow(new Date(task.createdAt), { addSuffix: true })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      {meta.pages > 1 && (
        <div className="flex items-center justify-between">
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
            className="px-3 py-1.5 text-sm border border-gray-300 rounded-md disabled:opacity-40 hover:bg-gray-50"
          >
            Previous
          </button>
          <span className="text-sm text-gray-600">
            Page {meta.page} of {meta.pages}
          </span>
          <button
            onClick={() => setPage(p => Math.min(meta.pages, p + 1))}
            disabled={page === meta.pages}
            className="px-3 py-1.5 text-sm border border-gray-300 rounded-md disabled:opacity-40 hover:bg-gray-50"
          >
            Next
          </button>
        </div>
      )}
    </div>
  )
}
