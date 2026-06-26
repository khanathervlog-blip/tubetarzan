"use client";

import { useState, useEffect, useMemo } from "react";
import { Video, RefreshCw, Loader2, Search, Wrench, ExternalLink, Zap, Lock } from "lucide-react";
import VideoOptimisePanel from "./VideoOptimisePanel";
import FixAllModal from "./FixAllModal";
import AdminChannelManager from "./AdminChannelManager";
import type { ChannelVideoCache } from "@/types/database";
import type { Profile } from "@/types/database";

type Filter = "all" | "needs_fix" | "good" | "great";
type SortKey = "score" | "views" | "vph" | "oldest" | "newest";

interface ChannelInfo {
  id: string;
  name: string | null;
  handle: string | null;
  thumbnail: string | null;
  subscriberCount: number | null;
  lockUntil: string | null;
}

interface Props {
  profile: Pick<Profile, "subscription_plan" | "locked_channel_id" | "locked_channel_name" | "locked_channel_handle" | "locked_channel_thumbnail" | "locked_channel_subscriber_count" | "channel_lock_until"> | null;
  isAdmin?: boolean;
}

function getPlanOptimiseLimit(plan: string | null, isAdmin: boolean): number {
  if (isAdmin) return Infinity;
  if (plan === "agency") return Infinity;
  if (plan === "pro") return 50;
  if (plan === "creator") return 25;
  return 5; // free
}

function scoreLabel(score: number | null) {
  if (score === null) return { text: "—", color: "text-[#555555]" };
  if (score >= 90) return { text: "✓ GREAT", color: "text-[#22C55E]" };
  if (score >= 70) return { text: "GOOD", color: "text-[#FFB700]" };
  return { text: "NEEDS FIX", color: "text-[#FF3B3B]" };
}

function scoreBar(score: number | null) {
  const pct = score ?? 0;
  const color = pct >= 90 ? "#22C55E" : pct >= 70 ? "#FFB700" : "#FF3B3B";
  return (
    <div className="flex items-center gap-2">
      <div className="w-20 h-1.5 bg-[#1E1E1E] rounded-full overflow-hidden">
        <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: color }} />
      </div>
      <span className="text-xs font-mono" style={{ color }}>{pct}/100</span>
    </div>
  );
}

