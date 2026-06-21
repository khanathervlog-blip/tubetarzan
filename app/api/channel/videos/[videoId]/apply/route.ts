import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { verifyChannelOwnership } from "@/lib/channel-security";
import { getValidAccessToken } from "@/lib/youtube-auth";
import { scoreTitle } from "@/lib/scoring";
import type { ChannelVideoCache } from "@/types/database";

export async function POST(
  request: NextRequest,
  { params }: { params: { videoId: string } }
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json() as {
    channelId?: string;
    title?: string;
    description?: string;
    tags?: string[];
  };
  const { channelId, title, description, tags } = body;
  if (!channelId) return NextResponse.json({ error: "channelId required" }, { status: 400 });

  if (!await verifyChannelOwnership(user.id, channelId)) {
    return NextResponse.json({ error: "Channel not authorized" }, { status: 403 });
  }

  // Read stored category_id so we don't accidentally overwrite the video's real category
  const serviceSupabaseRead = await createServiceClient();
  const { data: cachedVideo } = await serviceSupabaseRead
    .from("channel_video_cache")
    .select("category_id")
    .eq("user_id", user.id)
    .eq("video_id", params.videoId)
    .single();
  const categoryId = (cachedVideo as { category_id?: string | null } | null)?.category_id || "22";

  try {
    const accessToken = await getValidAccessToken(user.id);

    const snippet: Record<string, unknown> = { categoryId };
    if (title) snippet.title = title;
    if (description !== undefined) snippet.description = description;
    if (tags) snippet.tags = tags;

    const parts = ["snippet"];
    const res = await fetch(
      `https://www.googleapis.com/youtube/v3/videos?part=${parts.join(",")}`,
      {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ id: params.videoId, snippet }),
      }
    );

    if (!res.ok) {
      const errData = await res.json();
      const msg = errData?.error?.message || "YouTube API error";
      return NextResponse.json({ error: msg }, { status: res.status });
    }

    const serviceSupabase = await createServiceClient();
    const newScore = title ? scoreTitle(title) : null;

    await serviceSupabase
      .from("channel_video_cache")
      .update({
        ...(title && { title, optimization_score: newScore }),
        ...(description !== undefined && { description }),
        ...(tags && { tags }),
        applied_at: new Date().toISOString(),
      } as Partial<ChannelVideoCache>)
      .eq("user_id", user.id)
      .eq("video_id", params.videoId);

    return NextResponse.json({ success: true, newScore });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Apply failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
