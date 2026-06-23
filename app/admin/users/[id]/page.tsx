"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { ArrowLeft, Shield, ShieldOff, RotateCcw, Loader2, Save, AlertTriangle } from "lucide-react";

interface UserProfile {
  id: string;
  email: string;
  subscription_plan: string;
  subscription_status: string | null;
  created_at: string;
  scans_today: number;
  security_risk_score: number;
  is_suspended: boolean;
  suspension_reason: string | null;
  is_test_account: boolean;
  notes_internal: string | null;
  rate_limit_override: number | null;
  quota_override: number | null;
}

interface SecurityEvent {
  id: string;
  created_at: string;
  event_type: string;
  severity: string;
  is_resolved: boolean;
}

const SEVERITY_COLORS: Record<string, string> = {
  critical: "#FF3B3B",
  high: "#FF6B35",
  medium: "#FFD200",
  low: "#555555",
};

const PLAN_COLORS: Record<string, string> = {
  free: "#555555",
  creator: "#FFD200",
  pro: "#22C55E",
  agency: "#3B82F6",
};

export default function UserDetailPage({ params }: { params: { id: string } }) {
  const { id } = params;
  const [user, setUser] = useState<UserProfile | null>(null);
  const [events, setEvents] = useState<SecurityEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [notes, setNotes] = useState("");
  const [rateOverride, setRateOverride] = useState("");
  const [quotaOverride, setQuotaOverride] = useState("");
  const [planOverride, setPlanOverride] = useState("free");
  const [message, setMessage] = useState<{ text: string; ok: boolean } | null>(null);

  const flash = (text: string, ok = true) => {
    setMessage({ text, ok });
    setTimeout(() => setMessage(null), 4000);
  };

  const load = useCallback(async () => {
    setLoading(true);
    const [userRes, eventsRes] = await Promise.all([
      fetch(`/api/admin/users/${id}`),
      fetch(`/api/admin/security-events/list?userId=${id}`),
    ]);
    if (userRes.ok) {
      const data = await userRes.json();
      const u = data.user as UserProfile;
      setUser(u);
      setNotes(u.notes_internal || "");
      setRateOverride(u.rate_limit_override?.toString() || "");
      setQuotaOverride(u.quota_override?.toString() || "");
      setPlanOverride(u.subscription_plan || "free");
    }
    if (eventsRes.ok) {
      const data = await eventsRes.json();
      setEvents((data.events || []).slice(0, 10));
    }
    setLoading(false);
  }, [id]);

  useEffect(() => { load(); }, [load]);

  const patchUser = async (body: Record<string, unknown>, label: string) => {
    setSaving(label);
    const res = await fetch(`/api/admin/users/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    setSaving(null);
    if (res.ok) { flash("Saved"); load(); }
    else { const d = await res.json(); flash(d.error || "Error saving", false); }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-6 h-6 animate-spin text-[#555555]" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="max-w-3xl">
        <Link href="/admin/users" className="flex items-center gap-1.5 text-[#555555] hover:text-white text-sm mb-6 transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back to Users
        </Link>
        <p className="text-[#FF3B3B] text-sm">User not found.</p>
      </div>
    );
  }

  const riskColor = user.security_risk_score >= 80
    ? "#FF3B3B"
    : user.security_risk_score >= 40
    ? "#FFD200"
    : "#22C55E";

  return (
    <div className="max-w-3xl">
      <Link href="/admin/users" className="flex items-center gap-1.5 text-[#555555] hover:text-white text-sm mb-6 transition-colors">
        <ArrowLeft className="w-4 h-4" /> Back to Users
      </Link>

      {message && (
        <div className={`mb-5 text-sm rounded-badge px-4 py-3 ${message.ok ? "bg-[#22C55E]/10 border border-[#22C55E]/20 text-[#22C55E]" : "bg-[#FF3B3B]/10 border border-[#FF3B3B]/20 text-[#FF3B3B]"}`}>
          {message.text}
        </div>
      )}

      {/* Header card */}
      <div className="bg-[#111111] border border-[#1E1E1E] rounded-card p-5 mb-4">
        <div className="flex items-start justify-between mb-4">
          <div>
            <p className="text-white font-semibold">{user.email}</p>
            <p className="text-[#333333] text-xs mt-0.5 font-mono-stats">{user.id}</p>
            <p className="text-[#555555] text-xs mt-1">Joined {new Date(user.created_at).toLocaleDateString()}</p>
          </div>
          <div className="flex items-center gap-2">
            {user.is_test_account && (
              <span className="text-[10px] px-2 py-1 rounded bg-[#FFD200]/10 text-[#FFD200] font-bold">TEST</span>
            )}
            {user.is_suspended ? (
              <span className="text-[10px] px-2 py-1 rounded bg-[#FF3B3B]/10 text-[#FF3B3B] font-bold">SUSPENDED</span>
            ) : (
              <span className="text-[10px] px-2 py-1 rounded bg-[#22C55E]/10 text-[#22C55E] font-bold">ACTIVE</span>
            )}
          </div>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-[#0A0A0A] rounded-btn p-3 text-center">
            <p className="text-[#555555] text-xs mb-1">Plan</p>
            <p className="font-bold text-sm capitalize" style={{ color: PLAN_COLORS[user.subscription_plan] || "#999999" }}>
              {user.subscription_plan}
            </p>
          </div>
          <div className="bg-[#0A0A0A] rounded-btn p-3 text-center">
            <p className="text-[#555555] text-xs mb-1">Risk Score</p>
            <p className="font-mono-stats font-bold text-xl" style={{ color: riskColor }}>
              {user.security_risk_score || 0}
            </p>
          </div>
          <div className="bg-[#0A0A0A] rounded-btn p-3 text-center">
            <p className="text-[#555555] text-xs mb-1">Scans Today</p>
            <p className="font-mono-stats font-bold text-xl text-white">{user.scans_today || 0}</p>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="bg-[#111111] border border-[#1E1E1E] rounded-card p-5 mb-4">
        <h2 className="font-semibold text-white text-sm mb-3">Actions</h2>
        <div className="flex flex-wrap gap-2">
          {user.is_suspended ? (
            <button
              onClick={() => patchUser({ action: "unsuspend" }, "unsuspend")}
              disabled={!!saving}
              className="flex items-center gap-1.5 px-3 py-2 bg-[#22C55E]/10 border border-[#22C55E]/20 text-[#22C55E] text-sm rounded-btn hover:bg-[#22C55E]/20 transition-colors disabled:opacity-40"
            >
              {saving === "unsuspend" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Shield className="w-3.5 h-3.5" />}
              Unsuspend
            </button>
          ) : (
            <button
              onClick={() => { if (confirm("Suspend this user? They will be unable to use the platform.")) patchUser({ action: "suspend", reason: "Suspended by admin" }, "suspend"); }}
              disabled={!!saving}
              className="flex items-center gap-1.5 px-3 py-2 bg-[#FF3B3B]/10 border border-[#FF3B3B]/20 text-[#FF3B3B] text-sm rounded-btn hover:bg-[#FF3B3B]/20 transition-colors disabled:opacity-40"
            >
              {saving === "suspend" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ShieldOff className="w-3.5 h-3.5" />}
              Suspend
            </button>
          )}
          <button
            onClick={() => patchUser({ action: "reset_risk" }, "reset_risk")}
            disabled={!!saving || !user.security_risk_score}
            className="flex items-center gap-1.5 px-3 py-2 bg-[#111111] border border-[#1E1E1E] text-[#999999] text-sm rounded-btn hover:border-[#333333] hover:text-white transition-colors disabled:opacity-40"
          >
            {saving === "reset_risk" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RotateCcw className="w-3.5 h-3.5" />}
            Reset Risk Score
          </button>
        </div>
        {user.is_suspended && user.suspension_reason && (
          <p className="mt-3 text-[#FF3B3B] text-xs flex items-center gap-1.5">
            <AlertTriangle className="w-3.5 h-3.5" /> {user.suspension_reason}
          </p>
        )}
      </div>

      {/* Plan override */}
      <div className="bg-[#111111] border border-[#1E1E1E] rounded-card p-5 mb-4">
        <h2 className="font-semibold text-white text-sm mb-3">Plan Override</h2>
        <div className="flex items-center gap-3">
          <select
            value={planOverride}
            onChange={(e) => setPlanOverride(e.target.value)}
            className="bg-[#0A0A0A] border border-[#1E1E1E] rounded-btn px-3 py-2 text-sm text-white focus:outline-none focus:border-[#FFD200] transition-colors"
          >
            <option value="free">Free</option>
            <option value="creator">Creator ($9/mo)</option>
            <option value="pro">Pro ($25/mo)</option>
            <option value="agency">Agency ($99/mo)</option>
          </select>
          <button
            onClick={() => patchUser({ subscription_plan: planOverride }, "plan")}
            disabled={!!saving || planOverride === user.subscription_plan}
            className="flex items-center gap-1.5 px-3 py-2 bg-[#FFD200] text-[#080808] font-bold text-sm rounded-btn hover:bg-[#FFE033] transition-colors disabled:opacity-40"
          >
            {saving === "plan" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
            Set Plan
          </button>
        </div>
      </div>

      {/* Quota & rate overrides */}
      <div className="bg-[#111111] border border-[#1E1E1E] rounded-card p-5 mb-4">
        <h2 className="font-semibold text-white text-sm mb-3">Quota & Rate Override</h2>
        <p className="text-[#555555] text-xs mb-3">Leave blank to use plan defaults. Overrides apply instantly.</p>
        <div className="grid grid-cols-2 gap-4 mb-3">
          <div>
            <label className="text-[#555555] text-xs block mb-1.5">Daily Quota Override</label>
            <input
              type="number"
              value={quotaOverride}
              onChange={(e) => setQuotaOverride(e.target.value)}
              placeholder="Plan default"
              className="w-full bg-[#0A0A0A] border border-[#1E1E1E] rounded-btn px-3 py-2 text-sm text-white focus:outline-none focus:border-[#FFD200] transition-colors"
            />
          </div>
          <div>
            <label className="text-[#555555] text-xs block mb-1.5">Rate Limit Override (req/min)</label>
            <input
              type="number"
              value={rateOverride}
              onChange={(e) => setRateOverride(e.target.value)}
              placeholder="Plan default"
              className="w-full bg-[#0A0A0A] border border-[#1E1E1E] rounded-btn px-3 py-2 text-sm text-white focus:outline-none focus:border-[#FFD200] transition-colors"
            />
          </div>
        </div>
        <button
          onClick={() => patchUser({
            quota_override: quotaOverride ? Number(quotaOverride) : null,
            rate_limit_override: rateOverride ? Number(rateOverride) : null,
          }, "quota")}
          disabled={!!saving}
          className="flex items-center gap-1.5 px-3 py-2 bg-[#FFD200] text-[#080808] font-bold text-sm rounded-btn hover:bg-[#FFE033] transition-colors disabled:opacity-40"
        >
          {saving === "quota" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
          Save Overrides
        </button>
      </div>

      {/* Internal notes */}
      <div className="bg-[#111111] border border-[#1E1E1E] rounded-card p-5 mb-4">
        <h2 className="font-semibold text-white text-sm mb-3">Internal Notes</h2>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={4}
          placeholder="Admin-only notes — never visible to the user…"
          className="w-full bg-[#0A0A0A] border border-[#1E1E1E] rounded-btn px-3 py-2 text-sm text-white placeholder-[#333333] focus:outline-none focus:border-[#FFD200] transition-colors resize-none mb-3"
        />
        <button
          onClick={() => patchUser({ notes_internal: notes }, "notes")}
          disabled={!!saving}
          className="flex items-center gap-1.5 px-3 py-2 bg-[#FFD200] text-[#080808] font-bold text-sm rounded-btn hover:bg-[#FFE033] transition-colors disabled:opacity-40"
        >
          {saving === "notes" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
          Save Notes
        </button>
      </div>

      {/* Recent security events */}
      {events.length > 0 && (
        <div className="bg-[#111111] border border-[#1E1E1E] rounded-card overflow-hidden">
          <div className="px-5 py-3 border-b border-[#1E1E1E] flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-[#FFD200]" />
            <p className="text-white text-sm font-semibold">Recent Security Events</p>
          </div>
          <div className="divide-y divide-[#1E1E1E]">
            {events.map((ev) => (
              <div key={ev.id} className="px-5 py-3 flex items-center gap-3">
                <div
                  className="w-2 h-2 rounded-full shrink-0"
                  style={{ background: SEVERITY_COLORS[ev.severity] || "#555555" }}
                />
                <div className="flex-1 min-w-0">
                  <p className="text-white text-xs font-medium capitalize">
                    {ev.event_type.replace(/_/g, " ")}
                  </p>
                  <p className="text-[#555555] text-xs">{new Date(ev.created_at).toLocaleString()}</p>
                </div>
                <span
                  className="text-xs px-1.5 py-0.5 rounded-badge capitalize font-medium shrink-0"
                  style={{ color: SEVERITY_COLORS[ev.severity] || "#555555", background: `${SEVERITY_COLORS[ev.severity] || "#555555"}15` }}
                >
                  {ev.severity}
                </span>
                {ev.is_resolved && <span className="text-[#22C55E] text-xs shrink-0">✓</span>}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
