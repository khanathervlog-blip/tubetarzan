import { NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const svc = await createServiceClient();
  const now = new Date();
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();

  const [
    { data: profile },
    { count: totalIdeas },
    { count: ideasThisWeek },
    { count: ideasThisMonth },
    { data: ideasByStatus },
    { count: totalCompetitors },
    { data: topNiches },
    { data: recentIdeas },
  ] = await Promise.all([
    svc.from("profiles")
      .select("subscription_plan, youtube_quota_used_today, scans_today, scans_reset_date, created_at")
      .eq("id", user.id)
      .single(),

    svc.from("viral_ideas")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id),

    svc.from("viral_ideas")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .gte("created_at", weekAgo),

    svc.from("viral_ideas")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .gte("created_at", monthAgo),

    svc.from("viral_ideas")
      .select("status")
      .eq("user_id", user.id),

    svc.from("competitors")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id),

    svc.from("viral_ideas")
      .select("niche")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(200),

    svc.from("viral_ideas")
      .select("id, video_title, niche, status, created_at, title_score, is_done")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(5),
  ]);

  // Count ideas by status
  const statusCounts: Record<string, number> = {};
  for (const idea of (ideasByStatus || [])) {
    const s = (idea as { status: string }).status || "pending";
    statusCounts[s] = (statusCounts[s] || 0) + 1;
  }

  // Top niches
  const nicheCounts: Record<string, number> = {};
  for (const idea of (topNiches || [])) {
    const n = (idea as { niche: string }).niche;
    if (n) nicheCounts[n] = (nicheCounts[n] || 0) + 1;
  }
  const topNicheList = Object.entries(nicheCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([niche, count]) => ({ niche, count }));

  // Days since joined
  const p = profile as { subscription_plan: string; youtube_quota_used_today: number; scans_today: number; created_at: string } | null;
  const daysSinceJoined = p?.created_at
    ? Math.floor((now.getTime() - new Date(p.created_at).getTime()) / (1000 * 60 * 60 * 24))
    : 0;

  const ideasPerWeek = daysSinceJoined > 0
    ? ((totalIdeas || 0) / Math.max(daysSinceJoined / 7, 1)).toFixed(1)
    : "0";

  return NextResponse.json({
    plan: p?.subscription_plan || "free",
    quotaUsedToday: p?.youtube_quota_used_today || 0,
    scansToday: p?.scans_today || 0,
    daysSinceJoined,
    ideas: {
      total: totalIdeas || 0,
      thisWeek: ideasThisWeek || 0,
      thisMonth: ideasThisMonth || 0,
      perWeekAvg: ideasPerWeek,
      byStatus: statusCounts,
    },
    competitors: totalCompetitors || 0,
    topNiches: topNicheList,
    recentIdeas: recentIdeas || [],
  });
}
