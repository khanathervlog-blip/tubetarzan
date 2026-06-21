import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { ViralIdea } from "@/types/database";
import type { GeneratedIdea, EnrichedVideo } from "@/types/youtube";

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { idea?: GeneratedIdea; sourceVideo?: EnrichedVideo; niche?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  if (!body.idea || !body.niche) {
    return NextResponse.json(
      { error: "idea and niche are required" },
      { status: 400 }
    );
  }

  const { idea, sourceVideo, niche } = body;

  const { data, error } = await supabase
    .from("viral_ideas")
    .insert({
      user_id: user.id,
      niche,
      video_title: idea.video_title,
      thumbnail_text: idea.thumbnail_text,
      hook_line: idea.hook_line,
      click_confirmation: idea.click_confirmation,
      sub_niche_keyword: idea.sub_niche_keyword,
      packaging_notes: idea.packaging_notes,
      title_score: idea.title_score,
      source_tags: idea.suggested_tags,
      ...(sourceVideo && {
        source_video_id: sourceVideo.videoId,
        source_video_url: sourceVideo.videoUrl,
        source_video_title: sourceVideo.title,
        source_channel_name: sourceVideo.channelName,
        source_channel_id: sourceVideo.channelId,
        source_views: sourceVideo.viewCount,
        source_vph: sourceVideo.vph,
        source_outlier_ratio: sourceVideo.outlierRatio,
      }),
      status: "pending",
      is_done: false,
    } as Partial<ViralIdea>)
    .select("id")
    .single();

  if (error) {
    console.error("save idea error:", error);
    return NextResponse.json({ error: "Failed to save idea" }, { status: 500 });
  }

  return NextResponse.json({ id: (data as { id: string }).id });
}
