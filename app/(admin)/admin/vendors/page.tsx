"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";

interface VendorRow {
  id:             string;
  name:           string;
  nameKorean:     string | null;
  category:       string;
  phoneKorean:    string | null;
  email:          string | null;
  isApproved:     boolean;
  avgRating:      number | null;
  lastContactedAt: string | null;
  createdAt:      string;
  _count:         { recurrings: number; reviews: number };
}

const CATEGORY_LABELS: Record<string, string> = {
  LANDLORD:   "Landlord",
  GROCER:     "Grocer",
  CLEANER:    "Cleaner",
  ATTRACTION: "Attraction",
  UTILITY:    "Utility",
  GOVERNMENT: "Government",
  TELECOM:    "Telecom",
  DAYCARE:    "Daycare",
  OTHER:      "Other",
};

const CATEGORY_COLORS: Record<string, { color: string; bg: string }> = {
  LANDLORD:   { color: "#1B3A6B", bg: "#E8EEF7" },
  GROCER:     { color: "#085041", bg: "#E1F5EE" },
  CLEANER:    { color: "#374151", bg: "#F3F4F6" },
  ATTRACTION: { color: "#534AB7", bg: "#EEEDFE" },
  UTILITY:    { color: "#633806", bg: "#FAEEDA" },
  GOVERNMENT: { color: "#7A1010", bg: "#F9EAEA" },
  TELECOM:    { color: "#374151", bg: "#F3F4F6" },
  DAYCARE:    { color: "#085041", bg: "#E1F5EE" },
  OTHER:      { color: "#6B7280", bg: "#F3F4F6" },
};

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function StarRating({ rating }: { rating: number | null }) {
  if (!rating) return <span className="text-[11px] text-[var(--text-tertiary)]">—</span>;
  return (
    <span className="text-[12px] font-medium" style={{ color: "#B45309" }}>
      {"★".repeat(Math.round(rating))}{"☆".repeat(5 - Math.round(rating))} {rating.toFixed(1)}
    </span>
  );
}

