import { createServiceClient } from "@/lib/supabase/server";
import { Film, Send, Clock } from "lucide-react";

export default async function ContentPage() {
  const svc = await createServiceClient();

  const today = new Date().toISOString().split("T")[0];

  const [rendersRes, postsRes, bulkRes] = await Promise.allSettled([
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
  ]);

  const renders = rendersRes.status === "fulfilled" ? (rendersRes.value.data || []) : [];
  const posts = postsRes.status === "fulfilled" ? (postsRes.value.data || []) : [];
  const bulkOps = bulkRes.status === "fulfilled" ? (bulkRes.value.data || []) : [];

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
