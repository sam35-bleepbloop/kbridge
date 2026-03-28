"use client";

import { useEffect, useState } from "react";
import { signOut } from "next-auth/react";
import Image from "next/image";

const BASES = [
  "Camp Humphreys", "Osan Air Base", "Camp Walker", "Camp Carroll",
  "Camp Henry", "Camp Coiner", "Camp Market", "K-16 (Seoul AB)",
  "Yongsan Garrison", "Other",
];

const MONTHS = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December",
];

const DEROS_YEARS = Array.from({ length: 6 }, (_, i) => new Date().getFullYear() + i);

// ── Types ─────────────────────────────────────────────────────────────────────

interface AccountData {
  displayName:      string | null;
  email:            string;
  phoneKr:          string | null;
  phoneUs:          string | null;
  addressJson:      { street?: string; city?: string; base?: string; unit?: string } | null;
  sofaDeclaration:  string;
  derosDate:        string | null;
  consentFlagsJson: { usePreferences?: boolean; dataRetention?: boolean; marketing?: boolean } | null;
  preferencesJson:  { hasKids?: boolean; hasPets?: boolean } | null;
  referralCode:     string | null;
  createdAt:        string;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function SectionHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="mb-4">
      <h2 className="text-[14px] font-semibold" style={{ color: "var(--text-primary)" }}>{title}</h2>
      {subtitle && <p className="text-[12px] mt-0.5" style={{ color: "var(--text-secondary)" }}>{subtitle}</p>}
    </div>
  );
}

function SaveButton({ loading, saved }: { loading: boolean; saved: boolean }) {
  return (
    <button
      type="submit"
      disabled={loading}
      className="btn-primary text-[13px] px-4 py-2"
      style={{ minWidth: 90 }}
    >
      {loading ? "Saving…" : saved ? "✓ Saved" : "Save changes"}
    </button>
  );
}

function ErrorMsg({ msg }: { msg: string }) {
  return msg ? (
    <div className="alert-danger text-[12px] mt-3"><span>{msg}</span></div>
  ) : null;
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function AccountPage() {
  const [data,    setData]    = useState<AccountData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/account")
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="p-6 max-w-4xl mx-auto animate-fade-in">
        <div className="text-[13px] text-[var(--text-tertiary)]">Loading…</div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="p-6 max-w-4xl mx-auto animate-fade-in">
        <div className="text-[13px] text-[var(--kb-red)]">Failed to load account data.</div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-2xl mx-auto animate-fade-in">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-[var(--text-primary)]">Account</h1>
        <p className="text-sm text-[var(--text-secondary)] mt-0.5">
          Manage your profile, preferences, and account settings
        </p>
      </div>

      <div className="flex flex-col gap-5">
        <ProfileSection      data={data} onSaved={setData} />
        <ContactSection      data={data} onSaved={setData} />
        <AddressSection      data={data} onSaved={setData} />
        <SofaDerosSection    data={data} onSaved={setData} />
        <PreferencesSection  data={data} onSaved={setData} />
        <ConsentSection      data={data} onSaved={setData} />
        <PasswordSection />
        <DangerSection />
      </div>
    </div>
  );
}

// ── Profile section ───────────────────────────────────────────────────────────

function ProfileSection({ data, onSaved }: { data: AccountData; onSaved: (d: AccountData) => void }) {
  const [name,    setName]    = useState(data.displayName ?? "");
  const [loading, setLoading] = useState(false);
  const [saved,   setSaved]   = useState(false);
  const [error,   setError]   = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(""); setLoading(true); setSaved(false);
    const res = await fetch("/api/account", {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ displayName: name }),
    });
    setLoading(false);
    if (res.ok) { setSaved(true); onSaved({ ...data, displayName: name }); setTimeout(() => setSaved(false), 2500); }
    else { const d = await res.json(); setError(d.error ?? "Failed to save."); }
  }

  return (
    <div className="card p-5">
      <SectionHeader title="Profile" />
      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <div>
          <label className="label">Full name</label>
          <input className="input" value={name} onChange={e => setName(e.target.value)} required maxLength={100} />
        </div>
        <div>
          <label className="label">Email address</label>
          <input className="input" value={data.email} disabled style={{ opacity: 0.6, cursor: "not-allowed" }} />
          <p className="text-[11px] mt-1" style={{ color: "var(--text-tertiary)" }}>
            Email cannot be changed. Contact support if needed.
          </p>
        </div>
        <div className="flex justify-end mt-1">
          <SaveButton loading={loading} saved={saved} />
        </div>
        <ErrorMsg msg={error} />
      </form>
    </div>
  );
}

