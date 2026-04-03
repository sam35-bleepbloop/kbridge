"use client";

// app/(admin)/admin/pricing-rules/page.tsx
// Admin page: manage TaskPricingRule entries

import { useEffect, useState } from "react";

type PricingRule = {
  id: string;
  category: string;
  tokenCost: number;
  description: string | null;
  isActive: boolean;
  createdAt: string;
};

export default function PricingRulesPage() {
  const [rules, setRules] = useState<PricingRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [category, setCategory] = useState("");
  const [tokenCost, setTokenCost] = useState<number>(3);
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Edit state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editCost, setEditCost] = useState<number>(3);
  const [editDescription, setEditDescription] = useState("");
  const [editActive, setEditActive] = useState(true);

  async function loadRules() {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/pricing-rules");
      const data = await res.json();
      setRules(data.rules ?? []);
    } catch {
      setError("Failed to load pricing rules.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadRules(); }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    if (!category.trim()) { setFormError("Category is required."); return; }
    if (tokenCost < 2 || tokenCost > 10) { setFormError("Token cost must be between 2 and 10."); return; }

    setSaving(true);
    try {
      const res = await fetch("/api/admin/pricing-rules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ category: category.trim(), tokenCost, description: description.trim() || undefined }),
      });
      if (!res.ok) {
        const data = await res.json();
        setFormError(data.error ?? "Failed to create rule.");
        return;
      }
      setCategory("");
      setTokenCost(3);
      setDescription("");
      await loadRules();
    } finally {
      setSaving(false);
    }
  }

  async function handleSaveEdit(id: string) {
    await fetch(`/api/admin/pricing-rules/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tokenCost: editCost, description: editDescription || null, isActive: editActive }),
    });
    setEditingId(null);
    await loadRules();
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this pricing rule? Tasks matching this category will become Pioneer Tasks.")) return;
    await fetch(`/api/admin/pricing-rules/${id}`, { method: "DELETE" });
    await loadRules();
  }

  function startEdit(rule: PricingRule) {
    setEditingId(rule.id);
    setEditCost(rule.tokenCost);
    setEditDescription(rule.description ?? "");
    setEditActive(rule.isActive);
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-semibold text-gray-900 mb-1">Token Pricing Rules</h1>
      <p className="text-sm text-gray-500 mb-6">
        Define token costs for known one-off task categories. Tasks that don&apos;t match any active rule
        are treated as <span className="font-medium text-amber-600">Pioneer Tasks</span> and charged 2 tokens.
      </p>

      {/* Create form */}
      <div className="bg-white border border-gray-200 rounded-lg p-5 mb-8">
        <h2 className="text-base font-medium text-gray-800 mb-4">Add New Rule</h2>
        <form onSubmit={handleCreate} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Category name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                placeholder="e.g. Traffic Ticket Payment"
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1B3A6B]"
              />
              <p className="text-xs text-gray-400 mt-1">Must match the AI-generated task label (case-insensitive partial match).</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Token cost (2–10) <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                min={2}
                max={10}
                value={tokenCost}
                onChange={(e) => setTokenCost(Number(e.target.value))}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1B3A6B]"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description (optional)</label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Internal note for admin reference"
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1B3A6B]"
            />
          </div>
          {formError && <p className="text-sm text-red-600">{formError}</p>}
          <button
            type="submit"
            disabled={saving}
            className="bg-[#1B3A6B] text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-[#2D5499] disabled:opacity-50"
          >
            {saving ? "Saving..." : "Add Rule"}
          </button>
        </form>
      </div>

      {/* Rules table */}
      {loading ? (
        <p className="text-sm text-gray-500">Loading...</p>
      ) : error ? (
        <p className="text-sm text-red-600">{error}</p>
      ) : rules.length === 0 ? (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-sm text-amber-800">
          No pricing rules defined yet. All one-off tasks are currently treated as Pioneer Tasks (2 tokens).
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-gray-500">Category</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">Tokens</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">Description</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">Status</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {rules.map((rule) => (
                <tr key={rule.id} className={rule.isActive ? "" : "opacity-50"}>
                  <td className="px-4 py-3 font-medium text-gray-900">{rule.category}</td>
                  <td className="px-4 py-3">
                    {editingId === rule.id ? (
                      <input
                        type="number"
                        min={2}
                        max={10}
                        value={editCost}
                        onChange={(e) => setEditCost(Number(e.target.value))}
                        className="w-16 border border-gray-300 rounded px-2 py-1 text-sm"
                      />
                    ) : (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-[#E8EEF7] text-[#1B3A6B]">
                        {rule.tokenCost}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-gray-500">
                    {editingId === rule.id ? (
                      <input
                        type="text"
                        value={editDescription}
                        onChange={(e) => setEditDescription(e.target.value)}
                        className="w-full border border-gray-300 rounded px-2 py-1 text-sm"
                      />
                    ) : (
                      rule.description ?? <span className="text-gray-300">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {editingId === rule.id ? (
                      <label className="flex items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          checked={editActive}
                          onChange={(e) => setEditActive(e.target.checked)}
                        />
                        Active
                      </label>
                    ) : (
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${rule.isActive ? "bg-green-50 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                        {rule.isActive ? "Active" : "Inactive"}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {editingId === rule.id ? (
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleSaveEdit(rule.id)}
                          className="text-xs text-green-700 font-medium hover:underline"
                        >
                          Save
                        </button>
                        <button
                          onClick={() => setEditingId(null)}
                          className="text-xs text-gray-500 hover:underline"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <div className="flex gap-3">
                        <button
                          onClick={() => startEdit(rule)}
                          className="text-xs text-[#1B3A6B] font-medium hover:underline"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(rule.id)}
                          className="text-xs text-red-600 hover:underline"
                        >
                          Delete
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
