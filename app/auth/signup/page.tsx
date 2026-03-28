"use client";

import { signIn } from "next-auth/react";
import { useState } from "react";
import Image from "next/image";
import Link from "next/link";

const BASES = [
  "Camp Humphreys",
  "Osan Air Base",
  "Camp Walker",
  "Camp Carroll",
  "Camp Henry",
  "Camp Coiner",
  "Camp Market",
  "K-16 (Seoul AB)",
  "Yongsan Garrison",
  "Other",
];

const MONTHS = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December",
];

const DEROS_YEARS = Array.from(
  { length: 6 },
  (_, i) => new Date().getFullYear() + i
);

type Step = 1 | 2;

export default function SignupPage() {
  const [step, setStep] = useState<Step>(1);

  // Step 1 fields
  const [displayName,    setDisplayName]    = useState("");
  const [email,          setEmail]          = useState("");
  const [password,       setPassword]       = useState("");
  const [confirm,        setConfirm]        = useState("");
  const [referredByCode, setReferredByCode] = useState("");

  // Step 2 fields
  const [street,       setStreet]       = useState("");
  const [city,         setCity]         = useState("");
  const [base,         setBase]         = useState("");
  const [baseOther,    setBaseOther]    = useState("");
  const [unit,         setUnit]         = useState("");
  const [sofaChecked,  setSofaChecked]  = useState(false);
  const [derosDay,     setDerosDay]     = useState("");
  const [derosMonth,   setDerosMonth]   = useState("");
  const [derosYear,    setDerosYear]    = useState("");
  const [consentPrefs, setConsentPrefs] = useState(false);
  const [consentData,  setConsentData]  = useState(false);
  const [consentMkt,   setConsentMkt]   = useState(false);

  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState("");

  // ── Step 1 validation ──────────────────────────────────────────────
  function handleStep1(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (password !== confirm) { setError("Passwords do not match."); return; }
    if (password.length < 8)  { setError("Password must be at least 8 characters."); return; }
    setStep(2);
  }

  // ── Step 2 submit ──────────────────────────────────────────────────
  async function handleStep2(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!sofaChecked) {
      setError("You must confirm your SOFA status to continue.");
      return;
    }
    if (!derosMonth || !derosYear) {
      setError("Please provide at least the month and year of your DEROS date.");
      return;
    }
    if (!consentData) {
      setError("You must accept the data retention policy to continue.");
      return;
    }

    const resolvedBase = base === "Other" ? baseOther.trim() : base;

    // Build ISO date string — use day 01 if no exact day provided (workaround #17)
    const derosDateStr = derosDay
      ? `${derosYear}-${String(MONTHS.indexOf(derosMonth) + 1).padStart(2, "0")}-${derosDay.padStart(2, "0")}`
      : `${derosYear}-${String(MONTHS.indexOf(derosMonth) + 1).padStart(2, "0")}-01`;

    setLoading(true);
    try {
      const res = await fetch("/api/register", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          displayName,
          email,
          password,
          address: {
            street: street.trim(),
            city:   city.trim(),
            base:   resolvedBase,
            unit:   unit.trim(),
          },
          consentFlags: {
            usePreferences: consentPrefs,
            dataRetention:  consentData,
            marketing:      consentMkt,
          },
          derosDate:      derosDateStr,
          referredByCode: referredByCode.trim().toUpperCase() || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Something went wrong. Please try again.");
        setLoading(false);
        return;
      }

      const result = await signIn("credentials", { email, password, redirect: false });
      if (result?.error) {
        setError("Account created but sign-in failed. Please sign in manually.");
        setLoading(false);
      } else {
        window.location.href = "/dashboard";
      }
    } catch {
      setError("Something went wrong. Please try again.");
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-10" style={{ background: "var(--surface-page)" }}>
      <div className="w-full max-w-sm">

        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 rounded-full overflow-hidden mb-3 bg-white">
            <Image src="/logo.png" alt="K-Bridge" width={64} height={64} className="w-full h-full object-cover" />
          </div>
          <h1 className="text-xl font-semibold" style={{ color: "var(--kb-navy)" }}>K-Bridge</h1>
          <p className="text-sm text-[var(--text-secondary)] mt-0.5">Create your account</p>
        </div>

        {/* Step indicator */}
        <div className="flex items-center gap-2 mb-6 px-1">
          {([1, 2] as Step[]).map((s) => (
            <div key={s} className="flex items-center gap-2 flex-1">
              <div
                className="w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-semibold flex-shrink-0 transition-colors"
                style={{
                  background: step >= s ? "var(--kb-navy)" : "var(--surface-subtle)",
                  color:      step >= s ? "#fff" : "var(--text-tertiary)",
                }}
              >
                {s}
              </div>
              <span className="text-[12px]" style={{ color: step >= s ? "var(--kb-navy)" : "var(--text-tertiary)" }}>
                {s === 1 ? "Account" : "Details"}
              </span>
              {s < 2 && (
                <div
                  className="flex-1 h-px mx-1"
                  style={{ background: step > s ? "var(--kb-navy)" : "var(--border-subtle)" }}
                />
              )}
            </div>
          ))}
        </div>

        <div className="card p-6">

          {/* ── STEP 1 ─────────────────────────────────────────────── */}
          {step === 1 && (
            <>
              <button
                onClick={() => signIn("google", { callbackUrl: "/dashboard" })}
                className="w-full flex items-center justify-center gap-2.5 py-2.5 rounded-lg border border-black/[0.12] text-[13px] font-medium text-[var(--text-primary)] hover:bg-black/[0.02] transition mb-4"
              >
                <svg width="16" height="16" viewBox="0 0 16 16">
                  <path d="M15.68 8.18c0-.57-.05-1.12-.14-1.64H8v3.1h4.3a3.67 3.67 0 0 1-1.6 2.41v2h2.58c1.51-1.39 2.38-3.44 2.38-5.87z" fill="#4285F4"/>
                  <path d="M8 16c2.16 0 3.97-.72 5.3-1.94l-2.59-2a4.78 4.78 0 0 1-2.71.75c-2.08 0-3.84-1.4-4.47-3.29H.87v2.07A8 8 0 0 0 8 16z" fill="#34A853"/>
                  <path d="M3.53 9.52A4.8 4.8 0 0 1 3.28 8c0-.53.09-1.04.25-1.52V4.41H.87A8 8 0 0 0 0 8c0 1.29.31 2.5.87 3.59l2.66-2.07z" fill="#FBBC05"/>
                  <path d="M8 3.18c1.17 0 2.23.4 3.06 1.2l2.3-2.3A8 8 0 0 0 .87 4.41L3.53 6.48C4.16 4.58 5.92 3.18 8 3.18z" fill="#EA4335"/>
                </svg>
                Continue with Google
              </button>

              <div className="flex items-center gap-3 mb-4">
                <div className="flex-1 h-px bg-black/[0.08]" />
                <span className="text-[11px] text-[var(--text-tertiary)]">or</span>
                <div className="flex-1 h-px bg-black/[0.08]" />
              </div>

              <form onSubmit={handleStep1} className="flex flex-col gap-3">
                {error && (
                  <div className="alert-danger text-[12px]"><span>{error}</span></div>
                )}
                <div>
                  <label className="label">Full name</label>
                  <input type="text" className="input" value={displayName}
                    onChange={e => setDisplayName(e.target.value)}
                    placeholder="Your name" required autoComplete="name" />
                </div>
                <div>
                  <label className="label">Email address</label>
                  <input type="email" className="input" value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="you@example.com" required autoComplete="email" />
                </div>
                <div>
                  <label className="label">Password</label>
                  <input type="password" className="input" value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="••••••••" required autoComplete="new-password" minLength={8} />
                </div>
                <div>
                  <label className="label">Confirm password</label>
                  <input type="password" className="input" value={confirm}
                    onChange={e => setConfirm(e.target.value)}
                    placeholder="••••••••" required autoComplete="new-password" />
                </div>

                {/* Referral code — optional */}
                <div>
                  <label className="label">
                    Referral code{" "}
                    <span className="text-[var(--text-tertiary)] font-normal">(optional)</span>
                  </label>
                  <input
                    type="text"
                    className="input uppercase"
                    value={referredByCode}
                    onChange={e => setReferredByCode(e.target.value.toUpperCase())}
                    placeholder="e.g. KB-A3X9"
                    autoComplete="off"
                    maxLength={7}
                  />
                  <p className="text-[11px] text-[var(--text-tertiary)] mt-1">
                    Have a friend on K-Bridge? Enter their code and they'll earn 3 tokens.
                  </p>
                </div>

                <button type="submit" className="btn-primary w-full mt-1">Continue</button>
              </form>
            </>
          )}

          {/* ── STEP 2 ─────────────────────────────────────────────── */}
          {step === 2 && (
            <form onSubmit={handleStep2} className="flex flex-col gap-4">
              {error && (
                <div className="alert-danger text-[12px]"><span>{error}</span></div>
              )}

              {/* Address */}
              <div>
                <p className="text-[13px] font-semibold mb-3" style={{ color: "var(--text-primary)" }}>
                  Your address in Korea
                </p>
                <div className="flex flex-col gap-3">
                  <div>
                    <label className="label">Street address</label>
                    <input type="text" className="input" value={street}
                      onChange={e => setStreet(e.target.value)}
                      placeholder="e.g. 123 Main Street" autoComplete="street-address" />
                  </div>
                  <div>
                    <label className="label">City</label>
                    <input type="text" className="input" value={city}
                      onChange={e => setCity(e.target.value)}
                      placeholder="e.g. Pyeongtaek" autoComplete="address-level2" />
                  </div>
                  <div>
                    <label className="label">Installation / base</label>
                    <select
                      className="input"
                      value={base}
                      onChange={e => { setBase(e.target.value); setBaseOther(""); }}
                      required
                    >
                      <option value="" disabled>Select your base</option>
                      {BASES.map(b => <option key={b} value={b}>{b}</option>)}
                    </select>
                  </div>
                  {base === "Other" && (
                    <div>
                      <label className="label">Specify installation</label>
                      <input type="text" className="input" value={baseOther}
                        onChange={e => setBaseOther(e.target.value)}
                        placeholder="Installation name" required />
                    </div>
                  )}
                  <div>
                    <label className="label">
                      Unit <span className="text-[var(--text-tertiary)] font-normal">(optional)</span>
                    </label>
                    <input type="text" className="input" value={unit}
                      onChange={e => setUnit(e.target.value)}
                      placeholder="e.g. 2ID, 8th Army" />
                  </div>
                </div>
              </div>

              <div className="h-px bg-black/[0.06]" />

              {/* SOFA declaration */}
              <div>
                <p className="text-[13px] font-semibold mb-2" style={{ color: "var(--text-primary)" }}>
                  SOFA status
                </p>
                <label className="flex items-start gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={sofaChecked}
                    onChange={e => setSofaChecked(e.target.checked)}
                    className="mt-0.5 flex-shrink-0"
                  />
                  <span className="text-[13px]" style={{ color: "var(--text-primary)" }}>
                    I confirm I hold SOFA status in the Republic of Korea
                  </span>
                </label>

                {/* DEROS date */}
                <div className="mt-3">
                  <label className="label mb-1 block">
                    Expected departure date (DEROS)
                  </label>
                  <p className="text-[12px] text-[var(--text-secondary)] mb-2">
                    Day is optional — month and year are required.
                  </p>
                  <div className="flex gap-2">
                    <select
                      className="input"
                      value={derosDay}
                      onChange={e => setDerosDay(e.target.value)}
                      style={{ flex: "0 0 90px" }}
                    >
                      <option value="">Day</option>
                      {Array.from({ length: 31 }, (_, i) => i + 1).map(d => (
                        <option key={d} value={String(d)}>{d}</option>
                      ))}
                    </select>
                    <select
                      className="input"
                      value={derosMonth}
                      onChange={e => setDerosMonth(e.target.value)}
                      style={{ flex: 1 }}
                    >
                      <option value="" disabled>Month *</option>
                      {MONTHS.map(m => <option key={m} value={m}>{m}</option>)}
                    </select>
                    <select
                      className="input"
                      value={derosYear}
                      onChange={e => setDerosYear(e.target.value)}
                      style={{ flex: "0 0 90px" }}
                    >
                      <option value="" disabled>Year *</option>
                      {DEROS_YEARS.map(y => <option key={y} value={String(y)}>{y}</option>)}
                    </select>
                  </div>
                </div>
              </div>

              <div className="h-px bg-black/[0.06]" />

              {/* Consent flags */}
              <div>
                <p className="text-[13px] font-semibold mb-2" style={{ color: "var(--text-primary)" }}>
                  Privacy &amp; preferences
                </p>
                <div className="flex flex-col gap-2.5">
                  <label className="flex items-start gap-2.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={consentData}
                      onChange={e => setConsentData(e.target.checked)}
                      className="mt-0.5 flex-shrink-0"
                    />
                    <span className="text-[13px]" style={{ color: "var(--text-primary)" }}>
                      I agree to K-Bridge storing my data for up to 12 months of inactivity{" "}
                      <span style={{ color: "var(--alert-red)" }}>*</span>
                    </span>
                  </label>
                  <label className="flex items-start gap-2.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={consentPrefs}
                      onChange={e => setConsentPrefs(e.target.checked)}
                      className="mt-0.5 flex-shrink-0"
                    />
                    <span className="text-[13px] text-[var(--text-secondary)]">
                      Allow K-Bridge to use my past requests to personalise future suggestions{" "}
                      <span className="text-[var(--text-tertiary)]">(optional)</span>
                    </span>
                  </label>
                  <label className="flex items-start gap-2.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={consentMkt}
                      onChange={e => setConsentMkt(e.target.checked)}
                      className="mt-0.5 flex-shrink-0"
                    />
                    <span className="text-[13px] text-[var(--text-secondary)]">
                      Send me occasional updates about new K-Bridge features{" "}
                      <span className="text-[var(--text-tertiary)]">(optional)</span>
                    </span>
                  </label>
                </div>
              </div>

              <div className="flex gap-2 mt-1">
                <button
                  type="button"
                  onClick={() => { setStep(1); setError(""); }}
                  className="btn-secondary flex-1"
                  disabled={loading}
                >
                  Back
                </button>
                <button type="submit" disabled={loading} className="btn-primary flex-1">
                  {loading ? "Creating account…" : "Create account"}
                </button>
              </div>
            </form>
          )}
        </div>

        <p className="text-center text-[13px] text-[var(--text-secondary)] mt-4">
          Already have an account?{" "}
          <Link href="/auth/login" className="font-medium" style={{ color: "var(--kb-navy)" }}>
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
