"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  Loader2, ToggleLeft, ToggleRight, Trash2, Server, Zap, CreditCard,
} from "lucide-react";
import type { AdminSetting } from "@/types/database";

interface FeatureFlag {
  id: string;
  key: string;
  label: string;
  description: string | null;
  is_enabled: boolean;
}

interface PlanLimit {
  id: string;
  plan: string;
  daily_scans: number;
  monthly_scans: number;
  channels: number;
  ai_scripts: number;
  bulk_limit: number;
}

const PLAN_COLORS: Record<string, string> = {
  free: "#555555",
  creator: "#FFD200",
  pro: "#22C55E",
  agency: "#3B82F6",
};

export default function AdminSettingsPage() {
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [saving, setSaving] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [cacheCount, setCacheCount] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  const [flags, setFlags] = useState<FeatureFlag[]>([]);
  const [flagsLoading, setFlagsLoading] = useState(true);
  const [togglingFlag, setTogglingFlag] = useState<string | null>(null);

  const [planLimits, setPlanLimits] = useState<PlanLimit[]>([]);
  const [planLimitsLoading, setPlanLimitsLoading] = useState(true);
  const [editingPlan, setEditingPlan] = useState<string | null>(null);
  const [planEdits, setPlanEdits] = useState<Record<string, Partial<PlanLimit>>>({});
  const [savingPlan, setSavingPlan] = useState<string | null>(null);

  const flash = (msg: string) => {
    setMessage(msg);
    setTimeout(() => setMessage(""), 3500);
  };

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const [{ data: settings }, { count }] = await Promise.all([
        supabase.from("admin_settings").select("key, value").eq("key", "maintenance_mode").single(),
        supabase.from("search_cache").select("*", { count: "exact", head: true }),
      ]);
      setMaintenanceMode((settings as AdminSetting | null)?.value === "true");
      setCacheCount(count || 0);
      setLoading(false);
    }
    load();
  }, []);

  useEffect(() => {
    fetch("/api/admin/settings/feature-flags")
      .then((r) => r.json())
      .then((d) => { setFlags(d.flags || []); setFlagsLoading(false); })
      .catch(() => setFlagsLoading(false));
  }, []);

  useEffect(() => {
    fetch("/api/admin/settings/plan-limits")
      .then((r) => r.json())
      .then((d) => { setPlanLimits(d.limits || []); setPlanLimitsLoading(false); })
      .catch(() => setPlanLimitsLoading(false));
  }, []);

  async function toggleMaintenance() {
    setSaving(true);
    const supabase = createClient();
    const newValue = !maintenanceMode;
    await supabase.from("admin_settings").upsert({
      key: "maintenance_mode",
      value: newValue ? "true" : "false",
      updated_at: new Date().toISOString(),
    } as AdminSetting);
    setMaintenanceMode(newValue);
    setSaving(false);
    flash(`Maintenance mode ${newValue ? "enabled" : "disabled"}`);
  }

  async function clearCache() {
    if (!confirm("Clear all search cache? The next scans will be slower.")) return;
    setClearing(true);
    const supabase = createClient();
    await supabase.from("search_cache").delete().gte("id", "0");
    setCacheCount(0);
    setClearing(false);
    flash("Cache cleared");
  }

  async function toggleFlag(flag: FeatureFlag) {
    setTogglingFlag(flag.key);
    await fetch("/api/admin/settings/feature-flags", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key: flag.key, is_enabled: !flag.is_enabled }),
    });
    setFlags((prev) => prev.map((f) => f.key === flag.key ? { ...f, is_enabled: !f.is_enabled } : f));
    setTogglingFlag(null);
    flash(`${flag.label} ${!flag.is_enabled ? "enabled" : "disabled"}`);
  }

  async function savePlanLimits(plan: string) {
    const edits = planEdits[plan];
    if (!edits) return;
    setSavingPlan(plan);
    await fetch("/api/admin/settings/plan-limits", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ plan, ...edits }),
    });
    setPlanLimits((prev) => prev.map((p) => p.plan === plan ? { ...p, ...edits } : p));
    setPlanEdits((prev) => { const next = { ...prev }; delete next[plan]; return next; });
    setEditingPlan(null);
    setSavingPlan(null);
    flash(`${plan} plan limits saved`);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-6 h-6 animate-spin text-[#555555]" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl">
      <div className="mb-8">
        <h1 className="font-display font-bold text-2xl text-white mb-1">Platform Settings</h1>
        <p className="text-[#555555] text-sm">Global configuration, feature flags, and plan limits</p>
      </div>

      {message && (
        <div className="bg-[#22C55E]/10 border border-[#22C55E]/20 text-[#22C55E] text-sm rounded-badge px-4 py-3 mb-6">
          {message}
        </div>
      )}

      {/* Maintenance Mode */}
      <div className="bg-[#111111] border border-[#1E1E1E] rounded-card p-6 mb-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-semibold text-white text-sm mb-1">Maintenance Mode</h2>
            <p className="text-[#555555] text-xs">Shows maintenance page to all non-admin users</p>
          </div>
          <button onClick={toggleMaintenance} disabled={saving} className="flex items-center gap-2 min-h-[44px]">
            {saving ? (
              <Loader2 className="w-5 h-5 animate-spin text-[#555555]" />
            ) : maintenanceMode ? (
              <><ToggleRight className="w-7 h-7 text-[#FF3B3B]" /><span className="text-[#FF3B3B] text-xs font-medium">ON</span></>
            ) : (
              <><ToggleLeft className="w-7 h-7 text-[#555555]" /><span className="text-[#555555] text-xs font-medium">OFF</span></>
            )}
          </button>
        </div>
      </div>

      {/* Cache */}
      <div className="bg-[#111111] border border-[#1E1E1E] rounded-card p-6 mb-4">
        <div className="flex items-center gap-2 mb-4">
          <Server className="w-4 h-4 text-[#FFD200]" />
          <h2 className="font-semibold text-white text-sm">Search Cache</h2>
        </div>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[#999999] text-sm">
              <span className="text-white font-mono-stats font-bold text-xl">{cacheCount ?? "—"}</span>{" "}
              cached niche scans
            </p>
            <p className="text-[#555555] text-xs mt-1">Cache speeds up repeat searches. Use Cache Manager for full control.</p>
          </div>
          <button
            onClick={clearCache}
            disabled={clearing || cacheCount === 0}
            className="flex items-center gap-2 bg-[#FF3B3B]/10 border border-[#FF3B3B]/20 text-[#FF3B3B] text-sm px-4 py-2 rounded-btn hover:bg-[#FF3B3B]/20 transition-colors disabled:opacity-40 min-h-[44px]"
          >
            {clearing ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Trash2 className="w-4 h-4" /> Clear Cache</>}
          </button>
        </div>
      </div>

      {/* Feature Flags */}
      <div className="bg-[#111111] border border-[#1E1E1E] rounded-card p-6 mb-4">
        <div className="flex items-center gap-2 mb-4">
          <Zap className="w-4 h-4 text-[#FFD200]" />
          <h2 className="font-semibold text-white text-sm">Feature Flags</h2>
        </div>
        {flagsLoading ? (
          <div className="flex items-center gap-2 text-[#555555] text-sm py-2">
            <Loader2 className="w-4 h-4 animate-spin" /> Loading flags…
          </div>
        ) : flags.length === 0 ? (
          <p className="text-[#555555] text-sm">No flags found. Run ADMIN_MIGRATIONS.sql to seed defaults.</p>
        ) : (
          <div className="space-y-3">
            {flags.map((flag) => (
              <div key={flag.key} className="flex items-center justify-between py-1">
                <div className="flex-1 min-w-0 mr-4">
                  <p className="text-white text-sm font-medium">{flag.label}</p>
                  {flag.description && <p className="text-[#555555] text-xs mt-0.5">{flag.description}</p>}
                </div>
                <button
                  onClick={() => toggleFlag(flag)}
                  disabled={togglingFlag === flag.key}
                  className="flex items-center gap-1.5 shrink-0"
                >
                  {togglingFlag === flag.key ? (
                    <Loader2 className="w-5 h-5 animate-spin text-[#555555]" />
                  ) : flag.is_enabled ? (
                    <><ToggleRight className="w-7 h-7 text-[#22C55E]" /><span className="text-[#22C55E] text-xs font-medium w-6">ON</span></>
                  ) : (
                    <><ToggleLeft className="w-7 h-7 text-[#555555]" /><span className="text-[#555555] text-xs font-medium w-6">OFF</span></>
                  )}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Plan Limits */}
      <div className="bg-[#111111] border border-[#1E1E1E] rounded-card p-6 mb-4">
        <div className="flex items-center gap-2 mb-4">
          <CreditCard className="w-4 h-4 text-[#FFD200]" />
          <h2 className="font-semibold text-white text-sm">Plan Limits</h2>
        </div>
        {planLimitsLoading ? (
          <div className="flex items-center gap-2 text-[#555555] text-sm py-2">
            <Loader2 className="w-4 h-4 animate-spin" /> Loading limits…
          </div>
        ) : planLimits.length === 0 ? (
          <p className="text-[#555555] text-sm">No plan limits found. Run ADMIN_MIGRATIONS.sql to seed defaults.</p>
        ) : (
          <div className="space-y-4">
            {planLimits.map((pl) => {
              const isEditing = editingPlan === pl.plan;
              const edits = planEdits[pl.plan] || {};
              const val = (field: keyof PlanLimit) =>
                field in edits ? String(edits[field]) : String(pl[field]);
              const setEdit = (field: keyof PlanLimit, value: string) =>
                setPlanEdits((prev) => ({ ...prev, [pl.plan]: { ...prev[pl.plan], [field]: Number(value) } }));

              return (
                <div key={pl.plan} className="border border-[#1E1E1E] rounded-btn p-4">
                  <div className="flex items-center justify-between mb-3">
                    <span className="font-bold text-sm capitalize" style={{ color: PLAN_COLORS[pl.plan] || "#999999" }}>
                      {pl.plan}
                    </span>
                    {isEditing ? (
                      <div className="flex gap-2">
                        <button
                          onClick={() => savePlanLimits(pl.plan)}
                          disabled={savingPlan === pl.plan}
                          className="text-xs bg-[#FFD200] text-[#080808] font-bold px-3 py-1.5 rounded-btn hover:bg-[#FFE033] transition-colors disabled:opacity-40"
                        >
                          {savingPlan === pl.plan ? <Loader2 className="w-3 h-3 animate-spin" /> : "Save"}
                        </button>
                        <button onClick={() => { setEditingPlan(null); setPlanEdits((p) => { const n = { ...p }; delete n[pl.plan]; return n; }); }} className="text-xs text-[#555555] hover:text-white transition-colors px-2">
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <button onClick={() => setEditingPlan(pl.plan)} className="text-xs text-[#555555] hover:text-white border border-[#1E1E1E] rounded-btn px-3 py-1.5 transition-colors">
                        Edit
                      </button>
                    )}
                  </div>
                  <div className="grid grid-cols-3 gap-3 text-xs">
                    {(["daily_scans", "monthly_scans", "channels", "ai_scripts", "bulk_limit"] as (keyof PlanLimit)[]).map((field) => (
                      <div key={field}>
                        <p className="text-[#555555] mb-1 capitalize">{field.replace(/_/g, " ")}</p>
                        {isEditing ? (
                          <input
                            type="number"
                            value={val(field)}
                            onChange={(e) => setEdit(field, e.target.value)}
                            className="w-full bg-[#0A0A0A] border border-[#1E1E1E] rounded px-2 py-1 text-white focus:outline-none focus:border-[#FFD200] transition-colors"
                          />
                        ) : (
                          <p className="text-white font-mono-stats font-bold">{pl[field].toLocaleString()}</p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* API Key Pool */}
      <div className="bg-[#111111] border border-[#1E1E1E] rounded-card p-6">
        <h2 className="font-semibold text-white text-sm mb-4">Platform API Key Pool (Pro/Agency)</h2>
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((n) => {
            const hasKey = !!process.env[`YOUTUBE_API_KEY_${n}`];
            return (
              <div key={n} className="flex items-center justify-between text-sm">
                <span className="text-[#999999]">API Key #{n}</span>
                <span className={`text-xs font-medium px-2 py-1 rounded-badge ${hasKey ? "bg-[#22C55E]/10 text-[#22C55E]" : "bg-[#333333] text-[#555555]"}`}>
                  {hasKey ? "Configured" : "Not set"}
                </span>
              </div>
            );
          })}
        </div>
        <p className="text-[#555555] text-xs mt-4">Configure in environment variables.</p>
      </div>
    </div>
  );
}
