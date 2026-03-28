"use client";

import { useState, useEffect } from "react";

const CATEGORIES = ["PRICING", "PROCESS", "SERVICE_SCOPE", "VENDOR", "LOCAL_INFO", "POLICY"] as const;
const APPLIES_TO_OPTIONS = ["general", "phone", "transport", "utilities", "rent", "groceries", "attractions", "traffic", "daycare", "internet", "other"];

type Category = typeof CATEGORIES[number];

interface KnowledgeEntry {
  id:          string;
  category:    Category;
  title:       string;
  content:     string;
  isActive:    boolean;
  appliesTo:   string | null;
  source:      string | null;
  verifiedAt:  string | null;
  expiresAt:   string | null;
  createdById: string;
  createdAt:   string;
  updatedAt:   string;
}

const CATEGORY_COLORS: Record<Category, { bg: string; text: string; label: string }> = {
  PRICING:       { bg: "#EFF6FF", text: "#1D4ED8", label: "Pricing" },
  PROCESS:       { bg: "#F0FDF4", text: "#15803D", label: "Process" },
  SERVICE_SCOPE: { bg: "#FFF7ED", text: "#C2410C", label: "Service Scope" },
  VENDOR:        { bg: "#FAF5FF", text: "#7C3AED", label: "Vendor" },
  LOCAL_INFO:    { bg: "#FFF1F2", text: "#BE123C", label: "Local Info" },
  POLICY:        { bg: "#F0F9FF", text: "#0369A1", label: "Policy" },
};

const EMPTY_FORM = {
  category:   "PRICING" as Category,
  title:      "",
  content:    "",
  isActive:   true,
  appliesTo:  "general",
  source:     "",
  verifiedAt: "",
  expiresAt:  "",
};

