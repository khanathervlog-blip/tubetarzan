"use client";

import { ArrowLeft, Loader2, ExternalLink, TrendingUp, Lightbulb, AlertCircle, RefreshCw } from "lucide-react";
import type { Competitor } from "@/types/database";

interface TopVideo {
  videoId: string;
  title: string;
  views: number;
  publishedAt: string | null;
  tags: string[];
}

interface Props {
  competitor: Competitor;
  analysis: Record<string, unknown>;
  topVideos: TopVideo[];
  onBack: () => void;
  onReanalyse: () => void;
  analysing: boolean;
}

export default function CompetitorAnalysis({ competitor, analysis, topVideos, onBack, onReanalyse, analysing }: Props) {
  const titlePatterns = (competitor.title_patterns as string[] | null) || (analysis.title_patterns as string[]) || [];
  const strengths = (analysis.strengths as string[]) || [];
  const gaps = (analysis.gaps as string[]) || [];
  const stealIdeas = (analysis.steal_ideas as { title_idea: string; why: string }[]) || [];
  const contentStrategy = analysis.content_strategy as string || "";
  const thumbnailPatterns = analysis.thumbnail_patterns as string || "";
  const channelMeta = (analysis.channelMeta as { joinedAt?: string | null; country?: string | null; avgDurationSeconds?: number | null } | undefined) || {};

  function formatSubs(n: number | null) {
    if (!n) return "—";
    if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
    if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`;
    return n.toString();
  }

  function formatDuration(seconds: number | null | undefined) {
    if (!seconds) return "—";
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}m ${s}s`;
  }

  function formatJoinDate(dateStr: string | null | undefined) {
    if (!dateStr) return "—";
    return new Date(dateStr).toLocaleDateString("en-US", { month: "short", year: "numeric" });
  }

  function copyToClipboard(text: string) {
    navigator.clipboard.writeText(text);
  }

  const hasAnalysis = titlePatterns.length > 0 || strengths.length > 0;

  return (
    <div className="max-w-3xl">
      {/* Back */}
      <button onClick={onBack} className="flex items-center gap-1.5 text-[#555555] hover:text-white text-sm transition-colors mb-6">
        <ArrowLeft className="w-4 h-4" />Back to Competitors
      </button>

      {/* Channel header */}
      <div className="flex items-start justify-between mb-6 gap-4">
        <div className="flex items-center gap-4">
          {competitor.channel_thumbnail ? (
            <img src={competitor.channel_thumbnail} alt="" className="w-14 h-14 rounded-full border border-[#1E1E1E]" />
          ) : (
            <div className="w-14 h-14 rounded-full bg-[#1E1E1E]" />
          )}
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-display font-bold text-xl text-white">{competitor.channel_name}</h1>
              <a href={`https://youtube.com/channel/${competitor.channel_id}`} target="_blank" rel="noopener noreferrer"
                className="text-[#555555] hover:text-white transition-colors">
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
            {competitor.channel_handle && <p className="text-[#555555] text-sm">{competitor.channel_handle}</p>}
            {competitor.last_analyzed_at && (
              <p className="text-[#555555] text-xs mt-0.5">Last analysed {new Date(competitor.last_analyzed_at).toLocaleDateString()}</p>
            )}
          </div>
        </div>
        <button onClick={onReanalyse} disabled={analysing}
          className="flex items-center gap-2 bg-[#111111] border border-[#1E1E1E] text-[#999999] hover:text-white px-4 py-2 rounded-btn text-sm transition-colors disabled:opacity-50 min-h-[40px]">
          {analysing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
          {analysing ? "Analysing..." : "Re-analyse"}
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-3 mb-4">
        {[
          { label: "Subscribers", value: formatSubs(competitor.subscriber_count) },
          { label: "Total Videos", value: competitor.video_count?.toLocaleString() || "—" },
          { label: "Avg Views", value: competitor.avg_views_per_video?.toLocaleString() || "—" },
          { label: "Niche Score", value: competitor.niche_consistency_score ? `${competitor.niche_consistency_score}/100` : "—" },
        ].map(s => (
          <div key={s.label} className="bg-[#111111] border border-[#1E1E1E] rounded-card p-3 text-center">
            <p className="text-[#FFD200] font-display font-bold text-lg">{s.value}</p>
            <p className="text-[#999999] text-xs mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>
      {/* Extra channel meta — populated after analysis */}
      {(channelMeta.joinedAt || channelMeta.country || channelMeta.avgDurationSeconds) && (
        <div className="grid grid-cols-3 gap-3 mb-6">
          {channelMeta.joinedAt && (
            <div className="bg-[#111111] border border-[#1E1E1E] rounded-card p-3 text-center">
              <p className="text-white font-bold text-sm">{formatJoinDate(channelMeta.joinedAt)}</p>
              <p className="text-[#555555] text-xs mt-0.5">Joined YouTube</p>
            </div>
          )}
          {channelMeta.country && (
            <div className="bg-[#111111] border border-[#1E1E1E] rounded-card p-3 text-center">
              <p className="text-white font-bold text-sm">{channelMeta.country}</p>
              <p className="text-[#555555] text-xs mt-0.5">Country</p>
            </div>
          )}
          {channelMeta.avgDurationSeconds != null && (
            <div className="bg-[#111111] border border-[#1E1E1E] rounded-card p-3 text-center">
              <p className="text-white font-bold text-sm">{formatDuration(channelMeta.avgDurationSeconds)}</p>
              <p className="text-[#555555] text-xs mt-0.5">Avg Video Length</p>
            </div>
          )}
        </div>
      )}

      {!hasAnalysis && !analysing && (
        <div className="bg-[#111111] border border-[#1E1E1E] rounded-card px-6 py-10 text-center mb-6">
          <AlertCircle className="w-8 h-8 text-[#333333] mx-auto mb-3" />
          <p className="text-white font-semibold mb-1">No analysis yet</p>
          <p className="text-[#555555] text-sm mb-4">Run an analysis to see title patterns, strengths, gaps, and steal-worthy ideas.</p>
          <button onClick={onReanalyse}
            className="bg-[#FFD200] text-[#080808] font-bold px-5 py-2.5 rounded-btn hover:bg-[#FFE033] text-sm">
            Run Analysis →
          </button>
        </div>
      )}

      {analysing && (
        <div className="flex items-center gap-2 text-[#555555] mb-6">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span className="text-sm">Fetching top videos and running AI analysis...</span>
        </div>
      )}

      {hasAnalysis && (
        <div className="space-y-4">
          {/* Strategy */}
          {contentStrategy && (
            <div className="bg-[#111111] border border-[#1E1E1E] rounded-card p-5">
              <h3 className="text-xs font-semibold text-[#999999] uppercase mb-2">Content Strategy</h3>
              <p className="text-white text-sm leading-relaxed">{contentStrategy}</p>
              {thumbnailPatterns && (
                <p className="text-[#555555] text-xs mt-2 border-t border-[#1E1E1E] pt-2">
                  <span className="text-[#999999]">Thumbnails:</span> {thumbnailPatterns}
                </p>
              )}
            </div>
          )}

          {/* Title patterns */}
          {titlePatterns.length > 0 && (
            <div className="bg-[#111111] border border-[#1E1E1E] rounded-card p-5">
              <h3 className="text-xs font-semibold text-[#999999] uppercase mb-3">Title Patterns That Work</h3>
              <ul className="space-y-2">
                {titlePatterns.map((p, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm">
                    <span className="text-[#FFD200] shrink-0">→</span>
                    <span className="text-white">{p}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Strengths + Gaps */}
          {(strengths.length > 0 || gaps.length > 0) && (
            <div className="grid grid-cols-2 gap-4">
              {strengths.length > 0 && (
                <div className="bg-[#111111] border border-[#1E1E1E] rounded-card p-5">
                  <h3 className="text-xs font-semibold text-[#22C55E] uppercase mb-3 flex items-center gap-1.5">
                    <TrendingUp className="w-3.5 h-3.5" />Strengths
                  </h3>
                  <ul className="space-y-2">
                    {strengths.map((s, i) => (
                      <li key={i} className="text-sm text-[#999999] flex items-start gap-2">
                        <span className="text-[#22C55E] shrink-0">✓</span>{s}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {gaps.length > 0 && (
                <div className="bg-[#111111] border border-[#1E1E1E] rounded-card p-5">
                  <h3 className="text-xs font-semibold text-[#FFB700] uppercase mb-3">Gaps / Your Opportunity</h3>
                  <ul className="space-y-2">
                    {gaps.map((g, i) => (
                      <li key={i} className="text-sm text-[#999999] flex items-start gap-2">
                        <span className="text-[#FFB700] shrink-0">⚡</span>{g}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {/* Steal ideas */}
          {stealIdeas.length > 0 && (
            <div className="bg-[#111111] border border-[#1E1E1E] rounded-card p-5">
              <h3 className="text-xs font-semibold text-[#FFD200] uppercase mb-3 flex items-center gap-1.5">
                <Lightbulb className="w-3.5 h-3.5" />Ideas to Steal (Adapt for Your Channel)
              </h3>
              <div className="space-y-3">
                {stealIdeas.map((idea, i) => (
                  <div key={i} className="group flex items-start justify-between gap-3 p-3 rounded-btn bg-[#0A0A0A] hover:bg-[#1E1E1E] transition-colors">
                    <div>
                      <p className="text-white text-sm font-medium">{idea.title_idea}</p>
                      <p className="text-[#555555] text-xs mt-0.5">{idea.why}</p>
                    </div>
                    <button onClick={() => copyToClipboard(idea.title_idea)}
                      className="text-[#555555] hover:text-white transition-colors opacity-0 group-hover:opacity-100 shrink-0 text-xs border border-[#2E2E2E] px-2 py-1 rounded">
                      Copy
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Top videos */}
          {topVideos.length > 0 && (
            <div className="bg-[#111111] border border-[#1E1E1E] rounded-card p-5">
              <h3 className="text-xs font-semibold text-[#999999] uppercase mb-3">Their Top {topVideos.length} Videos</h3>
              <div className="space-y-2">
                {topVideos.map((v, i) => (
                  <div key={v.videoId} className="flex items-center gap-3 text-sm">
                    <span className="text-[#333333] font-mono w-4 shrink-0">{i + 1}</span>
                    <a href={`https://youtube.com/watch?v=${v.videoId}`} target="_blank" rel="noopener noreferrer"
                      className="flex-1 text-white hover:text-[#FFD200] transition-colors truncate">{v.title}</a>
                    <span className="text-[#555555] shrink-0 text-xs">{v.views.toLocaleString()} views</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
