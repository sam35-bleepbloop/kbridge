'use client'

import { useState, useEffect } from 'react'
import { formatDistanceToNow } from 'date-fns'

type PriceRef = {
  id: string
  category: string
  label: string
  minKrw: number
  maxKrw: number
  unit: string
  confidenceLevel: string
  notes: string | null
  updatedAt: string
  updatedBy: string | null
}

const CONFIDENCE_STYLES: Record<string, string> = {
  HIGH:   'bg-green-50 text-green-700',
  MEDIUM: 'bg-yellow-50 text-yellow-700',
  LOW:    'bg-red-50 text-red-700',
}

const EMPTY_FORM = {
  category: '',
  label: '',
  minKrw: '',
  maxKrw: '',
  unit: '',
  confidenceLevel: 'MEDIUM',
  notes: '',
}

type FormState = typeof EMPTY_FORM

export default function PricesClient() {
  const [prices, setPrices] = useState<PriceRef[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')

  // Modal state
  const [showModal, setShowModal] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [form, setForm] = useState<FormState>(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState('')

  // Delete confirmation
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)

  const load = async () => {
    setLoading(true)
    const res = await fetch('/api/admin/prices')
    if (res.ok) setPrices(await res.json())
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const categories = [...new Set(prices.map(p => p.category))].sort()

  const filtered = prices.filter(p => {
    const matchSearch = !search ||
      p.label.toLowerCase().includes(search.toLowerCase()) ||
      p.category.toLowerCase().includes(search.toLowerCase())
    const matchCat = !categoryFilter || p.category === categoryFilter
    return matchSearch && matchCat
  })

  const openCreate = () => {
    setEditId(null)
    setForm(EMPTY_FORM)
    setFormError('')
    setShowModal(true)
  }

  const openEdit = (p: PriceRef) => {
    setEditId(p.id)
    setForm({
      category:        p.category,
      label:           p.label,
      minKrw:          String(p.minKrw),
      maxKrw:          String(p.maxKrw),
      unit:            p.unit,
      confidenceLevel: p.confidenceLevel,
      notes:           p.notes ?? '',
    })
    setFormError('')
    setShowModal(true)
  }

  const handleSave = async () => {
    setFormError('')
    const min = parseInt(form.minKrw)
    const max = parseInt(form.maxKrw)
    if (!form.category.trim()) return setFormError('Category is required.')
    if (!form.label.trim())    return setFormError('Label is required.')
    if (!form.unit.trim())     return setFormError('Unit is required.')
    if (isNaN(min) || min < 0) return setFormError('Min KRW must be a non-negative number.')
    if (isNaN(max) || max < min) return setFormError('Max KRW must be ≥ Min KRW.')

    setSaving(true)
    const body = {
      category:        form.category.trim(),
      label:           form.label.trim(),
      minKrw:          min,
      maxKrw:          max,
      unit:            form.unit.trim(),
      confidenceLevel: form.confidenceLevel,
      notes:           form.notes.trim() || null,
    }

    const url    = editId ? `/api/admin/prices/${editId}` : '/api/admin/prices'
    const method = editId ? 'PATCH' : 'POST'
    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })

    setSaving(false)
    if (res.ok) {
      setShowModal(false)
      load()
    } else {
      const d = await res.json().catch(() => ({}))
      setFormError(d.error ?? 'Failed to save.')
    }
  }

  const handleDelete = async () => {
    if (!deleteId) return
    setDeleting(true)
    await fetch(`/api/admin/prices/${deleteId}`, { method: 'DELETE' })
    setDeleting(false)
    setDeleteId(null)
    load()
  }

  const fmtKrw = (n: number) => `₩${n.toLocaleString()}`

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-wrap gap-3 items-center">
        <input
          type="text"
          placeholder="Search label or category…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="border border-gray-300 rounded-md px-3 py-2 text-sm w-64 focus:outline-none focus:ring-2 focus:ring-[#1B3A6B]"
        />
        <select
          value={categoryFilter}
          onChange={e => setCategoryFilter(e.target.value)}
          className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1B3A6B]"
        >
          <option value="">All categories</option>
          {categories.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <span className="text-sm text-gray-500">{filtered.length} reference{filtered.length !== 1 ? 's' : ''}</span>
        <button
          onClick={openCreate}
          className="ml-auto px-4 py-2 bg-[#1B3A6B] text-white text-sm font-medium rounded-md hover:bg-[#2D5499] transition-colors"
        >
          + Add price reference
        </button>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              <th className="px-4 py-3">Category</th>
              <th className="px-4 py-3">Label</th>
              <th className="px-4 py-3">Range (KRW)</th>
              <th className="px-4 py-3">Unit</th>
              <th className="px-4 py-3">Confidence</th>
              <th className="px-4 py-3">Updated</th>
              <th className="px-4 py-3">Notes</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              <tr><td colSpan={8} className="px-4 py-8 text-center text-gray-400">Loading…</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={8} className="px-4 py-8 text-center text-gray-400">No price references found.</td></tr>
            ) : filtered.map(p => (
              <tr key={p.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 text-gray-600 font-medium">{p.category}</td>
                <td className="px-4 py-3 text-gray-900">{p.label}</td>
                <td className="px-4 py-3 text-gray-700 whitespace-nowrap">
                  {fmtKrw(p.minKrw)} – {fmtKrw(p.maxKrw)}
                </td>
                <td className="px-4 py-3 text-gray-600">{p.unit}</td>
                <td className="px-4 py-3">
                  <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${CONFIDENCE_STYLES[p.confidenceLevel] ?? 'bg-gray-100 text-gray-600'}`}>
                    {p.confidenceLevel}
                  </span>
                </td>
                <td className="px-4 py-3 text-gray-400 text-xs whitespace-nowrap">
                  {formatDistanceToNow(new Date(p.updatedAt), { addSuffix: true })}
                  {p.updatedBy && <div className="text-gray-300">{p.updatedBy}</div>}
                </td>
                <td className="px-4 py-3 text-gray-500 text-xs max-w-[160px] truncate">
                  {p.notes || <span className="text-gray-300">—</span>}
                </td>
                <td className="px-4 py-3 text-right whitespace-nowrap">
                  <button
                    onClick={() => openEdit(p)}
                    className="text-[#1B3A6B] hover:underline text-xs mr-3"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => setDeleteId(p.id)}
                    className="text-[#C0272D] hover:underline text-xs"
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg mx-4 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              {editId ? 'Edit price reference' : 'Add price reference'}
            </h2>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Category *</label>
                  <input
                    value={form.category}
                    onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                    placeholder="e.g. RENT"
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1B3A6B]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Label *</label>
                  <input
                    value={form.label}
                    onChange={e => setForm(f => ({ ...f, label: e.target.value }))}
                    placeholder="e.g. Monthly rent — 2BR"
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1B3A6B]"
                  />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Min KRW *</label>
                  <input
                    type="number"
                    value={form.minKrw}
                    onChange={e => setForm(f => ({ ...f, minKrw: e.target.value }))}
                    placeholder="800000"
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1B3A6B]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Max KRW *</label>
                  <input
                    type="number"
                    value={form.maxKrw}
                    onChange={e => setForm(f => ({ ...f, maxKrw: e.target.value }))}
                    placeholder="1500000"
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1B3A6B]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Unit *</label>
                  <input
                    value={form.unit}
                    onChange={e => setForm(f => ({ ...f, unit: e.target.value }))}
                    placeholder="per month"
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1B3A6B]"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Confidence level</label>
                <select
                  value={form.confidenceLevel}
                  onChange={e => setForm(f => ({ ...f, confidenceLevel: e.target.value }))}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1B3A6B]"
                >
                  <option value="HIGH">HIGH — verified, recent</option>
                  <option value="MEDIUM">MEDIUM — reasonable estimate</option>
                  <option value="LOW">LOW — outdated or uncertain</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Notes (optional)</label>
                <textarea
                  value={form.notes}
                  onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                  placeholder="Source, last verified date, caveats…"
                  rows={2}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1B3A6B] resize-none"
                />
              </div>
              {formError && (
                <p className="text-sm text-[#C0272D] bg-[#F9EAEA] px-3 py-2 rounded-md">{formError}</p>
              )}
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-4 py-2 bg-[#1B3A6B] text-white text-sm font-medium rounded-md hover:bg-[#2D5499] disabled:opacity-60 transition-colors"
              >
                {saving ? 'Saving…' : editId ? 'Save changes' : 'Add reference'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirmation */}
      {deleteId && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm mx-4 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-2">Delete price reference?</h2>
            <p className="text-sm text-gray-600 mb-6">
              This will permanently remove the reference. The AI will stop using it in estimates.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setDeleteId(null)}
                className="px-4 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="px-4 py-2 bg-[#C0272D] text-white text-sm font-medium rounded-md hover:bg-red-700 disabled:opacity-60 transition-colors"
              >
                {deleting ? 'Deleting…' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
