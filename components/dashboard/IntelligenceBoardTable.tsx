"use client";

import { useState } from "react";
import Image from "next/image";
import { Tag, Lightbulb, Copy, Check, ExternalLink, Lock } from "lucide-react";
import { formatNumber, formatAge, formatDuration } from "@/lib/utils";
import type { EnrichedVideo } from "@/types/youtube";

interface IntelligenceBoardTableProps {
  videos: EnrichedVideo[];
  niche: string;
  plan: string;
  isAdmin?: boolean;
  onGenerate: (video: EnrichedVideo) => void;
  onTagsSaved: (tags: string[]) => void;
  showToast: (msg: string) => void;
}

function VPHBadge({ vph }: { vph: number }) {
  if (vph >= 500)
    return (
      <span className="inline-flex items-center gap-1 font-mono-stats text-xs font-bold px-2 py-0.5 rounded-badge bg-[#22C55E]/15 text-[#22C55E]">
        ⚡ {formatNumber(vph)}
      </span>
    );
  if (vph >= 100)
    return (
      <span className="inline-flex items-center gap-1 font-mono-stats text-xs font-bold px-2 py-0.5 rounded-badge bg-[#FFB700]/15 text-[#FFB700]">
        ⚡ {formatNumber(vph)}
      </span>
    );
  return (
    <span className="inline-flex items-center gap-1 font-mono-stats text-xs px-2 py-0.5 rounded-badge bg-[#1E1E1E] text-[#555555]">
      {formatNumber(vph)}
    </span>
  );
}

function OutlierBadge({ ratio }: { ratio: number }) {
  if (ratio >= 10)
    return (
      <span className="inline-flex items-center gap-0.5 font-mono-stats text-xs font-bold px-2 py-0.5 rounded-badge bg-[#FF3B3B]/15 text-[#FF3B3B]">
        🔥 {ratio}x
      </span>
    );
  if (ratio >= 5)
    return (
      <span className="inline-flex items-center gap-0.5 font-mono-stats text-xs font-bold px-2 py-0.5 rounded-badge bg-[#FFB700]/15 text-[#FFB700]">
        🔥 {ratio}x
      </span>
    );
  return (
    <span className="font-mono-stats text-xs px-2 py-0.5 rounded-badge bg-[#1E1E1E] text-[#555555]">
      {ratio}x
    </span>
  );
}

function blendSuggestedTags(sourceTags: string[], niche: string): string[] {
  const year = new Date().getFullYear().toString();
  const nicheWord = niche.toLowerCase().split(" ")[0];
  const withYear = sourceTags.slice(0, 4).map((t) => `${t} ${year}`);
  const withNiche = sourceTags
    .slice(4, 8)
    .map((t) => (t.toLowerCase().includes(nicheWord) ? t : `${nicheWord} ${t}`));
  return Array.from(new Set([...sourceTags, ...withYear, ...withNiche])).slice(0, 20);
}

interface TagExpansionProps {
  video: EnrichedVideo;
  niche: string;
  showToast: (msg: string) => void;
  onTagsSaved: (tags: string[]) => void;
}

