import { NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { calculateVPH } from "@/lib/scoring";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const svc = await createServiceClient();
  const { data: profileRaw } = await svc
    .from("profiles")
    .select("locked_channel_id, locked_channel_subscriber_count")
    .eq("id", user.id)
    .single();
  const profile = profileRaw as { locked_channel_id: string | null; locked_channel_subscriber_count: number | null } | null;

  if (!profile?.locked_channel_id) {
    return NextResponse.json({ error: "No YouTube channel connected" }, { status: 400 });
  }

  // Get videos
  const { data: videos } = await svc
    .from("channel_video_cache")
    .select("view_count, published_at, outlier_ratio, tags, description, title, duration_seconds")
    .eq("user_id", user.id)
    .eq("channel_id", profile.locked_channel_id)
    .order("published_at", { ascending: false })
    .limit(50);

  if (!videos?.length) {
    return NextResponse.json({ error: "No videos found. Sync your channel first." }, { status: 400 });
  }

  // Calculate VPH score (average VPH of last 10 videos)
  const recentVideos = videos.slice(0, 10);
  const avgVph = recentVideos.reduce((sum, v) => {
    const vph = calculateVPH(v.view_count || 0, v.published_at || new Date().toISOString());
    return sum + vph;
  }, 0) / recentVideos.length;
  const vphScore = Math.min(100, Math.round((avgVph / 500) * 40)); // 500 VPH = max 40 points

  // Upload consistency (videos per month, last 3 months)
  const threeMonthsAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
  const recentCount = videos.filter(v => new Date(v.published_at || 0) > threeMonthsAgo).length;
  const consistencyScore = Math.min(30, Math.round((recentCount / 12) * 30)); // 12 videos in 3 months = full 30 pts

  // Optimization score (average of metadata completeness)
  const optScore = videos.slice(0, 20).reduce((sum, v) => {
    let s = 50;
    if (v.tags?.length >= 8) s += 15;
    else if (!v.tags?.length) s -= 20;
    if (v.description?.length > 200) s += 15;
    else if (!v.description?.length) s -= 15;
    const outlier = v.outlier_ratio || 0;
    if (outlier >= 3) s += 20;
    else if (outlier < 0.5) s -= 10;
    return sum + Math.min(100, Math.max(0, s));
  }, 0) / Math.min(videos.length, 20);
  const optimizationScore = Math.round((optScore / 100) * 30); // max 30 points

  const totalScore = Math.min(100, vphScore + consistencyScore + optimizationScore);

  const breakdown = {
    vph: { score: vphScore, max: 40, label: "Content Performance", detail: `Avg ${Math.round(avgVph)} VPH` },
    consistency: { score: consistencyScore, max: 30, label: "Upload Consistency", detail: `${recentCount} videos in 90 days` },
    optimization: { score: optimizationScore, max: 30, label: "Metadata Quality", detail: `${Math.round(optScore)}/100 avg` },
  };

  // Save to history
  try {
    await svc.from("channel_health_history").insert({
      user_id: user.id,
      channel_id: profile.locked_channel_id,
      health_score: totalScore,
      score_breakdown: breakdown,
    });
  } catch {
    // Non-fatal: table may not exist yet
  }

  return NextResponse.json({ score: totalScore, breakdown, videoCount: videos.length });
}
