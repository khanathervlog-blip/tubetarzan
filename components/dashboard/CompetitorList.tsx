"use client";

import { useState, useEffect } from "react";
import { Users, Plus, Trash2, Loader2, BarChart2, AlertCircle, ExternalLink } from "lucide-react";
import type { Competitor } from "@/types/database";
import CompetitorAnalysis from "./CompetitorAnalysis";

export default function CompetitorList() {
  const [competitors, setCompetitors] = useState<Competitor[]>([]);
  const [loading, setLoading] = useState(true);
  const [channelUrl, setChannelUrl] = useState("");
  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);
  const [analysing, setAnalysing] = useState<string | null>(null);
  const [selectedCompetitor, setSelectedCompetitor] = useState<{
    competitor: Competitor;
    analysis: Record<string, unknown>;
    topVideos: { videoId: string; title: string; views: number; publishedAt: string | null; tags: string[] }[];
  } | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 2500);
  }

  useEffect(() => { loadCompetitors(); }, []);

  async function loadCompetitors() {
    setLoading(true);
    try {
      const res = await fetch("/api/competitors");
      const data = await res.json();
      setCompetitors(data.competitors || []);
    } catch { showToast("Failed to load competitors"); }
    finally { setLoading(false); }
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!channelUrl.trim()) return;
    setAdding(true);
    setAddError(null);
    try {
      const res = await fetch("/api/competitors", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ channelUrl: channelUrl.trim() }),
      });
      const data = await res.json();
      if (!res.ok) { setAddError(data.error || "Failed to add competitor"); return; }
      setCompetitors(prev => [data.competitor, ...prev]);
      setChannelUrl("");
      showToast("Competitor added!");
    } catch { setAddError("Network error. Please try again."); }
    finally { setAdding(false); }
  }

  async function handleDelete(id: string, name: string) {
    if (!confirm(`Remove "${name}" from your competitor list?`)) return;
    try {
      const res = await fetch(`/api/competitors/${id}`, { method: "DELETE" });
      if (!res.ok) { showToast("Delete failed"); return; }
      setCompetitors(prev => prev.filter(c => c.id !== id));
      if (selectedCompetitor?.competitor.id === id) setSelectedCompetitor(null);
      showToast("Removed");
    } catch { showToast("Delete failed"); }
  }

  async function handleAnalyse(competitor: Competitor) {
    setAnalysing(competitor.id);
    try {
      const res = await fetch(`/api/competitors/${competitor.id}/analyse`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) { showToast(data.error || "Analysis failed"); return; }
      setCompetitors(prev => prev.map(c => c.id === competitor.id ? data.competitor : c));
      setSelectedCompetitor({ competitor: data.competitor, analysis: data.analysis, topVideos: data.topVideos });
    } catch { showToast("Analysis failed. Check your connection."); }
    finally { setAnalysing(null); }
  }

  function formatSubs(n: number | null) {
    if (!n) return "—";
    if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
    if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`;
    return n.toString();
  }

  function formatLastAnalysed(dateStr: string | null) {
    if (!dateStr) return null;
    const mins = Math.floor((Date.now() - new Date(dateStr).getTime()) / 60000);
    if (mins < 1) return "just now";
    if (mins < 60) return `${mins}m ago`;
    if (mins < 1440) return `${Math.floor(mins / 60)}h ago`;
    return `${Math.floor(mins / 1440)}d ago`;
  }

  if (selectedCompetitor) {
    return (
      <CompetitorAnalysis
        competitor={selectedCompetitor.competitor}
        analysis={selectedCompetitor.analysis}
        topVideos={selectedCompetitor.topVideos}
        onBack={() => setSelectedCompetitor(null)}
        onReanalyse={() => handleAnalyse(selectedCompetitor.competitor)}
        analysing={analysing === selectedCompetitor.competitor.id}
      />
    );
  }

  return (
    <div className="max-w-3xl">
      <div className="mb-6">
        <h1 className="font-display font-bold text-2xl text-white mb-1 flex items-center gap-2">
          <Users className="w-6 h-6 text-[#FFD200]" />
          Competitor Tracker
        </h1>
        <p className="text-[#555555] text-sm">Add competitor channels to analyse their top content and steal winning formulas.</p>
      </div>

      {/* Add form */}
      <div className="bg-[#111111] border border-[#1E1E1E] rounded-card p-5 mb-6">
        <h2 className="font-semibold text-white text-sm mb-3">Add Competitor Channel</h2>
        <form onSubmit={handleAdd} className="flex gap-2">
          <input
            type="text"
            value={channelUrl}
            onChange={e => setChannelUrl(e.target.value)}
            placeholder="youtube.com/@channelname or /channel/UCxxxx"
            className="flex-1 bg-[#080808] border border-[#1E1E1E] text-white placeholder-[#555555] rounded-btn px-4 py-2.5 text-sm focus:outline-none focus:border-[#FFD200] transition-colors"
          />
          <button type="submit" disabled={adding || !channelUrl.trim()}
            className="flex items-center gap-2 bg-[#FFD200] text-[#080808] font-bold px-4 py-2.5 rounded-btn hover:bg-[#FFE033] disabled:opacity-50 text-sm shrink-0 min-h-[44px]">
            {adding ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
            {adding ? "Adding..." : "Add"}
          </button>
        </form>
        {addError && (
          <div className="flex items-center gap-1.5 text-[#FF3B3B] text-xs mt-2">
            <AlertCircle className="w-3.5 h-3.5 shrink-0" />{addError}
          </div>
        )}
        <p className="text-[#555555] text-xs mt-2">Supports: @handle, /channel/ID, /user/ format</p>
      </div>

      {/* List */}
      {loading ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => <div key={i} className="h-20 bg-[#111111] border border-[#1E1E1E] rounded-card animate-pulse" />)}
        </div>
      ) : competitors.length === 0 ? (
        <div className="bg-[#111111] border border-[#1E1E1E] rounded-card px-6 py-12 text-center">
          <Users className="w-10 h-10 text-[#333333] mx-auto mb-3" />
          <p className="text-white font-semibold mb-1">No competitors yet</p>
          <p className="text-[#555555] text-sm">Add a competitor channel to start analysing their content strategy.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {competitors.map(c => (
            <div key={c.id} className="bg-[#111111] border border-[#1E1E1E] rounded-card p-4 flex items-center gap-4 hover:border-[#2E2E2E] transition-colors">
              {c.channel_thumbnail ? (
                <img src={c.channel_thumbnail} alt="" className="w-12 h-12 rounded-full border border-[#1E1E1E] shrink-0 bg-[#1E1E1E]" />
              ) : (
                <div className="w-12 h-12 rounded-full bg-[#1E1E1E] shrink-0 flex items-center justify-center">
                  <Users className="w-5 h-5 text-[#333333]" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-white font-medium text-sm truncate">{c.channel_name}</p>
                  <a href={`https://youtube.com/channel/${c.channel_id}`} target="_blank" rel="noopener noreferrer"
                    className="text-[#555555] hover:text-white transition-colors shrink-0">
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
                {c.channel_handle && <p className="text-[#555555] text-xs">{c.channel_handle}</p>}
                <div className="flex items-center gap-3 mt-1 text-xs text-[#555555]">
                  <span>{formatSubs(c.subscriber_count)} subs</span>
                  {c.video_count && <span>{c.video_count.toLocaleString()} videos</span>}
                  {c.avg_views_per_video && <span>{c.avg_views_per_video.toLocaleString()} avg views</span>}
                  {c.last_analyzed_at && <span className="text-[#22C55E]">Analysed {formatLastAnalysed(c.last_analyzed_at)}</span>}
                </div>
                {c.niche_consistency_score !== null && (
                  <div className="flex items-center gap-2 mt-1.5">
                    <div className="w-20 h-1 bg-[#1E1E1E] rounded-full overflow-hidden">
                      <div className="h-full rounded-full bg-[#FFD200]" style={{ width: `${c.niche_consistency_score}%` }} />
                    </div>
                    <span className="text-[#FFD200] text-xs">{c.niche_consistency_score}/100 niche score</span>
                  </div>
                )}
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {c.last_analyzed_at && (
                  <button onClick={() => setSelectedCompetitor({ competitor: c, analysis: {}, topVideos: [] })}
                    className="text-[#555555] hover:text-[#FFD200] text-xs transition-colors px-2 py-1.5">
                    View →
                  </button>
                )}
                <button
                  onClick={() => handleAnalyse(c)}
                  disabled={analysing === c.id}
                  className="flex items-center gap-1.5 bg-[#1E1E1E] hover:bg-[#2E2E2E] text-[#999999] hover:text-white text-xs px-3 py-1.5 rounded-btn transition-colors min-h-[32px] disabled:opacity-50"
                >
                  {analysing === c.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <BarChart2 className="w-3 h-3" />}
                  {analysing === c.id ? "Analysing..." : c.last_analyzed_at ? "Re-analyse" : "Analyse"}
                </button>
                <button onClick={() => handleDelete(c.id, c.channel_name)}
                  className="text-[#555555] hover:text-[#FF3B3B] transition-colors p-1.5">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {toast && (
        <div className="fixed bottom-6 right-6 bg-[#111111] border border-[#1E1E1E] text-white text-sm px-4 py-3 rounded-card shadow-2xl z-50 animate-slide-up">
          {toast}
        </div>
      )}
    </div>
  );
}
