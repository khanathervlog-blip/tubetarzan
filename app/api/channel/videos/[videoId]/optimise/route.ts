import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { verifyChannelOwnership } from "@/lib/channel-security";
import OpenAI from "openai";
import type { ChannelVideoCache } from "@/types/database";

export async function POST(
  request: NextRequest,
  { params }: { params: { videoId: string } }
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json() as { channelId?: string };
  const { channelId } = body;
  if (!channelId) return NextResponse.json({ error: "channelId required" }, { status: 400 });

  if (!await verifyChannelOwnership(user.id, channelId)) {
    return NextResponse.json({ error: "Channel not authorized" }, { status: 403 });
  }

  const serviceSupabase = await createServiceClient();
  const { data: videoRaw } = await serviceSupabase
    .from("channel_video_cache")
    .select("*")
    .eq("user_id", user.id)
    .eq("channel_id", channelId)
    .eq("video_id", params.videoId)
    .single();

  const video = videoRaw as ChannelVideoCache | null;
  if (!video) return NextResponse.json({ error: "Video not found" }, { status: 404 });

  try {
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      max_tokens: 1024,
      messages: [
        {
          role: "system",
          content: "You are a YouTube channel optimisation expert specialising in CTR, VPH, and SEO. Return only valid JSON.",
        },
        {
          role: "user",
          content: `Optimise this YouTube video for maximum CTR and VPH.

Current video data:
Title: ${video.title}
Description: ${video.description?.slice(0, 500) || "(none)"}
Tags: ${(video.tags || []).join(", ") || "(none)"}
Views: ${video.view_count?.toLocaleString()} | VPH: ${video.vph} | Outlier: ${video.outlier_ratio}x
Duration: ${Math.round((video.duration_seconds || 0) / 60)} minutes

Return ONLY valid JSON (no markdown):
{
  "suggested_title": "string max 65 chars, power words, avoid 'How to' opener",
  "suggested_description": "string 400-800 chars, hooks + keywords + CTA",
  "suggested_tags": ["array of 12-15 tags"],
  "suggested_thumbnail_text": "2-4 words ALL CAPS for thumbnail overlay",
  "optimization_notes": "2-3 sentences explaining why these changes improve CTR and VPH"
}`,
        },
      ],
    });

    const text = response.choices[0]?.message?.content || "";
    const clean = text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    const suggestions = JSON.parse(clean) as {
      suggested_title: string;
      suggested_description: string;
      suggested_tags: string[];
      suggested_thumbnail_text: string;
      optimization_notes: string;
    };

    await serviceSupabase
      .from("channel_video_cache")
      .update({
        suggested_title: suggestions.suggested_title,
        suggested_description: suggestions.suggested_description,
        suggested_tags: suggestions.suggested_tags,
        suggested_thumbnail_text: suggestions.suggested_thumbnail_text,
        optimization_notes: suggestions.optimization_notes,
        suggestions_generated_at: new Date().toISOString(),
      } as Partial<ChannelVideoCache>)
      .eq("user_id", user.id)
      .eq("video_id", params.videoId);

    return NextResponse.json({ suggestions });
  } catch (err) {
    console.error("Optimise error:", err);
    return NextResponse.json({ error: "Failed to generate suggestions" }, { status: 500 });
  }
}