export default function ChannelPage({ profile, isAdmin = false }: Props) {
  const [videos, setVideos] = useState<ChannelVideoCache[]>([]);
  const [channelInfo, setChannelInfo] = useState<ChannelInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null);
  const [syncAttempted, setSyncAttempted] = useState(false);
  const [optimiseVideo, setOptimiseVideo] = useState<ChannelVideoCache | null>(null);
  const [showFixAll, setShowFixAll] = useState(false);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [sortBy, setSortBy] = useState<SortKey>("score");
  const [toast, setToast] = useState<string | null>(null);

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  }

  useEffect(() => {
    loadVideos();
  }, []);

  async function loadVideos() {
    setLoading(true);
    try {
      const res = await fetch("/api/channel/videos");
      const data = await res.json();
      if (data.noChannel) { setLoading(false); return; }
      setChannelInfo(data.channelInfo);
      setVideos(data.videos || []);
      setLastSyncedAt(data.lastSyncedAt);
    } catch { showToast("Failed to load channel data"); }
    finally { setLoading(false); }
  }

  async function handleSync() {
    setSyncing(true);
    try {
      const res = await fetch("/api/channel/videos", { method: "POST" });
      const data = await res.json();
      if (!res.ok) { showToast(data.error || "Sync failed"); return; }
      setSyncAttempted(true);
      showToast(data.synced > 0 ? `Synced ${data.synced} videos` : "Sync complete — no public videos found on this channel");
      await loadVideos();
    } catch { showToast("Sync failed — check your connection"); }
    finally { setSyncing(false); }
  }

  const filtered = useMemo(() => {
    let vids = [...videos];
    if (search) vids = vids.filter(v => v.title.toLowerCase().includes(search.toLowerCase()));
    if (filter === "needs_fix") vids = vids.filter(v => (v.optimization_score || 0) < 70);
    if (filter === "good") vids = vids.filter(v => { const s = v.optimization_score || 0; return s >= 70 && s < 90; });
    if (filter === "great") vids = vids.filter(v => (v.optimization_score || 0) >= 90);
    switch (sortBy) {
      case "views": vids.sort((a, b) => (b.view_count || 0) - (a.view_count || 0)); break;
      case "vph": vids.sort((a, b) => (b.vph || 0) - (a.vph || 0)); break;
      case "oldest": vids.sort((a, b) => new Date(a.published_at || 0).getTime() - new Date(b.published_at || 0).getTime()); break;
      case "newest": vids.sort((a, b) => new Date(b.published_at || 0).getTime() - new Date(a.published_at || 0).getTime()); break;
      default: vids.sort((a, b) => (a.optimization_score || 0) - (b.optimization_score || 0));
    }
    return vids;
  }, [videos, search, filter, sortBy]);

  const optimiseLimit = getPlanOptimiseLimit(profile?.subscription_plan || null, isAdmin);
  const appliedCount = useMemo(() => videos.filter(v => v.applied_at !== null).length, [videos]);
  const optimiseLimitReached = optimiseLimit !== Infinity && appliedCount >= optimiseLimit;

  const stats = useMemo(() => {
    if (!videos.length) return null;
    const scores = videos.map(v => v.optimization_score || 0);
    const avg = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
    return {
      avg,
      needsFix: videos.filter(v => (v.optimization_score || 0) < 70).length,
      good: videos.filter(v => { const s = v.optimization_score || 0; return s >= 70 && s < 90; }).length,
      great: videos.filter(v => (v.optimization_score || 0) >= 90).length,
      total: videos.length,
    };
  }, [videos]);

  function formatSyncTime(dateStr: string) {
    const mins = Math.floor((Date.now() - new Date(dateStr).getTime()) / 60000);
    if (mins < 1) return "just now";
    if (mins < 60) return `${mins} minutes ago`;
    return `${Math.floor(mins / 60)} hours ago`;
  }

  if (loading) {
    return (
      <div className="max-w-4xl">
        <div className="flex items-center gap-2 mb-6">
          <Video className="w-6 h-6 text-[#FFD200]" />
          <h1 className="font-display font-bold text-2xl text-white">My Channel</h1>
        </div>
        <div className="space-y-3">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-20 bg-[#111111] border border-[#1E1E1E] rounded-card animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (!profile?.locked_channel_id) {
    return (
      <div className="max-w-4xl">
        <div className="flex items-center gap-2 mb-6">
          <Video className="w-6 h-6 text-[#FFD200]" />
          <h1 className="font-display font-bold text-2xl text-white">My Channel</h1>
        </div>
        <div className="bg-[#111111] border border-[#1E1E1E] rounded-card px-6 py-12 text-center">
          <Video className="w-10 h-10 text-[#333333] mx-auto mb-4" />
          <p className="text-white font-semibold mb-2">Channel not connected</p>
          <p className="text-[#555555] text-sm mb-6">Connect your YouTube channel to score your videos and apply optimisations in one click.</p>
          <a href="/api/auth/youtube/connect?return=dashboard" className="inline-flex items-center gap-2 bg-[#FF3B3B] text-white font-bold px-6 py-3 rounded-btn hover:bg-[#FF5555] transition-colors">
            Connect YouTube Channel →
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl">
      {/* Admin multi-channel manager */}
      {isAdmin && (
        <AdminChannelManager onSwitch={() => { loadVideos(); }} />
      )}

      {/* Header */}
      <div className="flex items-start justify-between mb-6 gap-4">
        <div className="flex items-center gap-4">
          {channelInfo?.thumbnail && (
            <img src={channelInfo.thumbnail} alt="" className="w-14 h-14 rounded-full border border-[#1E1E1E]" />
          )}
          <div>
            <h1 className="font-display font-bold text-2xl text-white">{channelInfo?.name || profile.locked_channel_name}</h1>
            {channelInfo?.handle && <p className="text-[#555555] text-sm">{channelInfo.handle}</p>}
            {channelInfo?.subscriberCount && (
              <p className="text-[#555555] text-xs">{channelInfo.subscriberCount.toLocaleString()} subscribers · {videos.length} videos</p>
            )}
            {lastSyncedAt && <p className="text-[#555555] text-xs mt-0.5">Last synced: {formatSyncTime(lastSyncedAt)}</p>}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {/* Fix All: visible for free/pro/agency/admin — hidden for creator (unless admin) */}
          {(isAdmin || profile?.subscription_plan !== "creator") && videos.length > 0 && (
            <button
              onClick={() => setShowFixAll(true)}
              className="flex items-center gap-2 bg-[#FFD200] text-[#080808] font-bold px-4 py-2 rounded-btn text-sm hover:bg-[#FFE040] transition-colors min-h-[40px]">
              <Zap className="w-3.5 h-3.5" />
              Fix All
            </button>
          )}
          <button onClick={handleSync} disabled={syncing} className="flex items-center gap-2 bg-[#111111] border border-[#1E1E1E] text-[#999999] hover:text-white px-4 py-2 rounded-btn text-sm transition-colors disabled:opacity-50 min-h-[40px]">
            {syncing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
            {syncing ? "Syncing..." : "Sync"}
          </button>
        </div>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-4 gap-3 mb-6">
          {[
            { label: "Avg Score", value: `${stats.avg}/100` },
            { label: "Needs Fix", value: stats.needsFix, sub: "< 70 score" },
            { label: "Good", value: stats.good, sub: "70-89" },
            { label: "Great", value: stats.great, sub: "90+" },
          ].map((s) => (
            <div key={s.label} className="bg-[#111111] border border-[#1E1E1E] rounded-card p-4 text-center">
              <p className="text-[#FFD200] font-display font-bold text-xl">{s.value}</p>
              <p className="text-[#999999] text-xs mt-0.5">{s.label}</p>
              {s.sub && <p className="text-[#555555] text-xs">{s.sub}</p>}
            </div>
          ))}
        </div>
      )}

      {/* Controls */}
      {videos.length === 0 ? (
        <div className="bg-[#111111] border border-[#1E1E1E] rounded-card px-6 py-10 text-center">
          <p className="text-[#555555] text-sm">
            {syncAttempted
              ? "No public videos found on this channel. Make sure your videos are public on YouTube."
              : "No videos synced yet. Click Sync to load your channel videos."}
          </p>
        </div>
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-3 mb-4">
            <div className="relative flex-1 min-w-48">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#555555]" />
              <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search your videos..."
                className="w-full pl-9 pr-4 py-2 bg-[#111111] border border-[#1E1E1E] rounded-btn text-white placeholder-[#555555] text-sm focus:outline-none focus:border-[#FFD200] min-h-[40px]" />
            </div>
            <div className="flex gap-1">
              {(["all","needs_fix","good","great"] as Filter[]).map(f => (
                <button key={f} onClick={() => setFilter(f)}
                  className={`text-xs px-3 py-1.5 rounded-badge transition-colors ${filter === f ? "bg-[#FFD200] text-[#080808] font-medium" : "bg-[#111111] border border-[#1E1E1E] text-[#999999] hover:text-white"}`}>
                  {f === "needs_fix" ? "Needs Fix" : f.charAt(0).toUpperCase() + f.slice(1)}
                </button>
              ))}
            </div>
            <select value={sortBy} onChange={e => setSortBy(e.target.value as SortKey)}
              className="bg-[#111111] border border-[#1E1E1E] text-[#999999] text-xs px-3 py-2 rounded-btn focus:outline-none min-h-[40px]">
              <option value="score">Score ↑</option>
              <option value="views">Views</option>
              <option value="vph">VPH</option>
              <option value="newest">Newest</option>
              <option value="oldest">Oldest</option>
            </select>
          </div>

          <div className="space-y-2">
            {filtered.map(video => {
              const label = scoreLabel(video.optimization_score);
              return (
                <div key={video.video_id} className="bg-[#111111] border border-[#1E1E1E] rounded-card p-4 flex items-center gap-4 hover:border-[#2E2E2E] transition-colors">
                  {video.thumbnail_url && (
                    <a href={`https://www.youtube.com/watch?v=${video.video_id}`} target="_blank" rel="noopener noreferrer" className="flex-shrink-0">
                      <img src={video.thumbnail_url} alt="" className="w-24 h-14 object-cover rounded-btn bg-[#1E1E1E] hover:opacity-80 transition-opacity" />
                    </a>
                  )}
                  <div className="flex-1 min-w-0">
                    <a href={`https://www.youtube.com/watch?v=${video.video_id}`} target="_blank" rel="noopener noreferrer"
                      className="text-white text-sm font-medium truncate block hover:text-[#FFD200] transition-colors">
                      {video.title}
                    </a>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="text-[#555555] text-xs">{(video.view_count || 0).toLocaleString()} views</span>
                      <span className="text-[#FFD200] text-xs">⚡{video.vph} VPH</span>
                      <span className="text-[#555555] text-xs">{video.outlier_ratio}x</span>
                      {video.tags && <span className="text-[#555555] text-xs">{video.tags.length} tags</span>}
                    </div>
                    <div className="mt-2">{scoreBar(video.optimization_score)}</div>
                  </div>
                  <div className="flex flex-col items-end gap-2 shrink-0">
                    <span className={`text-xs font-semibold ${label.color}`}>{label.text}</span>
                    <div className="flex items-center gap-2">
                      <a href={`https://studio.youtube.com/video/${video.video_id}/edit`} target="_blank" rel="noopener noreferrer"
                        className="text-[#555555] hover:text-white transition-colors p-1" title="Open in YouTube Studio">
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                      {optimiseLimitReached && !video.applied_at ? (
                        <a href="/pricing"
                          className="flex items-center gap-1.5 bg-[#1E1E1E] hover:bg-[#2E2E2E] text-[#FFD200] text-xs px-3 py-1.5 rounded-btn transition-colors min-h-[32px]"
                          title={`${profile?.subscription_plan || "free"} plan limit reached — upgrade to optimise more`}>
                          <Lock className="w-3 h-3" />
                          Upgrade
                        </a>
                      ) : (
                        <button onClick={() => setOptimiseVideo(video)}
                          className="flex items-center gap-1.5 bg-[#1E1E1E] hover:bg-[#2E2E2E] text-[#999999] hover:text-white text-xs px-3 py-1.5 rounded-btn transition-colors min-h-[32px]">
                          <Wrench className="w-3 h-3" />
                          Optimise →
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
            {filtered.length === 0 && (
              <div className="bg-[#111111] border border-[#1E1E1E] rounded-card px-6 py-8 text-center">
                <p className="text-[#555555] text-sm">No videos match this filter</p>
              </div>
            )}
          </div>
        </>
      )}

      {showFixAll && channelInfo && (
        <FixAllModal
          videos={videos}
          channelId={channelInfo.id}
          plan={isAdmin ? "admin" : (profile?.subscription_plan || "free")}
          onClose={() => setShowFixAll(false)}
          onDone={async () => { await loadVideos(); }}
        />
      )}

      {optimiseVideo && channelInfo && (
        <VideoOptimisePanel
          video={optimiseVideo}
          channelId={channelInfo.id}
          onClose={() => setOptimiseVideo(null)}
          onApplied={(id) => {
            setOptimiseVideo(null);
            setVideos(prev => prev.map(v => v.video_id === id ? { ...v, applied_at: new Date().toISOString() } : v));
          }}
          showToast={showToast}
        />
      )}

      {toast && (
        <div className="fixed bottom-6 right-6 bg-[#111111] border border-[#1E1E1E] text-white text-sm px-4 py-3 rounded-card shadow-2xl z-50 animate-slide-up">
          {toast}
        </div>
      )}
    </div>
  );
}