export default function KnowledgePage() {
  const [entries,     setEntries]     = useState<KnowledgeEntry[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [showForm,    setShowForm]    = useState(false);
  const [editId,      setEditId]      = useState<string | null>(null);
  const [form,        setForm]        = useState({ ...EMPTY_FORM });
  const [saving,      setSaving]      = useState(false);
  const [filterCat,   setFilterCat]   = useState<string>("ALL");
  const [filterTag,   setFilterTag]   = useState<string>("ALL");
  const [filterActive,setFilterActive]= useState<string>("ACTIVE");
  const [search,      setSearch]      = useState("");
  const [error,       setError]       = useState<string | null>(null);

  useEffect(() => { loadEntries(); }, []);

  async function loadEntries() {
    setLoading(true);
    try {
      const res  = await fetch("/api/admin/knowledge");
      const data = await res.json();
      setEntries(data.entries ?? []);
    } catch {
      setError("Failed to load knowledge entries.");
    } finally {
      setLoading(false);
    }
  }

  function openCreate() {
    setForm({ ...EMPTY_FORM });
    setEditId(null);
    setShowForm(true);
    setError(null);
  }

  function openEdit(entry: KnowledgeEntry) {
    setForm({
      category:   entry.category,
      title:      entry.title,
      content:    entry.content,
      isActive:   entry.isActive,
      appliesTo:  entry.appliesTo ?? "general",
      source:     entry.source ?? "",
      verifiedAt: entry.verifiedAt ? entry.verifiedAt.split("T")[0] : "",
      expiresAt:  entry.expiresAt  ? entry.expiresAt.split("T")[0]  : "",
    });
    setEditId(entry.id);
    setShowForm(true);
    setError(null);
  }

  async function handleSave() {
    if (!form.title.trim() || !form.content.trim()) {
      setError("Title and content are required.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const body = {
        ...form,
        verifiedAt: form.verifiedAt || null,
        expiresAt:  form.expiresAt  || null,
        source:     form.source     || null,
        appliesTo:  form.appliesTo  || null,
      };
      const res = await fetch(
        editId ? `/api/admin/knowledge/${editId}` : "/api/admin/knowledge",
        {
          method:  editId ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body:    JSON.stringify(body),
        }
      );
      if (!res.ok) throw new Error("Save failed");
      await loadEntries();
      setShowForm(false);
    } catch {
      setError("Save failed. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(entry: KnowledgeEntry) {
    await fetch(`/api/admin/knowledge/${entry.id}`, {
      method:  "PATCH",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ isActive: !entry.isActive }),
    });
    await loadEntries();
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this knowledge entry? This cannot be undone.")) return;
    await fetch(`/api/admin/knowledge/${id}`, { method: "DELETE" });
    await loadEntries();
  }

  const filtered = entries.filter(e => {
    if (filterCat !== "ALL" && e.category !== filterCat) return false;
    if (filterTag !== "ALL" && e.appliesTo !== filterTag) return false;
    if (filterActive === "ACTIVE" && !e.isActive) return false;
    if (filterActive === "INACTIVE" && e.isActive) return false;
    if (search) {
      const q = search.toLowerCase();
      return e.title.toLowerCase().includes(q) || e.content.toLowerCase().includes(q);
    }
    return true;
  });

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-[18px] font-semibold text-[var(--text-primary)]">Knowledge Base</h1>
          <p className="text-[13px] text-[var(--text-secondary)] mt-0.5">
            Operational knowledge injected into every AI chat. This is what makes K-Bridge smarter than generic AI.
          </p>
        </div>
        <button
          onClick={openCreate}
          className="btn btn-primary text-[13px] flex items-center gap-2"
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M7 1v12M1 7h12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
          Add Entry
        </button>
      </div>

      {/* Stats bar */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {[
          { label: "Total entries",  value: entries.length },
          { label: "Active",         value: entries.filter(e => e.isActive).length },
          { label: "Inactive / expired", value: entries.filter(e => !e.isActive).length },
        ].map(s => (
          <div key={s.label} className="card p-4">
            <div className="text-[22px] font-bold text-[var(--text-primary)]">{s.value}</div>
            <div className="text-[12px] text-[var(--text-secondary)] mt-0.5">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 mb-5">
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search entries…"
          className="input text-[13px] w-52"
        />
        <select value={filterCat} onChange={e => setFilterCat(e.target.value)} className="input text-[13px] w-44">
          <option value="ALL">All categories</option>
          {CATEGORIES.map(c => <option key={c} value={c}>{CATEGORY_COLORS[c].label}</option>)}
        </select>
        <select value={filterTag} onChange={e => setFilterTag(e.target.value)} className="input text-[13px] w-40">
          <option value="ALL">All topics</option>
          {APPLIES_TO_OPTIONS.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
        <select value={filterActive} onChange={e => setFilterActive(e.target.value)} className="input text-[13px] w-36">
          <option value="ALL">All statuses</option>
          <option value="ACTIVE">Active only</option>
          <option value="INACTIVE">Inactive only</option>
        </select>
        <span className="text-[12px] text-[var(--text-tertiary)] ml-auto">{filtered.length} entries</span>
      </div>

      {/* Entry list */}
      {loading ? (
        <div className="text-center py-12 text-[var(--text-tertiary)] text-sm animate-pulse">Loading…</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-[var(--text-tertiary)] text-sm">No entries found.</div>
      ) : (
        <div className="flex flex-col gap-3">
          {filtered.map(entry => {
            const cat = CATEGORY_COLORS[entry.category];
            return (
              <div
                key={entry.id}
                className="card p-5 transition-all"
                style={{ opacity: entry.isActive ? 1 : 0.55 }}
              >
                <div className="flex items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1.5">
                      <span
                        className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                        style={{ background: cat.bg, color: cat.text }}
                      >
                        {cat.label}
                      </span>
                      {entry.appliesTo && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full"
                          style={{ background: "var(--kb-navy-pale)", color: "var(--kb-navy)" }}>
                          #{entry.appliesTo}
                        </span>
                      )}
                      {!entry.isActive && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full"
                          style={{ background: "#FEF3C7", color: "#92400E" }}>
                          Inactive
                        </span>
                      )}
                      {entry.expiresAt && new Date(entry.expiresAt) < new Date() && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full"
                          style={{ background: "#FEE2E2", color: "#991B1B" }}>
                          Expired
                        </span>
                      )}
                    </div>
                    <div className="text-[14px] font-semibold text-[var(--text-primary)] mb-1">
                      {entry.title}
                    </div>
                    <div className="text-[12px] text-[var(--text-secondary)] leading-relaxed line-clamp-3">
                      {entry.content}
                    </div>
                    <div className="flex flex-wrap gap-3 mt-2 text-[11px] text-[var(--text-tertiary)]">
                      {entry.source && <span>Source: {entry.source}</span>}
                      {entry.verifiedAt && <span>Verified: {new Date(entry.verifiedAt).toLocaleDateString()}</span>}
                      {entry.expiresAt && <span>Expires: {new Date(entry.expiresAt).toLocaleDateString()}</span>}
                      <span>Updated: {new Date(entry.updatedAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                  {/* Actions */}
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button
                      onClick={() => toggleActive(entry)}
                      className="text-[11px] px-3 py-1.5 rounded-lg border transition-all"
                      style={{
                        borderColor: entry.isActive ? "rgba(0,0,0,0.12)" : "rgba(0,0,0,0.12)",
                        color: entry.isActive ? "var(--text-secondary)" : "#15803D",
                        background: "white",
                      }}
                      title={entry.isActive ? "Deactivate" : "Activate"}
                    >
                      {entry.isActive ? "Deactivate" : "Activate"}
                    </button>
                    <button
                      onClick={() => openEdit(entry)}
                      className="text-[11px] px-3 py-1.5 rounded-lg border transition-all"
                      style={{ borderColor: "rgba(0,0,0,0.12)", color: "var(--text-secondary)", background: "white" }}
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(entry.id)}
                      className="text-[11px] px-3 py-1.5 rounded-lg border transition-all"
                      style={{ borderColor: "#FECACA", color: "#DC2626", background: "white" }}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create / Edit modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div
            className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl mx-4 overflow-y-auto"
            style={{ maxHeight: "90vh" }}
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-black/[0.07]">
              <h2 className="text-[15px] font-semibold text-[var(--text-primary)]">
                {editId ? "Edit Knowledge Entry" : "New Knowledge Entry"}
              </h2>
              <button
                onClick={() => setShowForm(false)}
                className="text-[var(--text-tertiary)] hover:text-[var(--text-primary)]"
              >
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path d="M12 4L4 12M4 4l8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                </svg>
              </button>
            </div>

            <div className="px-6 py-5 flex flex-col gap-4">
              {error && (
                <div className="text-[12px] p-3 rounded-lg"
                  style={{ background: "#FEF2F2", color: "#DC2626" }}>
                  {error}
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[12px] font-medium text-[var(--text-secondary)] mb-1.5">Category *</label>
                  <select
                    value={form.category}
                    onChange={e => setForm(f => ({ ...f, category: e.target.value as Category }))}
                    className="input w-full text-[13px]"
                  >
                    {CATEGORIES.map(c => <option key={c} value={c}>{CATEGORY_COLORS[c].label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[12px] font-medium text-[var(--text-secondary)] mb-1.5">Applies to (topic tag)</label>
                  <select
                    value={form.appliesTo}
                    onChange={e => setForm(f => ({ ...f, appliesTo: e.target.value }))}
                    className="input w-full text-[13px]"
                  >
                    {APPLIES_TO_OPTIONS.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[12px] font-medium text-[var(--text-secondary)] mb-1.5">Title * <span className="font-normal text-[var(--text-tertiary)]">(admin-facing label)</span></label>
                <input
                  value={form.title}
                  onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                  placeholder="e.g. Off-base phone plan prices March 2026"
                  className="input w-full text-[13px]"
                />
              </div>

              <div>
                <label className="block text-[12px] font-medium text-[var(--text-secondary)] mb-1.5">
                  Content * <span className="font-normal text-[var(--text-tertiary)]">(injected directly into AI — be specific and accurate)</span>
                </label>
                <textarea
                  value={form.content}
                  onChange={e => setForm(f => ({ ...f, content: e.target.value }))}
                  placeholder="Write the knowledge the AI should use. Be specific. Include numbers, processes, and any edge cases..."
                  rows={8}
                  className="input w-full text-[13px] leading-relaxed resize-y"
                />
                <div className="text-[11px] text-[var(--text-tertiary)] mt-1">
                  {form.content.length} characters · This text is injected verbatim into the AI system prompt
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[12px] font-medium text-[var(--text-secondary)] mb-1.5">Source</label>
                  <input
                    value={form.source}
                    onChange={e => setForm(f => ({ ...f, source: e.target.value }))}
                    placeholder="e.g. SK Telecom storefront, March 2026"
                    className="input w-full text-[13px]"
                  />
                </div>
                <div>
                  <label className="block text-[12px] font-medium text-[var(--text-secondary)] mb-1.5">Verified date</label>
                  <input
                    type="date"
                    value={form.verifiedAt}
                    onChange={e => setForm(f => ({ ...f, verifiedAt: e.target.value }))}
                    className="input w-full text-[13px]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[12px] font-medium text-[var(--text-secondary)] mb-1.5">
                    Expires on <span className="font-normal text-[var(--text-tertiary)]">(auto-deactivates)</span>
                  </label>
                  <input
                    type="date"
                    value={form.expiresAt}
                    onChange={e => setForm(f => ({ ...f, expiresAt: e.target.value }))}
                    className="input w-full text-[13px]"
                  />
                </div>
                <div className="flex items-end pb-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={form.isActive}
                      onChange={e => setForm(f => ({ ...f, isActive: e.target.checked }))}
                      className="w-4 h-4 rounded"
                    />
                    <span className="text-[13px] text-[var(--text-primary)]">Active (included in AI context)</span>
                  </label>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-black/[0.07]">
              <button
                onClick={() => setShowForm(false)}
                className="btn btn-ghost text-[13px]"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="btn btn-primary text-[13px] disabled:opacity-50"
              >
                {saving ? "Saving…" : editId ? "Save Changes" : "Create Entry"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
