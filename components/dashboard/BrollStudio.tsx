"use client";

import { useState, useRef } from "react";
import { Film, Loader2, Search, Download, Sparkles, AlertCircle, Clock, ExternalLink } from "lucide-react";

interface VideoResult {
  id: string;
  source: "pexels" | "pixabay";
  url: string;
  thumbnailUrl: string;
  duration: number;
  width: number;
  height: number;
  photographer: string;
  attribution: string;
  pageUrl: string;
}

interface KlingTask {
  taskId: string;
  status: "submitted" | "processing" | "succeed" | "failed";
  videoUrl: string | null;
  prompt: string;
}

export default function BrollStudio() {
  const [query, setQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState<VideoResult[]>([]);
  const [searchError, setSearchError] = useState("");
  const [hasSearched, setHasSearched] = useState(false);
  const [pexelsAvailable, setPexelsAvailable] = useState(true);
  const [pixabayAvailable, setPixabayAvailable] = useState(true);
  const [klingAvailable, setKlingAvailable] = useState(true);

  // Kling AI generation
  const [klingPrompt, setKlingPrompt] = useState("");
  const [klingLoading, setKlingLoading] = useState(false);
  const [klingTask, setKlingTask] = useState<KlingTask | null>(null);
  const [klingError, setKlingError] = useState("");
  const [klingUpgradeRequired, setKlingUpgradeRequired] = useState(false);

  const pollingRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  async function handleSearch() {
    if (!query.trim()) return;
    setSearching(true);
    setSearchError("");
    setHasSearched(true);

    try {
      const res = await fetch("/api/broll/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: query.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Search failed");

      setResults(data.results || []);
      setPexelsAvailable(data.pexelsAvailable);
      setPixabayAvailable(data.pixabayAvailable);
      setKlingAvailable(data.klingAvailable);
    } catch (err) {
      setSearchError(err instanceof Error ? err.message : "Search failed");
    } finally {
      setSearching(false);
    }
  }

  async function handleKlingGenerate() {
    if (!klingPrompt.trim()) return;
    setKlingLoading(true);
    setKlingError("");
    setKlingUpgradeRequired(false);
    setKlingTask(null);

    if (pollingRef.current) clearInterval(pollingRef.current);

    try {
      const res = await fetch("/api/broll/kling", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: klingPrompt.trim(), duration: "5", aspectRatio: "16:9" }),
      });
      const data = await res.json();

      if (res.status === 403 && data.upgradeRequired) {
        setKlingUpgradeRequired(true);
        return;
      }
      if (!res.ok) throw new Error(data.error || "Kling AI request failed");

      const task: KlingTask = {
        taskId: data.taskId,
        status: "submitted",
        videoUrl: null,
        prompt: klingPrompt.trim(),
      };
      setKlingTask(task);

      // Poll for completion every 10 seconds
      pollingRef.current = setInterval(async () => {
        try {
          const pollRes = await fetch(`/api/broll/kling?taskId=${data.taskId}`);
          const pollData = await pollRes.json();

          if (pollData.status === "succeed" && pollData.videoUrl) {
            setKlingTask((prev) => prev ? { ...prev, status: "succeed", videoUrl: pollData.videoUrl } : prev);
            if (pollingRef.current) clearInterval(pollingRef.current);
            setKlingLoading(false);
          } else if (pollData.status === "failed") {
            setKlingTask((prev) => prev ? { ...prev, status: "failed" } : prev);
            setKlingError("Generation failed. Try a different prompt.");
            if (pollingRef.current) clearInterval(pollingRef.current);
            setKlingLoading(false);
          } else {
            setKlingTask((prev) => prev ? { ...prev, status: "processing" } : prev);
          }
        } catch {
          // Keep polling even on transient errors
        }
      }, 10000);

      // Timeout after 5 minutes
      setTimeout(() => {
        if (pollingRef.current) {
          clearInterval(pollingRef.current);
          setKlingLoading(false);
          if (klingTask?.status === "processing" || klingTask?.status === "submitted") {
            setKlingError("Generation timed out. Kling AI may be busy — try again.");
          }
        }
      }, 300000);
    } catch (err) {
      setKlingError(err instanceof Error ? err.message : "Kling AI request failed");
      setKlingLoading(false);
    }
  }

  const apiSetupNeeded = !pexelsAvailable && !pixabayAvailable;

  return (
    <div className="max-w-5xl">
      <div className="mb-8">
        <h1 className="font-display font-bold text-2xl text-white mb-1">B-roll Studio</h1>
        <p className="text-[#555555] text-sm">
          Search thousands of free stock videos from Pexels and Pixabay, or generate custom AI
          B-roll with Kling AI.
        </p>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Left: Search */}
        <div className="lg:col-span-2 space-y-6">
          {/* Search input */}
          <div className="bg-[#111111] border border-[#1E1E1E] rounded-card p-6">
            <label className="block text-xs font-medium text-[#999999] mb-2">
              Search Stock Footage
            </label>
            <div className="flex gap-3">
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                placeholder="night sky, meditation, istanbul cityscape..."
                className="flex-1 bg-[#080808] border border-[#1E1E1E] text-white placeholder-[#555555] rounded-btn px-4 py-3 text-sm focus:outline-none focus:border-[#FFD200] transition-colors min-h-[44px]"
              />
              <button
                onClick={handleSearch}
                disabled={searching || !query.trim()}
                className="flex items-center gap-2 bg-[#FFD200] text-[#080808] font-bold text-sm px-5 py-3 rounded-btn hover:bg-[#FFE033] transition-colors min-h-[44px] disabled:opacity-50"
              >
                {searching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                {searching ? "Searching..." : "Search"}
              </button>
            </div>

            {/* API status chips */}
            <div className="flex gap-2 mt-3 flex-wrap">
              <span className={`text-xs px-2 py-0.5 rounded-full ${pexelsAvailable ? "bg-[#22C55E]/10 text-[#22C55E]" : "bg-[#1E1E1E] text-[#555555]"}`}>
                Pexels {pexelsAvailable ? "✓" : "· add PEXELS_API_KEY"}
              </span>
              <span className={`text-xs px-2 py-0.5 rounded-full ${pixabayAvailable ? "bg-[#22C55E]/10 text-[#22C55E]" : "bg-[#1E1E1E] text-[#555555]"}`}>
                Pixabay {pixabayAvailable ? "✓" : "· add PIXABAY_API_KEY"}
              </span>
            </div>
          </div>

          {searchError && (
            <div className="flex items-start gap-3 bg-[#FF3B3B]/5 border border-[#FF3B3B]/20 rounded-btn px-4 py-3">
              <AlertCircle className="w-4 h-4 text-[#FF3B3B] mt-0.5 shrink-0" />
              <p className="text-[#FF3B3B] text-sm">{searchError}</p>
            </div>
          )}

          {/* Results grid */}
          {hasSearched && !searching && (
            <div>
              {results.length === 0 ? (
                <div className="bg-[#111111] border border-[#1E1E1E] rounded-card p-8 text-center">
                  <Film className="w-8 h-8 text-[#333333] mx-auto mb-3" />
                  <p className="text-[#555555] text-sm">
                    {apiSetupNeeded
                      ? "Add PEXELS_API_KEY and PIXABAY_API_KEY to your environment variables to search stock footage."
                      : `No results for "${query}". Try a different keyword.`}
                  </p>
                </div>
              ) : (
                <>
                  <p className="text-[#555555] text-xs mb-3">
                    {results.length} free videos for &ldquo;{query}&rdquo;
                  </p>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {results.map((v) => (
                      <VideoCard key={v.id} video={v} />
                    ))}
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        {/* Right: Kling AI */}
        <div className="space-y-4">
          <div className="bg-[#111111] border border-[#1E1E1E] rounded-card p-5">
            <div className="flex items-center gap-2 mb-4">
              <Sparkles className="w-4 h-4 text-[#FFD200]" />
              <h2 className="text-sm font-semibold text-white">Kling AI Generator</h2>
              <span className="text-[#333333] text-xs ml-auto">Free · 66 credits/day</span>
            </div>

            <p className="text-[#555555] text-xs mb-4">
              Generate a custom 5-second B-roll video from a text prompt using Kling AI.
            </p>

            <textarea
              value={klingPrompt}
              onChange={(e) => setKlingPrompt(e.target.value)}
              rows={4}
              placeholder="A dramatic sunset over ancient ruins, cinematic, 4K quality..."
              className="w-full bg-[#080808] border border-[#1E1E1E] text-white placeholder-[#555555] rounded-btn px-3 py-2.5 text-sm focus:outline-none focus:border-[#FFD200] transition-colors resize-none mb-3"
            />

            {klingUpgradeRequired ? (
              <div className="bg-[#FFD200]/5 border border-[#FFD200]/20 rounded-btn p-3 mb-3">
                <p className="text-[#FFD200] text-xs font-medium">Creator+ required</p>
                <a
                  href="/dashboard/settings?tab=billing"
                  className="text-xs text-[#999999] hover:text-white mt-1 inline-block"
                >
                  Upgrade →
                </a>
              </div>
            ) : null}

            {klingError && (
              <div className="text-[#FF3B3B] text-xs mb-3 flex items-start gap-2">
                <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                {klingError}
              </div>
            )}

            {!klingAvailable && (
              <p className="text-[#555555] text-xs mb-3">
                Add{" "}
                <code className="bg-[#1E1E1E] px-1 py-0.5 rounded text-[#FFD200]">KLING_API_KEY</code>{" "}
                to enable.
              </p>
            )}

            <button
              onClick={handleKlingGenerate}
              disabled={klingLoading || !klingPrompt.trim() || !klingAvailable}
              className="w-full flex items-center justify-center gap-2 bg-[#FFD200] text-[#080808] font-bold text-sm py-3 rounded-btn hover:bg-[#FFE033] transition-colors min-h-[44px] disabled:opacity-50"
            >
              {klingLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Sparkles className="w-4 h-4" />
              )}
              {klingLoading ? "Generating (~3 min)..." : "Generate AI B-roll"}
            </button>
          </div>

          {/* Kling task status */}
          {klingTask && (
            <div className="bg-[#111111] border border-[#1E1E1E] rounded-card p-5">
              <div className="flex items-center gap-2 mb-3">
                {klingTask.status === "succeed" ? (
                  <span className="w-2 h-2 rounded-full bg-[#22C55E]" />
                ) : klingTask.status === "failed" ? (
                  <span className="w-2 h-2 rounded-full bg-[#FF3B3B]" />
                ) : (
                  <Loader2 className="w-3.5 h-3.5 text-[#FFD200] animate-spin" />
                )}
                <span className="text-sm text-white">
                  {klingTask.status === "succeed"
                    ? "Video ready!"
                    : klingTask.status === "failed"
                    ? "Generation failed"
                    : "Generating..."}
                </span>
              </div>

              <p className="text-[#555555] text-xs mb-3 line-clamp-2">{klingTask.prompt}</p>

              {klingTask.status === "processing" || klingTask.status === "submitted" ? (
                <div className="flex items-center gap-2 text-[#555555] text-xs">
                  <Clock className="w-3.5 h-3.5" />
                  Usually ready in 2-4 minutes
                </div>
              ) : null}

              {klingTask.status === "succeed" && klingTask.videoUrl && (
                <div className="space-y-2 mt-2">
                  <video
                    src={klingTask.videoUrl}
                    controls
                    className="w-full rounded-btn bg-[#080808]"
                  />
                  <a
                    href={klingTask.videoUrl}
                    download={`kling-broll-${klingTask.taskId}.mp4`}
                    className="flex items-center justify-center gap-2 bg-[#1E1E1E] text-white text-sm py-2.5 rounded-btn hover:bg-[#2A2A2A] transition-colors"
                  >
                    <Download className="w-4 h-4" />
                    Download Video
                  </a>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function VideoCard({ video }: { video: VideoResult }) {
  const [hovered, setHovered] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  function handleMouseEnter() {
    setHovered(true);
    if (videoRef.current) {
      videoRef.current.play().catch(() => {});
    }
  }

  function handleMouseLeave() {
    setHovered(false);
    if (videoRef.current) {
      videoRef.current.pause();
      videoRef.current.currentTime = 0;
    }
  }

  return (
    <div
      className="relative group rounded-card overflow-hidden bg-[#111111] border border-[#1E1E1E] hover:border-[#333333] transition-colors cursor-pointer"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* Thumbnail */}
      <div className="aspect-video relative overflow-hidden bg-[#080808]">
        <img
          src={video.thumbnailUrl}
          alt={video.attribution}
          className={`w-full h-full object-cover transition-opacity duration-200 ${hovered ? "opacity-0" : "opacity-100"}`}
        />
        <video
          ref={videoRef}
          src={video.url}
          loop
          muted
          playsInline
          className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-200 ${hovered ? "opacity-100" : "opacity-0"}`}
        />
        <div className="absolute bottom-2 right-2 bg-black/70 text-white text-xs px-1.5 py-0.5 rounded">
          {video.duration}s
        </div>
        <div className="absolute top-2 left-2">
          <span
            className={`text-xs px-1.5 py-0.5 rounded font-medium ${
              video.source === "pexels"
                ? "bg-[#05A081]/80 text-white"
                : "bg-[#1D8EB4]/80 text-white"
            }`}
          >
            {video.source === "pexels" ? "Pexels" : "Pixabay"}
          </span>
        </div>
      </div>

      {/* Actions on hover */}
      <div
        className={`absolute inset-0 flex items-center justify-center gap-2 transition-opacity duration-200 ${hovered ? "opacity-100" : "opacity-0"}`}
      >
        <a
          href={video.url}
          download
          onClick={(e) => e.stopPropagation()}
          className="flex items-center gap-1 bg-[#FFD200] text-[#080808] text-xs font-bold px-3 py-2 rounded-btn hover:bg-[#FFE033] transition-colors"
        >
          <Download className="w-3.5 h-3.5" />
          Download
        </a>
        <a
          href={video.pageUrl}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          className="flex items-center gap-1 bg-[#111111]/90 text-white text-xs px-3 py-2 rounded-btn hover:bg-[#1E1E1E] transition-colors"
        >
          <ExternalLink className="w-3.5 h-3.5" />
          View
        </a>
      </div>

      {/* Attribution */}
      <div className="px-2 py-1.5">
        <p className="text-[#555555] text-xs truncate">{video.attribution}</p>
      </div>
    </div>
  );
}
