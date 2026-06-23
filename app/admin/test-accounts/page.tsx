"use client";

import { useState, useEffect, useCallback } from "react";
import { FlaskConical, Plus, Trash2, Loader2, Shield } from "lucide-react";

interface TestAccount {
  id: string;
  user_id: string;
  account_label: string;
  plan_to_simulate: string;
  created_by_admin: string;
  notes: string | null;
  created_at: string;
  profile: { email: string; subscription_plan: string } | null;
}

const PLANS = ["free", "creator", "pro", "agency"];

export default function TestAccountsPage() {
  const [accounts, setAccounts] = useState<TestAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [message, setMessage] = useState("");

  const [userId, setUserId] = useState("");
  const [label, setLabel] = useState("");
  const [plan, setPlan] = useState("free");
  const [notes, setNotes] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/test-accounts");
      if (res.ok) {
        const data = await res.json();
        setAccounts(data.accounts || []);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function create() {
    if (!userId.trim() || !label.trim()) return;
    setCreating(true);
    const res = await fetch("/api/admin/test-accounts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: userId.trim(), accountLabel: label.trim(), planToSimulate: plan, notes: notes.trim() || null }),
    });
    const data = await res.json();
    if (res.ok) {
      setMessage("Test account created");
      setUserId(""); setLabel(""); setPlan("free"); setNotes("");
      load();
    } else {
      setMessage(data.error || "Failed to create");
    }
    setTimeout(() => setMessage(""), 4000);
    setCreating(false);
  }

  async function remove(acc: TestAccount) {
    if (!confirm(`Remove test account "${acc.account_label}"?`)) return;
    setDeleting(acc.user_id);
    await fetch("/api/admin/test-accounts", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: acc.user_id }),
    });
    setMessage("Test account removed");
    setTimeout(() => setMessage(""), 3000);
    load();
    setDeleting(null);
  }

  return (
    <div className="max-w-3xl">
      <div className="mb-6">
        <h1 className="font-display font-bold text-2xl text-white mb-1 flex items-center gap-2">
          <FlaskConical className="w-6 h-6 text-[#FFD200]" /> Test Accounts
        </h1>
        <p className="text-[#555555] text-sm">
          Accounts permanently exempt from all security checks, rate limits, and quota caps.
        </p>
      </div>

      {message && (
        <div className="bg-[#22C55E]/10 border border-[#22C55E]/20 text-[#22C55E] text-sm rounded-card px-4 py-3 mb-6">
          {message}
        </div>
      )}

      <div className="bg-[#FFD200]/5 border border-[#FFD200]/20 rounded-card p-4 mb-6 flex items-start gap-3">
        <Shield className="w-4 h-4 text-[#FFD200] mt-0.5 shrink-0" />
        <p className="text-[#FFD200] text-sm">
          Test accounts bypass all security checks, rate limits, quota caps, and never appear in revenue or user metrics.
        </p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-32">
          <Loader2 className="w-5 h-5 animate-spin text-[#555555]" />
        </div>
      ) : accounts.length === 0 ? (
        <div className="bg-[#111111] border border-[#1E1E1E] rounded-card p-8 text-center mb-6">
          <FlaskConical className="w-8 h-8 text-[#333333] mx-auto mb-3" />
          <p className="text-[#555555] text-sm">No test accounts yet</p>
        </div>
      ) : (
        <div className="space-y-3 mb-8">
          {accounts.map((acc) => (
            <div key={acc.id} className="bg-[#111111] border border-[#1E1E1E] rounded-card p-5 flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <span className="text-white font-semibold text-sm">{acc.account_label}</span>
                  <span className="text-xs font-bold px-2 py-0.5 rounded-badge bg-[#FFD200]/10 text-[#FFD200] capitalize">
                    {acc.plan_to_simulate}
                  </span>
                </div>
                <p className="text-[#555555] text-xs">{acc.profile?.email || acc.user_id}</p>
                {acc.notes && <p className="text-[#333333] text-xs mt-1">{acc.notes}</p>}
                <p className="text-[#222222] text-xs mt-1">Created by {acc.created_by_admin} · {new Date(acc.created_at).toLocaleDateString()}</p>
              </div>
              <button
                onClick={() => remove(acc)}
                disabled={deleting === acc.user_id}
                className="flex items-center gap-1.5 text-xs text-[#555555] hover:text-[#FF3B3B] transition-colors disabled:opacity-50"
              >
                {deleting === acc.user_id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                Remove
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="bg-[#111111] border border-[#1E1E1E] rounded-card p-6">
        <h2 className="text-white font-semibold text-sm mb-4 flex items-center gap-2">
          <Plus className="w-4 h-4" /> Create Test Account
        </h2>
        <div className="space-y-4">
          <div>
            <label className="block text-xs text-[#999999] mb-1.5">User ID (from profiles table)</label>
            <input
              type="text"
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
              placeholder="uuid of existing user"
              className="w-full bg-[#080808] border border-[#1E1E1E] text-white placeholder-[#333333] rounded-btn px-4 py-2.5 text-sm focus:outline-none focus:border-[#FFD200]"
            />
          </div>
          <div>
            <label className="block text-xs text-[#999999] mb-1.5">Label</label>
            <input
              type="text"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="e.g. Creator Plan Testing"
              className="w-full bg-[#080808] border border-[#1E1E1E] text-white placeholder-[#333333] rounded-btn px-4 py-2.5 text-sm focus:outline-none focus:border-[#FFD200]"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-[#999999] mb-1.5">Plan to simulate</label>
              <select
                value={plan}
                onChange={(e) => setPlan(e.target.value)}
                className="w-full bg-[#080808] border border-[#1E1E1E] text-white rounded-btn px-4 py-2.5 text-sm focus:outline-none focus:border-[#FFD200]"
              >
                {PLANS.map((p) => (
                  <option key={p} value={p} className="bg-[#111111] capitalize">{p}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-[#999999] mb-1.5">Notes (optional)</label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="e.g. Testing A/B feature"
                className="w-full bg-[#080808] border border-[#1E1E1E] text-white placeholder-[#333333] rounded-btn px-4 py-2.5 text-sm focus:outline-none focus:border-[#FFD200]"
              />
            </div>
          </div>
          <button
            onClick={create}
            disabled={creating || !userId.trim() || !label.trim()}
            className="w-full bg-[#FFD200] text-[#080808] font-bold py-2.5 rounded-btn hover:bg-[#FFE033] transition-colors disabled:opacity-50 flex items-center justify-center gap-2 text-sm"
          >
            {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
            Create Test Account
          </button>
        </div>
      </div>
    </div>
  );
}