// ── Contact section ───────────────────────────────────────────────────────────

function ContactSection({ data, onSaved }: { data: AccountData; onSaved: (d: AccountData) => void }) {
  const [phoneKr, setPhoneKr] = useState(data.phoneKr ?? "");
  const [phoneUs, setPhoneUs] = useState(data.phoneUs ?? "");
  const [loading, setLoading] = useState(false);
  const [saved,   setSaved]   = useState(false);
  const [error,   setError]   = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(""); setLoading(true); setSaved(false);
    const res = await fetch("/api/account", {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phoneKr: phoneKr || null, phoneUs: phoneUs || null }),
    });
    setLoading(false);
    if (res.ok) { setSaved(true); onSaved({ ...data, phoneKr: phoneKr || null, phoneUs: phoneUs || null }); setTimeout(() => setSaved(false), 2500); }
    else { const d = await res.json(); setError(d.error ?? "Failed to save."); }
  }

  return (
    <div className="card p-5">
      <SectionHeader
        title="Phone numbers"
        subtitle="Optional — helps us make better local recommendations for you."
      />
      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <div>
          <label className="label">Korean phone number <span className="text-[var(--text-tertiary)] font-normal">(optional)</span></label>
          <input className="input" value={phoneKr} onChange={e => setPhoneKr(e.target.value)}
            placeholder="e.g. 010-1234-5678" maxLength={20} />
        </div>
        <div>
          <label className="label">US phone number <span className="text-[var(--text-tertiary)] font-normal">(optional)</span></label>
          <input className="input" value={phoneUs} onChange={e => setPhoneUs(e.target.value)}
            placeholder="e.g. +1 555 123 4567" maxLength={20} />
        </div>
        <div className="flex justify-end mt-1">
          <SaveButton loading={loading} saved={saved} />
        </div>
        <ErrorMsg msg={error} />
      </form>
    </div>
  );
}

// ── Address section ───────────────────────────────────────────────────────────

function AddressSection({ data, onSaved }: { data: AccountData; onSaved: (d: AccountData) => void }) {
  const addr = data.addressJson ?? {};
  const [street,    setStreet]    = useState(addr.street ?? "");
  const [city,      setCity]      = useState(addr.city   ?? "");
  const [base,      setBase]      = useState(addr.base   ?? "");
  const [baseOther, setBaseOther] = useState(!BASES.includes(addr.base ?? "") && addr.base ? addr.base : "");
  const [unit,      setUnit]      = useState(addr.unit   ?? "");
  const [loading,   setLoading]   = useState(false);
  const [saved,     setSaved]     = useState(false);
  const [error,     setError]     = useState("");

  // If stored base isn't in the list it was an "Other" entry
  const baseInList = BASES.includes(base);
  const displayBase = baseInList ? base : "Other";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(""); setLoading(true); setSaved(false);
    const resolvedBase = displayBase === "Other" ? baseOther.trim() : base;
    const res = await fetch("/api/account", {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ address: { street: street.trim(), city: city.trim(), base: resolvedBase, unit: unit.trim() } }),
    });
    setLoading(false);
    if (res.ok) {
      setSaved(true);
      onSaved({ ...data, addressJson: { street, city, base: resolvedBase, unit } });
      setTimeout(() => setSaved(false), 2500);
    } else { const d = await res.json(); setError(d.error ?? "Failed to save."); }
  }

  return (
    <div className="card p-5">
      <SectionHeader title="Address in Korea" />
      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <div>
          <label className="label">Street address</label>
          <input className="input" value={street} onChange={e => setStreet(e.target.value)}
            placeholder="e.g. 123 Main Street" />
        </div>
        <div>
          <label className="label">City</label>
          <input className="input" value={city} onChange={e => setCity(e.target.value)}
            placeholder="e.g. Pyeongtaek" />
        </div>
        <div>
          <label className="label">Installation / base</label>
          <select className="input" value={displayBase}
            onChange={e => { setBase(e.target.value); setBaseOther(""); }} required>
            <option value="" disabled>Select your base</option>
            {BASES.map(b => <option key={b} value={b}>{b}</option>)}
          </select>
        </div>
        {displayBase === "Other" && (
          <div>
            <label className="label">Specify installation</label>
            <input className="input" value={baseOther} onChange={e => setBaseOther(e.target.value)}
              placeholder="Installation name" required />
          </div>
        )}
        <div>
          <label className="label">Unit <span className="text-[var(--text-tertiary)] font-normal">(optional)</span></label>
          <input className="input" value={unit} onChange={e => setUnit(e.target.value)}
            placeholder="e.g. 2ID, 8th Army" />
        </div>
        <div className="flex justify-end mt-1">
          <SaveButton loading={loading} saved={saved} />
        </div>
        <ErrorMsg msg={error} />
      </form>
    </div>
  );
}

