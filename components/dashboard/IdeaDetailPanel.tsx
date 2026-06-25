"use client";

import { X, Copy, Check, ExternalLink } from "lucide-react";
import { useState } from "react";
import type { ViralIdea } from "@/types/database";

function ScoreBar({ score }: { score: number }) {
  const color = score >= 70 ? "#22C55E" : score >= 50 ? "#FFB700" : "#FF3B3B";
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-[#1E1E1E] rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all duration-700" style={{ width: `${score}%`, backgroundColor: color }} />
      </div>
      <span className="font-mono-stats text-xs font-bold" style={{ color }}>{score}/100</span>
    </div>
  );
}

interface Props {
  idea: ViralIdea;
  onClose: () => void;
}

export default function IdeaDetailPanel({ idea, onClose }: Props) {
  const [copied, setCopied] = useState(false);

  async function copyTags() {
    if (!idea.source_tags?.length) return;
    await navigator.clipboard.writeText(idea.source_tags.join(", "));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="fixed inset-0 z-40 flex justify-end" onClick={onClose}>
      <div
        className="w-full max-w-md h-full bg-[#0A0A0A] border-l border-[#1E1E1E] overflow-y-auto shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 bg-[#0A0A0A] border-b border-[#1E1E1E] px-5 py-4 flex items-center justify-between z-10">
          <div>
            <p className="text-[#555555] text-xs uppercase tracking-wider font-medium">Saved Idea</p>
            <p className="text-[#FFD200] text-xs font-semibold mt-0.5 capitalize">{idea.niche}</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-badge text-[#555555] hover:text-white hover:bg-[#1E1E1E] transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Source video bar */}
        {idea.source_video_title && (
          <div className="px-5 py-3 bg-[#0D0D0D] border-b border-[#1E1E1E] flex items-center gap-4 text-xs">
            <span className="text-[#555555] truncate">Based on: {idea.source_video_title}</span>
            {idea.source_video_id && (
              <a
                href={`https://youtube.com/watch?v=${idea.source_video_id}`}
                target="_blank" rel="noopener noreferrer"
                className="text-[#555555] hover:text-white shrink-0 transition-colors"
              >
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            )}
          </div>
        )}

        <div className="p-5 space-y-5">
          {/* Title */}
          <div>
            <p className="text-[#555555] text-xs uppercase tracking-wider font-medium mb-2">Video Title</p>
            <p className="text-white font-bold text-base leading-tight mb-2">&ldquo;{idea.video_title}&rdquo;</p>
            {idea.title_score && <ScoreBar score={idea.title_score} />}
          </div>

          {/* Thumbnail */}
          {idea.thumbnail_text && (
            <div>
              <p className="text-[#555555] text-xs uppercase tracking-wider font-medium mb-2">Thumbnail Text</p>
              <div className="bg-[#111111] border border-[#1E1E1E] rounded-card px-4 py-3 inline-block">
                <span className="font-display font-extrabold text-2xl text-white tracking-wide">{idea.thumbnail_text}</span>
              </div>
            </div>
          )}

          {/* Hook */}
          {idea.hook_line && (
            <div>
              <p className="text-[#555555] text-xs uppercase tracking-wider font-medium mb-2">Hook Line</p>
              <p className="text-[#999999] text-sm leading-relaxed italic">&ldquo;{idea.hook_line}&rdquo;</p>
            </div>
          )}

          {/* Click Confirmation */}
          {idea.click_confirmation && (
            <div>
              <p className="text-[#555555] text-xs uppercase tracking-wider font-medium mb-2">Click Confirmation</p>
              <p className="text-[#999999] text-sm leading-relaxed">{idea.click_confirmation}</p>
            </div>
          )}

          {/* Sub-niche */}
          {idea.sub_niche_keyword && (
            <div>
              <p className="text-[#555555] text-xs uppercase tracking-wider font-medium mb-2">Sub-Niche</p>
              <span className="bg-[#FFD200]/10 border border-[#FFD200]/20 text-[#FFD200] text-xs px-3 py-1 rounded-badge">
                {idea.sub_niche_keyword}
              </span>
            </div>
          )}

          {/* Packaging Notes */}
          {idea.packaging_notes && (
            <div className="bg-[#111111] border border-[#1E1E1E] rounded-card p-4">
              <p className="text-[#555555] text-xs uppercase tracking-wider font-medium mb-2">Packaging Notes</p>
              <p className="text-[#999999] text-sm leading-relaxed">{idea.packaging_notes}</p>
            </div>
          )}

          {/* Source stats */}
          {(idea.source_vph || idea.source_outlier_ratio || idea.source_channel_name) && (
            <div className="bg-[#111111] border border-[#1E1E1E] rounded-card p-4">
              <p className="text-[#555555] text-xs uppercase tracking-wider font-medium mb-3">Source Video Stats</p>
              <div className="flex flex-wrap gap-4 text-xs">
                {idea.source_channel_name && (
                  <div>
                    <p className="text-[#555555]">Channel</p>
                    <p className="text-white font-medium">{idea.source_channel_name}</p>
                  </div>
                )}
                {idea.source_views && (
                  <div>
                    <p className="text-[#555555]">Views</p>
                    <p className="text-white font-medium">{idea.source_views.toLocaleString()}</p>
                  </div>
                )}
                {idea.source_vph && (
                  <div>
                    <p className="text-[#555555]">VPH</p>
                    <p className="text-[#FFD200] font-bold">⚡{Math.round(idea.source_vph)}</p>
                  </div>
                )}
                {idea.source_outlier_ratio && (
                  <div>
                    <p className="text-[#555555]">Outlier</p>
                    <p className="text-[#FF3B3B] font-bold">🔥{idea.source_outlier_ratio}x</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Tags */}
          {idea.source_tags && idea.source_tags.length > 0 && (
            <div>
              <p className="text-[#555555] text-xs uppercase tracking-wider font-medium mb-2">
                Source Tags ({idea.source_tags.length})
              </p>
              <div className="flex flex-wrap gap-1.5 mb-3">
                {idea.source_tags.slice(0, 10).map(tag => (
                  <span key={tag} className="bg-[#1E1E1E] text-[#999999] text-xs px-2 py-1 rounded-badge">{tag}</span>
                ))}
                {idea.source_tags.length > 10 && (
                  <span className="text-[#555555] text-xs py-1">+{idea.source_tags.length - 10} more</span>
                )}
              </div>
              <button onClick={copyTags}
                className="flex items-center gap-1.5 text-xs bg-[#111111] border border-[#1E1E1E] text-[#999999] hover:text-white px-3 py-1.5 rounded-badge transition-colors">
                {copied ? <Check className="w-3 h-3 text-[#22C55E]" /> : <Copy className="w-3 h-3" />}
                Copy Tags
              </button>
            </div>
          )}

          {/* Notes */}
          {idea.notes && (
            <div>
              <p className="text-[#555555] text-xs uppercase tracking-wider font-medium mb-2">Notes</p>
              <p className="text-[#999999] text-sm leading-relaxed">{idea.notes}</p>
            </div>
          )}

          {/* Metadata */}
          <div className="border-t border-[#1E1E1E] pt-4 flex items-center justify-between text-xs text-[#555555]">
            <span>Saved {new Date(idea.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</span>
            <span className="capitalize">{idea.status}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
