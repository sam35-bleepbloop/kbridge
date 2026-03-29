// components/tasks/EscalateOfferCard.tsx
"use client";

import { useState } from "react";

interface EscalateOfferCardProps {
  taskId: string;
  taskSummary: string;
  tokenBalance: number;
  onConfirm: () => void;  // called after successful escalation
  onDismiss: () => void;  // called when user declines
}

const ESCALATION_COST = 3;

export function EscalateOfferCard({
  taskId,
  taskSummary,
  tokenBalance,
  onConfirm,
  onDismiss,
}: EscalateOfferCardProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const canAfford = tokenBalance >= ESCALATION_COST;

  async function handleConfirm() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/tasks/${taskId}/escalate`, {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Something went wrong. Please try again.");
        setLoading(false);
        return;
      }
      onConfirm();
    } catch {
      setError("Network error. Please try again.");
      setLoading(false);
    }
  }

  return (
    <div className="my-4 rounded-xl border border-[#2D5499]/30 bg-[#F0F4FA] p-4 shadow-sm">
      {/* Header */}
      <div className="mb-3 flex items-start gap-3">
        <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#1B3A6B] text-white">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
            <circle cx="9" cy="7" r="4" />
            <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
            <path d="M16 3.13a4 4 0 0 1 0 7.75" />
          </svg>
        </div>
        <div>
          <p className="text-sm font-semibold text-[#1B3A6B]">
            Hand off to a bilingual team member?
          </p>
          <p className="mt-0.5 text-xs text-gray-500">
            A K-Bridge employee will handle this directly.
          </p>
        </div>
      </div>

      {/* Task summary */}
      {taskSummary && (
        <div className="mb-3 rounded-lg bg-white px-3 py-2 text-xs text-gray-700 border border-gray-100">
          <span className="font-medium text-gray-500 uppercase tracking-wide text-[10px]">Task</span>
          <p className="mt-0.5">{taskSummary}</p>
        </div>
      )}

      {/* Cost breakdown */}
      <div className="mb-3 flex items-center justify-between rounded-lg bg-white px-3 py-2 border border-gray-100">
        <span className="text-xs text-gray-600">Escalation fee</span>
        <span className="text-sm font-semibold text-[#1B3A6B]">
          {ESCALATION_COST} tokens
        </span>
      </div>

      {/* Affordability warning */}
      {!canAfford && (
        <p className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700 border border-red-100">
          You need at least {ESCALATION_COST} tokens to escalate. Your current balance is {tokenBalance} token{tokenBalance !== 1 ? "s" : ""}.{" "}
          <a href="/tokens" className="underline font-medium">
            Top up here
          </a>
          .
        </p>
      )}

      {/* Error */}
      {error && (
        <p className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700 border border-red-100">
          {error}
        </p>
      )}

      {/* Buttons */}
      <div className="flex gap-2">
        <button
          onClick={handleConfirm}
          disabled={loading || !canAfford}
          className="flex-1 rounded-lg bg-[#1B3A6B] px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? "Confirming…" : `Confirm escalation (${ESCALATION_COST} tokens)`}
        </button>
        <button
          onClick={onDismiss}
          disabled={loading}
          className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:opacity-50"
        >
          No thanks
        </button>
      </div>
    </div>
  );
}