// ── SOFA + DEROS section ──────────────────────────────────────────────────────

function SofaDerosSection({ data, onSaved }: { data: AccountData; onSaved: (d: AccountData) => void }) {
  const existing = data.derosDate ? new Date(data.derosDate) : null;
  const [derosDay,   setDerosDay]   = useState(existing ? String(existing.getUTCDate()) : "");
  const [derosMonth, setDerosMonth] = useState(existing ? MONTHS[existing.getUTCMonth()] : "");
  const [derosYear,  setDerosYear]  = useState(existing ? String(existing.getUTCFullYear()) : "");
  const [loading,    setLoading]    = useState(false);
  const [saved,      setSaved]      = useState(false);
  const [error,      setError]      = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(""); setLoading(true); setSaved(false);
    if (!derosMonth || !derosYear) { setError("Month and year are required."); setLoading(false); return; }
    const derosDateStr = derosDay
      ? `${derosYear}-${String(MONTHS.indexOf(derosMonth) + 1).padStart(2, "0")}-${derosDay.padStart(2, "0")}`
      : `${derosYear}-${String(MONTHS.indexOf(derosMonth) + 1).padStart(2, "0")}-01`;
    const res = await fetch("/api/account", {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ derosDate: derosDateStr }),
    });
    setLoading(false);
    if (res.ok) { setSaved(true); onSaved({ ...data, derosDate: derosDateStr }); setTimeout(() => setSaved(false), 2500); }
    else { const d = await res.json(); setError(d.error ?? "Failed to save."); }
  }

  const sofaLabel: Record<string, string> = {
    US_BASED:     "Not verified",
    PENDING_SOFA:  "Pending verification",
    VERIFIED_SOFA: "Verified",
  };

  const sofaColor: Record<string, string> = {
    US_BASED:     "var(--text-secondary)",
    PENDING_SOFA:  "#854D0E",
    VERIFIED_SOFA: "#0F6E56",
  };

  return (
    <div className="card p-5">
      <SectionHeader title="SOFA status &amp; DEROS" />
      <div className="flex items-center gap-2 mb-4 p-3 rounded-lg" style={{ background: "var(--surface-page)" }}>
        <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: sofaColor[data.sofaDeclaration] ?? "var(--text-secondary)" }} />
        <span className="text-[13px]" style={{ color: sofaColor[data.sofaDeclaration] ?? "var(--text-secondary)" }}>
          SOFA status: <strong>{sofaLabel[data.sofaDeclaration] ?? data.sofaDeclaration}</strong>
        </span>
      </div>
      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <div>
          <label className="label mb-1 block">Expected departure date (DEROS)</label>
          <p className="text-[12px] mb-2" style={{ color: "var(--text-secondary)" }}>
            Day is optional — month and year are required.
          </p>
          <div className="flex gap-2">
            <select className="input" value={derosDay} onChange={e => setDerosDay(e.target.value)} style={{ flex: "0 0 90px" }}>
              <option value="">Day</option>
              {Array.from({ length: 31 }, (_, i) => i + 1).map(d => (
                <option key={d} value={String(d)}>{d}</option>
              ))}
            </select>
            <select className="input" value={derosMonth} onChange={e => setDerosMonth(e.target.value)} style={{ flex: 1 }}>
              <option value="" disabled>Month *</option>
              {MONTHS.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
            <select className="input" value={derosYear} onChange={e => setDerosYear(e.target.value)} style={{ flex: "0 0 90px" }}>
              <option value="" disabled>Year *</option>
              {DEROS_YEARS.map(y => <option key={y} value={String(y)}>{y}</option>)}
            </select>
          </div>
        </div>
        <div className="flex justify-end mt-1">
          <SaveButton loading={loading} saved={saved} />
        </div>
        <ErrorMsg msg={error} />
      </form>
    </div>
  );
}

