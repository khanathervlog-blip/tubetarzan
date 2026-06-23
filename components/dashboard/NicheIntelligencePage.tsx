"use client";

import { useState, useMemo } from "react";
import { DollarSign, ChevronUp, ChevronDown, Calculator } from "lucide-react";

interface NicheData {
  niche: string;
  category: string;
  rpm: number;
  cpm: number;
  competition: "low" | "medium" | "high";
  difficulty: "easy" | "medium" | "hard";
  country: string;
}

// Seeded from the brief — admin can update via Supabase table
const NICHE_DATA: NicheData[] = [
  { niche: "AI Technology", category: "Technology", rpm: 18.0, cpm: 25.0, competition: "high", difficulty: "medium", country: "US" },
  { niche: "Senior Health", category: "Health", rpm: 15.0, cpm: 22.0, competition: "medium", difficulty: "easy", country: "US" },
  { niche: "Personal Finance", category: "Finance", rpm: 12.5, cpm: 18.0, competition: "high", difficulty: "medium", country: "US" },
  { niche: "Self Mastery", category: "Education", rpm: 8.5, cpm: 11.0, competition: "medium", difficulty: "easy", country: "US" },
  { niche: "Car Reviews", category: "Automotive", rpm: 9.0, cpm: 14.0, competition: "medium", difficulty: "medium", country: "US" },
  { niche: "True Crime", category: "Entertainment", rpm: 7.0, cpm: 10.0, competition: "high", difficulty: "medium", country: "US" },
  { niche: "Horror Stories", category: "Entertainment", rpm: 6.0, cpm: 8.0, competition: "medium", difficulty: "easy", country: "US" },
  { niche: "Cooking", category: "Food", rpm: 5.0, cpm: 7.0, competition: "high", difficulty: "medium", country: "US" },
  { niche: "Travel Vlog", category: "Travel", rpm: 4.5, cpm: 6.0, competition: "high", difficulty: "hard", country: "US" },
  { niche: "Islamic Content", category: "Religion", rpm: 3.0, cpm: 4.0, competition: "low", difficulty: "easy", country: "US" },
  { niche: "Mindfulness", category: "Wellness", rpm: 7.5, cpm: 10.5, competition: "medium", difficulty: "easy", country: "US" },
  { niche: "DIY & Crafts", category: "Lifestyle", rpm: 4.0, cpm: 6.0, competition: "medium", difficulty: "medium", country: "US" },
  { niche: "Productivity", category: "Education", rpm: 9.5, cpm: 13.0, competition: "high", difficulty: "medium", country: "US" },
  { niche: "Fitness & Gym", category: "Health", rpm: 6.5, cpm: 9.0, competition: "high", difficulty: "medium", country: "US" },
  { niche: "Crypto & Web3", category: "Finance", rpm: 14.0, cpm: 20.0, competition: "high", difficulty: "hard", country: "US" },
  { niche: "Business Tips", category: "Business", rpm: 11.0, cpm: 16.0, competition: "high", difficulty: "medium", country: "US" },
];

const COMPETITION_COLORS: Record<string, string> = {
  low: "text-[#22C55E] bg-[#22C55E]/10",
  medium: "text-[#FFD200] bg-[#FFD200]/10",
  high: "text-[#FF3B3B] bg-[#FF3B3B]/10",
};

const DIFFICULTY_COLORS: Record<string, string> = {
  easy: "text-[#22C55E] bg-[#22C55E]/10",
  medium: "text-[#FFD200] bg-[#FFD200]/10",
  hard: "text-[#FF3B3B] bg-[#FF3B3B]/10",
};

type SortKey = "rpm" | "cpm" | "competition" | "difficulty" | "niche";
type SortDir = "asc" | "desc";

const COMPETITION_ORDER = { low: 0, medium: 1, high: 2 };
const DIFFICULTY_ORDER = { easy: 0, medium: 1, hard: 2 };

