import { NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const svc = await createServiceClient();

  const [{ data: history }, { data: ideas }] = await Promise.all([
    svc.from("user_search_history")
      .select("niche, searched_at")
      .eq("user_id", user.id)
      .order("searched_at", { ascending: false })
      .limit(50),
    svc.from("viral_ideas")
      .select("niche, created_at, title_score, source_vph, source_outlier_ratio")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(500),
  ]);

  // Build niche map with idea stats
  const nicheMap: Record<string, {
    niche: string;
    lastSearched: string | null;
    searchCount: number;
    ideaCount: number;
    avgTitleScore: number | null;
    avgVph: number | null;
    topOutlierRatio: number | null;
  }> = {};

  for (const h of (history || [])) {
    const n = (h as { niche: string; searched_at: string }).niche;
    if (!n) continue;
    if (!nicheMap[n]) {
      nicheMap[n] = { niche: n, lastSearched: null, searchCount: 0, ideaCount: 0, avgTitleScore: null, avgVph: null, topOutlierRatio: null };
    }
    nicheMap[n].searchCount++;
    if (!nicheMap[n].lastSearched) nicheMap[n].lastSearched = (h as { searched_at: string }).searched_at;
  }

  for (const idea of (ideas || [])) {
    const i = idea as { niche: string; title_score: number | null; source_vph: number | null; source_outlier_ratio: number | null };
    const n = i.niche;
    if (!n) continue;
    if (!nicheMap[n]) {
      nicheMap[n] = { niche: n, lastSearched: null, searchCount: 0, ideaCount: 0, avgTitleScore: null, avgVph: null, topOutlierRatio: null };
    }
    nicheMap[n].ideaCount++;
    if (i.title_score) {
      nicheMap[n].avgTitleScore = nicheMap[n].avgTitleScore
        ? Math.round((nicheMap[n].avgTitleScore! + i.title_score) / 2)
        : i.title_score;
    }
    if (i.source_vph) {
      nicheMap[n].avgVph = nicheMap[n].avgVph
        ? Math.round((nicheMap[n].avgVph! + i.source_vph) / 2)
        : Math.round(i.source_vph);
    }
    if (i.source_outlier_ratio && (!nicheMap[n].topOutlierRatio || i.source_outlier_ratio > nicheMap[n].topOutlierRatio!)) {
      nicheMap[n].topOutlierRatio = Math.round(i.source_outlier_ratio * 10) / 10;
    }
  }

  const niches = Object.values(nicheMap).sort((a, b) => {
    if (b.ideaCount !== a.ideaCount) return b.ideaCount - a.ideaCount;
    if (b.lastSearched && a.lastSearched) return new Date(b.lastSearched).getTime() - new Date(a.lastSearched).getTime();
    return 0;
  });

  return NextResponse.json({ niches });
}
