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
          content: `You are optimising this YouTube video for MAXIMUM CTR and VPH. Every suggestion must score 90+/100 on the criteria below.

Current video data:
Title: ${video.title}
Description: ${video.description?.slice(0, 500) || "(none)"}
Tags: ${(video.tags || []).join(", ") || "(none)"}
Views: ${video.view_count?.toLocaleString()} | VPH: ${video.vph} | Outlier: ${video.outlier_ratio}x
Duration: ${Math.round((video.duration_seconds || 0) / 60)} minutes

TITLE SCORING RULES (must hit 90+/100):
- Base score: 50
- Length 40-65 chars: +15 (REQUIRED — do NOT go shorter or longer)
- Contains a power word from this list: +15 (REQUIRED — pick from: best, worst, never, always, secret, truth, mistakes, actually, stop, most, only, nobody, hidden, real, honest, exposed, SHOCKING, INSANE, UNBELIEVABLE, BREATHTAKING)
- Contains a number (year, count, ranking, distance): +8 (REQUIRED)
- 1-2 ALL CAPS words (max): +7 (include this)
- Question mark: +5 (include if natural)
- PENALTY: do NOT start with "How to", "What is", "Learn", "Guide to", "Tips for"
Target: 90-100/100. Craft accordingly.

DESCRIPTION SCORING RULES (must hit 90+/100):
- Write 800-1200 characters minimum
- Open with a strong hook sentence
- Include relevant keywords naturally
- Add subscribe/follow call-to-action
- Include relevant hashtags (#keyword) at the end
- Use line breaks for readability

TAGS SCORING RULES (must hit 90+/100):
- Provide exactly 13-15 tags
- Mix: 5 short single-word tags + 8 multi-word long-tail keyword tags
- Each tag should be a real search term people type

Return ONLY valid JSON (no markdown):
{
  "suggested_title": "EXACT title 40-65 chars with power word + number + 1-2 CAPS words",
  "suggested_description": "800-1200 char description with hook + keywords + CTA + hashtags",
  "suggested_tags": ["13-15 tags mixing single and multi-word"],
  "suggested_thumbnail_text": "2-4 words ALL CAPS",
  "optimization_notes": "2-3 sentences on why these specific choices maximize CTR and VPH"
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
