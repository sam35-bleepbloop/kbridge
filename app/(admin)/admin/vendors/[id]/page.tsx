"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";

// ─── Types ────────────────────────────────────────────────────────────────────

interface BankDetails {
  bankName?:      string;
  accountNumber?: string;
  accountHolder?: string;
}

interface RecurringRow {
  id:          string;
  label:       string;
  amountUsd:   string;
  isActive:    boolean;
  pausedReason: string;
  nextRunAt:   string | null;
  createdAt:   string;
  user:        { displayName: string | null; email: string | null };
}

interface ReviewRow {
  id:        string;
  rating:    number;
  comment:   string | null;
  createdAt: string;
  user:      { displayName: string | null };
}

interface VendorDetail {
  id:              string;
  name:            string;
  nameKorean:      string | null;
  category:        string;
  phoneKorean:     string | null;
  email:           string | null;
  bankDetailsJson: BankDetails | null;
  isApproved:      boolean;
  avgRating:       number | null;
  lastContactedAt: string | null;
  createdAt:       string;
  recurrings:      RecurringRow[];
  reviews:         ReviewRow[];
}

// ─── Config ───────────────────────────────────────────────────────────────────

const CATEGORY_LABELS: Record<string, string> = {
  LANDLORD: "Landlord", GROCER: "Grocer", CLEANER: "Cleaner",
  ATTRACTION: "Attraction", UTILITY: "Utility", GOVERNMENT: "Government",
  TELECOM: "Telecom", DAYCARE: "Daycare", OTHER: "Other",
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmt(d: string) {
  return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-[10px] font-semibold text-[var(--text-tertiary)] uppercase tracking-wider mb-2">
      {children}
    </div>
  );
}

