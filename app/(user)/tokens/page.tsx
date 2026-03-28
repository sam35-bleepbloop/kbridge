"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { TOKEN_PACKS, TOKEN_PURCHASE_CAP, TOKEN_WALLET_CAP } from "@/lib/tokens/engine";

const PACK_DESCRIPTIONS = {
  single:   "Buy exactly what you need — no pack required.",
  starter:  "Perfect for trying K-Bridge or topping up between tasks.",
  standard: "Covers most users for a full month of regular tasks.",
  value:    "Best value — ideal if you have recurring payments set up.",
};

export default function TokensPage() {
  const searchParams = useSearchParams();
  const success   = searchParams.get("success");
  const cancelled = searchParams.get("cancelled");

  const [balance,       setBalance]       = useState<number | null>(null);
  const [loading,       setLoading]       = useState<string | null>(null);
  const [singleQty,     setSingleQty]     = useState(1);
  const [errorMsg,      setErrorMsg]      = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/tokens")
      .then((r) => r.json())
      .then((d) => setBalance(d.balance));
  }, []);

  // Per-purchase cap and wallet cap for single token counter
  const singleMax = Math.min(TOKEN_PURCHASE_CAP, TOKEN_WALLET_CAP - (balance ?? 0));

  async function purchase(packId: string, quantity?: number) {
    setLoading(packId);
    setErrorMsg(null);
    const res = await fetch("/api/tokens", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ packId, quantity }),
    });
    const data = await res.json();
    if (data.url) {
      window.location.href = data.url;
    } else {
      setErrorMsg(data.error ?? "Something went wrong. Please try again.");
      setLoading(null);
    }
  }

  const singlePack = TOKEN_PACKS.find((p) => p.id === "single")!;
  const otherPacks = TOKEN_PACKS.filter((p) => p.id !== "single");

  return (
    <div className="p-6 max-w-2xl mx-auto animate-fade-in">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-[var(--text-primary)]">Token packs</h1>
        <p className="text-sm text-[var(--text-secondary)] mt-0.5">
          Current balance:{" "}
          <span className="font-semibold text-[var(--text-primary)]">
            {balance === null ? "—" : `${balance} token${balance !== 1 ? "s" : ""}`}
          </span>
        </p>
      </div>

      {/* Success / cancel banners */}
      {success && (
        <div className="alert-info mb-5">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="flex-shrink-0 mt-0.5">
            <circle cx="8" cy="8" r="6" stroke="var(--kb-navy)" strokeWidth="1.2"/>
            <path d="M5 8l2 2 4-4" stroke="var(--kb-navy)" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          <div className="text-[13px]">
            <span className="font-medium">Tokens added successfully.</span>{" "}
            Your balance has been updated.
          </div>
        </div>
      )}
      {cancelled && (
        <div className="alert-warn mb-5">
          <div className="w-1.5 h-1.5 rounded-full bg-[#854F0B] flex-shrink-0 mt-1" />
          <div className="text-[13px]">Purchase cancelled — no charge was made.</div>
        </div>
      )}
      {errorMsg && (
        <div className="alert-warn mb-5">
          <div className="w-1.5 h-1.5 rounded-full bg-[#854F0B] flex-shrink-0 mt-1" />
          <div className="text-[13px]">{errorMsg}</div>
        </div>
      )}

      {/* Token cost reference */}
      <div
        className="rounded-lg p-4 mb-6"
        style={{ background: "var(--kb-navy-light)", border: "0.5px solid rgba(27,58,107,0.15)" }}
      >
        <div className="text-[12px] font-semibold text-[var(--kb-navy)] mb-2">Token costs at a glance</div>
        <div className="grid grid-cols-2 gap-x-6 gap-y-1">
          {[
            ["Recurring setup",          "10 tokens"],
            ["Recurring auto-payment",   "3 tokens"],
            ["One-off payment (AI)",     "5–8 tokens"],
            ["One-off payment (+ call)", "10–20 tokens"],
            ["Traffic ticket",           "8–25 tokens"],
            ["Inquiry / price check",    "1–3 tokens"],
          ].map(([label, cost]) => (
            <div key={label} className="flex justify-between text-[12px]">
              <span style={{ color: "var(--kb-navy-mid)" }}>{label}</span>
              <span className="font-medium" style={{ color: "var(--kb-navy)" }}>{cost}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Single token counter card */}
      <div className="card p-5 mb-3">
        <div className="flex items-center gap-5">
          {/* Token visual */}
          <div
            className="w-14 h-14 rounded-xl flex flex-col items-center justify-center flex-shrink-0"
            style={{ background: "var(--kb-navy-light)" }}
          >
            <div className="text-xl font-bold" style={{ color: "var(--kb-navy)" }}>
              {singleQty}
            </div>
            <div className="text-[9px] font-medium mt-0.5" style={{ color: "var(--kb-navy-mid)" }}>
              {singleQty === 1 ? "TOKEN" : "TOKENS"}
            </div>
          </div>

          {/* Details */}
          <div className="flex-1">
            <div className="flex items-baseline gap-2">
              <span className="text-[15px] font-semibold text-[var(--text-primary)]">
                Single tokens
              </span>
              <span className="text-[12px] text-[var(--text-tertiary)]">
                $2.00 each
              </span>
            </div>
            <div className="text-[12px] text-[var(--text-secondary)] mt-0.5">
              {PACK_DESCRIPTIONS.single}
            </div>

            {/* Counter */}
            <div className="flex items-center gap-3 mt-3">
              <button
                onClick={() => setSingleQty((q) => Math.max(1, q - 1))}
                disabled={singleQty <= 1 || !!loading}
                className="w-7 h-7 rounded-md border text-[16px] font-medium flex items-center justify-center disabled:opacity-30"
                style={{ borderColor: "var(--border-subtle)", color: "var(--text-primary)" }}
              >
                −
              </button>
              <span className="text-[15px] font-semibold w-6 text-center" style={{ color: "var(--text-primary)" }}>
                {singleQty}
              </span>
              <button
                onClick={() => setSingleQty((q) => Math.min(singleMax > 0 ? singleMax : TOKEN_PURCHASE_CAP, q + 1))}
                disabled={singleQty >= TOKEN_PURCHASE_CAP || !!loading}
                className="w-7 h-7 rounded-md border text-[16px] font-medium flex items-center justify-center disabled:opacity-30"
                style={{ borderColor: "var(--border-subtle)", color: "var(--text-primary)" }}
              >
                +
              </button>
              <span className="text-[12px]" style={{ color: "var(--text-tertiary)" }}>
                max {TOKEN_PURCHASE_CAP} per purchase
              </span>
            </div>
          </div>

          {/* Price + buy */}
          <div className="flex flex-col items-end gap-2 flex-shrink-0">
            <div className="text-[18px] font-bold text-[var(--text-primary)]">
              ${(singlePack.priceUsd * singleQty).toFixed(2)}
            </div>
            <button
              onClick={() => purchase("single", singleQty)}
              disabled={!!loading}
              className="btn-primary text-[13px] px-5 py-2 disabled:opacity-60"
            >
              {loading === "single" ? "Redirecting…" : "Buy"}
            </button>
          </div>
        </div>
      </div>

      {/* Pack cards */}
      <div className="flex flex-col gap-3">
        {otherPacks.map((pack) => (
          <div
            key={pack.id}
            className="card p-5 flex items-center gap-5"
            style={{ border: (pack as any).popular ? "2px solid var(--kb-navy)" : undefined }}
          >
            {(pack as any).popular && (
              <div
                className="absolute -mt-10 ml-4 text-[10px] font-semibold px-2 py-0.5 rounded"
                style={{ background: "var(--kb-navy)", color: "white" }}
              >
                Most popular
              </div>
            )}

            {/* Token visual */}
            <div
              className="w-14 h-14 rounded-xl flex flex-col items-center justify-center flex-shrink-0"
              style={{ background: "var(--kb-navy-light)" }}
            >
              <div className="text-xl font-bold" style={{ color: "var(--kb-navy)" }}>
                {pack.tokens}
              </div>
              <div className="text-[9px] font-medium mt-0.5" style={{ color: "var(--kb-navy-mid)" }}>
                TOKENS
              </div>
            </div>

            {/* Details */}
            <div className="flex-1">
              <div className="flex items-baseline gap-2">
                <span className="text-[15px] font-semibold text-[var(--text-primary)]">
                  {pack.label} pack
                </span>
                <span className="text-[12px] text-[var(--text-tertiary)]">
                  ${pack.pricePerToken.toFixed(2)}/token
                </span>
              </div>
              <div className="text-[12px] text-[var(--text-secondary)] mt-0.5">
                {PACK_DESCRIPTIONS[pack.id as keyof typeof PACK_DESCRIPTIONS]}
              </div>
            </div>

            {/* Price + buy */}
            <div className="flex flex-col items-end gap-2 flex-shrink-0">
              <div className="text-[18px] font-bold text-[var(--text-primary)]">
                ${pack.priceUsd.toFixed(2)}
              </div>
              <button
                onClick={() => purchase(pack.id)}
                disabled={!!loading}
                className="btn-primary text-[13px] px-5 py-2 disabled:opacity-60"
              >
                {loading === pack.id ? "Redirecting…" : "Buy"}
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Footer note */}
      <p className="text-[11px] text-[var(--text-tertiary)] text-center mt-6">
        Payments processed securely via Stripe in USD. Tokens never expire.
        Questions? Contact us through the chat.
      </p>
    </div>
  );
}
