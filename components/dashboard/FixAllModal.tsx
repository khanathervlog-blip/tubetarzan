"use client";

import { useState, useRef } from "react";
import { X, Loader2, CheckCircle2, Zap } from "lucide-react";
import type { ChannelVideoCache } from "@/types/database";

interface Props {
  videos: ChannelVideoCache[];
  channelId: string;
  plan: string;
  onClose: () => void;
  onDone: () => void;
}

type Stage = "confirm" | "running" | "done" | "upgrade";

const DELAY_MS = 400; // avoid OpenAI + YouTube rate limits

function getPlanLimit(plan: string): number {
  if (plan === "creator") return 25;
  if (plan === "pro") return 50;
  if (plan === "agency" || plan === "admin") return Infinity;
  return 5; // free
}

function getPlanName(plan: string): string {
  if (plan === "creator") return "Creator";
  if (plan === "pro") return "Pro";
  if (plan === "agency") return "Agency";
  return "Free";
}

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export default function FixAllModal({ videos, channelId, plan, onClose, onDone }: Props) {
  const planLimit = getPlanLimit(plan);
  const isUnlimited = planLimit === Infinity;

  // Only operate on videos not yet applied
  const unfixedVideos = videos.filter(v => !v.applied_at);
  const alreadyFixed = videos.length - unfixedVideos.length;
  const remaining = isUnlimited ? unfixedVideos.length : Math.max(0, planLimit - alreadyFixed);
  const videosToFix = unfixedVideos.slice(0, remaining);

  const [stage, setStage] = useState<Stage>("confirm");
  const [current, setCurrent] = useState(0);
  const [fixed, setFixed] = useState(0);
  const [failed, setFailed] = useState(0);
  const [currentTitle, setCurrentTitle] = useState("");
  const [lastError, setLastError] = useState<string | null>(null);
  const cancelledRef = useRef(false);

  const pct = videosToFix.length === 0 ? 100
    : stage === "done" || stage === "upgrade" ? 100
    : Math.round((current / videosToFix.length) * 100);

  async function start() {
    cancelledRef.current = false;
    setStage("running");
    let fixedCount = 0;
    let failedCount = 0;

    for (let i = 0; i < videosToFix.length; i++) {
      if (cancelledRef.current) break;
      const video = videosToFix[i];
      setCurrent(i);
      setCurrentTitle(video.title);

      try {
        // Generate AI suggestions
        const optRes = await fetch(`/api/channel/videos/${video.video_id}/optimise`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ channelId }),
        });
        if (!optRes.ok) {
          const e = await optRes.json().catch(() => ({})) as { error?: string };
          throw new Error(e.error || `AI failed (${optRes.status})`);
        }
        const optData = await optRes.json() as {
          suggestions: {
            suggested_title: string;
            suggested_description: string;
            suggested_tags: string[];
          };
        };
        const { suggestions } = optData;

        if (cancelledRef.current) break;

        // Apply to YouTube
        const applyRes = await fetch(`/api/channel/videos/${video.video_id}/apply`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            channelId,
            title: suggestions.suggested_title,
            description: suggestions.suggested_description,
            tags: suggestions.suggested_tags,
          }),
        });
        if (!applyRes.ok) {
          const e = await applyRes.json().catch(() => ({})) as { error?: string };
          throw new Error(e.error || `YouTube update failed (${applyRes.status})`);
        }

        fixedCount++;
        setFixed(fixedCount);
        setLastError(null);
      } catch (err) {
        failedCount++;
        setFailed(failedCount);
        setLastError(err instanceof Error ? err.message : "Unknown error");
      }

      // Pace requests to stay within OpenAI + YouTube rate limits
      await sleep(DELAY_MS);
    }

    if (!cancelledRef.current) {
      setCurrent(videosToFix.length);
      onDone();
      // Show upgrade prompt if there are still unfixed videos beyond the plan limit
      const stillRemaining = unfixedVideos.length - videosToFix.length;
      if (!isUnlimited && stillRemaining > 0) {
        setStage("upgrade");
      } else {
        setStage("done");
      }
    }
  }

  function cancel() {
    cancelledRef.current = true;
    onDone();
    setStage("done");
  }

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-[#0D0D0D] border border-[#1E1E1E] rounded-card w-full max-w-md p-6">

        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <Zap className="w-5 h-5 text-[#FFD200]" />
            <h2 className="font-display font-bold text-lg text-white">Fix All Videos</h2>
          </div>
          {stage !== "running" && (
            <button onClick={onClose} className="text-[#555555] hover:text-white transition-colors">
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Confirm */}
        {stage === "confirm" && (
          <>
            {videosToFix.length === 0 ? (
              <div className="bg-[#FF3B3B]/10 border border-[#FF3B3B]/30 rounded-btn px-4 py-3 mb-4">
                <p className="text-[#FF3B3B] text-sm font-medium">You&apos;ve reached your {getPlanName(plan)} plan limit ({planLimit} videos).</p>
                <p className="text-[#999999] text-xs mt-1">Upgrade your plan to fix more videos.</p>
              </div>
            ) : (
              <p className="text-[#999999] text-sm mb-3">
                AI will generate and apply optimised titles, descriptions, and tags for {videosToFix.length} video{videosToFix.length !== 1 ? "s" : ""}.
                {alreadyFixed > 0 && ` (${alreadyFixed} already fixed)`}
              </p>
            )}
            {!isUnlimited && unfixedVideos.length > remaining && videosToFix.length > 0 && (
              <div className="bg-[#FFD200]/10 border border-[#FFD200]/30 rounded-btn px-4 py-2.5 mb-4">
                <p className="text-[#FFD200] text-xs font-medium">
                  {getPlanName(plan)} plan: {remaining} fix{remaining !== 1 ? "es" : ""} remaining of your {planLimit}-video limit. Upgrade to fix all {unfixedVideos.length} unfixed videos.
                </p>
              </div>
            )}
            <p className="text-[#555555] text-xs mb-6">
              This updates your videos directly on YouTube. Review changes in YouTube Studio afterwards.
            </p>
            <div className="flex gap-3">
              <button onClick={onClose}
                className="flex-1 bg-[#111111] border border-[#1E1E1E] text-[#999999] hover:text-white py-2.5 rounded-btn text-sm transition-colors">
                {videosToFix.length === 0 ? "Close" : "Cancel"}
              </button>
              {videosToFix.length > 0 && (
                <button onClick={start}
                  className="flex-1 bg-[#FFD200] text-[#080808] font-bold py-2.5 rounded-btn text-sm hover:bg-[#FFE040] transition-colors">
                  Fix {videosToFix.length} Video{videosToFix.length !== 1 ? "s" : ""} →
                </button>
              )}
              {videosToFix.length === 0 && (
                <a href="/pricing"
                  className="flex-1 bg-[#FFD200] text-[#080808] font-bold py-2.5 rounded-btn text-sm hover:bg-[#FFE040] transition-colors flex items-center justify-center">
                  Upgrade Plan →
                </a>
              )}
            </div>
          </>
        )}

        {/* Running */}
        {stage === "running" && (
          <>
            <div className="mb-3">
              <div className="flex justify-between text-xs text-[#555555] mb-1.5">
                <span>{current} / {videosToFix.length} videos</span>
                <span>{pct}%</span>
              </div>
              <div className="h-2 bg-[#1E1E1E] rounded-full overflow-hidden">
                <div
                  className="h-full bg-[#FFD200] rounded-full transition-all duration-500 ease-out"
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
            <div className="flex items-center gap-2 text-sm text-[#999999] min-h-[24px]">
              <Loader2 className="w-4 h-4 animate-spin text-[#FFD200] shrink-0" />
              <span className="truncate">{currentTitle || "Starting..."}</span>
            </div>
            <div className="flex gap-4 text-xs mt-3">
              <span className="text-[#22C55E]">✓ {fixed} fixed</span>
              {failed > 0 && <span className="text-[#FF3B3B]">✗ {failed} failed</span>}
            </div>
            {lastError && (
              <p className="text-[#FF3B3B] text-xs mt-1.5 mb-4 truncate" title={lastError}>
                Last error: {lastError}
              </p>
            )}
            {!lastError && <div className="mb-6" />}
            <button onClick={cancel}
              className="w-full bg-[#111111] border border-[#1E1E1E] text-[#999999] hover:text-white py-2.5 rounded-btn text-sm transition-colors">
              Cancel
            </button>
          </>
        )}

        {/* Done */}
        {stage === "done" && (
          <>
            <div className="text-center mb-6">
              <CheckCircle2 className="w-12 h-12 text-[#22C55E] mx-auto mb-3" />
              <p className="text-white font-semibold text-lg">Fix All Complete!</p>
              <p className="text-[#999999] text-sm mt-1">
                {fixed} video{fixed !== 1 ? "s" : ""} optimised
                {failed > 0 ? `, ${failed} failed` : ""}.
              </p>
            </div>
            <button onClick={onClose}
              className="w-full bg-[#FFD200] text-[#080808] font-bold py-2.5 rounded-btn text-sm hover:bg-[#FFE040] transition-colors">
              Done
            </button>
          </>
        )}

        {/* Upgrade prompt (free users hit limit) */}
        {stage === "upgrade" && (
          <>
            <div className="text-center mb-6">
              <CheckCircle2 className="w-12 h-12 text-[#22C55E] mx-auto mb-3" />
              <p className="text-white font-semibold text-lg">{fixed} video{fixed !== 1 ? "s" : ""} fixed!</p>
              <p className="text-[#999999] text-sm mt-2">
                You&apos;ve reached your <span className="text-white font-medium">{getPlanName(plan)} plan limit ({planLimit} videos)</span>.{" "}
                {unfixedVideos.length - videosToFix.length > 0 && (
                  <span>You still have <span className="text-white font-medium">{unfixedVideos.length - videosToFix.length} more unfixed videos</span>. </span>
                )}
                Upgrade to fix all your videos in one click.
              </p>
            </div>
            <div className="flex gap-3">
              <button onClick={onClose}
                className="flex-1 bg-[#111111] border border-[#1E1E1E] text-[#999999] hover:text-white py-2.5 rounded-btn text-sm transition-colors">
                Close
              </button>
              <a href="/pricing"
                className="flex-1 bg-[#FFD200] text-[#080808] font-bold py-2.5 rounded-btn text-sm hover:bg-[#FFE040] transition-colors flex items-center justify-center">
                Upgrade Now →
              </a>
            </div>
          </>
        )}

      </div>
    </div>
  );
}
