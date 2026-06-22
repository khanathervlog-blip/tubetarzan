"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { Zap, X, Trash2, Info } from "lucide-react";
import NicheBar from "./NicheBar";
import QuotaMeter from "./QuotaMeter";
import ResultsToolbar from "./ResultsToolbar";
import IntelligenceBoardTable from "./IntelligenceBoardTable";
import GeneratePanel from "./GeneratePanel";
import IdeaTracker from "./IdeaTracker";
import type { EnrichedVideo, SearchResponse, GeneratedIdea } from "@/types/youtube";
import type { Profile } from "@/types/database";

type SortKey = "viralScore" | "vph" | "outlierRatio" | "viewCount" | "newest" | "oldest";

interface StoredSearch {
  id: number;
  niche: string;
  results: SearchResponse;
  timestamp: number;
}

interface SearchFilter {
  sortBy: SortKey;
  patternFilter: string;
  subNicheFilter: string;
}

interface IntelligenceBoardPageProps {
  profile: Pick<
    Profile,
    | "subscription_plan"
    | "youtube_quota_used_today"
    | "youtube_quota_reset_date"
    | "scans_today"
    | "scans_reset_date"
  >;
  isAdmin?: boolean;
}

export default function IntelligenceBoardPage({
  profile,
  isAdmin = false,
}: IntelligenceBoardPageProps) {
  const plan = profile.subscription_plan || "free";

  const [searches, setSearches] = useState<StoredSearch[]>([]);
  const [filters, setFilters] = useState<Record<number, SearchFilter>>({});
  const [isSearching, setIsSearching] = useState(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);
  const [searchError, setSearchError] = useState("");

  const today = new Date().toISOString().split("T")[0];
  const initialQuotaUsed =
    profile.youtube_quota_reset_date === today
      ? profile.youtube_quota_used_today || 0
      : 0;
  const initialScansToday =
    profile.scans_reset_date === today ? profile.scans_today || 0 : 0;
  const [quotaUsed, setQuotaUsed] = useState(initialQuotaUsed);
  const [scansToday, setScansToday] = useState(initialScansToday);

  const [generateVideo, setGenerateVideo] = useState<EnrichedVideo | null>(null);
  const [generateNiche, setGenerateNiche] = useState("");
  const [generatedIdea, setGeneratedIdea] = useState<GeneratedIdea | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [ideaTrackerRefresh, setIdeaTrackerRefresh] = useState(0);

  const [toast, setToast] = useState<string | null>(null);

  const showToast = useCallback((msg: string, duration = 2500) => {
    setToast(msg);
    setTimeout(() => setToast(null), duration);
  }, []);

  // Load search history from database on mount
  useEffect(() => {
    const cap = isAdmin ? 10 : 3;
    fetch("/api/searches/history")
      .then((r) => r.json())
      .then((data) => {
        if (data.searches) {
          const loaded: StoredSearch[] = (
            data.searches as {
              id: number;
              niche: string;
              results: SearchResponse;
              searched_at: string;
            }[]
          ).map((s) => ({
            id: s.id,
            niche: s.niche,
            results: s.results,
            timestamp: new Date(s.searched_at).getTime(),
          }));
          setSearches(loaded.slice(0, cap));
        }
      })
      .catch(() => {})
      .finally(() => setIsLoadingHistory(false));
  }, [isAdmin]);

  const nicheParamRef = useRef(false);
  useEffect(() => {
    if (isLoadingHistory || nicheParamRef.current) return;
    const params = new URLSearchParams(window.location.search);
    const niche = params.get("niche");
    if (niche) {
      nicheParamRef.current = true;
      handleSearch(niche);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoadingHistory]);

  const scanLimit = isAdmin ? null : plan === "free" || plan === "creator" ? 3 : null;

  async function handleSearch(niche: string) {
    setIsSearching(true);
    setSearchError("");
    try {
      const res = await fetch("/api/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ niche }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (data.requiresApiKey) {
          setSearchError("Please set up your YouTube API key in Settings first.");
        } else if (data.limitReached) {
          setSearchError(
            data.error || "Daily scan limit reached. Upgrade to unlock more scans."
          );
        } else {
          setSearchError(data.error || "Search failed. Please try again.");
        }
        return;
      }

      // Save to DB and get the server-assigned ID
      let dbId = Date.now();
      let searchedAt = new Date().toISOString();
      try {
        const histRes = await fetch("/api/searches/history", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ niche, results: data }),
        });
        if (histRes.ok) {
          const histData = await histRes.json();
          dbId = histData.id;
          searchedAt = histData.searched_at;
        }
      } catch {
        // non-fatal — results still show in current session
      }

      const newSearch: StoredSearch = {
        id: dbId,
        niche,
        results: data as SearchResponse,
        timestamp: new Date(searchedAt).getTime(),
      };

      const searchCap = isAdmin ? 10 : 3;
      setSearches((prev) => [newSearch, ...prev].slice(0, searchCap));
      setScansToday(data.scansDone || scansToday);
      if (!data.fromCache) {
        setQuotaUsed((q) => q + (data.quotaUsed || 0));
      }
      if (data.cacheError && isAdmin) {
        showToast(`⚠ Admin: ${data.cacheError}`, 8000);
      }
    } catch {
      setSearchError("Network error. Please try again.");
    } finally {
      setIsSearching(false);
    }
  }

  function removeSearch(id: number) {
    setSearches((prev) => prev.filter((s) => s.id !== id));
    setFilters((f) => {
      const next = { ...f };
      delete next[id];
      return next;
    });
    fetch(`/api/searches/history/${id}`, { method: "DELETE" }).catch(() => {});
  }

  function clearAll() {
    setSearches([]);
    setFilters({});
    fetch("/api/searches/history", { method: "DELETE" }).catch(() => {});
  }

  function getFilter(id: number): SearchFilter {
    return (
      filters[id] || { sortBy: "viralScore", patternFilter: "All", subNicheFilter: "All" }
    );
  }

  function updateFilter(id: number, update: Partial<SearchFilter>) {
    setFilters((f) => ({ ...f, [id]: { ...getFilter(id), ...update } }));
  }

  function getFilteredVideos(search: StoredSearch): EnrichedVideo[] {
    if (!search.results?.videos) return [];
    const f = getFilter(search.id);
    let vids = [...search.results.videos];
    if (f.patternFilter !== "All") vids = vids.filter((v) => v.pattern === f.patternFilter);
    if (f.subNicheFilter !== "All")
      vids = vids.filter((v) => v.detectedSubNiche === f.subNicheFilter);
    switch (f.sortBy) {
      case "vph":
        vids.sort((a, b) => b.vph - a.vph);
        break;
      case "outlierRatio":
        vids.sort((a, b) => b.outlierRatio - a.outlierRatio);
        break;
      case "viewCount":
        vids.sort((a, b) => b.viewCount - a.viewCount);
        break;
      case "newest":
        vids.sort(
          (a, b) =>
            new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
        );
        break;
      case "oldest":
        vids.sort(
          (a, b) =>
            new Date(a.publishedAt).getTime() - new Date(b.publishedAt).getTime()
        );
        break;
      default:
        vids.sort((a, b) => b.viralScore - a.viralScore);
    }
    return vids;
  }

  async function handleGenerate(video: EnrichedVideo, niche: string) {
    setGenerateVideo(video);
    setGenerateNiche(niche);
    setGeneratedIdea(null);
    setIsGenerating(true);
    try {
      const res = await fetch("/api/ideas/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sourceVideo: video, niche }),
      });
      const data = await res.json();
      if (!res.ok) {
        showToast(data.error || "Failed to generate idea");
        setGenerateVideo(null);
        return;
      }
      setGeneratedIdea(data as GeneratedIdea);
    } catch {
      showToast("Generation failed. Please try again.");
      setGenerateVideo(null);
    } finally {
      setIsGenerating(false);
    }
  }

  async function handleSaveIdea() {
    if (!generatedIdea || !generateVideo) return;
    const res = await fetch("/api/ideas/save", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        idea: generatedIdea,
        sourceVideo: generateVideo,
        niche: generateNiche,
      }),
    });
    if (!res.ok) throw new Error("Save failed");
    setIdeaTrackerRefresh((k) => k + 1);
    setGenerateVideo(null);
    setGeneratedIdea(null);
  }

  function searchTimeLabel(timestamp: number): string {
    const date = new Date(timestamp);
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();
    const timeStr = date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
    if (isToday) return `today at ${timeStr}`;
    return `yesterday at ${timeStr}`;
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="font-display font-bold text-2xl text-white mb-1 flex items-center gap-2">
            <Zap className="w-6 h-6 text-[#FFD200] fill-[#FFD200]" />
            Intelligence Board
            {isAdmin && (
              <span className="text-xs font-normal bg-[#FFD200]/20 text-[#FFD200] px-2 py-0.5 rounded-badge">
                Admin
              </span>
            )}
          </h1>
          <p className="text-[#555555] text-sm">Find viral opportunities in your niche</p>
        </div>
        {searches.length > 0 && (
          <button
            onClick={clearAll}
            className="flex items-center gap-2 text-xs text-[#555555] hover:text-[#FF3B3B] border border-[#1E1E1E] hover:border-[#FF3B3B]/40 px-3 py-2 rounded-btn transition-colors whitespace-nowrap min-h-[36px]"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Clear All Results
          </button>
        )}
      </div>

      {/* Search bar */}
      <NicheBar
        onSearch={handleSearch}
        isLoading={isSearching}
        fromCache={searches[0]?.results?.fromCache}
        scansToday={scansToday}
        scanLimit={scanLimit}
      />

      {/* Quota meter */}
      {(searches.length > 0 || plan === "free" || plan === "creator" || isAdmin) && (
        <QuotaMeter usedToday={quotaUsed} limit={10000} plan={plan} isAdmin={isAdmin} />
      )}

      {/* Persistence note */}
      {searches.length > 0 && (
        <div className="flex items-start gap-2 bg-[#111111] border border-[#1E1E1E] rounded-card px-4 py-3 mb-6 text-[#555555] text-xs">
          <Info className="w-3.5 h-3.5 mt-0.5 shrink-0 text-[#555555]" />
          <span>
            Results are saved to your account and reload automatically after login. Use{" "}
            <span className="text-white font-medium">Generate Idea</span> to permanently
            save any video to your Idea Tracker.
          </span>
        </div>
      )}

      {/* Error */}
      {searchError && (
        <div className="bg-[#FF3B3B]/10 border border-[#FF3B3B]/20 rounded-card px-4 py-3 mb-6 text-[#FF3B3B] text-sm">
          {searchError}
          {searchError.includes("Settings") && (
            <a href="/dashboard/settings" className="underline ml-1 font-medium">
              Go to Settings →
            </a>
          )}
          {searchError.includes("Upgrade") && (
            <a href="/#pricing" className="underline ml-1 font-medium">
              See Plans →
            </a>
          )}
        </div>
      )}

      {/* Active search skeleton */}
      {isSearching && (
        <div className="space-y-2 mb-8">
          {[...Array(8)].map((_, i) => (
            <div
              key={i}
              className="h-14 bg-[#111111] border border-[#1E1E1E] rounded-card animate-pulse"
            />
          ))}
        </div>
      )}

      {/* History loading skeleton */}
      {isLoadingHistory && !isSearching && (
        <div className="space-y-2 mb-8">
          {[...Array(2)].map((_, i) => (
            <div
              key={i}
              className="h-14 bg-[#111111] border border-[#1E1E1E] rounded-card animate-pulse opacity-40"
            />
          ))}
        </div>
      )}

      {/* Search result sections */}
      {searches.map((search) => {
        const f = getFilter(search.id);
        const filteredVids = getFilteredVideos(search);
        return (
          <div key={search.id} className="mb-10">
            <div className="flex items-center justify-between mb-3 pb-3 border-b border-[#1E1E1E]">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-semibold text-white text-sm">
                  &ldquo;{search.niche}&rdquo;
                </span>
                <span className="text-[#555555] text-xs">
                  {searchTimeLabel(search.timestamp)}
                </span>
                {search.results.fromCache && (
                  <span className="text-[#22C55E] text-xs bg-[#22C55E]/10 px-2 py-0.5 rounded-badge">
                    cached
                  </span>
                )}
                <span className="text-[#555555] text-xs">
                  {search.results.totalFound} videos
                </span>
              </div>
              <button
                onClick={() => removeSearch(search.id)}
                className="text-[#555555] hover:text-[#FF3B3B] transition-colors p-1"
                title="Remove this search"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {search.results.totalFound > 0 ? (
              <>
                <ResultsToolbar
                  totalFound={filteredVids.length}
                  niche={search.niche}
                  fromCache={search.results.fromCache}
                  sortBy={f.sortBy}
                  onSortChange={(v) => updateFilter(search.id, { sortBy: v })}
                  patternFilter={f.patternFilter}
                  onPatternChange={(v) => updateFilter(search.id, { patternFilter: v })}
                  subNicheFilter={f.subNicheFilter}
                  onSubNicheChange={(v) =>
                    updateFilter(search.id, { subNicheFilter: v })
                  }
                  subNiches={search.results.subNiches}
                  onRefresh={() => handleSearch(search.niche)}
                  isLoading={isSearching}
                />
                {filteredVids.length > 0 ? (
                  <IntelligenceBoardTable
                    videos={filteredVids}
                    niche={search.niche}
                    plan={plan}
                    isAdmin={isAdmin}
                    onGenerate={(v) => handleGenerate(v, search.niche)}
                    onTagsSaved={() => {}}
                    showToast={showToast}
                  />
                ) : (
                  <div className="bg-[#111111] border border-[#1E1E1E] rounded-card px-6 py-8 text-center">
                    <p className="text-[#555555] text-sm">
                      No videos match this filter — try removing a filter
                    </p>
                  </div>
                )}
              </>
            ) : (
              <div className="bg-[#111111] border border-[#1E1E1E] rounded-card px-6 py-8 text-center">
                <p className="text-[#555555] text-sm">
                  No results found for &apos;{search.niche}&apos;. Try a broader niche or
                  different keywords.
                </p>
              </div>
            )}
          </div>
        );
      })}

      {/* Empty state */}
      {!isSearching && !isLoadingHistory && searches.length === 0 && !searchError && (
        <div className="bg-[#111111] border border-[#1E1E1E] rounded-card px-6 py-12 text-center mt-4">
          <Zap className="w-10 h-10 text-[#333333] mx-auto mb-4" />
          <p className="text-white font-semibold mb-2">
            Enter a niche above and click Search Now
          </p>
          <p className="text-[#555555] text-sm">
            TubeTarzan runs 18 viral pattern searches and scores 200+ videos for you.
          </p>
        </div>
      )}

      {/* Idea Tracker */}
      <IdeaTracker showToast={showToast} refreshKey={ideaTrackerRefresh} />

      {/* Generate Panel */}
      {generateVideo && (
        <GeneratePanel
          video={generateVideo}
          idea={generatedIdea}
          isGenerating={isGenerating}
          onClose={() => {
            setGenerateVideo(null);
            setGeneratedIdea(null);
          }}
          onRegenerate={() => handleGenerate(generateVideo, generateNiche)}
          onSave={handleSaveIdea}
          showToast={showToast}
        />
      )}

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 right-6 bg-[#111111] border border-[#1E1E1E] text-white text-sm px-4 py-3 rounded-card shadow-2xl z-50 animate-slide-up">
          {toast}
        </div>
      )}
    </div>
  );
}
