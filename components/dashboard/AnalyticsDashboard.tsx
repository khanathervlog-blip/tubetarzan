"use client";

import { useState, useEffect } from "react";
import { BarChart3, Lightbulb, Users, Zap, TrendingUp, Calendar, Clock, CheckCircle, Loader2 } from "lucide-react";

interface AnalyticsData {
  plan: string;
  quotaUsedToday: number;
  scansToday: number;
  daysSinceJoined: number;
  ideas: {
    total: number;
    thisWeek: number;
    thisMonth: number;
    perWeekAvg: string;
    byStatus: Record<string, number>;
  };
  competitors: number;
  topNiches: { niche: string; count: number }[];
  recentIdeas: { id: string; video_title: string; niche: string; status: string; created_at: string; title_score: number | null; is_done: boolean }[];
}

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  pending: { label: "Idea", color: "#555555" },
  scripting: { label: "Scripting", color: "#FFB700" },
  recorded: { label: "Recorded", color: "#3B82F6" },
  uploaded: { label: "Uploaded", color: "#22C55E" },
  done: { label: "Done", color: "#22C55E" },
};

function StatCard({ icon: Icon, label, value, sub, color = "#FFD200" }: {
  icon: React.ElementType;
  label: string;
  value: string | number;
  sub?: string;
  color?: string;
}) {
  return (
    <div className="bg-[#111111] border border-[#1E1E1E] rounded-card p-5">
      <div className="flex items-center justify-between mb-3">
        <span className="text-[#555555] text-xs font-medium uppercase tracking-wider">{label}</span>
        <Icon className="w-4 h-4" style={{ color }} />
      </div>
      <p className="font-display font-bold text-2xl text-white">{value}</p>
      {sub && <p className="text-[#555555] text-xs mt-1">{sub}</p>}
    </div>
  );
}

