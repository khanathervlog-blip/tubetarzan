"use client";

import { useState, useEffect, useCallback } from "react";
import { BarChart3, Loader2, Save, RefreshCw } from "lucide-react";

interface UserQuota {
  id: string;
  email: string;
  subscription_plan: string;
  scans_today: number;
  quota_override: number | null;
  rate_limit_override: number | null;
}

const PLAN_CAPS: Record<string, number> = { free: 500, creator: 2000, pro: 8000, agency: 15000 };

export default function QuotaPage() {
  const [topUsers, setTopUsers] = useState<UserQuota[]>([]);
  const [loading, setLoading] = useState(true);
  const [overrides, setOverrides] = useState<Record<string, { quota: string; rate: string }>>({});
  const [saving, setSaving] = useState<string | null>(null);
  const [message, setMessage] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/quota");
      if (res.ok) {
        const data = await res.json();
        setTopUsers(data.topUsers || []);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function saveOverride(userId: string) {
    setSaving(userId);
    const o = overrides[userId] || {};
    await fetch("/api/admin/quota", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, quota_override: o.quota ?? "", rate_limit_override: o.rate ?? "" }),
    });
    setMessage("Override saved");
    setTimeout(() => setMessage(""), 3000);
    load();
    setSaving(null);
  }

  return (
    <div className="max-w-4xl">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="font-display font-bold text-2xl text-white mb-1 flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-[#FFD200]" /> Quota Manager
          </h1>
          <p className="text-[#555555] text-sm">Monitor API usage and set custom limits per user</p>
        </div>
        <button onClick={load} className="flex items-center gap-2 text-[#555555] hover:text-white text-sm">
          <RefreshCw className="w-4 h-4" /> Refresh
        </button>
      </div>

      {message && (
        <div className="bg-[#22C55E]/10 border border-[#22C55E]/20 text-[#22C55E] text-sm rounded-card px-4 py-3 mb-6">
          {message}
        </div>
      )}

      {/* Default caps */}
      <div className="bg-[#111111] border border-[#1E1E1E] rounded-card p-5 mb-6">
        <p className="text-white text-sm font-semibold mb-3">Default Daily Scan Caps</p>
        <div className="grid grid-cols-4 gap-3">
          {Object.entries(PLAN_CAPS).map(([plan, cap]) => (
            <div key={plan} className="bg-[#0A0A0A] border border-[#1E1E1E] rounded-btn p-3 text-center">
              <p className="text-[#555555] text-xs capitalize mb-1">{plan}</p>
              <p className="text-[#FFD200] font-mono-stats font-bold text-lg">{cap.toLocaleString()}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Top consumers */}
      <div className="bg-[#111111] border border-[#1E1E1E] rounded-card overflow-hidden">
        <div className="px-5 py-3 border-b border-[#1E1E1E]">
          <p className="text-white text-sm font-semibold">Top Consumers Today</p>
        </div>
        {loading ? (
          <div className="flex items-center justify-center h-32">
            <Loader2 className="w-5 h-5 animate-spin text-[#555555]" />
          </div>
        ) : topUsers.length === 0 ? (
          <div className="p-8 text-center text-[#555555] text-sm">No usage today</div>
        ) : (
          <div className="divide-y divide-[#1E1E1E]">
            {topUsers.map((u) => {
              const cap = u.quota_override ?? PLAN_CAPS[u.subscription_plan] ?? 500;
              const pct = Math.min(100, Math.round((u.scans_today / cap) * 100));
              const o = overrides[u.id] || {};
              return (
                <div key={u.id} className="p-5">
                  <div className="flex items-start justify-between gap-4 mb-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-sm font-medium truncate">{u.email}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-xs text-[#FFD200] capitalize">{u.subscription_plan}</span>
                        <span className="text-xs text-[#555555]">{u.scans_today} / {cap} scans</span>
                        {pct >= 80 && <span className="text-xs text-[#FF3B3B] font-bold">{pct}% ⚠</span>}
                      </div>
                    </div>
                  </div>

                  {/* Usage bar */}
                  <div className="h-1.5 bg-[#1E1E1E] rounded-full overflow-hidden mb-3">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${pct}%`,
                        background: pct >= 90 ? "#FF3B3B" : pct >= 70 ? "#FFD200" : "#22C55E",
                      }}
                    />
                  </div>

                  {/* Override inputs */}
                  <div className="flex items-center gap-2 flex-wrap">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[#555555] text-xs whitespace-nowrap">Quota cap:</span>
                      <input
                        type="number"
                        value={o.quota ?? (u.quota_override?.toString() || "")}
                        onChange={(e) => setOverrides((p) => ({ ...p, [u.id]: { ...p[u.id], quota: e.target.value } }))}
                        placeholder="default"
                        className="w-24 bg-[#080808] border border-[#1E1E1E] text-white text-xs rounded-btn px-2 py-1 focus:outline-none focus:border-[#FFD200]"
                      />
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-[#555555] text-xs whitespace-nowrap">Rate limit:</span>
                      <input
                        type="number"
                        value={o.rate ?? (u.rate_limit_override?.toString() || "")}
                        onChange={(e) => setOverrides((p) => ({ ...p, [u.id]: { ...p[u.id], rate: e.target.value } }))}
                        placeholder="default"
                        className="w-24 bg-[#080808] border border-[#1E1E1E] text-white text-xs rounded-btn px-2 py-1 focus:outline-none focus:border-[#FFD200]"
                      />
                    </div>
                    <button
                      onClick={() => saveOverride(u.id)}
                      disabled={saving === u.id}
                      className="flex items-center gap-1 text-xs bg-[#FFD200]/10 border border-[#FFD200]/20 text-[#FFD200] px-3 py-1 rounded-btn hover:bg-[#FFD200]/20 transition-colors disabled:opacity-50"
                    >
                      {saving === u.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
                      Save
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
