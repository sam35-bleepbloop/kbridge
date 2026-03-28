"use client";

import { signIn, getSession } from "next-auth/react";
import { useState } from "react";
import Image from "next/image";
import Link from "next/link";

export default function LoginPage() {
  const [email,    setEmail]    = useState("");
  const [password, setPassword] = useState("");
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    if (result?.error) {
      setError("Invalid email or password.");
      setLoading(false);
    } else {
      // Check session for employee flag — redirect accordingly.
      // Employees land on /admin/queue by default but are not blocked from /dashboard.
      const session = await getSession();
      window.location.href = session?.user?.isEmployee ? "/admin/queue" : "/dashboard";
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ background: "var(--surface-page)" }}>
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 rounded-full overflow-hidden mb-3 bg-white">
            <Image src="/logo.png" alt="K-Bridge" width={64} height={64} className="w-full h-full object-cover"/>
          </div>
          <h1 className="text-xl font-semibold" style={{ color: "var(--kb-navy)" }}>K-Bridge</h1>
          <p className="text-sm text-[var(--text-secondary)] mt-0.5">Welcome back</p>
        </div>

        <div className="card p-6">
          {/* Google sign-in */}
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

          <form onSubmit={handleSubmit} className="flex flex-col gap-3">
            {error && (
              <div className="alert-danger text-[12px]">
                <span>{error}</span>
              </div>
            )}
            <div>
              <label className="label">Email address</label>
              <input
                type="email"
                className="input"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                autoComplete="email"
              />
            </div>
            <div>
              <label className="label">Password</label>
              <input
                type="password"
                className="input"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                autoComplete="current-password"
              />
            </div>
            <button type="submit" disabled={loading} className="btn-primary w-full mt-1">
              {loading ? "Signing in…" : "Sign in"}
            </button>
          </form>
        </div>

        <p className="text-center text-[13px] text-[var(--text-secondary)] mt-4">
          New to K-Bridge?{" "}
          <Link href="/auth/signup" className="font-medium" style={{ color: "var(--kb-navy)" }}>
            Create an account
          </Link>
        </p>
      </div>
    </div>
  );
}