"use client";

import { X, Loader2, RefreshCw, Save, Copy, Check } from "lucide-react";
import { useState } from "react";
import { formatNumber } from "@/lib/utils";
import type { EnrichedVideo, GeneratedIdea } from "@/types/youtube";

interface GeneratePanelProps {
  video: EnrichedVideo | null;
  idea: GeneratedIdea | null;
  isGenerating: boolean;
  onClose: () => void;
  onRegenerate: () => void;
  onSave: () => Promise<void>;
  showToast: (msg: string) => void;
}

function ScoreBar({ score }: { score: number }) {
  let color = "#22C55E";
  if (score < 50) color = "#FF3B3B";
  else if (score < 70) color = "#FFB700";
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-[#1E1E1E] rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{ width: `${score}%`, backgroundColor: color }}
        />
      </div>
      <span
        className="font-mono-stats text-xs font-bold"
        style={{ color }}
      >
        {score}/100
      </span>
    </div>
  );
}

export default function GeneratePanel({
  video,
  idea,
  isGenerating,
  onClose,
  onRegenerate,
  onSave,
  showToast,
}: GeneratePanelProps) {
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);

  if (!video) return null;

  async function handleSave() {
    setSaving(true);
    try {
      await onSave();
      showToast("Idea saved to tracker!");
    } catch {
      showToast("Failed to save idea");
    } finally {
      setSaving(false);
    }
  }

  async function copyTags() {
    if (!idea?.suggested_tags) return;
    try {
      await navigator.clipboard.writeText(idea.suggested_tags.join(", "));
      setCopied(true);
      showToast("Tags copied!");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      showToast("Clipboard access denied");
    }
  }

  return (
    <div className="fixed inset-0 z-40 flex justify-end" onClick={onClose}>
      <div
        className="w-full max-w-md h-full bg-[#0A0A0A] border-l border-[#1E1E1E] overflow-y-auto shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 bg-[#0A0A0A] border-b border-[#1E1E1E] px-5 py-4 flex items-center justify-between z-10">
          <div>
            <p className="text-[#555555] text-xs uppercase tracking-wider font-medium">
              Generate My Version
            </p>
            <p className="text-white text-sm font-semibold mt-0.5 truncate max-w-[280px]">
              Based on: {video.title}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-badge text-[#555555] hover:text-white hover:bg-[#1E1E1E] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Source video stats */}
        <div className="px-5 py-3 bg-[#0D0D0D] border-b border-[#1E1E1E] flex items-center gap-4 text-xs">
          <span className="text-[#555555]">@{video.channelName}</span>
          <span className="font-mono-stats text-white">{formatNumber(video.viewCount)} views</span>
          <span className="font-mono-stats text-[#FFD200]">⚡{video.vph} VPH</span>
          <span className="font-mono-stats text-[#FF3B3B]">🔥{video.outlierRatio}x</span>
        </div>

        <div className="p-5">
          {isGenerating && (
            <div className="flex flex-col items-center justify-center py-16 gap-4">
              <Loader2 className="w-8 h-8 text-[#FF3B3B] animate-spin" />
              <p className="text-[#555555] text-sm">Generating viral idea…</p>
            </div>
          )}

          {!isGenerating && idea && (
            <div className="space-y-5">
              {/* Title */}
              <div>
                <p className="text-[#555555] text-xs uppercase tracking-wider font-medium mb-2">
                  Video Title
                </p>
                <p className="text-white font-bold text-base leading-tight mb-2">
                  &ldquo;{idea.video_title}&rdquo;
                </p>
                <ScoreBar score={idea.title_score} />
              </div>

              {/* Thumbnail */}
              <div>
                <p className="text-[#555555] text-xs uppercase tracking-wider font-medium mb-2">
                  Thumbnail Text
                </p>
                <div className="bg-[#111111] border border-[#1E1E1E] rounded-card px-4 py-3 inline-block">
                  <span className="font-display font-extrabold text-2xl text-white tracking-wide">
                    {idea.thumbnail_text}
                  </span>
                </div>
              </div>

              {/* Hook */}
              <div>
                <p className="text-[#555555] text-xs uppercase tracking-wider font-medium mb-2">
                  Hook Line
                </p>
                <p className="text-[#999999] text-sm leading-relaxed italic">
                  &ldquo;{idea.hook_line}&rdquo;
                </p>
              </div>

              {/* Click Confirmation */}
              <div>
                <p className="text-[#555555] text-xs uppercase tracking-wider font-medium mb-2">
                  Click Confirmation
                </p>
                <p className="text-[#999999] text-sm leading-relaxed">
                  {idea.click_confirmation}
                </p>
              </div>

              {/* Sub-niche */}
              <div>
                <p className="text-[#555555] text-xs uppercase tracking-wider font-medium mb-2">
                  Sub-Niche
                </p>
                <span className="bg-[#FFD200]/10 border border-[#FFD200]/20 text-[#FFD200] text-xs px-3 py-1 rounded-badge">
                  {idea.sub_niche_keyword}
                </span>
              </div>

              {/* Packaging Notes */}
              <div className="bg-[#111111] border border-[#1E1E1E] rounded-card p-4">
                <p className="text-[#555555] text-xs uppercase tracking-wider font-medium mb-2">
                  Packaging Notes
                </p>
                <p className="text-[#999999] text-sm leading-relaxed">
                  {idea.packaging_notes}
                </p>
              </div>

              {/* Suggested Tags */}
              {idea.suggested_tags?.length > 0 && (
                <div>
                  <p className="text-[#555555] text-xs uppercase tracking-wider font-medium mb-2">
                    Suggested Tags ({idea.suggested_tags.length})
                  </p>
                  <div className="flex flex-wrap gap-1.5 mb-3">
                    {idea.suggested_tags.slice(0, 10).map((tag) => (
                      <span
                        key={tag}
                        className="bg-[#1E1E1E] text-[#999999] text-xs px-2 py-1 rounded-badge"
                      >
                        {tag}
                      </span>
                    ))}
                    {idea.suggested_tags.length > 10 && (
                      <span className="text-[#555555] text-xs py-1">
                        + {idea.suggested_tags.length - 10} more
                      </span>
                    )}
                  </div>
                  <button
                    onClick={copyTags}
                    className="flex items-center gap-1.5 text-xs bg-[#111111] border border-[#1E1E1E] text-[#999999] hover:text-white px-3 py-1.5 rounded-badge transition-colors"
                  >
                    {copied ? (
                      <Check className="w-3 h-3 text-[#22C55E]" />
                    ) : (
                      <Copy className="w-3 h-3" />
                    )}
                    Copy Suggested Tags
                  </button>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-3 pt-2">
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="flex-1 flex items-center justify-center gap-2 bg-[#FFD200] text-[#080808] font-bold text-sm py-3 rounded-btn hover:bg-[#FFE033] transition-colors disabled:opacity-50"
                >
                  {saving ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Save className="w-4 h-4" />
                  )}
                  Save to Idea Tracker
                </button>
                <button
                  onClick={onRegenerate}
                  className="flex items-center justify-center gap-2 bg-[#111111] border border-[#1E1E1E] text-white text-sm px-4 py-3 rounded-btn hover:border-[#333333] transition-colors"
                >
                  <RefreshCw className="w-4 h-4" />
                  Redo
                </button>
              </div>
            </div>
          )}

          {!isGenerating && !idea && (
            <div className="flex flex-col items-center justify-center py-16 gap-4">
              <p className="text-[#555555] text-sm">Waiting to generate…</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