// ── Preferences section (kids/pets) ───────────────────────────────────────────

function PreferencesSection({ data, onSaved }: { data: AccountData; onSaved: (d: AccountData) => void }) {
  const prefs = data.preferencesJson ?? {};
  const [hasKids, setHasKids] = useState(prefs.hasKids ?? false);
  const [hasPets, setHasPets] = useState(prefs.hasPets ?? false);
  const [loading, setLoading] = useState(false);
  const [saved,   setSaved]   = useState(false);
  const [error,   setError]   = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(""); setLoading(true); setSaved(false);
    const res = await fetch("/api/account", {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ preferences: { hasKids, hasPets } }),
    });
    setLoading(false);
    if (res.ok) {
      setSaved(true);
      onSaved({ ...data, preferencesJson: { ...prefs, hasKids, hasPets } });
      setTimeout(() => setSaved(false), 2500);
    } else { const d = await res.json(); setError(d.error ?? "Failed to save."); }
  }

  return (
    <div className="card p-5">
      <SectionHeader
        title="Household"
        subtitle="Optional — helps K-Bridge make better local recommendations for your situation."
      />
      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <label className="flex items-center gap-3 cursor-pointer">
          <input type="checkbox" checked={hasKids} onChange={e => setHasKids(e.target.checked)} />
          <div>
            <div className="text-[13px]" style={{ color: "var(--text-primary)" }}>I have children with me in Korea</div>
            <div className="text-[11px]" style={{ color: "var(--text-secondary)" }}>Helps with school, daycare, and family activity suggestions</div>
          </div>
        </label>
        <label className="flex items-center gap-3 cursor-pointer">
          <input type="checkbox" checked={hasPets} onChange={e => setHasPets(e.target.checked)} />
          <div>
            <div className="text-[13px]" style={{ color: "var(--text-primary)" }}>I have pets with me in Korea</div>
            <div className="text-[11px]" style={{ color: "var(--text-secondary)" }}>Helps with pet-friendly vendor and service recommendations</div>
          </div>
        </label>
        <div className="flex justify-end mt-1">
          <SaveButton loading={loading} saved={saved} />
        </div>
        <ErrorMsg msg={error} />
      </form>
    </div>
  );
}

// ── Consent section ───────────────────────────────────────────────────────────

function ConsentSection({ data, onSaved }: { data: AccountData; onSaved: (d: AccountData) => void }) {
  const flags = data.consentFlagsJson ?? {};
  const [usePrefs,  setUsePrefs]  = useState(flags.usePreferences ?? false);
  const [marketing, setMarketing] = useState(flags.marketing ?? false);
  const [loading,   setLoading]   = useState(false);
  const [saved,     setSaved]     = useState(false);
  const [error,     setError]     = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(""); setLoading(true); setSaved(false);
    const res = await fetch("/api/account", {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ consentFlags: { usePreferences: usePrefs, marketing } }),
    });
    setLoading(false);
    if (res.ok) {
      setSaved(true);
      onSaved({ ...data, consentFlagsJson: { ...flags, usePreferences: usePrefs, marketing } });
      setTimeout(() => setSaved(false), 2500);
    } else { const d = await res.json(); setError(d.error ?? "Failed to save."); }
  }

  return (
    <div className="card p-5">
      <SectionHeader title="Privacy &amp; preferences" />
      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <div className="flex items-center gap-2 p-3 rounded-lg" style={{ background: "var(--surface-page)" }}>
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path d="M2 6l3 3 5-5" stroke="#0F6E56" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          <span className="text-[12px]" style={{ color: "var(--text-secondary)" }}>
            Data retention consent accepted — required to use K-Bridge.
          </span>
        </div>
        <label className="flex items-start gap-2.5 cursor-pointer">
          <input type="checkbox" checked={usePrefs} onChange={e => setUsePrefs(e.target.checked)} className="mt-0.5 flex-shrink-0" />
          <span className="text-[13px]" style={{ color: "var(--text-primary)" }}>
            Allow K-Bridge to use my past requests to personalise future suggestions
          </span>
        </label>
        <label className="flex items-start gap-2.5 cursor-pointer">
          <input type="checkbox" checked={marketing} onChange={e => setMarketing(e.target.checked)} className="mt-0.5 flex-shrink-0" />
          <span className="text-[13px]" style={{ color: "var(--text-primary)" }}>
            Send me occasional updates about new K-Bridge features
          </span>
        </label>
        <div className="flex justify-end mt-1">
          <SaveButton loading={loading} saved={saved} />
        </div>
        <ErrorMsg msg={error} />
      </form>
    </div>
  );
}