function TagExpansion({ video, niche, showToast, onTagsSaved }: TagExpansionProps) {
  const [copied, setCopied] = useState<"all" | "suggested" | null>(null);
  const suggested = blendSuggestedTags(video.tags, niche);

  async function copy(tags: string[], key: "all" | "suggested") {
    try {
      await navigator.clipboard.writeText(tags.join(", "));
      setCopied(key);
      showToast("Tags copied!");
      setTimeout(() => setCopied(null), 2000);
    } catch {
      showToast("Clipboard access denied");
    }
  }

  async function saveTagBank() {
    try {
      await fetch("/api/tags/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tags: video.tags, niche, sourceVideoId: video.videoId }),
      });
      onTagsSaved(video.tags);
      showToast("Tags saved to Tag Bank");
    } catch {
      showToast("Failed to save tags");
    }
  }

  if (video.tags.length === 0) {
    return (
      <tr>
        <td colSpan={9} className="px-4 py-3 bg-[#0A0A0A] border-b border-[#1E1E1E]">
          <p className="text-[#555555] text-xs">No tags found for this video.</p>
        </td>
      </tr>
    );
  }

  return (
    <tr>
      <td colSpan={9} className="px-4 py-4 bg-[#0A0A0A] border-b border-[#1E1E1E]">
        <div className="space-y-4">
          <div>
            <p className="text-[#555555] text-xs uppercase tracking-wider mb-2 font-medium">
              Tags from this video ({video.tags.length})
            </p>
            <div className="flex flex-wrap gap-1.5 mb-3">
              {video.tags.map((tag) => (
                <span
                  key={tag}
                  className="bg-[#1E1E1E] text-[#999999] text-xs px-2 py-1 rounded-badge"
                >
                  {tag}
                </span>
              ))}
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => copy(video.tags, "all")}
                className="flex items-center gap-1.5 text-xs bg-[#111111] border border-[#1E1E1E] text-[#999999] hover:text-white px-3 py-1.5 rounded-badge transition-colors"
              >
                {copied === "all" ? (
                  <Check className="w-3 h-3 text-[#22C55E]" />
                ) : (
                  <Copy className="w-3 h-3" />
                )}
                Copy All Tags
              </button>
              <button
                onClick={saveTagBank}
                className="flex items-center gap-1.5 text-xs bg-[#111111] border border-[#1E1E1E] text-[#FFD200] hover:bg-[#FFD200]/10 px-3 py-1.5 rounded-badge transition-colors"
              >
                + Add to Tag Bank
              </button>
            </div>
          </div>

          <div>
            <p className="text-[#555555] text-xs uppercase tracking-wider mb-2 font-medium">
              Suggested tags for your video (AI blend)
            </p>
            <div className="flex flex-wrap gap-1.5 mb-3">
              {suggested.slice(0, 12).map((tag) => (
                <span
                  key={tag}
                  className="bg-[#FF3B3B]/10 border border-[#FF3B3B]/20 text-[#FF3B3B] text-xs px-2 py-1 rounded-badge"
                >
                  {tag}
                </span>
              ))}
              {suggested.length > 12 && (
                <span className="text-[#555555] text-xs py-1">
                  + {suggested.length - 12} more
                </span>
              )}
            </div>
            <button
              onClick={() => copy(suggested, "suggested")}
              className="flex items-center gap-1.5 text-xs bg-[#111111] border border-[#1E1E1E] text-[#999999] hover:text-white px-3 py-1.5 rounded-badge transition-colors"
            >
              {copied === "suggested" ? (
                <Check className="w-3 h-3 text-[#22C55E]" />
              ) : (
                <Copy className="w-3 h-3" />
              )}
              Copy Suggested Tags
            </button>
          </div>
        </div>
      </td>
    </tr>
  );
}

