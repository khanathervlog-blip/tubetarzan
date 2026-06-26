"use client";

import { useState } from "react";
import { LineChart, Loader2, AlertCircle, TrendingDown, Lightbulb, Search } from "lucide-react";

interface RetentionPoint {
  position: number;
  retention: number;
  relativePerformance: number;
}

interface DropOff {
  position: number;
  drop: number;
}

interface AnalysisResult {
  videoId: string;
  videoTitle: string;
  retentionCurve: RetentionPoint[];
  dropOffs: DropOff[];
  avgRetention: number;
  estimated?: boolean;
  analysis: {
    dropOffAnalysis: { position: string; likelyCause: string; fix: string }[];
    overallInsight: string;
    quickWins: string[];
  } | null;
}

interface ChannelVideo {
  video_id: string;
  title: string;
  view_count: number;
}

export default function RetentionAnalysis({ channelVideos }: { channelVideos?: ChannelVideo[] }) {
  const [videoId, setVideoId] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState("");
  const [needsAnalyticsScope, setNeedsAnalyticsScope] = useState(false);
  const [upgradeRequired, setUpgradeRequired] = useState(false);

  async function analyze(vid?: string) {
    const id = (vid || videoId).trim();
    if (!id) return;
    setVideoId(id);
    setLoading(true);
    setError("");
    setResult(null);
    setNeedsAnalyticsScope(false);

    try {
      const res = await fetch(`/api/channel/retention?videoId=${id}`);
      const data = await res.json();
      if (data.upgradeRequired) { setUpgradeRequired(true); return; }
      if (data.needsAnalyticsScope) { setNeedsAnalyticsScope(true); return; }
      if (!res.ok) { setError(data.error || "Analysis failed"); return; }
      setResult(data as AnalysisResult);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Analysis failed");
    } finally {
      setLoading(false);
    }
  }

  if (upgradeRequired) return (
    <div className="max-w-2xl">
      <div className="bg-[#FFD200]/5 border border-[#FFD200]/20 rounded-card p-6 text-center">
        <p className="text-white font-semibold mb-2">Retention Analysis requires Creator plan</p>
        <a href="/#pricing" className="inline-flex items-center gap-2 bg-[#FFD200] text-[#080808] font-bold px-5 py-2.5 rounded-btn text-sm hover:bg-[#FFE033] mt-2">
          Upgrade to Creator →
        </a>
      </div>
    </div>
  );

  return (
    <div className="max-w-3xl">
      <div className="mb-6">
        <h1 className="font-display font-bold text-2xl text-white mb-1 flex items-center gap-2">
          <LineChart className="w-6 h-6 text-[#FFD200]" /> Retention Analysis
        </h1>
        <p className="text-[#555555] text-sm">See exactly where viewers drop off and get AI-powered fixes for each drop-off point.</p>
      </div>

      <div className="bg-[#111111] border border-[#1E1E1E] rounded-card p-6 mb-6 space-y-4">
        <div>
          <label className="block text-xs text-[#999999] mb-1.5">YouTube Video ID</label>
          <div className="flex gap-3">
            <input type="text" value={videoId} onChange={e => setVideoId(e.target.value)}
              onKeyDown={e => e.key === "Enter" && analyze()}
              placeholder="e.g. dQw4w9WgXcQ"
              className="flex-1 bg-[#080808] border border-[#1E1E1E] text-white placeholder-[#555555] rounded-btn px-4 py-3 text-sm focus:outline-none focus:border-[#FFD200]" />
            <button onClick={() => analyze()} disabled={loading || !videoId.trim()}
              className="flex items-center gap-2 bg-[#FFD200] text-[#080808] font-bold px-5 py-3 rounded-btn text-sm hover:bg-[#FFE033] disabled:opacity-50">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
              {loading ? "Analyzing..." : "Analyze"}
            </button>
          </div>
        </div>

        {channelVideos && channelVideos.length > 0 && (
          <div>
            <p className="text-xs text-[#555555] mb-2">Or pick from your channel:</p>
            <div className="max-h-40 overflow-y-auto space-y-1">
              {channelVideos.slice(0, 20).map(v => (
                <button key={v.video_id} onClick={() => analyze(v.video_id)}
                  className="w-full text-left px-3 py-2 rounded-btn hover:bg-[#1E1E1E] transition-colors">
                  <p className="text-white text-sm truncate">{v.title}</p>
                  <p className="text-[#555555] text-xs">{v.view_count?.toLocaleString()} views</p>
                </button>
              ))}
            </div>
          </div>
        )}

        {error && <div className="flex items-start gap-2 text-[#FF3B3B] text-sm"><AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />{error}</div>}
      </div>

      {result && (
        <div className="space-y-4">
          <div className="bg-[#111111] border border-[#1E1E1E] rounded-card p-5">
            <div className="flex items-start justify-between gap-2 mb-1">
              <p className="text-white font-semibold">{result.videoTitle}</p>
              {result.estimated && (
                <span className="shrink-0 text-xs bg-[#555555]/20 border border-[#555555]/40 text-[#999999] px-2 py-0.5 rounded-badge">AI Estimate</span>
              )}
            </div>
            <div className="flex items-center gap-4 mb-5">
              <div className="text-sm">
                <span className={`font-bold text-lg ${result.avgRetention >= 50 ? "text-[#22C55E]" : result.avgRetention >= 35 ? "text-[#FFD200]" : "text-[#FF3B3B]"}`}>
                  {result.avgRetention}%
                </span>
                <span className="text-[#555555] text-xs ml-1.5">avg retention</span>
              </div>
              <span className={`text-xs px-2 py-1 rounded-badge font-bold ${result.avgRetention >= 50 ? "bg-[#22C55E]/10 text-[#22C55E]" : result.avgRetention >= 35 ? "bg-[#FFD200]/10 text-[#FFD200]" : "bg-[#FF3B3B]/10 text-[#FF3B3B]"}`}>
                {result.avgRetention >= 50 ? "Excellent" : result.avgRetention >= 35 ? "Average" : "Needs Work"}
              </span>
            </div>

            {/* Retention curve visualization */}
            <div className="relative h-32 bg-[#080808] rounded-btn overflow-hidden">
              <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="w-full h-full">
                <defs>
                  <linearGradient id="retGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#FFD200" stopOpacity="0.3" />
                    <stop offset="100%" stopColor="#FFD200" stopOpacity="0" />
                  </linearGradient>
                </defs>
                {result.retentionCurve.length > 1 && (
                  <>
                    <polygon
                      fill="url(#retGrad)"
                      points={`0,100 ${result.retentionCurve.map(p => `${p.position},${100 - p.retention}`).join(" ")} 100,100`}
                    />
                    <polyline
                      fill="none"
                      stroke="#FFD200"
                      strokeWidth="1.5"
                      points={result.retentionCurve.map(p => `${p.position},${100 - p.retention}`).join(" ")}
                    />
                    {result.dropOffs.map(d => (
                      <circle key={d.position} cx={d.position} cy={100 - (result.retentionCurve.find(p => p.position === d.position)?.retention || 50)}
                        r="2" fill="#FF3B3B" />
                    ))}
                  </>
                )}
              </svg>
              <div className="absolute bottom-1 left-2 text-[#333333] text-xs">0%</div>
              <div className="absolute bottom-1 right-2 text-[#333333] text-xs">100%</div>
            </div>
            <div className="flex justify-between text-[#333333] text-xs mt-1 px-1">
              <span>Start</span>
              <span>25%</span>
              <span>50%</span>
              <span>75%</span>
              <span>End</span>
            </div>
          </div>

          {result.dropOffs.length > 0 && (
            <div className="bg-[#111111] border border-[#1E1E1E] rounded-card p-5">
              <div className="flex items-center gap-2 mb-3">
                <TrendingDown className="w-4 h-4 text-[#FF3B3B]" />
                <p className="text-white font-semibold text-sm">Biggest Drop-Off Points</p>
              </div>
              <div className="space-y-3">
                {result.dropOffs.map((d, i) => (
                  <div key={i} className="flex items-center gap-3 p-3 bg-[#0A0A0A] rounded-btn">
                    <div className="w-12 shrink-0 text-center">
                      <span className="text-white font-bold text-sm">{d.position}%</span>
                      <p className="text-[#333333] text-xs">mark</p>
                    </div>
                    <div className="h-8 w-px bg-[#1E1E1E]" />
                    <div>
                      <p className="text-[#FF3B3B] text-sm font-semibold">-{d.drop}% viewers left</p>
                      {result.analysis?.dropOffAnalysis?.[i] && (
                        <p className="text-[#555555] text-xs mt-0.5">{result.analysis.dropOffAnalysis[i].likelyCause}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {result.analysis && (
            <>
              <div className="bg-[#111111] border border-[#1E1E1E] rounded-card p-5">
                <div className="flex items-center gap-2 mb-3">
                  <Lightbulb className="w-4 h-4 text-[#FFD200]" />
                  <p className="text-white font-semibold text-sm">AI Analysis</p>
                </div>
                <p className="text-[#999999] text-sm leading-relaxed mb-4">{result.analysis.overallInsight}</p>
                {result.analysis.dropOffAnalysis?.length > 0 && (
                  <div className="space-y-3">
                    {result.analysis.dropOffAnalysis.map((d, i) => (
                      <div key={i} className="border border-[#FF3B3B]/20 bg-[#FF3B3B]/5 rounded-btn p-3">
                        <p className="text-white text-xs font-semibold mb-1">At {d.position} — {d.likelyCause}</p>
                        <p className="text-[#22C55E] text-xs flex items-start gap-1.5">
                          <span className="shrink-0">→</span> Fix: {d.fix}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {result.analysis.quickWins?.length > 0 && (
                <div className="bg-[#111111] border border-[#1E1E1E] rounded-card p-5">
                  <p className="text-white font-semibold text-sm mb-3">Quick Wins for Your Next Video</p>
                  <div className="space-y-2">
                    {result.analysis.quickWins.map((w, i) => (
                      <div key={i} className="flex items-start gap-2.5 text-sm">
                        <span className="text-[#FFD200] font-bold shrink-0">{i + 1}.</span>
                        <p className="text-[#999999]">{w}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}

          <button onClick={() => { setResult(null); setVideoId(""); }}
            className="w-full bg-[#1E1E1E] text-[#555555] hover:text-white py-3 rounded-btn text-sm transition-colors">
            Analyze Another Video
          </button>
        </div>
      )}
    </div>
  );
}
