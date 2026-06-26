"use client";

import { useState } from "react";
import { MessageSquare, Loader2, AlertCircle, Lightbulb, HelpCircle, TrendingUp, Smile } from "lucide-react";

interface Analysis {
  topQuestions: { question: string; frequency: string; videoIdea: string }[];
  painPoints: { issue: string; suggestion: string }[];
  videoIdeas: string[];
  sentiment: { positive: number; neutral: number; negative: number };
  topRequests: string[];
  summary: string;
}

export default function CommentsIntelligence({ isAdmin = false }: { isAdmin?: boolean }) {
  const [videoId, setVideoId] = useState("");
  const [loading, setLoading] = useState(false);
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [totalAnalyzed, setTotalAnalyzed] = useState(0);
  const [error, setError] = useState("");

  async function analyze() {
    setLoading(true);
    setError("");
    setAnalysis(null);
    const params = videoId.trim() ? `?videoId=${videoId.trim()}` : "";
    try {
      const res = await fetch(`/api/channel/comments${params}`);
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Failed to analyze comments"); return; }
      if (!data.analysis) { setError("Not enough comments to analyze yet."); return; }
      setAnalysis(data.analysis);
      setTotalAnalyzed(data.totalAnalyzed || 0);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Analysis failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-3xl">
      <div className="mb-6">
        <h1 className="font-display font-bold text-2xl text-white mb-1 flex items-center gap-2">
          <MessageSquare className="w-6 h-6 text-[#FFD200]" /> Comments Intelligence
        </h1>
        <p className="text-[#555555] text-sm">Analyze viewer comments to find content gaps, unanswered questions, and new video ideas.</p>
      </div>

      <div className="bg-[#111111] border border-[#1E1E1E] rounded-card p-6 mb-6 space-y-4">
        <div>
          <label className="block text-xs text-[#999999] mb-1.5">
            Video ID (optional — leave blank to analyze your connected channel&apos;s comments)
            {isAdmin && <span className="ml-2 text-[#FFD200]">Admin: enter any video ID to analyze comments from any channel</span>}
          </label>
          <input type="text" value={videoId} onChange={e => setVideoId(e.target.value)}
            placeholder="e.g. dQw4w9WgXcQ — or leave blank for whole channel"
            className="w-full bg-[#080808] border border-[#1E1E1E] text-white placeholder-[#555555] rounded-btn px-4 py-3 text-sm focus:outline-none focus:border-[#FFD200]" />
        </div>
        {error && <div className="flex items-start gap-2 text-[#FF3B3B] text-sm"><AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />{error}</div>}
        <button onClick={analyze} disabled={loading}
          className="w-full bg-[#FFD200] text-[#080808] font-bold py-3 rounded-btn hover:bg-[#FFE033] transition-colors disabled:opacity-50 flex items-center justify-center gap-2 text-sm">
          {loading ? <><Loader2 className="w-4 h-4 animate-spin" />Analyzing comments...</> : <><MessageSquare className="w-4 h-4" />Analyze Comments</>}
        </button>
      </div>

      {analysis && (
        <div className="space-y-4">
          <p className="text-[#555555] text-xs">Analyzed {totalAnalyzed} comments</p>

          {/* Sentiment */}
          <div className="bg-[#111111] border border-[#1E1E1E] rounded-card p-5">
            <div className="flex items-center gap-2 mb-3">
              <Smile className="w-4 h-4 text-[#FFD200]" />
              <p className="text-white font-semibold text-sm">Sentiment Overview</p>
            </div>
            <div className="flex gap-2 mb-2">
              {[
                { label: "Positive", val: analysis.sentiment.positive, color: "bg-[#22C55E]" },
                { label: "Neutral", val: analysis.sentiment.neutral, color: "bg-[#555555]" },
                { label: "Negative", val: analysis.sentiment.negative, color: "bg-[#FF3B3B]" },
              ].map(s => (
                <div key={s.label} className="flex-1">
                  <div className="h-2 rounded-full overflow-hidden bg-[#1E1E1E]">
                    <div className={`h-full ${s.color} transition-all`} style={{ width: `${s.val}%` }} />
                  </div>
                  <p className="text-[#555555] text-xs mt-1">{s.label}: {s.val}%</p>
                </div>
              ))}
            </div>
            <p className="text-[#999999] text-sm leading-relaxed">{analysis.summary}</p>
          </div>

          {/* Top Questions */}
          {analysis.topQuestions?.length > 0 && (
            <div className="bg-[#111111] border border-[#1E1E1E] rounded-card p-5">
              <div className="flex items-center gap-2 mb-3">
                <HelpCircle className="w-4 h-4 text-[#FFD200]" />
                <p className="text-white font-semibold text-sm">Unanswered Questions (Video Ideas)</p>
              </div>
              <div className="space-y-3">
                {analysis.topQuestions.map((q, i) => (
                  <div key={i} className="border border-[#1E1E1E] rounded-btn p-3 bg-[#0A0A0A]">
                    <div className="flex items-start justify-between gap-2 mb-1.5">
                      <p className="text-white text-sm">{q.question}</p>
                      <span className={`text-xs px-2 py-0.5 rounded-badge shrink-0 ${q.frequency === "high" ? "bg-[#FF3B3B]/10 text-[#FF3B3B]" : q.frequency === "medium" ? "bg-[#FFD200]/10 text-[#FFD200]" : "bg-[#1E1E1E] text-[#555555]"}`}>
                        {q.frequency}
                      </span>
                    </div>
                    <p className="text-[#22C55E] text-xs flex items-center gap-1.5">
                      <Lightbulb className="w-3 h-3" /> Video idea: {q.videoIdea}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Video Ideas */}
          {analysis.videoIdeas?.length > 0 && (
            <div className="bg-[#111111] border border-[#1E1E1E] rounded-card p-5">
              <div className="flex items-center gap-2 mb-3">
                <Lightbulb className="w-4 h-4 text-[#FFD200]" />
                <p className="text-white font-semibold text-sm">Video Ideas from Comments</p>
              </div>
              <div className="space-y-2">
                {analysis.videoIdeas.map((idea, i) => (
                  <div key={i} className="flex items-start gap-3 p-3 bg-[#0A0A0A] rounded-btn">
                    <span className="text-[#FFD200] text-xs font-bold font-mono shrink-0">{i + 1}</span>
                    <p className="text-[#999999] text-sm">{idea}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Pain Points */}
          {analysis.painPoints?.length > 0 && (
            <div className="bg-[#111111] border border-[#1E1E1E] rounded-card p-5">
              <div className="flex items-center gap-2 mb-3">
                <TrendingUp className="w-4 h-4 text-[#FFD200]" />
                <p className="text-white font-semibold text-sm">Viewer Pain Points</p>
              </div>
              <div className="space-y-3">
                {analysis.painPoints.map((p, i) => (
                  <div key={i} className="border-l-2 border-[#FF3B3B]/40 pl-3">
                    <p className="text-white text-sm">{p.issue}</p>
                    <p className="text-[#555555] text-xs mt-0.5">{p.suggestion}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Top Requests */}
          {analysis.topRequests?.length > 0 && (
            <div className="bg-[#111111] border border-[#1E1E1E] rounded-card p-5">
              <p className="text-white font-semibold text-sm mb-3">Most Requested Content</p>
              <div className="flex flex-wrap gap-2">
                {analysis.topRequests.map((req, i) => (
                  <span key={i} className="px-3 py-1.5 bg-[#FFD200]/10 text-[#FFD200] text-xs rounded-badge border border-[#FFD200]/20">
                    {req}
                  </span>
                ))}
              </div>
            </div>
          )}

          <button onClick={() => { setAnalysis(null); setVideoId(""); }}
            className="w-full bg-[#1E1E1E] text-[#555555] hover:text-white py-3 rounded-btn text-sm transition-colors">
            Analyze Different Video
          </button>
        </div>
      )}
    </div>
  );
}