export default function AdminVendorsPage() {
  const router = useRouter();
  const [vendors,      setVendors]      = useState<VendorRow[]>([]);
  const [total,        setTotal]        = useState(0);
  const [page,         setPage]         = useState(1);
  const [search,       setSearch]       = useState("");
  const [searchInput,  setSearchInput]  = useState("");
  const [categoryFilter, setCategoryFilter] = useState("ALL");
  const [approvedFilter, setApprovedFilter] = useState("ALL");
  const [loading,      setLoading]      = useState(true);
  const [showCreate,   setShowCreate]   = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({
      search, page: String(page),
      category: categoryFilter,
      approved: approvedFilter,
    });
    const res  = await fetch(`/api/admin/vendors?${params}`);
    const data = await res.json();
    setVendors(data.vendors ?? []);
    setTotal(data.total ?? 0);
    setLoading(false);
  }, [search, page, categoryFilter, approvedFilter]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    const t = setTimeout(() => { setSearch(searchInput); setPage(1); }, 300);
    return () => clearTimeout(t);
  }, [searchInput]);

  const totalPages = Math.ceil(total / 50);

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-[var(--text-primary)]">Vendors</h1>
          <p className="text-sm text-[var(--text-secondary)] mt-0.5">
            {total.toLocaleString()} total · {vendors.filter((v) => v.isApproved).length} approved on this page
          </p>
        </div>
        <button onClick={() => setShowCreate(true)} className="btn-primary text-[13px]">
          + Add vendor
        </button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 mb-4 flex-wrap">
        {/* Search */}
        <div className="relative flex-1 max-w-xs">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
            width="13" height="13" viewBox="0 0 13 13" fill="none">
            <circle cx="5.5" cy="5.5" r="4" stroke="var(--text-tertiary)" strokeWidth="1.3"/>
            <path d="M9 9l2.5 2.5" stroke="var(--text-tertiary)" strokeWidth="1.3" strokeLinecap="round"/>
          </svg>
          <input
            className="input pl-8 h-9 text-[13px]"
            placeholder="Search name, Korean name, phone…"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
          />
        </div>

        {/* Approval filter */}
        <div className="flex items-center gap-1">
          {[["ALL", "All"], ["APPROVED", "Approved"], ["UNAPPROVED", "Unapproved"]].map(([f, label]) => (
            <button
              key={f}
              onClick={() => { setApprovedFilter(f); setPage(1); }}
              className="px-3 py-1.5 rounded-lg text-[12px] transition-all"
              style={{
                background: approvedFilter === f ? "var(--kb-navy)" : "white",
                color:      approvedFilter === f ? "white" : "var(--text-secondary)",
                border:     `0.5px solid ${approvedFilter === f ? "transparent" : "rgba(0,0,0,0.12)"}`,
                fontWeight: approvedFilter === f ? 500 : 400,
              }}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Category filter */}
        <select
          className="input h-9 text-[12px] w-auto pr-8"
          value={categoryFilter}
          onChange={(e) => { setCategoryFilter(e.target.value); setPage(1); }}
        >
          <option value="ALL">All categories</option>
          {Object.entries(CATEGORY_LABELS).map(([val, label]) => (
            <option key={val} value={val}>{label}</option>
          ))}
        </select>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        <table className="w-full">
          <thead>
            <tr style={{ borderBottom: "1px solid rgba(0,0,0,0.07)", background: "var(--surface-page)" }}>
              {["Vendor", "Category", "Status", "Recurrings", "Rating", "Last contact", "Added"].map((h) => (
                <th key={h} className="text-left px-4 py-2.5 text-[11px] font-semibold text-[var(--text-tertiary)] uppercase tracking-wider">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: 6 }).map((_, i) => (
                <tr key={i} style={{ borderBottom: "0.5px solid rgba(0,0,0,0.06)" }}>
                  {Array.from({ length: 7 }).map((_, j) => (
                    <td key={j} className="px-4 py-3">
                      <div className="h-3 rounded animate-pulse"
                        style={{ background: "var(--surface-page)", width: j === 0 ? "160px" : "60px" }} />
                    </td>
                  ))}
                </tr>
              ))
            ) : vendors.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-12 text-center text-[13px] text-[var(--text-tertiary)]">
                  No vendors found
                </td>
              </tr>
            ) : (
              vendors.map((vendor) => {
                const catCfg = CATEGORY_COLORS[vendor.category] ?? CATEGORY_COLORS.OTHER;
                return (
                  <tr
                    key={vendor.id}
                    onClick={() => router.push(`/admin/vendors/${vendor.id}`)}
                    className="cursor-pointer transition-colors"
                    style={{ borderBottom: "0.5px solid rgba(0,0,0,0.06)" }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = "var(--kb-navy-pale)")}
                    onMouseLeave={(e) => (e.currentTarget.style.background = "")}
                  >
                    {/* Vendor name */}
                    <td className="px-4 py-3">
                      <div className="text-[13px] font-medium text-[var(--text-primary)]">{vendor.name}</div>
                      {vendor.nameKorean && (
                        <div className="text-[11px] text-[var(--text-tertiary)]">{vendor.nameKorean}</div>
                      )}
                    </td>

                    {/* Category */}
                    <td className="px-4 py-3">
                      <span
                        className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                        style={{ background: catCfg.bg, color: catCfg.color }}
                      >
                        {CATEGORY_LABELS[vendor.category] ?? vendor.category}
                      </span>
                    </td>

                    {/* Approval status */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        <div
                          className="w-2 h-2 rounded-full"
                          style={{ background: vendor.isApproved ? "var(--status-success-text)" : "var(--text-tertiary)" }}
                        />
                        <span className="text-[12px]"
                          style={{ color: vendor.isApproved ? "var(--status-success-text)" : "var(--text-tertiary)" }}>
                          {vendor.isApproved ? "Approved" : "Unapproved"}
                        </span>
                      </div>
                    </td>

                    {/* Recurrings */}
                    <td className="px-4 py-3">
                      <span className="text-[13px] text-[var(--text-primary)]">{vendor._count.recurrings}</span>
                    </td>

                    {/* Rating */}
                    <td className="px-4 py-3">
                      <StarRating rating={vendor.avgRating} />
                    </td>

                    {/* Last contact */}
                    <td className="px-4 py-3">
                      <span className="text-[12px] text-[var(--text-secondary)]">
                        {vendor.lastContactedAt ? fmtDate(vendor.lastContactedAt) : "—"}
                      </span>
                    </td>

                    {/* Added */}
                    <td className="px-4 py-3">
                      <span className="text-[12px] text-[var(--text-secondary)]">{fmtDate(vendor.createdAt)}</span>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3"
            style={{ borderTop: "0.5px solid rgba(0,0,0,0.07)" }}>
            <span className="text-[12px] text-[var(--text-tertiary)]">
              Showing {((page - 1) * 50) + 1}–{Math.min(page * 50, total)} of {total}
            </span>
            <div className="flex items-center gap-1.5">
              <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}
                className="btn-secondary text-[12px] h-8 px-3 disabled:opacity-40">← Prev</button>
              <span className="text-[12px] text-[var(--text-secondary)] px-2">{page} / {totalPages}</span>
              <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                className="btn-secondary text-[12px] h-8 px-3 disabled:opacity-40">Next →</button>
            </div>
          </div>
        )}
      </div>

      {/* Create vendor modal */}
      {showCreate && (
        <CreateVendorModal
          onClose={() => setShowCreate(false)}
          onCreated={() => { setShowCreate(false); load(); }}
        />
      )}
    </div>
  );
}

