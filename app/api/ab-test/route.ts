import { NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { getValidAccessToken } from "@/lib/youtube-auth";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: tests, error } = await supabase
    .from("ab_tests")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(50);

  if (error?.code === "42P01") return NextResponse.json({ tests: [], tableExists: false });
  return NextResponse.json({ tests: tests || [], tableExists: true });
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const svc = await createServiceClient();
  const { data: profileRaw } = await svc
    .from("profiles")
    .select("subscription_plan, email, locked_channel_id")
    .eq("id", user.id)
    .single();
  const profile = profileRaw as { subscription_plan: string; email: string; locked_channel_id: string | null } | null;

  const isAdmin = (process.env.ADMIN_EMAIL || "").split(",").map(e => e.trim()).includes(profile?.email || "");
  const plan = profile?.subscription_plan || "free";
  if (plan === "free" && !isAdmin) {
    return NextResponse.json({ error: "A/B Testing requires Creator plan or above", upgradeRequired: true }, { status: 403 });
  }

  if (!profile?.locked_channel_id) {
    return NextResponse.json({ error: "No YouTube channel connected" }, { status: 400 });
  }

  const { videoId, variantATitle, variantBTitle, variantAThumbnailUrl, variantBThumbnailUrl } = await request.json();
  if (!videoId || !variantATitle || !variantBTitle) {
    return NextResponse.json({ error: "videoId, variantATitle, and variantBTitle are required" }, { status: 400 });
  }

  // Check no active test for this video
  const { data: existing } = await svc
    .from("ab_tests")
    .select("id")
    .eq("user_id", user.id)
    .eq("video_id", videoId)
    .eq("status", "running")
    .maybeSingle();
  if (existing) {
    return NextResponse.json({ error: "An active A/B test already exists for this video" }, { status: 409 });
  }

  // Set video title to variant A immediately
  try {
    const accessToken = await getValidAccessToken(user.id);
    // Fetch current video data using OAuth token so private/unlisted videos are found
    const videoRes = await fetch(
      `https://www.googleapis.com/youtube/v3/videos?part=snippet&id=${videoId}`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );
    const videoData = await videoRes.json();
    const snippet = videoData.items?.[0]?.snippet;
    if (!snippet) return NextResponse.json({ error: "Video not found. Make sure you entered the correct Video ID (found in the URL: youtube.com/watch?v=VIDEO_ID)" }, { status: 404 });

    await fetch("https://www.googleapis.com/youtube/v3/videos?part=snippet", {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        id: videoId,
        snippet: { ...snippet, title: variantATitle },
      }),
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "YouTube API error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }

  const { data: test, error } = await svc.from("ab_tests").insert({
    user_id: user.id,
    channel_id: profile.locked_channel_id,
    video_id: videoId,
    variant_a_title: variantATitle,
    variant_b_title: variantBTitle,
    variant_a_thumbnail_url: variantAThumbnailUrl || null,
    variant_b_thumbnail_url: variantBThumbnailUrl || null,
    current_variant: "a",
    status: "running",
    rotate_at: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(),
  }).select().single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ test });
}