function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={`card p-4 ${className}`}>{children}</div>;
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col">
      <span className="text-[10px] text-[var(--text-tertiary)] mb-0.5">{label}</span>
      <span className="text-[12px] font-medium text-[var(--text-primary)]">{value || "—"}</span>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function AdminVendorDetailPage() {
  const params   = useParams();
  const vendorId = params.id as string;

  const [vendor,      setVendor]      = useState<VendorDetail | null>(null);
  const [loading,     setLoading]     = useState(true);
  const [editing,     setEditing]     = useState(false);
  const [saving,      setSaving]      = useState(false);
  const [saveMsg,     setSaveMsg]     = useState<string | null>(null);
  const [approving,   setApproving]   = useState(false);
  const [activeTab,   setActiveTab]   = useState<"recurrings" | "reviews">("recurrings");

  // Edit form state
  const [form, setForm] = useState({
    name: "", nameKorean: "", category: "OTHER",
    phoneKorean: "", email: "",
    bankName: "", accountNumber: "", accountHolder: "",
  });

  useEffect(() => {
    fetch(`/api/admin/vendors/${vendorId}`)
      .then((r) => r.json())
      .then((d) => {
        setVendor(d.vendor);
        const v = d.vendor as VendorDetail;
        const bank = v.bankDetailsJson ?? {};
        setForm({
          name:          v.name,
          nameKorean:    v.nameKorean ?? "",
          category:      v.category,
          phoneKorean:   v.phoneKorean ?? "",
          email:         v.email ?? "",
          bankName:      bank.bankName ?? "",
          accountNumber: bank.accountNumber ?? "",
          accountHolder: bank.accountHolder ?? "",
        });
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [vendorId]);

  async function reload() {
    const res  = await fetch(`/api/admin/vendors/${vendorId}`);
    const data = await res.json();
    setVendor(data.vendor);
  }

  async function handleSave() {
    setSaving(true);
    setSaveMsg(null);
    const res = await fetch(`/api/admin/vendors/${vendorId}`, {
      method:  "PATCH",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({
        action:       "edit",
        name:         form.name.trim(),
        nameKorean:   form.nameKorean.trim() || null,
        category:     form.category,
        phoneKorean:  form.phoneKorean.trim() || null,
        email:        form.email.trim() || null,
        bankDetailsJson: (form.bankName || form.accountNumber || form.accountHolder) ? {
          bankName:      form.bankName.trim() || undefined,
          accountNumber: form.accountNumber.trim() || undefined,
          accountHolder: form.accountHolder.trim() || undefined,
        } : null,
      }),
    });
    if (res.ok) {
      setSaveMsg("Saved");
      setEditing(false);
      await reload();
    }
    setSaving(false);
  }

  async function handleApprovalToggle() {
    if (!vendor) return;
    setApproving(true);
    await fetch(`/api/admin/vendors/${vendorId}`, {
      method:  "PATCH",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ action: "set_approval", isApproved: !vendor.isApproved }),
    });
    await reload();
    setApproving(false);
  }

  // ── Loading ────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <div className="text-[13px] text-[var(--text-tertiary)] animate-pulse">Loading vendor…</div>
      </div>
    );
  }

  if (!vendor) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <div className="text-[13px] text-[var(--kb-red)]">Vendor not found.</div>
      </div>
    );
  }

  const bank = vendor.bankDetailsJson ?? {};

  return (
    <div className="p-6 max-w-4xl mx-auto">

      {/* Breadcrumb */}
      <div className="flex items-center gap-2 mb-5 text-[12px]">
        <a href="/admin/vendors"
          className="text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] transition-colors">
          Vendors
        </a>
        <span style={{ color: "rgba(0,0,0,0.2)" }}>/</span>
        <span className="text-[var(--text-secondary)] font-medium">{vendor.name}</span>
      </div>

      <div className="flex gap-5 items-start">

        {/* ── LEFT: details ───────────────────────────────────────────────── */}
        <div className="flex-1 min-w-0 flex flex-col gap-4">

          {/* Header card */}
          <Card>
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <h2 className="text-[17px] font-semibold text-[var(--text-primary)]">{vendor.name}</h2>
                  {vendor.nameKorean && (
                    <span className="text-[13px] text-[var(--text-tertiary)]">{vendor.nameKorean}</span>
                  )}
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span
                    className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                    style={{ background: "var(--kb-navy-light)", color: "var(--kb-navy)" }}
                  >
                    {CATEGORY_LABELS[vendor.category] ?? vendor.category}
                  </span>
                  <span
                    className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                    style={{
                      background: vendor.isApproved ? "var(--status-success-bg)" : "var(--status-warn-bg)",
                      color:      vendor.isApproved ? "var(--status-success-text)" : "var(--status-warn-text)",
                    }}
                  >
                    {vendor.isApproved ? "✓ Approved" : "Unapproved"}
                  </span>
                  {vendor.avgRating && (
                    <span className="text-[11px] font-medium" style={{ color: "#B45309" }}>
                      ★ {vendor.avgRating.toFixed(1)} ({vendor.reviews.length} reviews)
                    </span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <button
                  onClick={handleApprovalToggle}
                  disabled={approving}
                  className="text-[12px] px-3 py-1.5 rounded-lg font-medium transition-all disabled:opacity-50"
                  style={{
                    background: vendor.isApproved ? "var(--status-danger-bg)" : "var(--status-success-bg)",
                    color:      vendor.isApproved ? "var(--status-danger-text)" : "var(--status-success-text)",
                    border: `1px solid ${vendor.isApproved ? "#FCA5A5" : "#6EE7B7"}`,
                  }}
                >
                  {approving ? "…" : vendor.isApproved ? "Unapprove" : "Approve"}
                </button>
                <button
                  onClick={() => setEditing(!editing)}
                  className="btn-secondary text-[12px]"
                >
                  {editing ? "Cancel" : "Edit"}
                </button>
              </div>
            </div>
          </Card>

          {/* Details / Edit */}
          <Card>
            <div className="flex items-center justify-between mb-3">
              <SectionLabel>Contact & details</SectionLabel>
              {saveMsg && <span className="text-[11px] text-[var(--status-success-text)]">{saveMsg}</span>}
            </div>

            {!editing ? (
              <div className="grid grid-cols-2 gap-x-6 gap-y-3">
                <Field label="Phone (Korean)" value={vendor.phoneKorean ?? ""} />
                <Field label="Email"          value={vendor.email ?? ""} />
                <Field label="Category"       value={CATEGORY_LABELS[vendor.category] ?? vendor.category} />
                <Field label="Last contacted" value={vendor.lastContactedAt ? fmt(vendor.lastContactedAt) : ""} />
                <Field label="Added"          value={fmt(vendor.createdAt)} />
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="label">Vendor name (English) *</label>
                    <input className="input text-[13px]" value={form.name}
                      onChange={(e) => setForm({ ...form, name: e.target.value })} />
                  </div>
                  <div>
                    <label className="label">Korean name</label>
                    <input className="input text-[13px]" value={form.nameKorean}
                      onChange={(e) => setForm({ ...form, nameKorean: e.target.value })} placeholder="한국어 이름" />
                  </div>
                  <div>
                    <label className="label">Category</label>
                    <select className="input text-[13px]" value={form.category}
                      onChange={(e) => setForm({ ...form, category: e.target.value })}>
                      {Object.entries(CATEGORY_LABELS).map(([val, label]) => (
                        <option key={val} value={val}>{label}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="label">Korean phone</label>
                    <input className="input text-[13px]" value={form.phoneKorean}
                      onChange={(e) => setForm({ ...form, phoneKorean: e.target.value })} placeholder="010-XXXX-XXXX" />
                  </div>
                  <div className="col-span-2">
                    <label className="label">Email</label>
                    <input className="input text-[13px]" type="email" value={form.email}
                      onChange={(e) => setForm({ ...form, email: e.target.value })} />
                  </div>
                </div>

                {/* Bank details */}
                <div
                  className="pt-3 mt-1"
                  style={{ borderTop: "0.5px solid rgba(0,0,0,0.07)" }}
                >
                  <div className="text-[11px] font-semibold text-[var(--text-tertiary)] uppercase tracking-wider mb-2">
                    Bank details
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="label">Bank name</label>
                      <input className="input text-[13px]" value={form.bankName}
                        onChange={(e) => setForm({ ...form, bankName: e.target.value })} placeholder="e.g. KB국민은행" />
                    </div>
                    <div>
                      <label className="label">Account number</label>
                      <input className="input text-[13px]" value={form.accountNumber}
                        onChange={(e) => setForm({ ...form, accountNumber: e.target.value })} placeholder="000-000-000000" />
                    </div>
                    <div>
                      <label className="label">Account holder</label>
                      <input className="input text-[13px]" value={form.accountHolder}
                        onChange={(e) => setForm({ ...form, accountHolder: e.target.value })} placeholder="Name on account" />
                    </div>
                  </div>
                </div>

                <div className="flex justify-end">
                  <button onClick={handleSave} disabled={saving} className="btn-primary text-[13px]">
                    {saving ? "Saving…" : "Save changes"}
                  </button>
                </div>
              </div>
            )}
          </Card>

          {/* Bank details (view mode) */}
          {!editing && (bank.bankName || bank.accountNumber || bank.accountHolder) && (
            <Card>
              <SectionLabel>Bank details</SectionLabel>
              <div className="grid grid-cols-3 gap-x-6 gap-y-2">
                <Field label="Bank"           value={bank.bankName ?? ""} />
                <Field label="Account number" value={bank.accountNumber ?? ""} />
                <Field label="Account holder" value={bank.accountHolder ?? ""} />
              </div>
              <div
                className="mt-3 pt-3 text-[11px] text-[var(--text-tertiary)]"
                style={{ borderTop: "0.5px solid rgba(0,0,0,0.07)" }}
              >
                ⚠ Bank details are sensitive. Only display when necessary.
              </div>
            </Card>
          )}

          {/* Recurrings / Reviews tabs */}
          <Card className="overflow-hidden p-0">
            <div
              className="flex border-b"
              style={{ borderColor: "rgba(0,0,0,0.08)", background: "var(--surface-page)" }}
            >
              {([
                ["recurrings", `Active recurrings (${vendor.recurrings.length})`],
                ["reviews",    `Reviews (${vendor.reviews.length})`],
              ] as const).map(([tab, label]) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className="px-4 py-3 text-[12px] font-medium transition-all"
                  style={{
                    color:        activeTab === tab ? "var(--kb-navy)" : "var(--text-tertiary)",
                    borderBottom: activeTab === tab ? "2px solid var(--kb-navy)" : "2px solid transparent",
                    background:   activeTab === tab ? "white" : "transparent",
                  }}
                >
                  {label}
                </button>
              ))}
            </div>

            <div className="p-4">
              {/* Recurrings */}
              {activeTab === "recurrings" && (
                <div>
                  {vendor.recurrings.length === 0 ? (
                    <div className="text-[13px] text-[var(--text-tertiary)] text-center py-8">
                      No recurring payments linked to this vendor
                    </div>
                  ) : (
                    <div className="flex flex-col gap-2">
                      {vendor.recurrings.map((r) => (
                        <div
                          key={r.id}
                          className="flex items-center gap-3 p-3 rounded-lg border"
                          style={{ borderColor: "rgba(0,0,0,0.07)" }}
                        >
                          <div className="flex-1 min-w-0">
                            <div className="text-[12px] font-medium text-[var(--text-primary)] truncate">{r.label}</div>
                            <div className="text-[11px] text-[var(--text-tertiary)]">
                              {r.user.displayName ?? r.user.email ?? "Unknown user"}
                            </div>
                          </div>
                          <div className="text-right flex-shrink-0">
                            <div className="text-[12px] font-semibold text-[var(--text-primary)]">
                              ${parseFloat(r.amountUsd).toFixed(2)}
                            </div>
                            {r.nextRunAt && (
                              <div className="text-[10px] text-[var(--text-tertiary)]">
                                Next: {fmt(r.nextRunAt)}
                              </div>
                            )}
                          </div>
                          <span
                            className="text-[10px] font-semibold px-1.5 py-0.5 rounded flex-shrink-0"
                            style={{
                              background: r.isActive && r.pausedReason === "NONE"
                                ? "var(--status-success-bg)"
                                : "var(--status-warn-bg)",
                              color: r.isActive && r.pausedReason === "NONE"
                                ? "var(--status-success-text)"
                                : "var(--status-warn-text)",
                            }}
                          >
                            {r.isActive && r.pausedReason === "NONE" ? "Active" : `Paused${r.pausedReason !== "NONE" ? `: ${r.pausedReason.toLowerCase().replace(/_/g, " ")}` : ""}`}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Reviews */}
              {activeTab === "reviews" && (
                <div>
                  {vendor.reviews.length === 0 ? (
                    <div className="text-[13px] text-[var(--text-tertiary)] text-center py-8">No reviews yet</div>
                  ) : (
                    <div className="flex flex-col gap-3">
                      {vendor.reviews.map((review) => (
                        <div key={review.id} className="p-3 rounded-lg" style={{ background: "var(--surface-page)" }}>
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-[12px] font-medium text-[var(--text-primary)]">
                              {review.user.displayName ?? "Anonymous"}
                            </span>
                            <div className="flex items-center gap-2">
                              <span className="text-[12px]" style={{ color: "#B45309" }}>
                                {"★".repeat(review.rating)}{"☆".repeat(5 - review.rating)}
                              </span>
                              <span className="text-[10px] text-[var(--text-tertiary)]">{fmt(review.createdAt)}</span>
                            </div>
                          </div>
                          {review.comment && (
                            <div className="text-[12px] text-[var(--text-secondary)] leading-relaxed">
                              {review.comment}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </Card>
        </div>

        {/* ── RIGHT: quick info ────────────────────────────────────────────── */}
        <div className="w-[220px] flex-shrink-0 flex flex-col gap-4">
          <Card>
            <SectionLabel>Summary</SectionLabel>
            <div className="flex flex-col gap-2.5">
              {[
                ["Recurrings",  String(vendor.recurrings.length)],
                ["Reviews",     String(vendor.reviews.length)],
                ["Avg rating",  vendor.avgRating ? vendor.avgRating.toFixed(1) + " / 5" : "—"],
                ["Added",       fmt(vendor.createdAt)],
                ["Last contact", vendor.lastContactedAt ? fmt(vendor.lastContactedAt) : "—"],
              ].map(([label, value]) => (
                <div key={label} className="flex items-center justify-between">
                  <span className="text-[11px] text-[var(--text-tertiary)]">{label}</span>
                  <span className="text-[12px] font-medium text-[var(--text-primary)]">{value}</span>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
