"use client";

import { useState } from "react";
import { Search, Loader2 } from "lucide-react";

interface NicheBarProps {
  onSearch: (niche: string) => void;
  isLoading: boolean;
  fromCache?: boolean;
  cachedAt?: string;
  scansToday?: number;
  scanLimit?: number | null;
}

export default function NicheBar({
  onSearch,
  isLoading,
  fromCache,
  cachedAt,
  scansToday = 0,
  scanLimit,
}: NicheBarProps) {
  const [niche, setNiche] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (niche.trim().length >= 2 && !isLoading) {
      onSearch(niche.trim());
    }
  }

  function cacheAge(): string {
    if (!cachedAt) return "";
    const hours = (Date.now() - new Date(cachedAt).getTime()) / (1000 * 60 * 60);
    if (hours < 1) return `${Math.round(hours * 60)}m ago`;
    return `${Math.round(hours)}h ago`;
  }

  const scansLabel =
    scanLimit === null
      ? "Unlimited scans"
      : `${scansToday}/${scanLimit} scans today`;

  return (
    <form onSubmit={handleSubmit} className="mb-6">
      <div className="flex gap-3">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#555555]" />
          <input
            type="text"
            value={niche}
            onChange={(e) => setNiche(e.target.value)}
            placeholder="Enter your niche (e.g. self mastery, travel vlog, personal finance)"
            className="w-full pl-10 pr-4 py-3 bg-[#111111] border border-[#1E1E1E] rounded-btn text-white placeholder-[#555555] text-sm focus:outline-none focus:border-[#FF3B3B] transition-colors min-h-[44px]"
            disabled={isLoading}
            maxLength={100}
          />
        </div>
        <button
          type="submit"
          disabled={isLoading || niche.trim().length < 2}
          className="bg-[#FF3B3B] hover:bg-[#FF5555] disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold px-6 py-3 rounded-btn transition-colors flex items-center gap-2 min-h-[44px] whitespace-nowrap"
        >
          {isLoading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Searching...
            </>
          ) : (
            <>
              <Search className="w-4 h-4" />
              Search Now
            </>
          )}
        </button>
      </div>

      <div className="flex items-center gap-4 mt-2 text-xs text-[#555555]">
        <span>{scansLabel}</span>
        {fromCache && cachedAt && (
          <span className="text-[#22C55E]">
            ✓ Cached result from {cacheAge()} · saves quota
          </span>
        )}
      </div>
    </form>
  );
}
