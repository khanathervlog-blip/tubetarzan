"use client";

import { RefreshCw } from "lucide-react";

export type SortKey = "viralScore" | "vph" | "outlierRatio" | "viewCount" | "newest" | "oldest" | "engagement" | "recency";
export type AgeFilter = "all" | "momentum" | "proven" | "evergreen";

interface ResultsToolbarProps {
  totalFound: number;
  niche: string;
  fromCache: boolean;
  sortBy: SortKey;
  onSortChange: (s: SortKey) => void;
  ageFilter: AgeFilter;
  onAgeFilterChange: (a: AgeFilter) => void;
  patternFilter: string;
  onPatternChange: (p: string) => void;
  subNicheFilter: string;
  onSubNicheChange: (s: string) => void;
  subNiches: string[];
  onRefresh: () => void;
  isLoading: boolean;
}

const SORT_OPTIONS: { label: string; value: SortKey }[] = [
  { label: "Viral Score", value: "viralScore" },
  { label: "Engagement", value: "engagement" },
  { label: "Recency", value: "recency" },
  { label: "VPH", value: "vph" },
  { label: "Outlier", value: "outlierRatio" },
  { label: "Total Views", value: "viewCount" },
  { label: "Newest", value: "newest" },
  { label: "Oldest", value: "oldest" },
];

const AGE_FILTERS: { label: string; value: AgeFilter; description: string }[] = [
  { label: "All Time", value: "all", description: "All videos" },
  { label: "Momentum", value: "momentum", description: "0–14 days — trending now" },
  { label: "Proven", value: "proven", description: "0–6 months — validated ideas" },
  { label: "Evergreen", value: "evergreen", description: "6+ months — timeless content" },
];

const PATTERNS = [
  "All","Things Not To Do","Dark Side","Mistakes","Best Places",
  "Worth It?","Secrets","Exposed","First Impression","Comparison",
  "Transformation","Tips",
];

export default function ResultsToolbar({
  totalFound, niche, fromCache, sortBy, onSortChange,
  ageFilter, onAgeFilterChange,
  patternFilter, onPatternChange, subNicheFilter, onSubNicheChange,
  subNiches, onRefresh, isLoading,
}: ResultsToolbarProps) {
  return (
    <div className="mb-4 space-y-3">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <p className="text-[#999999] text-sm">
          <span className="text-white font-semibold">{totalFound}</span> videos found in{" "}
          <span className="text-[#FFD200]">&apos;{niche}&apos;</span>
        </p>
        {fromCache && (
          <button
            onClick={onRefresh}
            disabled={isLoading}
            className="flex items-center gap-1.5 text-xs text-[#555555] hover:text-white transition-colors disabled:opacity-50"
          >
            <RefreshCw className="w-3 h-3" />
            Cached · Refresh
          </button>
        )}
      </div>

      {/* Sort */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-[#555555] text-xs">Sort by:</span>
        {SORT_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            onClick={() => onSortChange(opt.value)}
            className={`text-xs px-3 py-1.5 rounded-badge transition-colors min-h-[32px] ${
              sortBy === opt.value
                ? "bg-[#FF3B3B] text-white font-medium"
                : "bg-[#111111] border border-[#1E1E1E] text-[#999999] hover:text-white"
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {/* Age filter */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-[#555555] text-xs">Age:</span>
        {AGE_FILTERS.map((af) => (
          <button
            key={af.value}
            onClick={() => onAgeFilterChange(af.value)}
            title={af.description}
            className={`text-xs px-3 py-1.5 rounded-badge transition-colors min-h-[32px] ${
              ageFilter === af.value
                ? "bg-[#22C55E]/20 border border-[#22C55E]/40 text-[#22C55E] font-medium"
                : "bg-[#111111] border border-[#1E1E1E] text-[#999999] hover:text-white"
            }`}
          >
            {af.label}
          </button>
        ))}
      </div>

      {/* Pattern filter */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-[#555555] text-xs">Pattern:</span>
        {PATTERNS.map((p) => (
          <button
            key={p}
            onClick={() => onPatternChange(p)}
            className={`text-xs px-3 py-1.5 rounded-badge transition-colors min-h-[32px] ${
              patternFilter === p
                ? "bg-[#FFD200] text-[#080808] font-medium"
                : "bg-[#111111] border border-[#1E1E1E] text-[#999999] hover:text-white"
            }`}
          >
            {p}
          </button>
        ))}
      </div>

      {/* Sub-niche filter */}
      {subNiches.length > 0 && (
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[#555555] text-xs">Sub-niche:</span>
          <button
            onClick={() => onSubNicheChange("All")}
            className={`text-xs px-3 py-1.5 rounded-badge transition-colors min-h-[32px] ${
              subNicheFilter === "All"
                ? "bg-[#FFD200] text-[#080808] font-medium"
                : "bg-[#111111] border border-[#1E1E1E] text-[#999999] hover:text-white"
            }`}
          >
            All
          </button>
          {subNiches.map((s) => (
            <button
              key={s}
              onClick={() => onSubNicheChange(s)}
              className={`text-xs px-3 py-1.5 rounded-badge transition-colors min-h-[32px] ${
                subNicheFilter === s
                  ? "bg-[#FFD200] text-[#080808] font-medium"
                  : "bg-[#111111] border border-[#1E1E1E] text-[#999999] hover:text-white"
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