export default function NicheIntelligencePage({
  dbNiches,
}: {
  dbNiches?: NicheData[];
}) {
  const data = dbNiches && dbNiches.length > 0 ? dbNiches : NICHE_DATA;

  const [sortKey, setSortKey] = useState<SortKey>("rpm");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [filterCompetition, setFilterCompetition] = useState<string>("all");
  const [filterDifficulty, setFilterDifficulty] = useState<string>("all");
  const [searchNiche, setSearchNiche] = useState("");

  // Revenue calculator
  const [selectedNiche, setSelectedNiche] = useState<NicheData | null>(null);
  const [viewsPerVideo, setViewsPerVideo] = useState(50000);
  const [videosPerMonth, setVideosPerMonth] = useState(8);

  function handleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === "desc" ? "asc" : "desc"));
    } else {
      setSortKey(key);
      setSortDir("desc");
    }
  }

  const sorted = useMemo(() => {
    return [...data]
      .filter((n) => {
        if (filterCompetition !== "all" && n.competition !== filterCompetition) return false;
        if (filterDifficulty !== "all" && n.difficulty !== filterDifficulty) return false;
        if (searchNiche && !n.niche.toLowerCase().includes(searchNiche.toLowerCase())) return false;
        return true;
      })
      .sort((a, b) => {
        let cmp = 0;
        if (sortKey === "rpm") cmp = a.rpm - b.rpm;
        else if (sortKey === "cpm") cmp = a.cpm - b.cpm;
        else if (sortKey === "competition")
          cmp = COMPETITION_ORDER[a.competition] - COMPETITION_ORDER[b.competition];
        else if (sortKey === "difficulty")
          cmp = DIFFICULTY_ORDER[a.difficulty] - DIFFICULTY_ORDER[b.difficulty];
        else if (sortKey === "niche") cmp = a.niche.localeCompare(b.niche);
        return sortDir === "desc" ? -cmp : cmp;
      });
  }, [data, sortKey, sortDir, filterCompetition, filterDifficulty, searchNiche]);

  // Revenue estimates for selected niche
  const monthlyRevenue = selectedNiche
    ? (viewsPerVideo * videosPerMonth * selectedNiche.rpm) / 1000
    : null;
  const perVideoRevenue = selectedNiche
    ? (viewsPerVideo * selectedNiche.rpm) / 1000
    : null;

  function SortIcon({ k }: { k: SortKey }) {
    if (sortKey !== k) return <span className="text-[#333333] ml-1">↕</span>;
    return sortDir === "desc" ? (
      <ChevronDown className="w-3 h-3 ml-1 text-[#FFD200] inline" />
    ) : (
      <ChevronUp className="w-3 h-3 ml-1 text-[#FFD200] inline" />
    );
  }

  return (
    <div className="max-w-5xl">
      <div className="mb-8">
        <h1 className="font-display font-bold text-2xl text-white mb-1">Niche RPM Intelligence</h1>
        <p className="text-[#555555] text-sm">
          Estimated earnings per 1,000 views by niche. Choose your niche based on revenue potential,
          not just what looks interesting.
        </p>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Table */}
        <div className="lg:col-span-2 space-y-4">
          {/* Filters */}
          <div className="flex flex-wrap gap-3">
            <input
              type="text"
              value={searchNiche}
              onChange={(e) => setSearchNiche(e.target.value)}
              placeholder="Search niches..."
              className="flex-1 min-w-[160px] bg-[#111111] border border-[#1E1E1E] text-white placeholder-[#555555] rounded-btn px-3 py-2 text-sm focus:outline-none focus:border-[#FFD200]"
            />
            <select
              value={filterCompetition}
              onChange={(e) => setFilterCompetition(e.target.value)}
              className="bg-[#111111] border border-[#1E1E1E] text-white rounded-btn px-3 py-2 text-sm focus:outline-none focus:border-[#FFD200]"
            >
              <option value="all">All Competition</option>
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </select>
            <select
              value={filterDifficulty}
              onChange={(e) => setFilterDifficulty(e.target.value)}
              className="bg-[#111111] border border-[#1E1E1E] text-white rounded-btn px-3 py-2 text-sm focus:outline-none focus:border-[#FFD200]"
            >
              <option value="all">All Difficulty</option>
              <option value="easy">Easy</option>
              <option value="medium">Medium</option>
              <option value="hard">Hard</option>
            </select>
          </div>

          {/* Table */}
          <div className="bg-[#111111] border border-[#1E1E1E] rounded-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-[#1E1E1E]">
                    <th
                      className="px-4 py-3 text-left text-xs font-medium text-[#555555] cursor-pointer hover:text-white"
                      onClick={() => handleSort("niche")}
                    >
                      Niche <SortIcon k="niche" />
                    </th>
                    <th
                      className="px-4 py-3 text-right text-xs font-medium text-[#555555] cursor-pointer hover:text-white"
                      onClick={() => handleSort("rpm")}
                    >
                      RPM <SortIcon k="rpm" />
                    </th>
                    <th
                      className="px-4 py-3 text-right text-xs font-medium text-[#555555] cursor-pointer hover:text-white hidden sm:table-cell"
                      onClick={() => handleSort("cpm")}
                    >
                      CPM <SortIcon k="cpm" />
                    </th>
                    <th
                      className="px-4 py-3 text-center text-xs font-medium text-[#555555] cursor-pointer hover:text-white"
                      onClick={() => handleSort("competition")}
                    >
                      Competition <SortIcon k="competition" />
                    </th>
                    <th
                      className="px-4 py-3 text-center text-xs font-medium text-[#555555] cursor-pointer hover:text-white"
                      onClick={() => handleSort("difficulty")}
                    >
                      Difficulty <SortIcon k="difficulty" />
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-[#555555]">
                      Calculate
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {sorted.map((n, i) => (
                    <tr
                      key={n.niche}
                      className={`border-b border-[#0A0A0A] hover:bg-[#0A0A0A] transition-colors ${selectedNiche?.niche === n.niche ? "bg-[#FFD200]/5" : ""}`}
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span className="text-[#555555] text-xs w-5 shrink-0">{i + 1}</span>
                          <div>
                            <p className="text-white text-sm font-medium">{n.niche}</p>
                            <p className="text-[#555555] text-xs">{n.category}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className="text-[#FFD200] font-bold text-sm">
                          ${n.rpm.toFixed(2)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right hidden sm:table-cell">
                        <span className="text-[#999999] text-sm">${n.cpm.toFixed(2)}</span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span
                          className={`text-xs px-2 py-0.5 rounded-full capitalize font-medium ${COMPETITION_COLORS[n.competition]}`}
                        >
                          {n.competition}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span
                          className={`text-xs px-2 py-0.5 rounded-full capitalize font-medium ${DIFFICULTY_COLORS[n.difficulty]}`}
                        >
                          {n.difficulty}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <button
                          onClick={() => setSelectedNiche(selectedNiche?.niche === n.niche ? null : n)}
                          className="text-xs text-[#555555] hover:text-[#FFD200] transition-colors p-1.5 rounded hover:bg-[#1E1E1E]"
                        >
                          <Calculator className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {sorted.length === 0 && (
              <div className="p-8 text-center text-[#555555] text-sm">
                No niches match your filters.
              </div>
            )}
          </div>

          <p className="text-[#333333] text-xs">
            RPM = Revenue Per 1,000 views (what you earn). CPM = Cost Per 1,000 impressions (what
            advertisers pay). Data is an estimate based on industry research · Updated monthly.
          </p>
        </div>

        {/* Revenue Calculator */}
        <div className="space-y-4">
          <div className="bg-[#111111] border border-[#1E1E1E] rounded-card p-5">
            <div className="flex items-center gap-2 mb-4">
              <Calculator className="w-4 h-4 text-[#FFD200]" />
              <h2 className="text-sm font-semibold text-white">Revenue Calculator</h2>
            </div>

            {selectedNiche ? (
              <>
                <div className="bg-[#080808] rounded-btn px-3 py-2 mb-4">
                  <p className="text-[#555555] text-xs">Selected niche</p>
                  <p className="text-[#FFD200] font-bold text-sm">{selectedNiche.niche}</p>
                  <p className="text-[#999999] text-xs">${selectedNiche.rpm.toFixed(2)} RPM</p>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-medium text-[#999999] mb-2">
                      Views per video
                    </label>
                    <input
                      type="number"
                      value={viewsPerVideo}
                      onChange={(e) => setViewsPerVideo(Math.max(0, parseInt(e.target.value) || 0))}
                      className="w-full bg-[#080808] border border-[#1E1E1E] text-white rounded-btn px-3 py-2.5 text-sm focus:outline-none focus:border-[#FFD200]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-[#999999] mb-2">
                      Videos per month
                    </label>
                    <input
                      type="number"
                      value={videosPerMonth}
                      onChange={(e) =>
                        setVideosPerMonth(Math.max(1, parseInt(e.target.value) || 1))
                      }
                      className="w-full bg-[#080808] border border-[#1E1E1E] text-white rounded-btn px-3 py-2.5 text-sm focus:outline-none focus:border-[#FFD200]"
                    />
                  </div>
                </div>

                <div className="mt-5 space-y-3 border-t border-[#1E1E1E] pt-4">
                  <div className="flex justify-between items-center">
                    <span className="text-[#555555] text-xs">Per video</span>
                    <span className="text-white text-sm font-bold">
                      ${perVideoRevenue?.toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-[#555555] text-xs">Per month</span>
                    <span className="text-[#FFD200] text-lg font-bold">
                      ${monthlyRevenue?.toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ",")}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-[#555555] text-xs">Per year</span>
                    <span className="text-[#22C55E] text-sm font-bold">
                      ${((monthlyRevenue || 0) * 12).toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ",")}
                    </span>
                  </div>
                </div>

                <button
                  onClick={() => setSelectedNiche(null)}
                  className="mt-4 w-full text-xs text-[#555555] hover:text-white transition-colors py-2"
                >
                  Clear selection
                </button>
              </>
            ) : (
              <div className="text-center py-6">
                <DollarSign className="w-8 h-8 text-[#333333] mx-auto mb-2" />
                <p className="text-[#555555] text-sm">
                  Click the <Calculator className="w-3.5 h-3.5 inline" /> icon on any niche to
                  calculate its revenue potential.
                </p>
              </div>
            )}
          </div>

          {/* Sweet spot tip */}
          <div className="bg-[#111111] border border-[#FFD200]/10 rounded-card p-4">
            <p className="text-[#FFD200] text-xs font-semibold mb-1">💡 Sweet Spot</p>
            <p className="text-[#999999] text-xs">
              Look for <strong className="text-white">Medium RPM + Low Competition + Easy</strong>{" "}
              niches. &ldquo;Senior Health&rdquo; and &ldquo;Self Mastery&rdquo; are the best risk-adjusted picks for new
              channels.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
