"use client";

import { useState, useCallback } from "react";
import { Server, CheckCircle, XCircle, AlertTriangle, Loader2, RefreshCw, Cpu } from "lucide-react";

const RAILWAY_SERVICES = [
  { name: "FFmpeg (video assembly)", desc: "Renders, B-roll assembly, video editing" },
  { name: "Pattern Analyzer", desc: "yt-dlp + PySceneDetect for viral pattern detection" },
  { name: "MuseTalk (lip sync)", desc: "Primary lip sync model — requires GPU (Railway Pro)" },
  { name: "Wav2Lip (lip sync fallback)", desc: "CPU-capable fallback when GPU unavailable" },
  { name: "faster-whisper (captions)", desc: "Word-level transcription in 96+ languages" },
];

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

      {/* Railway Microservices breakdown */}
      <div className="mt-6 bg-[#111111] border border-[#1E1E1E] rounded-card overflow-hidden">
        <div className="px-5 py-3 border-b border-[#1E1E1E] flex items-center gap-2">
          <Cpu className="w-4 h-4 text-[#FFD200]" />
          <p className="text-white text-sm font-semibold">Railway Microservice — Deployed Services</p>
        </div>
        <div className="divide-y divide-[#1E1E1E]">
          {RAILWAY_SERVICES.map((svc) => {
            const railwayService = services.find((s) => s.name === "Railway (FFmpeg)");
            const isUp = railwayService?.status === "ok";
            const isDown = railwayService?.status === "down";
            return (
              <div key={svc.name} className="px-5 py-3 flex items-center gap-4">
                {services.length === 0 ? (
                  <div className="w-2 h-2 rounded-full bg-[#333333]" />
                ) : isUp ? (
                  <div className="w-2 h-2 rounded-full bg-[#22C55E]" />
                ) : isDown ? (
                  <div className="w-2 h-2 rounded-full bg-[#FF3B3B]" />
                ) : (
                  <div className="w-2 h-2 rounded-full bg-[#FFD200]" />
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-white text-sm">{svc.name}</p>
                  <p className="text-[#555555] text-xs">{svc.desc}</p>
                </div>
                <span className="text-xs text-[#333333]">
                  {services.length === 0 ? "—" : isUp ? "active" : isDown ? "unreachable" : "degraded"}
                </span>
              </div>
            );
          })}
        </div>
        <div className="px-5 py-3 border-t border-[#1E1E1E] bg-[#0A0A0A]">
          <p className="text-[#555555] text-xs">
            All services run on the same Railway container. GPU (MuseTalk) requires Railway Pro plan.
            Status reflects the Railway (FFmpeg) health ping above.
          </p>
        </div>
      </div>
    </div>
  );
}