// ─── Create Vendor Modal ──────────────────────────────────────────────────────

function CreateVendorModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [form,    setForm]    = useState({ name: "", nameKorean: "", category: "LANDLORD", phoneKorean: "", email: "", isApproved: false });
  const [saving,  setSaving]  = useState(false);
  const [error,   setError]   = useState("");

  async function handleSubmit() {
    if (!form.name.trim()) { setError("Vendor name is required"); return; }
    setSaving(true);
    setError("");
    const res = await fetch("/api/admin/vendors", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({
        name:        form.name.trim(),
        nameKorean:  form.nameKorean.trim() || undefined,
        category:    form.category,
        phoneKorean: form.phoneKorean.trim() || undefined,
        email:       form.email.trim() || undefined,
        isApproved:  form.isApproved,
      }),
    });
    const data = await res.json();
    if (!res.ok) { setError(data.error ?? "Failed to create vendor"); setSaving(false); return; }
    onCreated();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.4)" }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-white rounded-xl border border-black/[0.08] p-5 w-full max-w-md">
        <div className="text-[15px] font-semibold text-[var(--text-primary)] mb-4">Add vendor</div>

        <div className="flex flex-col gap-3">
          <div>
            <label className="label">Vendor name (English) *</label>
            <input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Kim Property Management" />
          </div>
          <div>
            <label className="label">Korean name</label>
            <input className="input" value={form.nameKorean} onChange={(e) => setForm({ ...form, nameKorean: e.target.value })} placeholder="e.g. 김부동산" />
          </div>
          <div>
            <label className="label">Category *</label>
            <select className="input" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
              {Object.entries(CATEGORY_LABELS).map(([val, label]) => (
                <option key={val} value={val}>{label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Korean phone number</label>
            <input className="input" value={form.phoneKorean} onChange={(e) => setForm({ ...form, phoneKorean: e.target.value })} placeholder="e.g. 010-1234-5678" />
          </div>
          <div>
            <label className="label">Email</label>
            <input className="input" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="optional" />
          </div>
          <div className="flex items-center gap-2">
            <input type="checkbox" id="approved" checked={form.isApproved}
              onChange={(e) => setForm({ ...form, isApproved: e.target.checked })}
              className="w-4 h-4 accent-[var(--kb-navy)]"
            />
            <label htmlFor="approved" className="text-[13px] text-[var(--text-secondary)]">Mark as approved</label>
          </div>
        </div>

        {error && <div className="alert-danger mt-3 text-[12px]"><span>{error}</span></div>}

        <div className="flex items-center justify-between mt-5">
          <button onClick={onClose} className="btn-secondary">Cancel</button>
          <button onClick={handleSubmit} disabled={saving} className="btn-primary">
            {saving ? "Creating…" : "Create vendor"}
          </button>
        </div>
      </div>
    </div>
  );
}
