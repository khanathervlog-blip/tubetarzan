"use client";

import { useState, useEffect } from "react";
import { Bookmark, TrendingUp, Lightbulb, Search, Loader2, Clock, BarChart2 } from "lucide-react";
import Link from "next/link";

interface NicheData {
  niche: string;
  lastSearched: string | null;
  searchCount: number;
  ideaCount: number;
  avgTitleScore: number | null;
  avgVph: number | null;
  topOutlierRatio: number | null;
}

function timeAgo(date: string | null): string {
  if (!date) return "Never";
  const diff = Date.now() - new Date(date).getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days}d ago`;
  if (days < 30) return `${Math.floor(days / 7)}w ago`;
  return `${Math.floor(days / 30)}mo ago`;
}

function formatVph(vph: number | null): string {
  if (!vph) return "—";
  if (vph >= 1000) return `${(vph / 1000).toFixed(1)}k`;
  return vph.toFixed(0);
}

export default function NichesPage() {
  const [niches, setNiches] = useState<NicheData[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("");

  useEffect(() => {
    fetch("/api/niches")
      .then(r => r.json())
      .then(d => setNiches(d.niches || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const filtered = niches.filter(n =>
    n.niche.toLowerCase().includes(filter.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-5 h-5 text-[#555555] animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl">
      <div className="mb-6">
        <h1 className="font-display font-bold text-2xl text-white mb-1 flex items-center gap-2">
          <Bookmark className="w-6 h-6 text-[#FFD200]" />
          Niche Library
        </h1>
        <p className="text-[#555555] text-sm">All niches you&apos;ve explored — click to search again on the Intelligence Board.</p>
      </div>

      {niches.length === 0 ? (
        <div className="bg-[#111111] border border-[#1E1E1E] rounded-card p-10 text-center">
          <Bookmark className="w-10 h-10 text-[#1E1E1E] mx-auto mb-3" />
          <p className="text-white font-semibold mb-1">No niches explored yet</p>
          <p className="text-[#555555] text-sm mb-5">Search a niche on the Intelligence Board to populate your library.</p>
          <Link href="/dashboard" className="inline-flex items-center gap-2 bg-[#FFD200] text-[#080808] font-bold px-4 py-2.5 rounded-btn text-sm hover:bg-[#FFE033]">
            <Search className="w-4 h-4" />Go to Intelligence Board
          </Link>
        </div>
      ) : (
        <>
          {/* Search filter */}
          <div className="relative mb-5">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#555555]" />
            <input
              type="text"
              value={filter}
              onChange={e => setFilter(e.target.value)}
              placeholder="Filter niches..."
              className="w-full pl-10 pr-4 py-2.5 bg-[#111111] border border-[#1E1E1E] text-white placeholder-[#555555] rounded-btn text-sm focus:outline-none focus:border-[#FFD200] transition-colors"
            />
          </div>

          {/* Stats row */}
          <div className="grid grid-cols-3 gap-3 mb-5">
            <div className="bg-[#111111] border border-[#1E1E1E] rounded-card p-4 text-center">
              <p className="font-display font-bold text-xl text-white">{niches.length}</p>
              <p className="text-[#555555] text-xs mt-0.5">Niches explored</p>
            </div>
            <div className="bg-[#111111] border border-[#1E1E1E] rounded-card p-4 text-center">
              <p className="font-display font-bold text-xl text-white">{niches.reduce((a, n) => a + n.ideaCount, 0)}</p>
              <p className="text-[#555555] text-xs mt-0.5">Total ideas saved</p>
            </div>
            <div className="bg-[#111111] border border-[#1E1E1E] rounded-card p-4 text-center">
              <p className="font-display font-bold text-xl text-white">{niches.reduce((a, n) => a + n.searchCount, 0)}</p>
              <p className="text-[#555555] text-xs mt-0.5">Total searches</p>
            </div>
          </div>

          {/* Niche grid */}
          <div className="grid gap-3 md:grid-cols-2">
            {filtered.map(n => (
              <div key={n.niche} className="bg-[#111111] border border-[#1E1E1E] rounded-card p-5 hover:border-[#2E2E2E] transition-colors">
                <div className="flex items-start justify-between gap-3 mb-4">
                  <div className="min-w-0">
                    <h3 className="text-white font-semibold text-sm capitalize truncate">{n.niche}</h3>
                    <div className="flex items-center gap-1 mt-1 text-[#555555] text-xs">
                      <Clock className="w-3 h-3 shrink-0" />
                      {timeAgo(n.lastSearched)}
                      {n.searchCount > 1 && <span className="ml-1">· {n.searchCount}x searched</span>}
                    </div>
                  </div>
                  <Link
                    href={`/dashboard?niche=${encodeURIComponent(n.niche)}`}
                    className="shrink-0 flex items-center gap-1.5 bg-[#FFD200] text-[#080808] font-bold px-3 py-1.5 rounded-btn text-xs hover:bg-[#FFE033] transition-colors"
                  >
                    <Search className="w-3 h-3" />Search Again
                  </Link>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div className="bg-[#080808] rounded-btn p-2.5 text-center">
                    <div className="flex items-center justify-center gap-1 mb-1">
                      <Lightbulb className="w-3 h-3 text-[#FFD200]" />
                    </div>
                    <p className="text-white font-bold text-sm">{n.ideaCount}</p>
                    <p className="text-[#555555] text-xs">Ideas</p>
                  </div>
                  <div className="bg-[#080808] rounded-btn p-2.5 text-center">
                    <div className="flex items-center justify-center gap-1 mb-1">
                      <TrendingUp className="w-3 h-3 text-[#22C55E]" />
                    </div>
                    <p className="text-white font-bold text-sm">{formatVph(n.avgVph)}</p>
                    <p className="text-[#555555] text-xs">Avg VPH</p>
                  </div>
                  <div className="bg-[#080808] rounded-btn p-2.5 text-center">
                    <div className="flex items-center justify-center gap-1 mb-1">
                      <BarChart2 className="w-3 h-3 text-[#3B82F6]" />
                    </div>
                    <p className="text-white font-bold text-sm">{n.topOutlierRatio != null ? `${n.topOutlierRatio}x` : "—"}</p>
                    <p className="text-[#555555] text-xs">Top outlier</p>
                  </div>
                </div>

                {n.avgTitleScore != null && (
                  <div className="mt-3 pt-3 border-t border-[#1E1E1E] flex items-center gap-2">
                    <span className="text-[#555555] text-xs">Avg title score:</span>
                    <span className={`text-xs font-semibold ${n.avgTitleScore >= 80 ? "text-[#22C55E]" : n.avgTitleScore >= 60 ? "text-[#FFB700]" : "text-[#FF3B3B]"}`}>
                      {n.avgTitleScore}/100
                    </span>
                  </div>
                )}
              </div>
            ))}
          </div>

          {filtered.length === 0 && (
            <p className="text-center text-[#555555] text-sm py-8">No niches match &quot;{filter}&quot;</p>
          )}
        </>
      )}
    </div>
  );
}