export default function AnalyticsDashboard() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/analytics")
      .then(r => r.json())
      .then(d => setData(d))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 text-[#555555] animate-spin" />
      </div>
    );
  }

  if (!data) {
    return <p className="text-[#555555] text-sm">Failed to load analytics.</p>;
  }

  const statusKeys = Object.keys(data.ideas.byStatus);
  const totalIdeasForStatus = Object.values(data.ideas.byStatus).reduce((a, b) => a + b, 0);

  return (
    <div className="max-w-4xl space-y-6">
      {/* Header */}
      <div className="mb-2">
        <h1 className="font-display font-bold text-2xl text-white mb-1 flex items-center gap-2">
          <BarChart3 className="w-6 h-6 text-[#FFD200]" />
          Your Analytics
        </h1>
        <p className="text-[#555555] text-sm">
          {data.daysSinceJoined > 0 ? `${data.daysSinceJoined} days on TubeTarzan` : "Welcome to TubeTarzan!"} •{" "}
          <span className="capitalize">{data.plan}</span> plan
        </p>
      </div>

      {/* Stat grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard icon={Lightbulb} label="Total Ideas" value={data.ideas.total} sub={`${data.ideas.thisWeek} this week`} />
        <StatCard icon={TrendingUp} label="Ideas / Week" value={data.ideas.perWeekAvg} sub="rolling average" color="#22C55E" />
        <StatCard icon={Users} label="Competitors" value={data.competitors} sub="channels tracked" color="#3B82F6" />
        <StatCard icon={Zap} label="Scans Today" value={data.scansToday} sub="YouTube searches" color="#FF3B3B" />
      </div>

      {/* Pipeline + Top Niches */}
      <div className="grid md:grid-cols-2 gap-4">
        {/* Content Pipeline */}
        <div className="bg-[#111111] border border-[#1E1E1E] rounded-card p-5">
          <h3 className="font-semibold text-white mb-4 flex items-center gap-2">
            <Calendar className="w-4 h-4 text-[#FFD200]" />
            Content Pipeline
          </h3>
          {statusKeys.length === 0 ? (
            <p className="text-[#555555] text-sm">No ideas yet. Start from the Intelligence Board.</p>
          ) : (
            <div className="space-y-3">
              {statusKeys.map(key => {
                const count = data.ideas.byStatus[key];
                const pct = totalIdeasForStatus > 0 ? Math.round((count / totalIdeasForStatus) * 100) : 0;
                const { label, color } = STATUS_LABELS[key] || { label: key, color: "#555555" };
                return (
                  <div key={key}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm" style={{ color }}>{label}</span>
                      <span className="text-white text-sm font-semibold">{count}</span>
                    </div>
                    <div className="h-1.5 bg-[#1E1E1E] rounded-full overflow-hidden">
                      <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: color }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Top Niches */}
        <div className="bg-[#111111] border border-[#1E1E1E] rounded-card p-5">
          <h3 className="font-semibold text-white mb-4 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-[#FFD200]" />
            Your Top Niches
          </h3>
          {data.topNiches.length === 0 ? (
            <p className="text-[#555555] text-sm">No ideas yet. Search a niche on the Intelligence Board.</p>
          ) : (
            <div className="space-y-3">
              {data.topNiches.map((n, i) => (
                <div key={n.niche} className="flex items-center gap-3">
                  <span className="text-[#555555] text-xs w-4 shrink-0">{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-sm truncate capitalize">{n.niche}</p>
                  </div>
                  <span className="text-[#FFD200] text-xs font-semibold shrink-0">{n.count} idea{n.count !== 1 ? "s" : ""}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Monthly overview */}
      <div className="bg-[#111111] border border-[#1E1E1E] rounded-card p-5">
        <h3 className="font-semibold text-white mb-4 flex items-center gap-2">
          <Clock className="w-4 h-4 text-[#FFD200]" />
          This Month
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center">
            <p className="font-display font-bold text-2xl text-white">{data.ideas.thisMonth}</p>
            <p className="text-[#555555] text-xs mt-1">Ideas created</p>
          </div>
          <div className="text-center">
            <p className="font-display font-bold text-2xl text-white">{data.ideas.byStatus["uploaded"] || 0}</p>
            <p className="text-[#555555] text-xs mt-1">Videos uploaded</p>
          </div>
          <div className="text-center">
            <p className="font-display font-bold text-2xl text-white">{data.quotaUsedToday}</p>
            <p className="text-[#555555] text-xs mt-1">API quota today</p>
          </div>
          <div className="text-center">
            <p className="font-display font-bold text-2xl text-[#22C55E]">{data.ideas.byStatus["done"] || 0}</p>
            <p className="text-[#555555] text-xs mt-1">Ideas done</p>
          </div>
        </div>
      </div>

      {/* Recent Ideas */}
      {data.recentIdeas.length > 0 && (
        <div className="bg-[#111111] border border-[#1E1E1E] rounded-card p-5">
          <h3 className="font-semibold text-white mb-4 flex items-center gap-2">
            <Lightbulb className="w-4 h-4 text-[#FFD200]" />
            Recent Ideas
          </h3>
          <div className="space-y-3">
            {data.recentIdeas.map(idea => {
              const statusInfo = STATUS_LABELS[idea.status] || { label: idea.status, color: "#555555" };
              return (
                <div key={idea.id} className="flex items-center gap-3 p-3 bg-[#080808] rounded-btn">
                  {idea.is_done
                    ? <CheckCircle className="w-4 h-4 text-[#22C55E] shrink-0" />
                    : <Lightbulb className="w-4 h-4 text-[#555555] shrink-0" />
                  }
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-sm truncate">{idea.video_title}</p>
                    <p className="text-[#555555] text-xs capitalize">{idea.niche}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {idea.title_score != null && (
                      <span className={`text-xs font-semibold ${idea.title_score >= 80 ? "text-[#22C55E]" : idea.title_score >= 60 ? "text-[#FFB700]" : "text-[#FF3B3B]"}`}>
                        {idea.title_score}/100
                      </span>
                    )}
                    <span className="text-xs px-2 py-0.5 rounded-badge" style={{ color: statusInfo.color, background: `${statusInfo.color}15` }}>
                      {statusInfo.label}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
          <a href="/dashboard/ideas" className="block mt-4 text-center text-xs text-[#555555] hover:text-[#FFD200] transition-colors">
            View all ideas in Idea Tracker →
          </a>
        </div>
      )}

      {/* Empty state */}
      {data.ideas.total === 0 && (
        <div className="bg-[#111111] border border-[#1E1E1E] rounded-card p-8 text-center">
          <BarChart3 className="w-10 h-10 text-[#1E1E1E] mx-auto mb-3" />
          <p className="text-white font-semibold mb-1">No data yet</p>
          <p className="text-[#555555] text-sm mb-4">Search a niche on the Intelligence Board to start generating ideas.</p>
          <a href="/dashboard" className="inline-flex items-center gap-2 bg-[#FFD200] text-[#080808] font-bold px-4 py-2.5 rounded-btn text-sm hover:bg-[#FFE033]">
            Go to Intelligence Board →
          </a>
        </div>
      )}
    </div>
  );
}
