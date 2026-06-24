import { createServiceClient } from "@/lib/supabase/server";
import { Film, Send, Clock, Mic, Subtitles } from "lucide-react";

export default async function ContentPage() {
  const svc = await createServiceClient();

  const today = new Date().toISOString().split("T")[0];

  const [rendersRes, postsRes, bulkRes, lipSyncRes, captionRes] = await Promise.allSettled([
    svc
      .from("rendered_videos")
      .select("id, render_status, render_progress, created_at, output_url, user_id")
      .order("created_at", { ascending: false })
      .limit(20),
    svc
      .from("social_posts")
      .select("id, platform, status, scheduled_for, post_title, created_at")
      .gte("created_at", `${today}T00:00:00Z`)
      .order("scheduled_for", { ascending: true })
      .limit(30),
    svc
      .from("bulk_operations")
      .select("id, operation_type, status, total_videos, processed_videos, created_at")
      .order("created_at", { ascending: false })
      .limit(10),
    svc
      .from("lipsync_jobs")
      .select("id, status, quality, started_at, completed_at, error")
      .gte("started_at", `${today}T00:00:00Z`)
      .order("started_at", { ascending: false }),
    svc
      .from("caption_jobs")
      .select("id, status, caption_style, language_detected, created_at, error")
      .gte("created_at", `${today}T00:00:00Z`)
      .order("created_at", { ascending: false }),
  ]);

  const renders = rendersRes.status === "fulfilled" ? (rendersRes.value.data || []) : [];
  const posts = postsRes.status === "fulfilled" ? (postsRes.value.data || []) : [];
  const bulkOps = bulkRes.status === "fulfilled" ? (bulkRes.value.data || []) : [];
  const lipSyncJobs = lipSyncRes.status === "fulfilled" ? (lipSyncRes.value.data || []) : [];
  const captionJobs = captionRes.status === "fulfilled" ? (captionRes.value.data || []) : [];

  // Lip sync stats
  const lsComplete = lipSyncJobs.filter((j: { status: string }) => j.status === "complete").length;
  const lsFailed = lipSyncJobs.filter((j: { status: string }) => j.status === "failed").length;
  const lsProcessing = lipSyncJobs.filter((j: { status: string }) => j.status === "processing").length;
  const lsSuccessRate = lipSyncJobs.length > 0 ? Math.round((lsComplete / lipSyncJobs.length) * 100) : 0;
  const lsByQuality = {
    fast: lipSyncJobs.filter((j: { quality: string }) => j.quality === "fast").length,
    balanced: lipSyncJobs.filter((j: { quality: string }) => j.quality === "balanced").length,
    best: lipSyncJobs.filter((j: { quality: string }) => j.quality === "best").length,
  };

  // Caption stats
  const capComplete = captionJobs.filter((j: { status: string }) => j.status === "complete").length;
  const capFailed = captionJobs.filter((j: { status: string }) => j.status === "failed").length;
  const styleCount: Record<string, number> = {};
  const langCount: Record<string, number> = {};
  for (const j of captionJobs as { caption_style: string; language_detected: string | null }[]) {
    if (j.caption_style) styleCount[j.caption_style] = (styleCount[j.caption_style] || 0) + 1;
    if (j.language_detected) langCount[j.language_detected] = (langCount[j.language_detected] || 0) + 1;
  }
  const topStyle = Object.entries(styleCount).sort((a, b) => b[1] - a[1])[0];
  const topLangs = Object.entries(langCount).sort((a, b) => b[1] - a[1]).slice(0, 4);

  const rendersByStatus = {
    processing: renders.filter((r: { render_status: string }) => r.render_status === "processing").length,
    queued: renders.filter((r: { render_status: string }) => r.render_status === "queued").length,
    complete: renders.filter((r: { render_status: string }) => r.render_status === "complete").length,
    failed: renders.filter((r: { render_status: string }) => r.render_status === "failed").length,
  };

  const postsByStatus = {
    scheduled: posts.filter((p: { status: string }) => p.status === "scheduled").length,
    published: posts.filter((p: { status: string }) => p.status === "published").length,
    failed: posts.filter((p: { status: string }) => p.status === "failed").length,
  };

  const STATUS_COLORS: Record<string, string> = {
    processing: "#FFD200", queued: "#999999", complete: "#22C55E", failed: "#FF3B3B",
    scheduled: "#FFD200", published: "#22C55E", draft: "#555555", publishing: "#FFD200",
    completed: "#22C55E", running: "#FFD200",
  };

  return (
    <div className="max-w-4xl">
      <div className="mb-8">
        <h1 className="font-display font-bold text-2xl text-white mb-1 flex items-center gap-2">
          <Film className="w-6 h-6 text-[#FFD200]" /> Content Monitor
        </h1>
        <p className="text-[#555555] text-sm">Renders, posts, and bulk operations across all users</p>
      </div>

      {/* Render stats */}
      <div className="grid grid-cols-4 gap-3 mb-6">
        {Object.entries(rendersByStatus).map(([status, count]) => (
          <div key={status} className="bg-[#111111] border border-[#1E1E1E] rounded-card p-4 text-center">
            <p className="text-[#555555] text-xs capitalize mb-1">{status}</p>
            <p className="font-mono-stats font-bold text-xl" style={{ color: STATUS_COLORS[status] || "#999999" }}>
              {count}
            </p>
          </div>
        ))}
      </div>

      {/* Recent renders */}
      <div className="bg-[#111111] border border-[#1E1E1E] rounded-card overflow-hidden mb-6">
        <div className="px-5 py-3 border-b border-[#1E1E1E] flex items-center gap-2">
          <Film className="w-4 h-4 text-[#FFD200]" />
          <p className="text-white text-sm font-semibold">Recent Renders</p>
        </div>
        {renders.length === 0 ? (
          <div className="p-6 text-center text-[#555555] text-sm">No renders yet</div>
        ) : (
          <div className="divide-y divide-[#1E1E1E]">
            {renders.slice(0, 10).map((r: { id: string; render_status: string; render_progress: number; created_at: string; output_url: string | null }) => (
              <div key={r.id} className="px-5 py-3 flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-[#555555] text-xs">{new Date(r.created_at).toLocaleString()}</p>
                  {r.render_status === "processing" && r.render_progress > 0 && (
                    <div className="mt-1 h-1 bg-[#1E1E1E] rounded-full overflow-hidden w-40">
                      <div className="h-full bg-[#FFD200] rounded-full" style={{ width: `${r.render_progress}%` }} />
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {r.render_status === "processing" && r.render_progress > 0 && (
                    <span className="text-[#555555] text-xs">{r.render_progress}%</span>
                  )}
                  <span
                    className="text-xs font-bold px-2 py-0.5 rounded-badge capitalize"
                    style={{ color: STATUS_COLORS[r.render_status] || "#999999", background: `${STATUS_COLORS[r.render_status] || "#999999"}15` }}
                  >
                    {r.render_status}
                  </span>
                  {r.output_url && (
                    <a href={r.output_url} target="_blank" rel="noopener noreferrer" className="text-xs text-[#555555] hover:text-white transition-colors">
                      ↗
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Social posts today */}
      <div className="bg-[#111111] border border-[#1E1E1E] rounded-card overflow-hidden mb-6">
        <div className="px-5 py-3 border-b border-[#1E1E1E] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Send className="w-4 h-4 text-[#FFD200]" />
            <p className="text-white text-sm font-semibold">Social Posts Today</p>
          </div>
          <div className="flex items-center gap-3 text-xs">
            <span className="text-[#22C55E]">{postsByStatus.published} sent</span>
            <span className="text-[#FFD200]">{postsByStatus.scheduled} pending</span>
            {postsByStatus.failed > 0 && <span className="text-[#FF3B3B]">{postsByStatus.failed} failed</span>}
          </div>
        </div>
        {posts.length === 0 ? (
          <div className="p-6 text-center text-[#555555] text-sm">No posts scheduled today</div>
        ) : (
          <div className="divide-y divide-[#1E1E1E]">
            {posts.slice(0, 15).map((p: { id: string; platform: string; status: string; scheduled_for: string | null; post_title: string | null }) => (
              <div key={p.id} className="px-5 py-3 flex items-center gap-3">
                <Clock className="w-3.5 h-3.5 text-[#333333] shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-white text-xs truncate">{p.post_title || "Untitled"}</p>
                  <p className="text-[#555555] text-xs capitalize">{p.platform} · {p.scheduled_for ? new Date(p.scheduled_for).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "—"}</p>
                </div>
                <span
                  className="text-xs px-2 py-0.5 rounded-badge font-medium capitalize shrink-0"
                  style={{ color: STATUS_COLORS[p.status] || "#999999", background: `${STATUS_COLORS[p.status] || "#999999"}15` }}
                >
                  {p.status}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Lip Sync Monitoring */}
      <div className="bg-[#111111] border border-[#1E1E1E] rounded-card overflow-hidden mb-6">
        <div className="px-5 py-3 border-b border-[#1E1E1E] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Mic className="w-4 h-4 text-[#FFD200]" />
            <p className="text-white text-sm font-semibold">Lip Sync Jobs Today</p>
          </div>
          <div className="flex items-center gap-3 text-xs">
            <span className="text-[#22C55E]">{lsComplete} complete</span>
            {lsProcessing > 0 && <span className="text-[#FFD200]">{lsProcessing} processing</span>}
            {lsFailed > 0 && <span className="text-[#FF3B3B]">{lsFailed} failed</span>}
          </div>
        </div>
        {lipSyncJobs.length === 0 ? (
          <div className="p-6 text-center text-[#555555] text-sm">No lip sync jobs today</div>
        ) : (
          <div className="p-5 space-y-4">
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-[#0D0D0D] border border-[#1E1E1E] rounded-lg p-3 text-center">
                <p className="text-[#555555] text-xs mb-1">Total Today</p>
                <p className="text-white font-bold text-xl font-mono-stats">{lipSyncJobs.length}</p>
              </div>
              <div className="bg-[#0D0D0D] border border-[#1E1E1E] rounded-lg p-3 text-center">
                <p className="text-[#555555] text-xs mb-1">Success Rate</p>
                <p className="font-bold text-xl font-mono-stats" style={{ color: lsSuccessRate >= 80 ? "#22C55E" : lsSuccessRate >= 50 ? "#FFD200" : "#FF3B3B" }}>
                  {lsSuccessRate}%
                </p>
              </div>
              <div className="bg-[#0D0D0D] border border-[#1E1E1E] rounded-lg p-3 text-center">
                <p className="text-[#555555] text-xs mb-1">Queue Now</p>
                <p className="font-bold text-xl font-mono-stats" style={{ color: lsProcessing > 0 ? "#FFD200" : "#555555" }}>{lsProcessing}</p>
              </div>
            </div>
            <div className="flex gap-3 text-xs">
              <div className="flex-1 bg-[#0D0D0D] border border-[#1E1E1E] rounded-lg p-3">
                <p className="text-[#555555] mb-2">Model Usage</p>
                <div className="space-y-1">
                  <div className="flex justify-between"><span className="text-gray-400">MuseTalk (best)</span><span className="text-white font-mono-stats">{lsByQuality.best}</span></div>
                  <div className="flex justify-between"><span className="text-gray-400">MuseTalk (balanced)</span><span className="text-white font-mono-stats">{lsByQuality.balanced}</span></div>
                  <div className="flex justify-between"><span className="text-gray-400">Wav2Lip (fast)</span><span className="text-white font-mono-stats">{lsByQuality.fast}</span></div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Caption Monitoring */}
      <div className="bg-[#111111] border border-[#1E1E1E] rounded-card overflow-hidden mb-6">
        <div className="px-5 py-3 border-b border-[#1E1E1E] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Subtitles className="w-4 h-4 text-[#FFD200]" />
            <p className="text-white text-sm font-semibold">Caption Jobs Today</p>
          </div>
          <div className="flex items-center gap-3 text-xs">
            <span className="text-[#22C55E]">{capComplete} complete</span>
            {capFailed > 0 && <span className="text-[#FF3B3B]">{capFailed} failed</span>}
          </div>
        </div>
        {captionJobs.length === 0 ? (
          <div className="p-6 text-center text-[#555555] text-sm">No caption jobs today</div>
        ) : (
          <div className="p-5 space-y-4">
            <div className="grid grid-cols-2 gap-3">
              {topLangs.length > 0 && (
                <div className="bg-[#0D0D0D] border border-[#1E1E1E] rounded-lg p-3">
                  <p className="text-[#555555] text-xs mb-2">Languages Detected</p>
                  <div className="space-y-1">
                    {topLangs.map(([lang, count]) => (
                      <div key={lang} className="flex justify-between text-xs">
                        <span className="text-gray-400 capitalize">{lang}</span>
                        <span className="text-white font-mono-stats">{count}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {topStyle && (
                <div className="bg-[#0D0D0D] border border-[#1E1E1E] rounded-lg p-3">
                  <p className="text-[#555555] text-xs mb-2">Most Popular Style</p>
                  <p className="text-[#FFD200] font-semibold text-sm capitalize">{topStyle[0].replace(/_/g, " ")}</p>
                  <p className="text-[#555555] text-xs mt-1">{topStyle[1]} of {captionJobs.length} jobs ({Math.round(topStyle[1] / captionJobs.length * 100)}%)</p>
                  <div className="mt-2 space-y-1">
                    {Object.entries(styleCount).map(([style, count]) => (
                      <div key={style} className="flex items-center gap-2">
                        <div className="flex-1 h-1 bg-[#1E1E1E] rounded-full overflow-hidden">
                          <div className="h-full bg-[#FFD200] rounded-full" style={{ width: `${Math.round(count / captionJobs.length * 100)}%` }} />
                        </div>
                        <span className="text-[#555555] text-xs w-16 text-right capitalize">{style.replace(/_/g, " ")}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Bulk operations */}
      {bulkOps.length > 0 && (
        <div className="bg-[#111111] border border-[#1E1E1E] rounded-card overflow-hidden">
          <div className="px-5 py-3 border-b border-[#1E1E1E]">
            <p className="text-white text-sm font-semibold">Recent Bulk Operations</p>
          </div>
          <div className="divide-y divide-[#1E1E1E]">
            {bulkOps.map((op: { id: string; operation_type: string; status: string; total_videos: number; processed_videos: number; created_at: string }) => (
              <div key={op.id} className="px-5 py-3 flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-white text-xs capitalize">{op.operation_type.replace(/_/g, " ")}</p>
                  <p className="text-[#555555] text-xs">{new Date(op.created_at).toLocaleDateString()} · {op.processed_videos}/{op.total_videos} videos</p>
                </div>
                <span
                  className="text-xs px-2 py-0.5 rounded-badge font-medium capitalize"
                  style={{ color: STATUS_COLORS[op.status] || "#999999", background: `${STATUS_COLORS[op.status] || "#999999"}15` }}
                >
                  {op.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
