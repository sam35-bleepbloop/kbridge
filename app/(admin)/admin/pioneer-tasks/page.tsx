"use client";

// app/(admin)/admin/pioneer-tasks/page.tsx
// Admin review queue for completed Pioneer Tasks — create pricing rules from here

import { useEffect, useState } from "react";
import Link from "next/link";

type PioneerTask = {
  id: string;
  label: string | null;
  type: string;
  status: string;
  tokenActual: number | null;
  createdAt: string;
  closedAt: string | null;
  user: {
    displayName: string | null;
    email: string;
  };
};

export default function PioneerTasksPage() {
  const [tasks, setTasks] = useState<PioneerTask[]>([]);
  const [loading, setLoading] = useState(true);

  // Quick-add rule state
  const [addingFor, setAddingFor] = useState<string | null>(null); // task id
  const [quickCategory, setQuickCategory] = useState("");
  const [quickCost, setQuickCost] = useState<number>(3);
  const [quickDesc, setQuickDesc] = useState("");
  const [quickError, setQuickError] = useState<string | null>(null);
  const [quickSaving, setQuickSaving] = useState(false);

  async function loadTasks() {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/pioneer-tasks");
      const data = await res.json();
      setTasks(data.tasks ?? []);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadTasks(); }, []);

  function startQuickAdd(task: PioneerTask) {
    setAddingFor(task.id);
    setQuickCategory(task.label ?? "");
    setQuickCost(3);
    setQuickDesc("");
    setQuickError(null);
  }

  async function handleQuickAdd(e: React.FormEvent) {
    e.preventDefault();
    setQuickError(null);
    if (!quickCategory.trim()) { setQuickError("Category is required."); return; }
    if (quickCost < 2 || quickCost > 10) { setQuickError("Cost must be 2–10."); return; }

    setQuickSaving(true);
    try {
      const res = await fetch("/api/admin/pricing-rules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          category: quickCategory.trim(),
          tokenCost: quickCost,
          description: quickDesc.trim() || undefined,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        setQuickError(typeof data.error === "string" ? data.error : "Failed to create rule.");
        return;
      }
      setAddingFor(null);
      // No need to reload tasks — pioneer tasks remain here for reference
      // (they are flagged at completion, not unflagged when a rule is added)
    } finally {
      setQuickSaving(false);
    }
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-1">
        <h1 className="text-2xl font-semibold text-gray-900">Pioneer Task Review</h1>
        <Link
          href="/admin/pricing-rules"
          className="text-sm text-[#1B3A6B] font-medium hover:underline"
        >
          Manage all pricing rules →
        </Link>
      </div>
      <p className="text-sm text-gray-500 mb-6">
        These completed tasks were charged the pioneer rate (2 tokens) because no pricing rule matched.
        Review each one and add a pricing rule so future similar tasks are priced correctly.
      </p>

      {loading ? (
        <p className="text-sm text-gray-500">Loading...</p>
      ) : tasks.length === 0 ? (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-sm text-green-800">
          No pioneer tasks awaiting review. All completed one-off tasks matched a pricing rule.
        </div>
      ) : (
        <div className="space-y-4">
          {tasks.map((task) => (
            <div key={task.id} className="bg-white border border-gray-200 rounded-lg p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200">
                      🎖️ Pioneer
                    </span>
                    <span className="text-xs text-gray-400">{task.type}</span>
                  </div>
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {task.label ?? <span className="text-gray-400 italic">No label generated</span>}
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {task.user.displayName ?? task.user.email} ·{" "}
                    {task.closedAt
                      ? new Date(task.closedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
                      : "—"}
                    {" · "}
                    <Link
                      href={`/admin/tasks/${task.id}`}
                      className="text-[#1B3A6B] hover:underline"
                    >
                      View task
                    </Link>
                  </p>
                </div>

                {addingFor !== task.id && (
                  <button
                    onClick={() => startQuickAdd(task)}
                    className="shrink-0 bg-[#1B3A6B] text-white px-3 py-1.5 rounded-md text-xs font-medium hover:bg-[#2D5499]"
                  >
                    Add Pricing Rule
                  </button>
                )}
              </div>

              {addingFor === task.id && (
                <form onSubmit={handleQuickAdd} className="mt-4 pt-4 border-t border-gray-100 space-y-3">
                  <p className="text-xs font-medium text-gray-600 uppercase tracking-wide">New Pricing Rule</p>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="sm:col-span-2">
                      <label className="block text-xs text-gray-600 mb-1">Category name</label>
                      <input
                        type="text"
                        value={quickCategory}
                        onChange={(e) => setQuickCategory(e.target.value)}
                        placeholder="e.g. Traffic Ticket Payment"
                        className="w-full border border-gray-300 rounded px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1B3A6B]"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">Token cost (2–10)</label>
                      <input
                        type="number"
                        min={2}
                        max={10}
                        value={quickCost}
                        onChange={(e) => setQuickCost(Number(e.target.value))}
                        className="w-full border border-gray-300 rounded px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1B3A6B]"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">Description (optional)</label>
                    <input
                      type="text"
                      value={quickDesc}
                      onChange={(e) => setQuickDesc(e.target.value)}
                      placeholder="Internal note"
                      className="w-full border border-gray-300 rounded px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1B3A6B]"
                    />
                  </div>
                  {quickError && <p className="text-xs text-red-600">{quickError}</p>}
                  <div className="flex gap-2">
                    <button
                      type="submit"
                      disabled={quickSaving}
                      className="bg-[#1B3A6B] text-white px-3 py-1.5 rounded text-xs font-medium hover:bg-[#2D5499] disabled:opacity-50"
                    >
                      {quickSaving ? "Saving..." : "Save Rule"}
                    </button>
                    <button
                      type="button"
                      onClick={() => setAddingFor(null)}
                      className="text-xs text-gray-500 hover:underline"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
