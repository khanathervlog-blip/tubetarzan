"use client";

import { useState, useEffect, useCallback } from "react";
import { Shield, AlertTriangle, CheckCircle, XCircle, Loader2, RefreshCw, User } from "lucide-react";

interface SecurityEvent {
  id: string;
  created_at: string;
  user_id: string;
  event_type: string;
  severity: "low" | "medium" | "high" | "critical";
  details: Record<string, unknown>;
  ip_address: string | null;
  is_resolved: boolean;
  action_taken: string | null;
  profiles?: { email: string; security_risk_score: number; is_suspended: boolean } | null;
}

const SEVERITY_COLORS: Record<string, string> = {
  low: "#22C55E",
  medium: "#FFD200",
  high: "#FF8C00",
  critical: "#FF3B3B",
};

export default function SecurityPage() {
  const [events, setEvents] = useState<SecurityEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [resolving, setResolving] = useState<string | null>(null);
  const [suspending, setSuspending] = useState<string | null>(null);
  const [message, setMessage] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/security-events/list");
      if (res.ok) {
        const data = await res.json();
        setEvents(data.events || []);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function resolveEvent(id: string) {
    setResolving(id);
    await fetch(`/api/admin/security-events/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action_taken: "Reviewed and resolved by admin" }),
    });
    setMessage("Event resolved");
    setTimeout(() => setMessage(""), 3000);
    load();
    setResolving(null);
  }

  async function suspendUser(userId: string) {
    setSuspending(userId);
    await fetch(`/api/admin/users/${userId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "suspend", reason: "Security violation" }),
    });
    setMessage("User suspended");
    setTimeout(() => setMessage(""), 3000);
    load();
    setSuspending(null);
  }

  async function resetRisk(userId: string) {
    await fetch(`/api/admin/users/${userId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "reset_risk" }),
    });
    setMessage("Risk score reset");
    setTimeout(() => setMessage(""), 3000);
    load();
  }

  const open = events.filter((e) => !e.is_resolved);
  const bySeverity = (s: string) => open.filter((e) => e.severity === s);
  const critical = bySeverity("critical");
  const high = bySeverity("high");
  const medium = bySeverity("medium");
  const low = bySeverity("low");

  return (
    <div className="max-w-5xl">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="font-display font-bold text-2xl text-white mb-1 flex items-center gap-2">
            <Shield className="w-6 h-6 text-[#FF3B3B]" /> Security Center
          </h1>
          <p className="text-[#555555] text-sm">Monitor and respond to security events</p>
        </div>
        <button onClick={load} className="flex items-center gap-2 text-[#555555] hover:text-white text-sm transition-colors">
          <RefreshCw className="w-4 h-4" /> Refresh
        </button>
      </div>

      {message && (
        <div className="bg-[#22C55E]/10 border border-[#22C55E]/20 text-[#22C55E] text-sm rounded-card px-4 py-3 mb-6">
          {message}
        </div>
      )}

      {/* Risk overview */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[
          { label: "Critical", count: critical.length, color: "#FF3B3B" },
          { label: "High", count: high.length, color: "#FF8C00" },
          { label: "Medium", count: medium.length, color: "#FFD200" },
          { label: "Low", count: low.length, color: "#22C55E" },
        ].map((s) => (
          <div key={s.label} className="bg-[#111111] border border-[#1E1E1E] rounded-card p-4 text-center">
            <p className="text-[#555555] text-xs mb-1">{s.label}</p>
            <p className="font-mono-stats font-bold text-2xl" style={{ color: s.color }}>{s.count}</p>
          </div>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-40">
          <Loader2 className="w-6 h-6 animate-spin text-[#555555]" />
        </div>
      ) : open.length === 0 ? (
        <div className="bg-[#111111] border border-[#1E1E1E] rounded-card p-12 text-center">
          <CheckCircle className="w-10 h-10 text-[#22C55E] mx-auto mb-3" />
          <p className="text-white font-semibold">No active security events</p>
          <p className="text-[#555555] text-sm mt-1">All clear</p>
        </div>
      ) : (
        <div className="space-y-3">
          {open
            .sort((a, b) => {
              const order = { critical: 0, high: 1, medium: 2, low: 3 };
              return (order[a.severity] || 3) - (order[b.severity] || 3);
            })
            .map((event) => (
              <div
                key={event.id}
                className="bg-[#111111] border border-[#1E1E1E] rounded-card p-5"
                style={{ borderLeftColor: SEVERITY_COLORS[event.severity], borderLeftWidth: 3 }}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span
                        className="text-xs font-bold px-2 py-0.5 rounded-badge uppercase"
                        style={{
                          color: SEVERITY_COLORS[event.severity],
                          background: `${SEVERITY_COLORS[event.severity]}15`,
                        }}
                      >
                        {event.severity}
                      </span>
                      <span className="text-white text-sm font-medium">{event.event_type.replace(/_/g, " ")}</span>
                    </div>
                    <div className="flex items-center gap-2 text-[#555555] text-xs mb-2">
                      <User className="w-3 h-3" />
                      <span>{event.profiles?.email || event.user_id?.slice(0, 8) + "…"}</span>
                      {event.profiles?.security_risk_score !== undefined && (
                        <span className="text-[#FF3B3B]">Risk: {event.profiles.security_risk_score}/100</span>
                      )}
                      <span>{new Date(event.created_at).toLocaleString()}</span>
                    </div>
                    {event.details && Object.keys(event.details).length > 0 && (
                      <div className="text-[#555555] text-xs bg-[#080808] rounded-btn px-3 py-2">
                        {Object.entries(event.details).map(([k, v]) => (
                          <span key={k} className="mr-3">
                            <span className="text-[#999999]">{k}:</span> {String(v)}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="flex flex-col gap-2 shrink-0">
                    <button
                      onClick={() => resolveEvent(event.id)}
                      disabled={resolving === event.id}
                      className="flex items-center gap-1.5 text-xs bg-[#22C55E]/10 border border-[#22C55E]/20 text-[#22C55E] px-3 py-1.5 rounded-btn hover:bg-[#22C55E]/20 transition-colors disabled:opacity-50"
                    >
                      {resolving === event.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle className="w-3 h-3" />}
                      Resolve
                    </button>
                    {event.user_id && !event.profiles?.is_suspended && (
                      <button
                        onClick={() => suspendUser(event.user_id)}
                        disabled={suspending === event.user_id}
                        className="flex items-center gap-1.5 text-xs bg-[#FF3B3B]/10 border border-[#FF3B3B]/20 text-[#FF3B3B] px-3 py-1.5 rounded-btn hover:bg-[#FF3B3B]/20 transition-colors disabled:opacity-50"
                      >
                        {suspending === event.user_id ? <Loader2 className="w-3 h-3 animate-spin" /> : <XCircle className="w-3 h-3" />}
                        Suspend
                      </button>
                    )}
                    {event.user_id && (
                      <button
                        onClick={() => resetRisk(event.user_id)}
                        className="flex items-center gap-1.5 text-xs bg-[#1E1E1E] text-[#555555] px-3 py-1.5 rounded-btn hover:text-white transition-colors"
                      >
                        <AlertTriangle className="w-3 h-3" /> Reset Risk
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
        </div>
      )}

      {events.filter((e) => e.is_resolved).length > 0 && (
        <div className="mt-8">
          <p className="text-[#333333] text-xs font-bold uppercase tracking-widest mb-3">
            Resolved ({events.filter((e) => e.is_resolved).length})
          </p>
          <div className="space-y-2">
            {events
              .filter((e) => e.is_resolved)
              .slice(0, 10)
              .map((event) => (
                <div key={event.id} className="bg-[#0A0A0A] border border-[#1E1E1E] rounded-card px-4 py-3 flex items-center gap-3">
                  <CheckCircle className="w-4 h-4 text-[#22C55E] shrink-0" />
                  <span className="text-[#555555] text-xs flex-1">
                    {event.event_type.replace(/_/g, " ")} · {event.profiles?.email || "Unknown"}
                  </span>
                  {event.action_taken && (
                    <span className="text-[#333333] text-xs">{event.action_taken}</span>
                  )}
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}
