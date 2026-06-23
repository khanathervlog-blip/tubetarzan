"use client";

import { useState, useEffect } from "react";
import {
  Calendar,
  Plus,
  Loader2,
  Trash2,
  AlertCircle,
  Clock,
  Check,
  X,
} from "lucide-react";

interface ScheduledPost {
  id: string;
  platform: string;
  post_title: string;
  post_description: string | null;
  scheduled_for: string;
  status: string;
  platform_post_id: string | null;
  platform_post_url: string | null;
  error_message: string | null;
}

const PLATFORMS = [
  { value: "youtube", label: "YouTube", icon: "▶" },
  { value: "instagram", label: "Instagram Reels", icon: "📷" },
  { value: "tiktok", label: "TikTok", icon: "🎵" },
  { value: "twitter", label: "Twitter / X", icon: "𝕏" },
];

const STATUS_STYLES: Record<string, string> = {
  scheduled: "text-[#FFD200] bg-[#FFD200]/10",
  publishing: "text-[#999999] bg-[#1E1E1E]",
  published: "text-[#22C55E] bg-[#22C55E]/10",
  failed: "text-[#FF3B3B] bg-[#FF3B3B]/10",
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function minDatetime(): string {
  const d = new Date();
  d.setMinutes(d.getMinutes() + 5);
  return d.toISOString().slice(0, 16);
}

export default function PublishScheduler() {
  const [posts, setPosts] = useState<ScheduledPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [tableExists, setTableExists] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [upgradeRequired, setUpgradeRequired] = useState(false);

  // Form state
  const [platform, setPlatform] = useState("youtube");
  const [postTitle, setPostTitle] = useState("");
  const [postDescription, setPostDescription] = useState("");
  const [scheduledFor, setScheduledFor] = useState(minDatetime());
  const [youtubeVideoId, setYoutubeVideoId] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");

  const [deletingId, setDeletingId] = useState<string | null>(null);

  async function loadPosts() {
    try {
      const res = await fetch("/api/social/schedule");
      const data = await res.json();
      setPosts(data.posts || []);
      setTableExists(data.tableExists !== false);
    } catch {
      setPosts([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadPosts();
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!postTitle.trim()) return;
    setSubmitting(true);
    setFormError("");
    setUpgradeRequired(false);

    try {
      const res = await fetch("/api/social/schedule", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          platform,
          postTitle: postTitle.trim(),
          postDescription: postDescription.trim() || null,
          scheduledFor: new Date(scheduledFor).toISOString(),
          youtubeVideoId: youtubeVideoId.trim() || null,
        }),
      });
      const data = await res.json();

      if (res.status === 403 && data.upgradeRequired) {
        setUpgradeRequired(true);
        return;
      }
      if (!res.ok) throw new Error(data.error || "Failed to schedule post");

      setShowForm(false);
      setPostTitle("");
      setPostDescription("");
      setYoutubeVideoId("");
      setScheduledFor(minDatetime());
      await loadPosts();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Failed to schedule post");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(postId: string) {
    setDeletingId(postId);
    try {
      await fetch(`/api/social/schedule?id=${postId}`, { method: "DELETE" });
      setPosts((prev) => prev.filter((p) => p.id !== postId));
    } finally {
      setDeletingId(null);
    }
  }

  const upcoming = posts.filter((p) => p.status === "scheduled" || p.status === "publishing");
  const published = posts.filter((p) => p.status === "published" || p.status === "failed");

  return (
    <div className="max-w-3xl">
      <div className="mb-8 flex items-start justify-between">
        <div>
          <h1 className="font-display font-bold text-2xl text-white mb-1">Publish & Schedule</h1>
          <p className="text-[#555555] text-sm">
            Plan when to post your content. Set reminders and auto-publish YouTube videos at the
            best times.
          </p>
        </div>
        <button
          onClick={() => { setShowForm(true); setUpgradeRequired(false); setFormError(""); }}
          className="flex items-center gap-2 bg-[#FFD200] text-[#080808] font-bold text-sm px-4 py-2.5 rounded-btn hover:bg-[#FFE033] transition-colors min-h-[44px] shrink-0"
        >
          <Plus className="w-4 h-4" />
          Schedule Post
        </button>
      </div>

      {/* Migration notice */}
      {!tableExists && (
        <div className="bg-[#FFD200]/5 border border-[#FFD200]/20 rounded-card p-4 mb-6">
          <p className="text-[#FFD200] text-sm font-medium mb-1">Database table needed</p>
          <p className="text-[#999999] text-sm">
            Run the Phase 5 SQL migration in Supabase to enable post scheduling. The{" "}
            <code className="bg-[#1E1E1E] px-1 py-0.5 rounded text-xs">social_posts</code> table
            needs to be created first.
          </p>
          <p className="text-[#555555] text-xs mt-2">
            Find the migration SQL in{" "}
            <code className="bg-[#1E1E1E] px-1 py-0.5 rounded text-xs">PHASE5_MIGRATIONS.sql</code>{" "}
            in your project root.
          </p>
        </div>
      )}

      {/* Schedule form */}
      {showForm && (
        <div className="bg-[#111111] border border-[#FFD200]/20 rounded-card p-6 mb-6">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-white font-semibold text-sm">New Scheduled Post</h2>
            <button
              onClick={() => setShowForm(false)}
              className="text-[#555555] hover:text-white transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {upgradeRequired && (
            <div className="bg-[#FFD200]/5 border border-[#FFD200]/20 rounded-btn p-3 mb-4">
              <p className="text-[#FFD200] text-sm font-medium">Creator plan required</p>
              <a
                href="/dashboard/settings?tab=billing"
                className="text-xs text-[#999999] hover:text-white mt-1 inline-block"
              >
                Upgrade to Creator →
              </a>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Platform */}
            <div>
              <label className="block text-xs font-medium text-[#999999] mb-2">Platform</label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {PLATFORMS.map((p) => (
                  <button
                    key={p.value}
                    type="button"
                    onClick={() => setPlatform(p.value)}
                    className={`flex flex-col items-center gap-1 py-2.5 rounded-btn text-xs transition-colors ${
                      platform === p.value
                        ? "bg-[#FFD200]/10 border border-[#FFD200]/30 text-[#FFD200]"
                        : "bg-[#080808] border border-[#1E1E1E] text-[#555555] hover:text-white"
                    }`}
                  >
                    <span className="text-lg">{p.icon}</span>
                    {p.label}
                  </button>
                ))}
              </div>
              {platform !== "youtube" && (
                <p className="text-[#555555] text-xs mt-2">
                  Non-YouTube platforms save as reminders only (API integration coming soon).
                </p>
              )}
            </div>

            {/* Title */}
            <div>
              <label className="block text-xs font-medium text-[#999999] mb-2">
                Video / Post Title *
              </label>
              <input
                type="text"
                value={postTitle}
                onChange={(e) => setPostTitle(e.target.value)}
                required
                placeholder="Things Not To Do In Istanbul"
                className="w-full bg-[#080808] border border-[#1E1E1E] text-white placeholder-[#555555] rounded-btn px-4 py-3 text-sm focus:outline-none focus:border-[#FFD200] transition-colors min-h-[44px]"
              />
            </div>

            {/* YouTube Video ID (optional) */}
            {platform === "youtube" && (
              <div>
                <label className="block text-xs font-medium text-[#999999] mb-2">
                  YouTube Video ID (optional)
                </label>
                <input
                  type="text"
                  value={youtubeVideoId}
                  onChange={(e) => setYoutubeVideoId(e.target.value)}
                  placeholder="dQw4w9WgXcQ — leave blank for reminder only"
                  className="w-full bg-[#080808] border border-[#1E1E1E] text-white placeholder-[#555555] rounded-btn px-4 py-3 text-sm focus:outline-none focus:border-[#FFD200] transition-colors min-h-[44px]"
                />
                <p className="text-[#333333] text-xs mt-1">
                  If provided, TubeTarzan will set this video to &ldquo;public&rdquo; at the scheduled time.
                  Upload as Unlisted in YouTube Studio first.
                </p>
              </div>
            )}

            {/* Notes */}
            <div>
              <label className="block text-xs font-medium text-[#999999] mb-2">
                Notes / Description (optional)
              </label>
              <textarea
                value={postDescription}
                onChange={(e) => setPostDescription(e.target.value)}
                rows={3}
                placeholder="Hook, key points, hashtags..."
                className="w-full bg-[#080808] border border-[#1E1E1E] text-white placeholder-[#555555] rounded-btn px-4 py-3 text-sm focus:outline-none focus:border-[#FFD200] transition-colors resize-none"
              />
            </div>

            {/* Schedule time */}
            <div>
              <label className="block text-xs font-medium text-[#999999] mb-2">
                Schedule Date & Time *
              </label>
              <input
                type="datetime-local"
                value={scheduledFor}
                onChange={(e) => setScheduledFor(e.target.value)}
                min={minDatetime()}
                required
                className="w-full bg-[#080808] border border-[#1E1E1E] text-white rounded-btn px-4 py-3 text-sm focus:outline-none focus:border-[#FFD200] transition-colors min-h-[44px] [color-scheme:dark]"
              />
              <p className="text-[#333333] text-xs mt-1">
                Best times: YouTube 6–9pm EST · Instagram 6–8pm EST · TikTok 7–9pm EST
              </p>
            </div>

            {formError && (
              <div className="flex items-start gap-2 text-[#FF3B3B] text-sm">
                <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                {formError}
              </div>
            )}

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="flex-1 bg-[#1E1E1E] text-white text-sm py-3 rounded-btn hover:bg-[#2A2A2A] transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting || !postTitle.trim()}
                className="flex-1 flex items-center justify-center gap-2 bg-[#FFD200] text-[#080808] font-bold text-sm py-3 rounded-btn hover:bg-[#FFE033] transition-colors disabled:opacity-50"
              >
                {submitting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Calendar className="w-4 h-4" />
                )}
                Schedule Post
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Content */}
      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="w-6 h-6 text-[#555555] animate-spin" />
        </div>
      ) : (
        <div className="space-y-6">
          {/* Upcoming */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <Clock className="w-4 h-4 text-[#FFD200]" />
              <h2 className="text-white font-semibold text-sm">Upcoming ({upcoming.length})</h2>
            </div>

            {upcoming.length === 0 ? (
              <div className="bg-[#111111] border border-[#1E1E1E] rounded-card p-8 text-center">
                <Calendar className="w-8 h-8 text-[#333333] mx-auto mb-3" />
                <p className="text-[#555555] text-sm">No scheduled posts yet.</p>
                <p className="text-[#333333] text-xs mt-1">
                  Click &ldquo;Schedule Post&rdquo; to plan your content calendar.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {upcoming.map((post) => (
                  <PostCard
                    key={post.id}
                    post={post}
                    onDelete={handleDelete}
                    deleting={deletingId === post.id}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Published history */}
          {published.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-4">
                <Check className="w-4 h-4 text-[#22C55E]" />
                <h2 className="text-white font-semibold text-sm">
                  Published / History ({published.length})
                </h2>
              </div>
              <div className="space-y-3">
                {published.slice(0, 10).map((post) => (
                  <PostCard
                    key={post.id}
                    post={post}
                    onDelete={handleDelete}
                    deleting={deletingId === post.id}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function PostCard({
  post,
  onDelete,
  deleting,
}: {
  post: ScheduledPost;
  onDelete: (id: string) => void;
  deleting: boolean;
}) {
  const platformInfo = PLATFORMS.find((p) => p.value === post.platform) || PLATFORMS[0];

  return (
    <div className="bg-[#111111] border border-[#1E1E1E] rounded-card p-4 flex items-start gap-4">
      <div className="text-2xl shrink-0">{platformInfo.icon}</div>
      <div className="flex-1 min-w-0">
        <p className="text-white text-sm font-medium truncate">{post.post_title}</p>
        <div className="flex items-center gap-3 mt-1">
          <span className="text-[#555555] text-xs">{formatDate(post.scheduled_for)}</span>
          <span
            className={`text-xs px-2 py-0.5 rounded-full capitalize font-medium ${STATUS_STYLES[post.status] || "text-[#555555] bg-[#1E1E1E]"}`}
          >
            {post.status}
          </span>
        </div>
        {post.platform_post_url && (
          <a
            href={post.platform_post_url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[#FFD200] text-xs hover:underline mt-1 inline-block"
          >
            View on {platformInfo.label} →
          </a>
        )}
        {post.error_message && (
          <p className="text-[#555555] text-xs mt-1 italic">{post.error_message}</p>
        )}
      </div>
      {post.status === "scheduled" && (
        <button
          onClick={() => onDelete(post.id)}
          disabled={deleting}
          className="text-[#333333] hover:text-[#FF3B3B] transition-colors p-1.5 shrink-0"
        >
          {deleting ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Trash2 className="w-4 h-4" />
          )}
        </button>
      )}
    </div>
  );
}
