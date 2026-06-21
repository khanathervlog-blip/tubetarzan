import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import OpenAI from "openai";

export async function POST(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: competitor } = await supabase
    .from("competitors")
    .select("*")
    .eq("id", params.id)
    .eq("user_id", user.id)
    .single();

  if (!competitor) return NextResponse.json({ error: "Competitor not found" }, { status: 404 });

  const { data: profile } = await supabase
    .from("profiles")
    .select("youtube_api_key, subscription_plan")
    .eq("id", user.id)
    .single();

  const isAdmin = (process.env.ADMIN_EMAIL || "").split(",").map(e => e.trim()).includes(user.email || "");
  const plan = profile?.subscription_plan || "free";
  const apiKey = (isAdmin || plan === "pro" || plan === "agency")
    ? (process.env.YOUTUBE_API_KEY || profile?.youtube_api_key)
    : profile?.youtube_api_key;

  if (!apiKey) return NextResponse.json({ error: "YouTube API key required." }, { status: 400 });

  // Fetch top 50 videos from uploads playlist
  const chanRes = await fetch(
    `https://www.googleapis.com/youtube/v3/channels?part=contentDetails,statistics&id=${competitor.channel_id}&key=${apiKey}`
  );
  const chanData = await chanRes.json();
  if (!chanData.items?.[0]) return NextResponse.json({ error: "Could not fetch channel data." }, { status: 500 });

  const uploadsPlaylistId = chanData.items[0].contentDetails?.relatedPlaylists?.uploads;
  const updatedStats = chanData.items[0].statistics;

  if (!uploadsPlaylistId) return NextResponse.json({ error: "Could not find uploads playlist." }, { status: 500 });

  const plRes = await fetch(
    `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet,contentDetails&playlistId=${uploadsPlaylistId}&maxResults=50&key=${apiKey}`
  );
  const plData = await plRes.json();
  const videoIds = (plData.items || []).map((item: { contentDetails?: { videoId?: string } }) => item.contentDetails?.videoId).filter(Boolean);

  if (!videoIds.length) return NextResponse.json({ error: "No videos found." }, { status: 500 });

  const videosRes = await fetch(
    `https://www.googleapis.com/youtube/v3/videos?part=snippet,statistics&id=${videoIds.join(",")}&key=${apiKey}`
  );
  const videosData = await videosRes.json();
  const videos = videosData.items || [];

  if (!videos.length) return NextResponse.json({ error: "Could not fetch video data." }, { status: 500 });

  // Calculate averages
  const viewCounts = videos.map((v: { statistics?: { viewCount?: string } }) => parseInt(v.statistics?.viewCount || "0")).filter((n: number) => n > 0);
  const avgViews = viewCounts.length ? Math.round(viewCounts.reduce((a: number, b: number) => a + b, 0) / viewCounts.length) : 0;
  const topVideos = [...videos]
    .sort((a: { statistics?: { viewCount?: string } }, b: { statistics?: { viewCount?: string } }) => parseInt(b.statistics?.viewCount || "0") - parseInt(a.statistics?.viewCount || "0"))
    .slice(0, 10)
    .map((v: { id: string; snippet?: { title?: string; publishedAt?: string; tags?: string[] }; statistics?: { viewCount?: string } }) => ({
      videoId: v.id,
      title: v.snippet?.title || "",
      views: parseInt(v.statistics?.viewCount || "0"),
      publishedAt: v.snippet?.publishedAt || null,
      tags: v.snippet?.tags || [],
    }));

  // Build context for AI
  const titlesForAI = topVideos.map((v: { title: string; views: number }) => `"${v.title}" (${v.views.toLocaleString()} views)`).join("\n");

  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  const aiRes = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    max_tokens: 1024,
    messages: [
      { role: "system", content: "You are a YouTube competitive intelligence expert. Return only valid JSON." },
      {
        role: "user",
        content: `Analyse this YouTube channel's top performing content:

Channel: ${competitor.channel_name}
Subscribers: ${updatedStats?.subscriberCount ? parseInt(updatedStats.subscriberCount).toLocaleString() : "Unknown"}
Avg views per video: ${avgViews.toLocaleString()}

Top 10 videos by views:
${titlesForAI}

Return ONLY valid JSON:
{
  "title_patterns": ["Pattern 1", "Pattern 2", "Pattern 3", "Pattern 4", "Pattern 5"],
  "niche_consistency_score": 85,
  "content_strategy": "2-3 sentence summary of their content strategy",
  "upload_frequency": "Their likely upload frequency based on the data",
  "strengths": ["Strength 1", "Strength 2", "Strength 3"],
  "gaps": ["Gap/opportunity 1", "Gap/opportunity 2", "Gap/opportunity 3"],
  "steal_ideas": [
    { "title_idea": "Inspired title for YOUR channel", "why": "Why this works" },
    { "title_idea": "Another inspired title", "why": "Why this works" },
    { "title_idea": "Third inspired title", "why": "Why this works" }
  ],
  "thumbnail_patterns": "Brief description of their thumbnail style"
}`,
      },
    ],
  });

  const aiText = aiRes.choices[0]?.message?.content || "";
  const aiClean = aiText.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
  let aiAnalysis: Record<string, unknown> = {};
  try { aiAnalysis = JSON.parse(aiClean); } catch { /* use empty */ }

  const now = new Date().toISOString();
  const { data: updated, error: updateErr } = await supabase
    .from("competitors")
    .update({
      subscriber_count: updatedStats?.subscriberCount ? parseInt(updatedStats.subscriberCount) : competitor.subscriber_count,
      video_count: updatedStats?.videoCount ? parseInt(updatedStats.videoCount) : competitor.video_count,
      total_views: updatedStats?.viewCount ? parseInt(updatedStats.viewCount) : competitor.total_views,
      avg_views_per_video: avgViews || competitor.avg_views_per_video,
      top_videos: topVideos,
      title_patterns: aiAnalysis.title_patterns || null,
      niche_consistency_score: aiAnalysis.niche_consistency_score as number | null || null,
      last_analyzed_at: now,
    })
    .eq("id", params.id)
    .eq("user_id", user.id)
    .select()
    .single();

  if (updateErr) return NextResponse.json({ error: updateErr.message }, { status: 500 });

  return NextResponse.json({ competitor: updated, analysis: aiAnalysis, topVideos });
}
