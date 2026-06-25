import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data, error } = await supabase
    .from("competitors")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ competitors: data || [] });
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json() as { channelUrl?: string };
  const { channelUrl } = body;
  if (!channelUrl) return NextResponse.json({ error: "channelUrl required" }, { status: 400 });

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

  if (!apiKey) return NextResponse.json({ error: "YouTube API key required. Add one in Settings." }, { status: 400 });

  // Check limit
  const { count } = await supabase
    .from("competitors")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id);

  const maxCompetitors = plan === "agency" || isAdmin ? 20 : plan === "pro" ? 10 : plan === "creator" ? 5 : 3;
  if ((count || 0) >= maxCompetitors) {
    return NextResponse.json({ error: `You've reached the ${maxCompetitors} competitor limit on your plan.` }, { status: 429 });
  }

  // Resolve channel ID from URL
  let channelId = "";
  let channelHandle = "";

  const url = channelUrl.trim();
  const handleMatch = url.match(/@([\w.-]+)/);
  const channelIdMatch = url.match(/channel\/(UC[\w-]+)/);
  const userMatch = url.match(/\/user\/([\w-]+)/);

  if (channelIdMatch) {
    channelId = channelIdMatch[1];
  } else if (handleMatch) {
    channelHandle = `@${handleMatch[1]}`;
    const res = await fetch(`https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics&forHandle=${handleMatch[1]}&key=${apiKey}`);
    const d = await res.json();
    if (!d.items?.[0]) return NextResponse.json({ error: "Channel not found. Check the URL and try again." }, { status: 404 });
    channelId = d.items[0].id;
  } else if (userMatch) {
    const res = await fetch(`https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics&forUsername=${userMatch[1]}&key=${apiKey}`);
    const d = await res.json();
    if (!d.items?.[0]) return NextResponse.json({ error: "Channel not found." }, { status: 404 });
    channelId = d.items[0].id;
  } else {
    return NextResponse.json({ error: "Invalid YouTube channel URL. Use @handle, /channel/ID, or /user/ format." }, { status: 400 });
  }

  // Check not already added
  const { data: existing } = await supabase
    .from("competitors")
    .select("id")
    .eq("user_id", user.id)
    .eq("channel_id", channelId)
    .maybeSingle();

  if (existing) return NextResponse.json({ error: "This competitor is already in your list." }, { status: 409 });

  // Fetch channel details
  const chanRes = await fetch(`https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics,contentDetails&id=${channelId}&key=${apiKey}`);
  const chanData = await chanRes.json();
  if (!chanData.items?.[0]) return NextResponse.json({ error: "Could not fetch channel data." }, { status: 404 });

  const ch = chanData.items[0];
  const snippet = ch.snippet;
  const stats = ch.statistics;

  const { data: inserted, error: insertErr } = await supabase
    .from("competitors")
    .insert({
      user_id: user.id,
      channel_id: channelId,
      channel_handle: channelHandle || snippet?.customUrl || null,
      channel_name: snippet?.title || "Unknown Channel",
      channel_thumbnail: snippet?.thumbnails?.default?.url || null,
      subscriber_count: stats?.subscriberCount ? parseInt(stats.subscriberCount) : null,
      video_count: stats?.videoCount ? parseInt(stats.videoCount) : null,
      total_views: stats?.viewCount ? parseInt(stats.viewCount) : null,
      avg_views_per_video: (stats?.viewCount && stats?.videoCount)
        ? Math.round(parseInt(stats.viewCount) / parseInt(stats.videoCount))
        : null,
    })
    .select()
    .single();

  if (insertErr) return NextResponse.json({ error: insertErr.message }, { status: 500 });
  return NextResponse.json({
    competitor: inserted,
    channelMeta: {
      joinedAt: snippet?.publishedAt || null,
      country: snippet?.country || null,
      avgDurationSeconds: null,
    },
  });
}
