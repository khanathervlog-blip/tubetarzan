"use client";

import { useState } from "react";
import { X, Loader2, Zap, Check, AlertTriangle, ExternalLink } from "lucide-react";
import { scoreTitle, scoreDescription, scoreTags } from "@/lib/scoring";
import type { ChannelVideoCache } from "@/types/database";

interface Props {
  video: ChannelVideoCache;
  channelId: string;
  onClose: () => void;
  onApplied: (videoId: string) => void;
  showToast: (msg: string) => void;
}

type Suggestions = {
  suggested_title: string;
  suggested_description: string;
  suggested_tags: string[];
  suggested_thumbnail_text: string;
  optimization_notes: string;
};

export default function VideoOptimisePanel({ video, channelId, onClose, onApplied, showToast }: Props) {
  const [suggestions, setSuggestions] = useState<Suggestions | null>(
    video.suggested_title
      ? {
          suggested_title: video.suggested_title,
          suggested_description: video.suggested_description || "",
          suggested_tags: video.suggested_tags || [],
          suggested_thumbnail_text: video.suggested_thumbnail_text || "",
          optimization_notes: video.optimization_notes || "",
        }
      : null
  );
  const [generating, setGenerating] = useState(false);
  const [applying, setApplying] = useState(false);
  const [showFullDesc, setShowFullDesc] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [applyMode, setApplyMode] = useState<"all" | "title" | "description" | "tags">("all");

  async function generate() {
    setGenerating(true);
    try {
      const res = await fetch(`/api/channel/videos/${video.video_id}/optimise`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ channelId }),
      });
      const data = await res.json();
      if (!res.ok) { showToast(data.error || "Generation failed"); return; }
      setSuggestions(data.suggestions);
    } catch { showToast("Network error. Please try again."); }
    finally { setGenerating(false); }
  }

  async function apply() {
    if (!suggestions) return;
    setApplying(true);
    setShowConfirm(false);
    const body: Record<string, unknown> = { channelId };
    if (applyMode === "all" || applyMode === "title") body.title = suggestions.suggested_title;
    if (applyMode === "all" || applyMode === "description") body.description = suggestions.suggested_description;
    if (applyMode === "all" || applyMode === "tags") body.tags = suggestions.suggested_tags;

    try {
      const res = await fetch(`/api/channel/videos/${video.video_id}/apply`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) { showToast(data.error || "Apply failed"); return; }
      showToast("Changes applied to YouTube ✓");
      onApplied(video.video_id);
    } catch { showToast("Apply failed — check your connection."); }
    finally { setApplying(false); }
  }

  const suggestedScore = suggestions?.suggested_title ? scoreTitle(suggestions.suggested_title) : null;
  const currentDescScore = scoreDescription(video.description || "");
  const suggestedDescScore = suggestions?.suggested_description ? scoreDescription(suggestions.suggested_description) : null;
  const currentTagsScore = scoreTags(video.tags || []);
  const suggestedTagsScore = suggestions?.suggested_tags ? scoreTags(suggestions.suggested_tags) : null;

  function scoreColor(score: number) {
    if (score >= 80) return "text-[#22C55E]";
    if (score >= 60) return "text-[#FFB700]";
    return "text-[#FF3B3B]";
  }

  function ScoreChip({ score }: { score: number }) {
    return (
      <span className={`text-xs font-bold ${scoreColor(score)}`}>
        {score}/100
      </span>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="flex-1 bg-black/60" onClick={onClose} />
      <div className="w-full max-w-2xl bg-[#0A0A0A] border-l border-[#1E1E1E] flex flex-col overflow-y-auto">
        {/* Header */}
        <div className="flex items-start justify-between p-6 border-b border-[#1E1E1E] sticky top-0 bg-[#0A0A0A] z-10">
          <div>
            <p className="text-[#555555] text-xs mb-1">OPTIMISING</p>
            <h2 className="font-semibold text-white text-sm leading-snug max-w-xs">
              &quot;{video.title}&quot;
            </h2>
          </div>
          <button onClick={onClose} className="text-[#555555] hover:text-white transition-colors p-1 shrink-0">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Current perf */}
          <div className="flex items-center gap-6 text-sm">
            <span className="text-[#555555]">{(video.view_count || 0).toLocaleString()} views</span>
            <span className="text-[#FFD200]">⚡{video.vph} VPH</span>
            <span className="text-[#999999]">{video.outlier_ratio}x outlier</span>
            <span className={`font-semibold ${scoreColor(video.optimization_score || 0)}`}>
              Score: {video.optimization_score}/100
            </span>
          </div>

          {!suggestions && (
            <button
              onClick={generate}
              disabled={generating}
              className="w-full bg-[#FFD200] text-[#080808] font-bold py-3 rounded-btn hover:bg-[#FFE033] disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {generating ? <><Loader2 className="w-4 h-4 animate-spin" />Generating suggestions...</> : <><Zap className="w-4 h-4" />Generate AI Suggestions</>}
            </button>
          )}

          {suggestions && (
            <>
              {/* Title */}
              <div className="bg-[#111111] border border-[#1E1E1E] rounded-card p-4">
                <h3 className="text-xs font-semibold text-[#999999] uppercase mb-3">Title Optimisation</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-[#555555] mb-1">Current</p>
                    <p className="text-white text-sm font-medium">{video.title}</p>
                    <p className={`text-xs mt-1 ${scoreColor(video.optimization_score || 0)}`}>
                      Score: {video.optimization_score}/100
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-[#555555] mb-1">AI Suggested</p>
                    <p className="text-[#FFD200] text-sm font-medium">{suggestions.suggested_title}</p>
                    {suggestedScore !== null && (
                      <p className={`text-xs mt-1 ${scoreColor(suggestedScore)}`}>
                        Score: {suggestedScore}/100
                      </p>
                    )}
                  </div>
                </div>
                {suggestions.optimization_notes && (
                  <p className="text-[#555555] text-xs mt-3 border-t border-[#1E1E1E] pt-3">
                    {suggestions.optimization_notes}
                  </p>
                )}
              </div>

              {/* Description */}
              <div className="bg-[#111111] border border-[#1E1E1E] rounded-card p-4">
                <h3 className="text-xs font-semibold text-[#999999] uppercase mb-3">Description Optimisation</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <p className="text-xs text-[#555555]">Current ({video.description?.length || 0} chars)</p>
                      <ScoreChip score={currentDescScore} />
                    </div>
                    <p className="text-white text-xs leading-relaxed line-clamp-4">{video.description || "(no description)"}</p>
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <p className="text-xs text-[#555555]">AI Suggested</p>
                      {suggestedDescScore !== null && <ScoreChip score={suggestedDescScore} />}
                    </div>
                    <p className="text-[#FFD200] text-xs leading-relaxed">
                      {showFullDesc ? suggestions.suggested_description : `${suggestions.suggested_description.slice(0, 200)}...`}
                    </p>
                    <button onClick={() => setShowFullDesc(!showFullDesc)} className="text-[#555555] hover:text-white text-xs mt-1 underline">
                      {showFullDesc ? "Show less" : "Show full description"}
                    </button>
                  </div>
                </div>
              </div>

              {/* Tags */}
              <div className="bg-[#111111] border border-[#1E1E1E] rounded-card p-4">
                <h3 className="text-xs font-semibold text-[#999999] uppercase mb-3">Tags Optimisation</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <p className="text-xs text-[#555555]">Current ({video.tags?.length || 0} tags)</p>
                      <ScoreChip score={currentTagsScore} />
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {(video.tags || []).map(t => (
                        <span key={t} className="text-xs bg-[#1E1E1E] text-[#999999] px-2 py-0.5 rounded-badge">{t}</span>
                      ))}
                      {!video.tags?.length && <span className="text-xs text-[#555555]">No tags</span>}
                    </div>
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <p className="text-xs text-[#555555]">AI Suggested ({suggestions.suggested_tags.length} tags)</p>
                      {suggestedTagsScore !== null && <ScoreChip score={suggestedTagsScore} />}
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {suggestions.suggested_tags.map(t => (
                        <span key={t} className="text-xs bg-[#FFD200]/10 text-[#FFD200] px-2 py-0.5 rounded-badge">{t}</span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Thumbnail */}
              {suggestions.suggested_thumbnail_text && (
                <div className="bg-[#111111] border border-[#1E1E1E] rounded-card p-4">
                  <h3 className="text-xs font-semibold text-[#999999] uppercase mb-2">Thumbnail Text Suggestion</h3>
                  <p className="text-[#FFD200] font-bold text-lg">{suggestions.suggested_thumbnail_text}</p>
                  <p className="text-[#555555] text-xs mt-1">Update your thumbnail in YouTube Studio — programmatic upload is not supported.</p>
                </div>
              )}

              {/* Apply buttons */}
              <div className="border-t border-[#1E1E1E] pt-4 space-y-3">
                <div className="flex flex-wrap gap-2">
                  {[
                    { mode: "all" as const, label: "Apply All Changes to YouTube →" },
                    { mode: "title" as const, label: "Apply Title Only" },
                    { mode: "description" as const, label: "Apply Description Only" },
                    { mode: "tags" as const, label: "Apply Tags Only" },
                  ].map(({ mode, label }) => (
                    <button
                      key={mode}
                      onClick={() => { setApplyMode(mode); setShowConfirm(true); }}
                      disabled={applying}
                      className={`text-sm font-medium px-4 py-2.5 rounded-btn transition-colors disabled:opacity-50 min-h-[44px] ${
                        mode === "all"
                          ? "bg-[#FFD200] text-[#080808] hover:bg-[#FFE033]"
                          : "bg-[#111111] border border-[#1E1E1E] text-[#999999] hover:text-white"
                      }`}
                    >
                      {mode === "all" && applying ? <span className="flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" />Applying...</span> : label}
                    </button>
                  ))}
                </div>

                <button
                  onClick={generate}
                  disabled={generating}
                  className="text-xs text-[#555555] hover:text-white transition-colors"
                >
                  {generating ? "Regenerating..." : "↻ Regenerate suggestions"}
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Confirm dialog */}
      {showConfirm && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/70">
          <div className="bg-[#111111] border border-[#1E1E1E] rounded-card p-6 max-w-sm mx-4">
            <div className="flex items-center gap-2 mb-3">
              <AlertTriangle className="w-5 h-5 text-[#FFB700]" />
              <h3 className="font-semibold text-white">Confirm Apply</h3>
            </div>
            <p className="text-[#999999] text-sm mb-4">
              This will update your video on YouTube immediately. Your current{" "}
              {applyMode === "all" ? "title, description, and tags" : applyMode} will be replaced.
              This cannot be undone from TubeTarzan.
            </p>
            <div className="flex gap-3">
              <button onClick={apply} className="flex-1 bg-[#FFD200] text-[#080808] font-bold py-2.5 rounded-btn hover:bg-[#FFE033] text-sm flex items-center justify-center gap-2">
                {applying ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                Confirm & Apply
              </button>
              <button onClick={() => setShowConfirm(false)} className="flex-1 bg-[#1E1E1E] text-[#999999] font-medium py-2.5 rounded-btn hover:text-white text-sm">Cancel</button>
            </div>
            <a href={`https://studio.youtube.com/video/${video.video_id}/edit`} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-1 text-xs text-[#555555] hover:text-white mt-3 transition-colors">
              <ExternalLink className="w-3 h-3" />
              Open in YouTube Studio instead
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