export default function IntelligenceBoardTable({
  videos,
  niche,
  plan,
  isAdmin = false,
  onGenerate,
  onTagsSaved,
  showToast,
}: IntelligenceBoardTableProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const isFree = plan === "free" && !isAdmin;
  const visibleVideos = isFree ? videos.slice(0, 10) : videos;
  const lockedCount = isFree ? videos.length - 10 : 0;

  if (videos.length === 0) return null;

  return (
    <div className="bg-[#111111] border border-[#1E1E1E] rounded-card overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm min-w-[900px]">
          <thead>
            <tr className="border-b border-[#1E1E1E] text-[#555555] text-xs">
              <th className="text-left px-4 py-3 font-medium w-12"></th>
              <th className="text-left px-4 py-3 font-medium">Title / Channel</th>
              <th className="text-right px-4 py-3 font-medium">Views</th>
              <th className="text-right px-4 py-3 font-medium">VPH</th>
              <th className="text-right px-4 py-3 font-medium">Outlier</th>
              <th className="text-right px-4 py-3 font-medium">Dur.</th>
              <th className="text-right px-4 py-3 font-medium">Age</th>
              <th className="text-right px-4 py-3 font-medium">Tags</th>
              <th className="text-right px-4 py-3 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {visibleVideos.map((video) => (
              <>
                <tr
                  key={video.videoId}
                  className="border-b border-[#0F0F0F] hover:bg-[#0D0D0D] transition-colors"
                >
                  <td className="px-4 py-3">
                    <div className="relative w-12 h-9 rounded overflow-hidden bg-[#1E1E1E] flex-shrink-0">
                      {video.thumbnailUrl && (
                        <Image
                          src={video.thumbnailUrl}
                          alt=""
                          fill
                          sizes="48px"
                          className="object-cover"
                          unoptimized
                        />
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 max-w-[280px]">
                    <a
                      href={video.videoUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-white hover:text-[#FF3B3B] font-medium truncate block transition-colors"
                    >
                      {video.title}
                    </a>
                    <div className="flex items-center gap-1 mt-0.5">
                      <span className="text-[#555555] text-xs truncate">
                        @{video.channelName}
                      </span>
                      <span className="text-[#333333] text-xs">·</span>
                      <span className="text-[#555555] text-xs">
                        {formatNumber(video.channelSubscriberCount)} subs
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right font-mono-stats text-xs text-white">
                    {formatNumber(video.viewCount)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <VPHBadge vph={video.vph} />
                  </td>
                  <td className="px-4 py-3 text-right">
                    <OutlierBadge ratio={video.outlierRatio} />
                  </td>
                  <td className="px-4 py-3 text-right font-mono-stats text-xs text-[#555555]">
                    {formatDuration(video.durationSeconds)}
                  </td>
                  <td className="px-4 py-3 text-right font-mono-stats text-xs text-[#555555]">
                    {formatAge(video.publishedAt)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {video.tags.length > 0 ? (
                      <button
                        onClick={() =>
                          setExpandedId(
                            expandedId === video.videoId ? null : video.videoId
                          )
                        }
                        className={`flex items-center gap-1 text-xs px-2 py-1 rounded-badge transition-colors ml-auto ${
                          expandedId === video.videoId
                            ? "bg-[#FFD200]/20 text-[#FFD200]"
                            : "bg-[#1E1E1E] text-[#555555] hover:text-white"
                        }`}
                      >
                        <Tag className="w-3 h-3" />
                        {video.tags.length}
                      </button>
                    ) : (
                      <span className="text-[#333333] text-xs">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center gap-1.5 justify-end">
                      <a
                        href={video.videoUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-1.5 rounded-badge bg-[#1E1E1E] text-[#555555] hover:text-white transition-colors"
                        title="Open on YouTube"
                      >
                        <ExternalLink className="w-3 h-3" />
                      </a>
                      <button
                        onClick={() => onGenerate(video)}
                        className="flex items-center gap-1 text-xs bg-[#FF3B3B]/10 border border-[#FF3B3B]/20 text-[#FF3B3B] px-2 py-1.5 rounded-badge hover:bg-[#FF3B3B]/20 transition-colors"
                      >
                        <Lightbulb className="w-3 h-3" />
                        Generate
                      </button>
                    </div>
                  </td>
                </tr>
                {expandedId === video.videoId && (
                  <TagExpansion
                    key={`tags-${video.videoId}`}
                    video={video}
                    niche={niche}
                    showToast={showToast}
                    onTagsSaved={onTagsSaved}
                  />
                )}
              </>
            ))}
          </tbody>
        </table>
      </div>

      {isFree && lockedCount > 0 && (
        <div className="border-t border-[#1E1E1E] bg-[#0A0A0A] px-6 py-8 text-center">
          <Lock className="w-8 h-8 text-[#333333] mx-auto mb-3" />
          <p className="text-white font-semibold mb-1">
            🔒 {lockedCount} more videos — Upgrade to Creator to unlock
          </p>
          <p className="text-[#555555] text-sm mb-4">
            Free plan shows top 10 only. See all {videos.length} results with Creator.
          </p>
          <a
            href="/#pricing"
            className="bg-[#FFD200] text-[#080808] font-bold px-6 py-2.5 rounded-btn hover:bg-[#FFE033] transition-colors inline-block text-sm"
          >
            Upgrade Now →
          </a>
        </div>
      )}
    </div>
  );
}
