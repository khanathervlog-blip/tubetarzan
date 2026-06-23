"use client";

import { useState } from "react";
import {
  AlignLeft,
  Loader2,
  Copy,
  Check,
  Download,
  Clock,
  FileText,
  AlertCircle,
} from "lucide-react";

interface Segment {
  start: number;
  duration: number;
  text: string;
}

interface TranscriptResult {
  videoId: string;
  videoUrl: string;
  language: string;
  trackName: string;
  segments: Segment[];
  fullText: string;
  wordCount: number;
  totalSeconds: number;
  formattedDuration: string;
  speakingPaceWpm: number;
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export default function TranscriptFetcher() {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<TranscriptResult | null>(null);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const [view, setView] = useState<"text" | "segments">("text");

  async function handleFetch() {
    if (!url.trim()) return;
    setLoading(true);
    setError("");
    setResult(null);

    try {
      const res = await fetch("/api/transcript/fetch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: url.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to fetch transcript");
      setResult(data as TranscriptResult);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  async function copyText() {
    if (!result) return;
    await navigator.clipboard.writeText(result.fullText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function downloadText() {
    if (!result) return;
    const content =
      view === "segments"
        ? result.segments.map((s) => `[${formatTime(s.start)}] ${s.text}`).join("\n")
        : result.fullText;
    const blob = new Blob([content], { type: "text/plain" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `transcript-${result.videoId}.txt`;
    a.click();
  }

  function useForScript() {
    if (!result) return;
    // Pass transcript to script writer via localStorage
    localStorage.setItem("tt_transcript_text", result.fullText);
    localStorage.setItem("tt_transcript_video_id", result.videoId);
    window.location.href = "/dashboard/script?from=transcript";
  }

  return (
    <div className="max-w-3xl">
      <div className="mb-8">
        <h1 className="font-display font-bold text-2xl text-white mb-1">Transcript Fetcher</h1>
        <p className="text-[#555555] text-sm">
          Extract the full transcript from any YouTube video. Use it to analyze competitor scripts or
          as the base for your own.
        </p>
      </div>

      {/* Input */}
      <div className="bg-[#111111] border border-[#1E1E1E] rounded-card p-6 mb-6">
        <label className="block text-xs font-medium text-[#999999] mb-2">YouTube URL or Video ID</label>
        <div className="flex gap-3">
          <input
            type="text"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleFetch()}
            placeholder="https://www.youtube.com/watch?v=... or video ID"
            className="flex-1 bg-[#080808] border border-[#1E1E1E] text-white placeholder-[#555555] rounded-btn px-4 py-3 text-sm focus:outline-none focus:border-[#FFD200] transition-colors min-h-[44px]"
          />
          <button
            onClick={handleFetch}
            disabled={loading || !url.trim()}
            className="flex items-center gap-2 bg-[#FFD200] text-[#080808] font-bold text-sm px-5 py-3 rounded-btn hover:bg-[#FFE033] transition-colors min-h-[44px] disabled:opacity-50"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <AlignLeft className="w-4 h-4" />}
            {loading ? "Fetching..." : "Fetch"}
          </button>
        </div>
        <p className="text-[#333333] text-xs mt-2">
          Works with any public YouTube video that has captions (auto-generated or manual).
        </p>
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-start gap-3 bg-[#FF3B3B]/5 border border-[#FF3B3B]/20 rounded-btn px-4 py-3 mb-6">
          <AlertCircle className="w-4 h-4 text-[#FF3B3B] mt-0.5 shrink-0" />
          <p className="text-[#FF3B3B] text-sm">{error}</p>
        </div>
      )}

      {/* Result */}
      {result && (
        <div className="bg-[#111111] border border-[#1E1E1E] rounded-card overflow-hidden">
          {/* Stats header */}
          <div className="px-6 py-4 border-b border-[#1E1E1E] flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-1.5 text-xs text-[#999999]">
              <FileText className="w-3.5 h-3.5 text-[#FFD200]" />
              <span className="text-white font-medium">{result.wordCount.toLocaleString()}</span> words
            </div>
            <div className="flex items-center gap-1.5 text-xs text-[#999999]">
              <Clock className="w-3.5 h-3.5 text-[#FFD200]" />
              {result.formattedDuration} video
            </div>
            <div className="text-xs text-[#999999]">
              <span className="text-white font-medium">{result.speakingPaceWpm}</span> wpm speaking pace
            </div>
            <div className="text-xs text-[#555555] ml-auto capitalize">
              {result.trackName} · {result.language}
            </div>
          </div>

          {/* Toolbar */}
          <div className="px-6 py-3 border-b border-[#1E1E1E] flex items-center gap-3 flex-wrap">
            <div className="flex bg-[#080808] rounded-btn p-0.5 gap-0.5">
              <button
                onClick={() => setView("text")}
                className={`px-3 py-1.5 text-xs rounded-md transition-colors ${view === "text" ? "bg-[#1E1E1E] text-white" : "text-[#555555] hover:text-white"}`}
              >
                Full Text
              </button>
              <button
                onClick={() => setView("segments")}
                className={`px-3 py-1.5 text-xs rounded-md transition-colors ${view === "segments" ? "bg-[#1E1E1E] text-white" : "text-[#555555] hover:text-white"}`}
              >
                With Timestamps
              </button>
            </div>

            <div className="ml-auto flex items-center gap-2">
              <button
                onClick={copyText}
                className="flex items-center gap-1.5 text-xs text-[#555555] hover:text-white transition-colors px-3 py-1.5 rounded-btn hover:bg-[#1E1E1E]"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-[#22C55E]" /> : <Copy className="w-3.5 h-3.5" />}
                {copied ? "Copied!" : "Copy"}
              </button>
              <button
                onClick={downloadText}
                className="flex items-center gap-1.5 text-xs text-[#555555] hover:text-white transition-colors px-3 py-1.5 rounded-btn hover:bg-[#1E1E1E]"
              >
                <Download className="w-3.5 h-3.5" />
                Download
              </button>
              <button
                onClick={useForScript}
                className="flex items-center gap-1.5 text-xs bg-[#FFD200]/10 text-[#FFD200] hover:bg-[#FFD200]/20 transition-colors px-3 py-1.5 rounded-btn font-medium"
              >
                <FileText className="w-3.5 h-3.5" />
                Use for Script →
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="p-6 max-h-[500px] overflow-y-auto">
            {view === "text" ? (
              <p className="text-[#999999] text-sm leading-relaxed whitespace-pre-wrap">
                {result.fullText}
              </p>
            ) : (
              <div className="space-y-2">
                {result.segments.map((seg, i) => (
                  <div key={i} className="flex gap-3 group hover:bg-[#0A0A0A] rounded px-2 py-1 -mx-2">
                    <span className="text-[#FFD200] text-xs font-mono shrink-0 mt-0.5 w-10">
                      {formatTime(seg.start)}
                    </span>
                    <span className="text-[#999999] text-sm leading-relaxed">{seg.text}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer tip */}
          <div className="px-6 py-3 border-t border-[#1E1E1E]">
            <p className="text-[#333333] text-xs">
              Tip: Click &ldquo;Use for Script →&rdquo; to pre-fill the Script Writer with this transcript as
              your reference.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
