"use client";

import { useState, useCallback } from "react";
import { Server, CheckCircle, XCircle, AlertTriangle, Loader2, RefreshCw } from "lucide-react";

interface ServiceResult {
  name: string;
  status: "ok" | "down" | "degraded";
  ms: number;
  error?: string;
}

const STATUS_CONFIG = {
  ok: { color: "#22C55E", icon: CheckCircle, label: "OK" },
  degraded: { color: "#FFD200", icon: AlertTriangle, label: "Slow" },
  down: { color: "#FF3B3B", icon: XCircle, label: "Down" },
};

export default function SystemPage() {
  const [services, setServices] = useState<ServiceResult[]>([]);
  const [checkedAt, setCheckedAt] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const runCheck = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/system");
      if (res.ok) {
        const data = await res.json();
        setServices(data.services || []);
        setCheckedAt(data.checked_at);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  const okCount = services.filter((s) => s.status === "ok").length;
  const downCount = services.filter((s) => s.status === "down").length;
  const degradedCount = services.filter((s) => s.status === "degraded").length;

  return (
    <div className="max-w-3xl">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="font-display font-bold text-2xl text-white mb-1 flex items-center gap-2">
            <Server className="w-6 h-6 text-[#FFD200]" /> System Health
          </h1>
          <p className="text-[#555555] text-sm">
            {checkedAt ? `Last checked: ${new Date(checkedAt).toLocaleTimeString()}` : "Click check to run live service pings"}
          </p>
        </div>
        <button
          onClick={runCheck}
          disabled={loading}
          className="flex items-center gap-2 bg-[#FFD200] text-[#080808] font-bold px-4 py-2 rounded-btn text-sm hover:bg-[#FFE033] transition-colors disabled:opacity-50"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
          {loading ? "Checking…" : "Check All Services"}
        </button>
      </div>

      {services.length > 0 && (
        <div className="grid grid-cols-3 gap-4 mb-6">
          {[
            { label: "Operational", count: okCount, color: "#22C55E" },
            { label: "Degraded", count: degradedCount, color: "#FFD200" },
            { label: "Down", count: downCount, color: "#FF3B3B" },
          ].map((s) => (
            <div key={s.label} className="bg-[#111111] border border-[#1E1E1E] rounded-card p-4 text-center">
              <p className="text-[#555555] text-xs mb-1">{s.label}</p>
              <p className="font-mono-stats font-bold text-2xl" style={{ color: s.color }}>{s.count}</p>
            </div>
          ))}
        </div>
      )}

      {loading && services.length === 0 ? (
        <div className="bg-[#111111] border border-[#1E1E1E] rounded-card p-12 text-center">
          <Loader2 className="w-8 h-8 animate-spin text-[#555555] mx-auto mb-3" />
          <p className="text-[#555555] text-sm">Pinging all services…</p>
          <p className="text-[#333333] text-xs mt-1">This takes up to 15 seconds</p>
        </div>
      ) : services.length === 0 ? (
        <div className="bg-[#111111] border border-[#1E1E1E] rounded-card p-12 text-center">
          <Server className="w-10 h-10 text-[#333333] mx-auto mb-3" />
          <p className="text-[#555555] text-sm">Click &ldquo;Check All Services&rdquo; to run a live health check</p>
        </div>
      ) : (
        <div className="bg-[#111111] border border-[#1E1E1E] rounded-card overflow-hidden">
          <div className="divide-y divide-[#1E1E1E]">
            {services.map((svc) => {
              const cfg = STATUS_CONFIG[svc.status] || STATUS_CONFIG.down;
              const Icon = cfg.icon;
              return (
                <div key={svc.name} className="px-5 py-4 flex items-center gap-4">
                  <Icon className="w-4 h-4 shrink-0" style={{ color: cfg.color }} />
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-sm font-medium">{svc.name}</p>
                    {svc.error && (
                      <p className="text-[#FF3B3B] text-xs mt-0.5 truncate">{svc.error}</p>
                    )}
                  </div>
                  <div className="text-right shrink-0">
                    <span
                      className="text-xs font-bold px-2 py-0.5 rounded-badge"
                      style={{ color: cfg.color, background: `${cfg.color}15` }}
                    >
                      {cfg.label}
                    </span>
                    {svc.ms > 0 && (
                      <p className="text-[#555555] text-xs mt-1 font-mono-stats">{svc.ms}ms</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
