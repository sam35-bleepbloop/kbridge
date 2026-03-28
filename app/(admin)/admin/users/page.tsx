"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";

interface UserRow {
  id:              string;
  displayName:     string | null;
  email:           string | null;
  tokenBalance:    number;
  sofaDeclaration: string;
  derosDate:       string | null;
  referralCode:    string | null;
  createdAt:       string;
  lastActiveAt:    string;
  _count:          { tasks: number };
}

const SOFA_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  US_BASED:     { label: "Not verified", color: "#633806", bg: "#FAEEDA" },
  PENDING_SOFA:  { label: "Pending SOFA", color: "#854D0E", bg: "#FEF9C3" },
  VERIFIED_SOFA: { label: "Verified",     color: "#085041", bg: "#E1F5EE" },
};

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function fmtRelative(d: string) {
  const diff = Date.now() - new Date(d).getTime();
  const days = Math.floor(diff / 86400000);
  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 30) return `${days}d ago`;
  if (days < 365) return `${Math.floor(days / 30)}mo ago`;
  return `${Math.floor(days / 365)}y ago`;
}

export default function AdminUsersPage() {
  const router = useRouter();
  const [users,       setUsers]       = useState<UserRow[]>([]);
  const [total,       setTotal]       = useState(0);
  const [page,        setPage]        = useState(1);
  const [search,      setSearch]      = useState("");
  const [sofaFilter,  setSofaFilter]  = useState("ALL");
  const [loading,     setLoading]     = useState(true);
  const [searchInput, setSearchInput] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({
      search, page: String(page), sofa: sofaFilter,
    });
    const res  = await fetch(`/api/admin/users?${params}`);
    const data = await res.json();
    setUsers(data.users ?? []);
    setTotal(data.total ?? 0);
    setLoading(false);
  }, [search, page, sofaFilter]);

  useEffect(() => { load(); }, [load]);

  // Debounce search
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
          <h1 className="text-xl font-semibold text-[var(--text-primary)]">Users</h1>
          <p className="text-sm text-[var(--text-secondary)] mt-0.5">
            {total.toLocaleString()} total users
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 mb-4">
        {/* Search */}
        <div className="relative flex-1 max-w-xs">
          <svg
            className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
            width="13" height="13" viewBox="0 0 13 13" fill="none"
          >
            <circle cx="5.5" cy="5.5" r="4" stroke="var(--text-tertiary)" strokeWidth="1.3"/>
            <path d="M9 9l2.5 2.5" stroke="var(--text-tertiary)" strokeWidth="1.3" strokeLinecap="round"/>
          </svg>
          <input
            className="input pl-8 h-9 text-[13px]"
            placeholder="Search name, email, referral code…"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
          />
        </div>

        {/* SOFA filter */}
        <div className="flex items-center gap-1">
          {["ALL", "US_BASED", "PENDING_SOFA", "VERIFIED_SOFA"].map((f) => (
            <button
              key={f}
              onClick={() => { setSofaFilter(f); setPage(1); }}
              className="px-3 py-1.5 rounded-lg text-[12px] transition-all"
              style={{
                background: sofaFilter === f ? "var(--kb-navy)" : "white",
                color:      sofaFilter === f ? "white" : "var(--text-secondary)",
                border:     `0.5px solid ${sofaFilter === f ? "transparent" : "rgba(0,0,0,0.12)"}`,
                fontWeight: sofaFilter === f ? 500 : 400,
              }}
            >
              {f === "ALL" ? "All SOFA" : f.charAt(0) + f.slice(1).toLowerCase()}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        <table className="w-full">
          <thead>
            <tr style={{ borderBottom: "1px solid rgba(0,0,0,0.07)", background: "var(--surface-page)" }}>
              {["User", "SOFA", "Tokens", "Tasks", "DEROS", "Last active", "Joined"].map((h) => (
                <th key={h} className="text-left px-4 py-2.5 text-[11px] font-semibold text-[var(--text-tertiary)] uppercase tracking-wider">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: 8 }).map((_, i) => (
                <tr key={i} style={{ borderBottom: "0.5px solid rgba(0,0,0,0.06)" }}>
                  {Array.from({ length: 7 }).map((_, j) => (
                    <td key={j} className="px-4 py-3">
                      <div
                        className="h-3 rounded animate-pulse"
                        style={{ background: "var(--surface-page)", width: j === 0 ? "140px" : "60px" }}
                      />
                    </td>
                  ))}
                </tr>
              ))
            ) : users.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-12 text-center text-[13px] text-[var(--text-tertiary)]">
                  No users found
                </td>
              </tr>
            ) : (
              users.map((user) => {
                const sofa = SOFA_CONFIG[user.sofaDeclaration] ?? SOFA_CONFIG.US_BASED;
                const derosExpired = user.derosDate && new Date(user.derosDate) < new Date();
                return (
                  <tr
                    key={user.id}
                    onClick={() => router.push(`/admin/users/${user.id}`)}
                    className="cursor-pointer transition-colors"
                    style={{ borderBottom: "0.5px solid rgba(0,0,0,0.06)" }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = "var(--kb-navy-pale)")}
                    onMouseLeave={(e) => (e.currentTarget.style.background = "")}
                  >
                    {/* User */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <div
                          className="w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-semibold text-white flex-shrink-0"
                          style={{ background: "var(--kb-navy)" }}
                        >
                          {(user.displayName ?? user.email ?? "?")[0].toUpperCase()}
                        </div>
                        <div>
                          <div className="text-[13px] font-medium text-[var(--text-primary)]">
                            {user.displayName ?? <span className="text-[var(--text-tertiary)]">No name</span>}
                          </div>
                          <div className="text-[11px] text-[var(--text-tertiary)]">{user.email}</div>
                        </div>
                      </div>
                    </td>

                    {/* SOFA */}
                    <td className="px-4 py-3">
                      <span
                        className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                        style={{ background: sofa.bg, color: sofa.color }}
                      >
                        {sofa.label}
                      </span>
                    </td>

                    {/* Tokens */}
                    <td className="px-4 py-3">
                      <span
                        className="text-[13px] font-semibold"
                        style={{ color: user.tokenBalance < 3 ? "var(--kb-red)" : "var(--text-primary)" }}
                      >
                        {user.tokenBalance}
                      </span>
                    </td>

                    {/* Tasks */}
                    <td className="px-4 py-3">
                      <span className="text-[13px] text-[var(--text-primary)]">{user._count.tasks}</span>
                    </td>

                    {/* DEROS */}
                    <td className="px-4 py-3">
                      {user.derosDate ? (
                        <span
                          className="text-[12px]"
                          style={{ color: derosExpired ? "var(--kb-red)" : "var(--text-secondary)" }}
                        >
                          {derosExpired && "⚠ "}{fmtDate(user.derosDate)}
                        </span>
                      ) : (
                        <span className="text-[12px] text-[var(--text-tertiary)]">—</span>
                      )}
                    </td>

                    {/* Last active */}
                    <td className="px-4 py-3">
                      <span className="text-[12px] text-[var(--text-secondary)]">
                        {fmtRelative(user.lastActiveAt)}
                      </span>
                    </td>

                    {/* Joined */}
                    <td className="px-4 py-3">
                      <span className="text-[12px] text-[var(--text-secondary)]">
                        {fmtDate(user.createdAt)}
                      </span>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>

        {/* Pagination */}
        {totalPages > 1 && (
          <div
            className="flex items-center justify-between px-4 py-3"
            style={{ borderTop: "0.5px solid rgba(0,0,0,0.07)" }}
          >
            <span className="text-[12px] text-[var(--text-tertiary)]">
              Showing {((page - 1) * 50) + 1}–{Math.min(page * 50, total)} of {total}
            </span>
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="btn-secondary text-[12px] h-8 px-3 disabled:opacity-40"
              >
                ← Prev
              </button>
              <span className="text-[12px] text-[var(--text-secondary)] px-2">
                {page} / {totalPages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="btn-secondary text-[12px] h-8 px-3 disabled:opacity-40"
              >
                Next →
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