// ── Password section ──────────────────────────────────────────────────────────

function PasswordSection() {
  const [current,  setCurrent]  = useState("");
  const [newPw,    setNewPw]    = useState("");
  const [confirm,  setConfirm]  = useState("");
  const [loading,  setLoading]  = useState(false);
  const [saved,    setSaved]    = useState(false);
  const [error,    setError]    = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (newPw !== confirm) { setError("New passwords do not match."); return; }
    if (newPw.length < 8)  { setError("Password must be at least 8 characters."); return; }
    setLoading(true); setSaved(false);
    const res = await fetch("/api/account", {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ passwordChange: { current, new: newPw } }),
    });
    setLoading(false);
    if (res.ok) {
      setSaved(true);
      setCurrent(""); setNewPw(""); setConfirm("");
      setTimeout(() => setSaved(false), 2500);
    } else { const d = await res.json(); setError(d.error ?? "Failed to update password."); }
  }

  return (
    <div className="card p-5">
      <SectionHeader title="Change password" />
      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <div>
          <label className="label">Current password</label>
          <input type="password" className="input" value={current} onChange={e => setCurrent(e.target.value)} required autoComplete="current-password" />
        </div>
        <div>
          <label className="label">New password</label>
          <input type="password" className="input" value={newPw} onChange={e => setNewPw(e.target.value)} required minLength={8} autoComplete="new-password" />
        </div>
        <div>
          <label className="label">Confirm new password</label>
          <input type="password" className="input" value={confirm} onChange={e => setConfirm(e.target.value)} required autoComplete="new-password" />
        </div>
        <div className="flex justify-end mt-1">
          <SaveButton loading={loading} saved={saved} />
        </div>
        <ErrorMsg msg={error} />
      </form>
    </div>
  );
}

// ── Danger zone ───────────────────────────────────────────────────────────────

function DangerSection() {
  const [confirming, setConfirming] = useState(false);
  const [loading,    setLoading]    = useState(false);
  const [error,      setError]      = useState("");

  async function handleDelete() {
    setLoading(true); setError("");
    const res = await fetch("/api/account", { method: "DELETE" });
    if (res.ok) {
      await signOut({ callbackUrl: "/auth/login" });
    } else {
      setLoading(false);
      const d = await res.json();
      setError(d.error ?? "Failed to delete account.");
    }
  }

  return (
    <div className="card p-5" style={{ borderColor: "var(--kb-red-light, #fde8e8)" }}>
      <SectionHeader title="Danger zone" />
      {!confirming ? (
        <button
          onClick={() => setConfirming(true)}
          className="text-[13px] font-medium px-4 py-2 rounded-lg border transition-colors"
          style={{ color: "var(--kb-red)", borderColor: "var(--kb-red)", background: "transparent" }}
        >
          Delete account
        </button>
      ) : (
        <div className="flex flex-col gap-3">
          <div
            className="p-3 rounded-lg text-[13px]"
            style={{ background: "var(--kb-red-light, #fde8e8)", color: "var(--kb-red)" }}
          >
            This will anonymise your account and cannot be undone. Your token ledger history
            will be preserved for audit purposes but all personal data will be removed.
          </div>
          <div className="flex gap-2">
            <button onClick={() => setConfirming(false)} className="btn-secondary flex-1" disabled={loading}>
              Cancel
            </button>
            <button
              onClick={handleDelete}
              disabled={loading}
              className="flex-1 py-2 rounded-lg text-[13px] font-medium text-white transition-colors"
              style={{ background: "var(--kb-red)" }}
            >
              {loading ? "Deleting…" : "Yes, delete my account"}
            </button>
          </div>
          <ErrorMsg msg={error} />
        </div>
      )}
    </div>
  );
}
