"use client";

import { useState, useEffect, useCallback } from "react";
import { Database, Trash2, Loader2, RefreshCw } from "lucide-react";

interface CacheCounts {
  search_cache: number;
  claude_ideas: number;
  transcripts: number;
}

const CACHES = [
  {
    key: "search",
    label: "YouTube Search Cache",
    desc: "Cached niche scan results (12hr TTL). Clears to force fresh YouTube API calls.",
    countKey: "search_cache" as keyof CacheCounts,
    color: "#FF3B3B",
  },
  {
    key: "claude",
    label: "Claude Ideas Cache",
    desc: "Cached AI-generated idea sets per niche (24hr TTL). Clears to force new Claude calls.",
    countKey: "claude_ideas" as keyof CacheCounts,
    color: "#FFD200",
  },
  {
    key: "transcripts",
    label: "Transcript Cache",
    desc: "Cached video transcripts (30-day TTL). Large storage — clear only if needed.",
    countKey: "transcripts" as keyof CacheCounts,
    color: "#22C55E",
  },
];

export default function CachePage() {
  const [counts, setCounts] = useState<CacheCounts | null>(null);
  const [loading, setLoading] = useState(true);
  const [clearing, setClearing] = useState<string | null>(null);
  const [message, setMessage] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/cache");
      if (res.ok) setCounts(await res.json());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function clearCache(type: string) {
    if (!confirm(`Clear ${type} cache? This cannot be undone.`)) return;
    setClearing(type);
    await fetch("/api/admin/cache", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type }),
    });
    setMessage(`${type} cache cleared`);
    setTimeout(() => setMessage(""), 3000);
    load();
    setClearing(null);
  }

  const total = counts ? counts.search_cache + counts.claude_ideas + counts.transcripts : 0;

  return (
    <div className="max-w-2xl">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="font-display font-bold text-2xl text-white mb-1 flex items-center gap-2">
            <Database className="w-6 h-6 text-[#FFD200]" /> Cache Manager
          </h1>
          <p className="text-[#555555] text-sm">
            {loading ? "Loading…" : `${total.toLocaleString()} total cached entries`}
          </p>
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

      {loading ? (
        <div className="flex items-center justify-center h-32">
          <Loader2 className="w-5 h-5 animate-spin text-[#555555]" />
        </div>
      ) : (
        <div className="space-y-4">
          {CACHES.map((cache) => (
            <div key={cache.key} className="bg-[#111111] border border-[#1E1E1E] rounded-card p-5">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-1">
                    <p className="text-white text-sm font-semibold">{cache.label}</p>
                    <span className="font-mono-stats font-bold text-sm" style={{ color: cache.color }}>
                      {(counts?.[cache.countKey] ?? 0).toLocaleString()}
                    </span>
                    <span className="text-[#555555] text-xs">entries</span>
                  </div>
                  <p className="text-[#555555] text-xs">{cache.desc}</p>
                </div>
                <button
                  onClick={() => clearCache(cache.key)}
                  disabled={clearing === cache.key || (counts?.[cache.countKey] ?? 0) === 0}
                  className="flex items-center gap-1.5 text-xs bg-[#FF3B3B]/10 border border-[#FF3B3B]/20 text-[#FF3B3B] px-3 py-2 rounded-btn hover:bg-[#FF3B3B]/20 transition-colors disabled:opacity-40 shrink-0"
                >
                  {clearing === cache.key ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
                  Clear
                </button>
              </div>
            </div>
          ))}

          <div className="bg-[#111111] border border-[#1E1E1E] rounded-card p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white text-sm font-semibold mb-1">Clear All Caches</p>
                <p className="text-[#555555] text-xs">Clears all 3 caches at once. Will trigger real API calls until re-populated.</p>
              </div>
              <button
                onClick={() => clearCache("all")}
                disabled={clearing === "all" || total === 0}
                className="flex items-center gap-1.5 text-xs bg-[#FF3B3B]/10 border border-[#FF3B3B]/20 text-[#FF3B3B] px-4 py-2 rounded-btn hover:bg-[#FF3B3B]/20 transition-colors disabled:opacity-40 shrink-0"
              >
                {clearing === "all" ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
                Clear All
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
